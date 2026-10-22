// 每日流水线收尾：给当天成刊，把日报 Markdown 追加到仓库的 Reports/<年-月>.md。
// 采集、内容理解、精选评分和归组由 worker 完成（见 .github/workflows/daily.yml），这里只成刊 + 落盘。
//   node scripts/daily.ts              当天（按 site.ts 的 EDITION_TIMES.daily 判定）
//   node scripts/daily.ts 2026-10-22   指定一期
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { composeDaily, dueDaily } from "@aihot/backend/reports/compose";
import { dailyWithNotes } from "@aihot/backend/publication/reports";
import { beijingAt, beijingStamp, beijingWeekday } from "@aihot/contracts/time";
import { EDITION_TIMES, EDITION_WHEN, SITE } from "@aihot/site";

/** 日报里的一条：公开读取层（publication/reports.ts）的 v1 结构。 */
interface Entry {
  title: string;
  summary?: string;
  source: { name: string };
  links: { aihot: string | null; original: string | null };
}
interface Section {
  label: string;
  items: Entry[];
}

const date = process.argv[2] ?? dueDaily();

// 当天窗口里一条都没入选：信源静默或模型没放开，写一句说明再退出，不算流水线失败。
try {
  const composed = await composeDaily(date);
  console.log(JSON.stringify({ level: "info", msg: "composed", ...composed }));
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  if (reason.includes("nothing judged")) {
    // 空窗时把库里的计数打出来：articles 少说明没抓到，publications/selected 少说明模型那一步没过。
    const end = beijingAt(date, EDITION_TIMES.daily);
    const start = new Date(end.getTime() - 86400000);
    const counts = await sql<{ articles: string; publications: string; selected: string; inWindow: string; newest: string; oldest: string }[]>`
      SELECT (SELECT count(*) FROM articles)::text AS articles,
             (SELECT count(*) FROM publications)::text AS publications,
             (SELECT count(*) FROM publications WHERE selected)::text AS selected,
             (SELECT count(*) FROM publications WHERE timeline_at >= ${start} AND timeline_at <= ${end})::text AS "inWindow",
             (SELECT coalesce(max(timeline_at)::text, '-') FROM publications) AS newest,
             (SELECT coalesce(min(timeline_at)::text, '-') FROM publications) AS oldest`;
    console.log(JSON.stringify({ level: "warn", msg: "quiet window, no report", date, reason,
      windowStart: start.toISOString(), windowEnd: end.toISOString(), ...counts[0] }));
    await closeDb();
    process.exit(0);
  }
  throw error;
}

const saved = await dailyWithNotes(date);
if (!saved) throw new Error(`daily report ${date} not found after composing`);
const report = saved.body.report;
const sections = report.sections as Section[];
const flashes = report.flashes as Entry[];

/** 落盘给读者看，所以链原文；站内链接要站点上线才有意义。 */
const link = (entry: Entry) => entry.links.original ?? entry.links.aihot ?? "";

const lines: string[] = [
  `## ${report.date}（${beijingWeekday(report.date)}）`,
  "",
  `收录北京时间 ${beijingStamp(report.windowStart)} 至 ${beijingStamp(report.windowEnd)} 的动态。`,
  "",
];
if (report.lead) lines.push(`**${report.lead.title}**`, "", report.lead.leadParagraph, "");
for (const section of sections) {
  lines.push(`### ${section.label}`, "");
  section.items.forEach((item, i) => {
    lines.push(`${i + 1}. [${item.title}](${link(item)}) · ${item.source.name}`);
    if (item.summary) lines.push(`   ${item.summary}`);
  });
  lines.push("");
}
if (flashes.length) {
  lines.push("### 快讯", "");
  for (const flash of flashes) lines.push(`- [${flash.title}](${link(flash)}) · ${flash.source.name}`);
  lines.push("");
}

const dir = path.join(REPO_ROOT, "Reports");
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${date.slice(0, 7)}.md`);
if (!existsSync(file)) {
  writeFileSync(
    file,
    [
      `# ${SITE.name} · ${date.slice(0, 7)} 日报汇编`,
      "",
      `> ${EDITION_WHEN.daily}自动成刊，每天的日报按时间追加在下面；标题和摘要由模型根据原文写成，事实请回原文核对。`,
      "",
      "---",
      "",
    ].join("\n"),
  );
}
appendFileSync(file, `${lines.join("\n")}\n---\n\n`);

const events = sections.reduce((n, s) => n + s.items.length, 0) + flashes.length;
console.log(JSON.stringify({ level: "info", msg: "report appended", file, date, events }));
await closeDb();
