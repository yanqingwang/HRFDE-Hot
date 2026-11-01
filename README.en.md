# HRFDE Hot

A daily radar for HR, Forward Deployed Engineers (FDE) and job-market change.

HRFDE Hot watches HR technology, customer-facing delivery engineering, hiring and layoffs, people/org changes, policy, research, practical guides and informed opinion. Reports about the same event are grouped together, ranked by importance and first-hand evidence, and published as a Chinese daily briefing at 08:00 Beijing time.

## Read the daily

Each daily issue is written into `Reports/<year>-<month>.md` in this repository, appended one day at a time and committed by the daily workflow; no server has to stay online.

## How it works

1. **Collect** HR media, vendor blogs, employment-law firms and labour-market research RSS, Hacker News searches, and the HRTechChina web listing — in English and Chinese.
2. **Judge** every item for relevance, then score it independently with a hard-event-first rubric. Marketing, generic AI releases, single job ads and unsupported trend commentary rank low.
3. **Write** a Chinese headline, an answer-first summary and a reason, then extract categories, tags, entities and facts.
4. **Group and compose** one event from multiple reports; the daily issue is composed by rule, not by a model choosing the layout.
5. **Publish** by appending the composed issue to `Reports/` and committing it from GitHub Actions.

Sections: FDE & delivery; HR technology; hiring, org & industry; policy & compliance; research & reports; practice & opinion.

## Run locally

Requires Node.js 24+, PostgreSQL 17, and an OpenAI-compatible model endpoint. The example configuration uses SiliconFlow; `LLM_MODEL` in `.env` picks the model, and the daily workflow runs `Qwen/Qwen3-8B` with thinking disabled.

```bash
npm ci
cp .env.example .env
# Edit .env: DATABASE_URL, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL,
# SESSION_SECRET, IMG_PROXY_SIGN_SECRET
node scripts/migrate.ts
node scripts/seed.ts
node apps/worker/src/main.ts
```

Export an issue by hand after it has been composed:

```bash
node scripts/daily.ts
```

To use the web reader locally, start the API and web app in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

The admin UI is at `/admin`; the password is `ADMIN_PASSWORD` in `.env`.

## GitHub Actions

`.github/workflows/daily.yml` starts at 01:00 UTC (09:00 Beijing): it migrates and seeds, lets the worker collect and process for 15 minutes, then writes the day's issue into `Reports/` and commits it. The issue covers the previous day 08:00 to today 08:00, so an external PostgreSQL (`DATABASE_URL`) is required; on a fresh per-run database every source is a first import and its items are kept out of the daily issue.

| Secret | Purpose |
|---|---|
| `SILICONFLOW_API_KEY` | Model calls (wired to `LLM_API_KEY` in the workflow) |
| `DATABASE_URL` | External PostgreSQL; without it the built-in database cannot produce an issue |
| `SESSION_SECRET` | Session/feedback signing |
| `IMG_PROXY_SIGN_SECRET` | Image proxy signing |

The workflow commits only `Reports/`; it never writes the database or secrets into the repository.

## Customize

Nearly all editorial configuration lives in two folders:

- `site/`: site name, copy, edition times, about page, terms, changelog, brand.
- `industry/`: categories and tags (`taxonomy.ts`), topics (`topics.json`), sources (`sources.json`), prompts (`prompts/`), selection thresholds (`selection.ts`).

Before publishing, run:

```bash
npm run typecheck
npm run build -w @aihot/web
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/hrfde_test npm test
```

## License

The code is MIT licensed. The site name, copy and brand assets are maintained by this site's operator; source articles remain the property of their publishers.
