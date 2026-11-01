import { readFileSync } from "node:fs";
import { fetchRss } from "../packages/backend/src/sources/rss.ts";
import { extractFromUrl } from "../packages/backend/src/content/extract.ts";
import { prefilterUser, PREFILTER_SYSTEM } from "../packages/backend/src/editorial/writing.ts";

const BASE = process.env.LLM_BASE_URL!;
const KEY = process.env.LLM_API_KEY!;
const models = (process.env.BENCH_MODELS ?? "THUDM/GLM-4-9B-0414,Qwen/Qwen3-8B").split(",");
const sources = JSON.parse(readFileSync("industry/sources.json", "utf8")).sources as Array<Record<string, unknown>>;

async function call(model: string, user: string) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 300, response_format: { type: "json_object" }, enable_thinking: false,
      messages: [{ role: "system", content: PREFILTER_SYSTEM + "\n只输出一个 JSON 对象。" }, { role: "user", content: user }],
    }),
  });
  const data = await res.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  return String(data.choices?.[0]?.message?.content ?? "");
}

const sample: Array<{ source: string; title: string; url: string; body: string }> = [];
for (const raw of sources.filter((s) => s.kind === "rss").slice(0, 8)) {
  const row = {
    id: raw.id, name: raw.name, kind: raw.kind, config: raw.config, tier: raw.tier,
    participation_mode: raw.participation_mode, first_party: raw.tier === "T1",
    interval_minutes: raw.interval_minutes, enabled: true, cursor: null, fail_count: 0,
  };
  try {
    const items = ((await fetchRss(row as never)) as { candidates?: Array<{ title: string; url: string; bodyHtml?: string | null; publishedAt?: string | null }> }).candidates ?? [];
    for (const item of items.slice(0, 2)) {
      let body = item.bodyHtml ? String(item.bodyHtml).replace(/<[^>]+>/g, " ") : "";
      if (body.trim().length < 400) {
        try { body = (await extractFromUrl(item.url, "bench", {}, { paidFallback: false }))?.text ?? body; } catch { /* keep feed text */ }
      }
      sample.push({ source: String(raw.id), title: item.title, url: item.url, body: body.slice(0, 4000) });
    }
  } catch { /* skip unreachable source */ }
}

for (const model of models) {
  let ok = 0, missing = 0, bad = 0;
  const labels: string[] = [];
  for (const item of sample) {
    const input = {
      id: item.url, revision: 1, title: item.title, url: item.url, author: null, publishedAt: new Date(),
      bodyText: item.body || null, excerpt: null, xPost: null, media: [],
      source: { name: item.source, kind: "rss", tier: "T2", firstParty: false },
    };
    const text = await call(model, prefilterUser(input));
    let parsed: Record<string, unknown> | null = null;
    try { parsed = JSON.parse(/\{[\s\S]*\}/.exec(text)?.[0] ?? "null") as Record<string, unknown> | null; } catch { parsed = null; }
    const label = String(parsed?.label ?? "").toUpperCase();
    if (model.includes("GLM")) console.log(JSON.stringify({ raw: text.slice(0, 300), parsed, label }));
    if (["PASS", "BLOCK", "UNKNOWN"].includes(label)) { ok++; labels.push(label); }
    else if (parsed) { missing++; labels.push("MISSING"); }
    else { bad++; labels.push("BADJSON"); }
    if (label === "MISSING" || label === "BADJSON" || !parsed) console.log(JSON.stringify({ model, issue: label, title: item.title.slice(0, 50), raw: text.slice(0, 120) }));
  }
  console.log(JSON.stringify({ model, n: sample.length, ok, missing, bad, labels }));
}
