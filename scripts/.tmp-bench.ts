// Temporary full-step comparison for free small models: prefilter, two scores, structure, writing.
import { extractFromUrl } from "../packages/backend/src/content/extract.ts";
import { buildMaterial, buildScoreInput, STRUCTURE_SYSTEM } from "../packages/backend/src/editorial/analyze.ts";
import { prefilterUser, understandUser, PREFILTER_SYSTEM, UNDERSTAND_SYSTEM } from "../packages/backend/src/editorial/writing.ts";
import { promptText } from "../packages/backend/src/editorial/prompts.ts";

const SCORE = promptText("selection-score");
const MODELS = (process.env.BENCH_MODELS ?? "THUDM/GLM-4-9B-0414,Qwen/Qwen3-8B").split(",");
const BASE = process.env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1";
const KEY = process.env.LLM_API_KEY!;

const ARTICLES = [
  { id: "hrdive-pbm", title: "DOL finalizes sweeping pharmacy benefit manager disclosure rule", tier: "T2", url: "https://www.hrdive.com/news/pbm-transparency-final-rule-labor-department-employer/873318/" },
  { id: "littler", title: "Ninth Circuit Holds that California’s Captive-Audience Ban Violates the First Amendment", tier: "T2", url: "https://www.littler.com/news-analysis/asap/ninth-circuit-holds-californias-captive-audience-ban-violates-first-amendment" },
  { id: "hiringlab", title: "Q3 2026 Employment Cost Index: Rising Healthcare Costs Keep Haunting Employers", tier: "T2", url: "https://hiringlab.indeed.com/2026/10/30/q3-2026-employment-cost-index/" },
  { id: "hrtechchina", title: "上海2026社保公积金新标准正式落地：最低基数7546元，7月起需补差", tier: "T2", url: "https://www.hrtechchina.com/76421.html" },
  { id: "personneltoday", title: "Worker excused from using AI on basis of Humanist beliefs", tier: "T2", url: "https://www.personneltoday.com/hr/usa-worker-ai-humanist-artificial-intelligence/" },
  { id: "bersin", title: "AI Makes The HCM Market Hot Again: Workday, SAP, Oracle, and More.", tier: "T1_5", url: "https://joshbersin.com/2026/10/ai-makes-the-hcm-market-hot-again-workday-sap-oracle-and-more/" },
];

type Reply = { ok: boolean; json: Record<string, unknown> | null; ms: number; raw: string };

async function call(model: string, system: string, user: string, maxTokens: number, temperature: number): Promise<Reply> {
  const started = Date.now();
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model, temperature, max_tokens: maxTokens, response_format: { type: "json_object" }, enable_thinking: false,
      messages: [{ role: "system", content: system + "\n只输出一个 JSON 对象。" }, { role: "user", content: user }],
    }),
  });
  const data = await res.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const text = String(data.choices?.[0]?.message?.content ?? "");
  const match = /\{[\s\S]*\}/.exec(text);
  return { ok: Boolean(match), json: match ? JSON.parse(match[0]) as Record<string, unknown> : null, ms: Date.now() - started, raw: text.slice(0, 60) };
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
  for (const article of ARTICLES) {
    const input = {
      id: article.id, revision: 1, title: article.title, url: article.url, author: null,
      publishedAt: new Date(), bodyText: bodies.get(article.id) || null, excerpt: null,
      xPost: null, media: [], source: { name: article.id, kind: "rss", tier: article.tier, firstParty: article.tier === "T1" },
    };
    try {
      const pre = await call(model, PREFILTER_SYSTEM, prefilterUser(input), 300, 0);
      const label = String(pre.json?.label ?? "").toUpperCase();
      let s1: number | null = null, s2: number | null = null;
      let structure: Reply | null = null, understanding: Reply | null = null;
      if (label !== "BLOCK") {
        const [a, b] = await Promise.all([
          call(model, SCORE, buildScoreInput(input), 400, 0),
          call(model, SCORE, buildScoreInput(input), 400, 0),
        ]);
        s1 = Number(a.json?.attentionScore); s2 = Number(b.json?.attentionScore);
        structure = await call(model, STRUCTURE_SYSTEM, buildMaterial(input), 1200, 0.2);
        understanding = await call(model, UNDERSTAND_SYSTEM, understandUser(input), 900, 0.2);
      }
      console.log(JSON.stringify({
        model, id: article.id, label, s1, s2,
        preMs: pre.ms, scoreMs: structure ? null : undefined,
        category: structure?.json?.category ?? null,
        tags: structure?.json?.tags ?? null,
        subjects: structure?.json?.subjects ?? null,
        factTitle: (structure?.json?.fact as Record<string, unknown> | null | undefined)?.title ?? null,
        itemType: understanding?.json?.itemType ?? null,
        titleZh: understanding?.json?.titleZh ?? null,
        summaryZh: understanding?.json?.summaryZh ?? null,
        judgment: understanding?.json?.editorialJudgment ?? null,
        structureOk: structure?.ok ?? null,
        understandingOk: understanding?.ok ?? null,
        understandingMs: understanding?.ms ?? null,
      }));
    } catch (error) {
      console.log(JSON.stringify({ model, id: article.id, error: String(error).slice(0, 100) }));
    }
  }
}
