# 每日在 GitHub 上跑

不用自己准备服务器：仓库里的 `.github/workflows/daily.yml` 每天北京 09:00（UTC 01:00）在 GitHub 的
runner 上把整条流水线跑一遍，把当天日报写进仓库的 `Reports/<年-月>.md` 并提交。

## 它每一步做什么

| 步骤 | 命令 | 说明 |
|---|---|---|
| 建表 | `node scripts/migrate.ts` | runner 上起一个 postgres 17 服务容器，库每次新建 |
| 导入信源 | `node scripts/seed.ts` | 读 `industry/sources.json`，已存在的不覆盖 |
| 采集与处理 | `node apps/worker/src/main.ts`（跑 15 分钟后 SIGTERM） | 收到期信源 → 内容理解、精选评分、翻译 → 归组、热度 → 成刊 |
| 落盘 | `node scripts/daily.ts` | 当天成刊，Markdown 追加到 `Reports/<年-月>.md`，链接指向原文 |
| 提交 | git commit + push | 只有报告有变化才提交 |

当天窗口里一条都没入选时，`scripts/daily.ts` 打印一条 warn 并不写文件、不判失败。

## 需要的 secret

| Secret | 用途 |
|---|---|
| `LLM_API_KEY` | 模型调用（ SiliconFlow）。地址和模型名写在 workflow 的 env 里：`LLM_BASE_URL`、`LLM_MODEL` |

没配 `LLM_API_KEY` 时采集照常，但没有评分和写作，日报不会生成。

## 报告为什么在文件里

数据库每次新建，跨天的去重和历史热度不保留；日报的历史就落在仓库的 `Reports/<年-月>.md` 里，
一天一节，按时间追加。要看某个月的完整记录，打开对应月份的文件即可。

想保留库里的历史（去重、热度、事件归并更准），把 workflow 里的 `DATABASE_URL` 换成外部
PostgreSQL 并删掉 `services.postgres`，其余步骤不变。
