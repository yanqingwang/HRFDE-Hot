// Temporary benchmark: same articles, same prompts, several SiliconFlow free models.
import { extractFromUrl } from "../packages/backend/src/content/extract.ts";
import { buildMaterial } from "../packages/backend/src/editorial/input.ts";
import { buildScoreInput } from "../packages/backend/src/editorial/analyze.ts";
import { promptText } from "../packages/backend/src/editorial/prompts.ts";

const PRE = promptText("prefilter");
const SCORE = promptText("selection-score");
const MODELS = (process.env.BENCH_MODELS ?? "Qwen/Qwen3-8B,Qwen/Qwen3.5-4B,THUDM/GLM-4-9B-0414,Qwen/Qwen2.5-7B-Instruct").split(",");
const BASE = process.env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1";
const KEY = process.env.LLM_API_KEY!;

const ARTICLES = [
  { id: "hrdive", title: "DOL finalizes sweeping pharmacy benefit manager disclosure rule", tier: "T2", url: "https://www.hrdive.com/news/pbm-transparency-final-rule-labor-department-employer/873318/" },
  { id: "littler", title: "Ninth Circuit Holds that California’s Captive-Audience Ban Violates the First Amendment", tier: "T2", url: "https://www.littler.com/news-analysis/asap/ninth-circuit-holds-californias-captive-audience-ban-violates-first-amendment" },
  { id: "hiringlab", title: "Q3 2026 Employment Cost Index: Rising Healthcare Costs Keep Haunting Employers", tier: "T2", url: "https://hiringlab.indeed.com/2026/10/30/q3-2026-employment-cost-index/" },
  { id: "hrtechchina", title: "上海2026社保公积金新标准正式落地：最低基数7546元，7月起需补差", tier: "T2", url: "https://www.hrtechchina.com/76421.html" },
];

async function call(model: string, system: string, user: string, maxTokens: number) {
  const started = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: maxTokens, response_format: { type: "json_object" },
      enable_thinking: false,
      messages: [
        { role: "system", content: system + "\n只输出一个 JSON 对象。" },
        { role: "user", content: user },
      ],
    }),
  });
  const data = await res.json() as { choices?: Array<{ message?: { content?: string | null } }> ; usage?: { completion_tokens?: number } };
  const ms = Date.now() - started;
  const text = String(data.choices?.[0]?.message?.content ?? "");
  const match = /\{[\s\S]*\}/.exec(text);
  return { ok: Boolean(match), json: match ? JSON.parse(match[0]) as Record<string, unknown> : null, ms, tokens: data.usage?.completion_tokens ?? null, raw: text.slice(0, 80) };
}

const bodies = new Map<string, string>();
for (const article of ARTICLES) {
  try {
    const body = await extractFromUrl(article.url, "bench", {}, { paidFallback: false });
    bodies.set(article.id, (body?.text ?? "").slice(0, 6000));
  } catch {
    bodies.set(article.id, "");
  }
}

for (const model of MODELS) {
  const rows: Array<Record<string, unknown>> = [];
  for (const article of ARTICLES) {
    const input = {
      id: article.id, revision: 1, title: article.title, url: article.url, author: null,
      publishedAt: new Date(), bodyText: bodies.get(article.id) || null, excerpt: null,
      xPost: null, media: [], source: { name: article.id, kind: "rss", tier: article.tier, firstParty: false },
    };
    try {
      const pre = await call(model, PRE, buildMaterial(input), 300);
      let score: number | null = null;
      if (String(pre.json?.label).toUpperCase() !== "BLOCK") {
        const s = await call(model, SCORE, buildScoreInput(input), 400);
        score = typeof s.json?.attentionScore === "number" ? s.json.attentionScore : Number(s.json?.attentionScore);
      }
      rows.push({ article: article.id, label: pre.json?.label ?? null, preMs: pre.ms, score, scoreOk: Number.isFinite(score) });
    } catch (error) {
      rows.push({ article: article.id, error: String(error).slice(0, 80) });
    }
  }
  console.log(JSON.stringify({ model, rows }));
}
