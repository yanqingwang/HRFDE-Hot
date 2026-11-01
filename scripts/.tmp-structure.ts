import { readFileSync } from "node:fs";
import { fetchRss } from "../packages/backend/src/sources/rss.ts";
import { extractFromUrl } from "../packages/backend/src/content/extract.ts";
import { buildMaterial, STRUCTURE_SYSTEM } from "../packages/backend/src/editorial/analyze.ts";
import { understandUser, UNDERSTAND_SYSTEM } from "../packages/backend/src/editorial/writing.ts";

const BASE = process.env.LLM_BASE_URL!;
const KEY = process.env.LLM_API_KEY!;
const MODEL = process.env.BENCH_MODELS ?? "THUDM/GLM-4-9B-0414";
const sources = JSON.parse(readFileSync("industry/sources.json", "utf8")).sources as Array<Record<string, unknown>>;

async function call(system: string, user: string, maxTokens: number, temperature: number) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL, temperature, max_tokens: maxTokens, response_format: { type: "json_object" }, enable_thinking: false,
      messages: [{ role: "system", content: system + "\n只输出一个 JSON 对象。" }, { role: "user", content: user }],
    }),
  });
  const data = await res.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const text = String(data.choices?.[0]?.message?.content ?? "");
  return text;
}

const items: Array<{ source: string; title: string; url: string; body: string }> = [];
for (const raw of sources.filter((s) => s.kind === "rss").slice(0, 6)) {
  const row = {
    id: raw.id, name: raw.name, kind: raw.kind, config: raw.config, tier: raw.tier,
    participation_mode: raw.participation_mode, first_party: raw.tier === "T1",
    interval_minutes: raw.interval_minutes, enabled: true, cursor: null, fail_count: 0,
  };
  try {
    const candidates = ((await fetchRss(row as never)) as { candidates?: Array<{ title: string; url: string; bodyHtml?: string | null }> }).candidates ?? [];
    for (const item of candidates.slice(0, 2)) {
      let body = item.bodyHtml ? String(item.bodyHtml).replace(/<[^>]+>/g, " ") : "";
      if (body.trim().length < 500) {
        try { body = (await extractFromUrl(item.url, "bench", {}, { paidFallback: false }))?.text ?? body; } catch { /* feed text */ }
      }
      items.push({ source: String(raw.id), title: item.title, url: item.url, body: body.slice(0, 4000) });
    }
  } catch { /* skip */ }
}

let structOk = 0, understandOk = 0, emptyStruct = 0, emptyUnderstand = 0;
for (const item of items) {
  const input = {
    id: item.url, revision: 1, title: item.title, url: item.url, author: null, publishedAt: new Date(),
    bodyText: item.body || null, excerpt: null, xPost: null, media: [],
    source: { name: item.source, kind: "rss", tier: "T2", firstParty: false },
  };
  const sRaw = await call(STRUCTURE_SYSTEM, buildMaterial(input), 1200, 0.2);
  let s: Record<string, unknown> | null = null;
  try { s = JSON.parse(/\{[\s\S]*\}/.exec(sRaw)?.[0] ?? "null") as Record<string, unknown> | null; } catch { s = null; }
  const sGood = Boolean(s && s.category && Array.isArray(s.tags) && s.tags.length > 0);
  if (sGood) structOk++; if (!s || Object.keys(s).length === 0) emptyStruct++;

  const uRaw = await call(UNDERSTAND_SYSTEM, understandUser(input), 1000, 0.2);
  let u: Record<string, unknown> | null = null;
  try { u = JSON.parse(/\{[\s\S]*\}/.exec(uRaw)?.[0] ?? "null") as Record<string, unknown> | null; } catch { u = null; }
  const uGood = Boolean(u && u.titleZh && u.summaryZh && u.itemType);
  if (uGood) understandOk++; if (!u || Object.keys(u).length === 0) emptyUnderstand++;

  console.log(JSON.stringify({ source: item.source, title: item.title.slice(0, 50), structGood: sGood, understandGood: uGood,
    category: s?.category ?? null, tags: s?.tags ?? null, titleZh: u?.titleZh ?? null }));
  if (!sGood) console.log(JSON.stringify({ kind: "BAD_STRUCTURE", raw: sRaw.slice(0, 160) }));
  if (!uGood) console.log(JSON.stringify({ kind: "BAD_UNDERSTAND", raw: uRaw.slice(0, 160) }));
}
console.log(JSON.stringify({ model: MODEL, n: items.length, structOk, emptyStruct, understandOk, emptyUnderstand }));
