# HRFDE Hot

HR、FDE（Forward Deployed Engineer）与职位变化的每日雷达。

这个站盯着 HR 科技、前线部署/客户交付工程、招聘与裁员、组织与人事、政策合规、研究报告、实践教程和观点。它把不同来源报道的同一件事归到一起，按重要性和一手程度排序，每天 08:00（北京时间）出一份中文日报。

## 看日报

每天自动生成的日报写在仓库的 `Reports/<年-月>.md` 里，按日期一节接一节追加，由每日任务自动提交，不需要长期运行服务器。

## 它是怎么工作的

1. **采集**：HR 媒体、厂商官方博客、劳动法事务所与劳动力市场研究的 RSS，Hacker News 的相关搜索，以及 HRTechChina 的网页列表；中英文都有。
2. **预筛与评分**：模型先判断是否属于 HR、FDE 或职位变化，再按“硬事件优先”的标准独立打分；营销稿、泛 AI 发布、单条职位广告和没有事实支撑的趋势评论会被压低。
3. **写作与归类**：生成中文标题、答案先行的摘要和推荐理由，抽出分类、标签、主体与事实。
4. **归组与日报**：同一件事的多篇报道合成一个事件；日报按规则编出头条、要点、分节和快讯，不靠模型决定版面。
5. **发布**：GitHub Actions 成刊后把当天日报追加到 `Reports/` 并提交。

分类与栏目：

| 栏目 | 收什么 |
|---|---|
| FDE 与交付 | FDE 岗位、团队、招聘要求、客户现场交付方法与组织模式 |
| HR 科技 | HRIS/HCM、ATS、薪酬、福利、绩效、学习、员工体验、劳动力分析 |
| 招聘、组织与行业 | 已发生的招聘、裁员、冻结、重组、高管/CHRO 变动、融资并购 |
| 政策与合规 | 劳动法、薪酬透明、签证与全球用工、员工隐私、HR 场景 AI 合规 |
| 研究与报告 | 劳动力市场、招聘、薪酬、组织效能、FDE/交付工程的调查与数据 |
| 实践与观点 | 可复用的 HR/FDE 做法、教程、职业转型与有事实支撑的判断 |

## 本机运行

需要 Node.js 24+、PostgreSQL 17 和一个 OpenAI 兼容的模型接口。示例配置走 SiliconFlow，模型由 `.env` 的 `LLM_MODEL` 决定；每日任务里用的是 `Qwen/Qwen3-8B`，关掉思考。

```bash
npm ci
cp .env.example .env
# 编辑 .env：DATABASE_URL、LLM_BASE_URL、LLM_API_KEY、LLM_MODEL、SESSION_SECRET、IMG_PROXY_SIGN_SECRET
node scripts/migrate.ts
node scripts/seed.ts
node apps/worker/src/main.ts
```

worker 启动后按 `industry/sources.json` 采集。日报到点后可以手动导出：

```bash
node scripts/daily.ts
```

本地看网页界面需要再启动 API 和 Web：

```bash
npm run dev:api
npm run dev:web
```

后台在 `/admin`，密码是 `.env` 里的 `ADMIN_PASSWORD`。

## GitHub Actions

`.github/workflows/daily.yml` 每天 01:00 UTC（北京时间 09:00）启动：建表、导入信源、让 worker 跑 15 分钟采集与处理，最后把当天日报写进 `Reports/` 并提交。日报窗口是前一天的 08:00 到当天 08:00，所以必须配外部 PostgreSQL（`DATABASE_URL`）；用 runner 上每次新建的库，每个信源都会是“首次导入”，条目会被排除在日报外。

| Secret | 用途 |
|---|---|
| `SILICONFLOW_API_KEY` | 模型调用（workflow 里接到 `LLM_API_KEY`） |
| `DATABASE_URL` | 外部 PostgreSQL；不配就退回 runner 内置库，出不了刊 |
| `SESSION_SECRET` | 会话/反馈标识 |
| `IMG_PROXY_SIGN_SECRET` | 图片代理签名 |

工作流只提交 `Reports/`，不会把数据库或密钥写进仓库。

## 改内容

几乎所有行业相关内容都在两个文件夹：

- `site/`：站名、文案、出刊时间、关于页、条款、更新日志、品牌。
- `industry/`：分类与标签（`taxonomy.ts`）、主题（`topics.json`）、信源（`sources.json`）、提示词（`prompts/`）、入选门槛（`selection.ts`）。

改完至少运行：

```bash
npm run typecheck
npm run build -w @aihot/web
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/hrfde_test npm test
```

## 许可

代码使用 MIT 许可证。站点名称、文案与品牌素材由本站维护者保留；来源文章的版权归各来源所有。
