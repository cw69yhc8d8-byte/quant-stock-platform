# CHECKLIST

## 上线前检查

- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
- [ ] 首页 `/` 正常
- [ ] `/market` 正常
- [ ] `/sectors` 正常
- [ ] `/stocks` 正常
- [ ] `/report` 正常
- [ ] `/journal` 正常
- [ ] `/settings` 正常
- [ ] API 返回 JSON
- [ ] 手机端页面显示正常
- [ ] 所有股票分析页面保留风险提示
- [ ] `DATA_PROVIDER` 线上设置为 `mock`
- [ ] `.env` 未提交到 GitHub
- [ ] 没有提交真实 token
- [ ] `dev.db` 未提交到 GitHub

## API 核查

- [ ] `/api/market/overview`
- [ ] `/api/sectors`
- [ ] `/api/stocks`
- [ ] `/api/stocks/[code]`
- [ ] `/api/report/latest`
- [ ] `/api/journal`
- [ ] `/api/system/data-provider`
- [ ] `/api/system/refresh`
- [ ] `/api/system/refresh-logs`
- [ ] `/api/data-refresh/logs`

## 部署核查

- [ ] GitHub 仓库已上传最新代码
- [ ] Vercel 项目已导入
- [ ] Vercel 环境变量已设置 `DATA_PROVIDER=mock`
- [ ] 生产环境误设 `akshare` 时不会执行 Python
- [ ] 没有数据库时页面不会白屏
- [ ] `/settings` 能看到数据源状态

## 下一阶段准备

- [ ] 选定线上数据库（Supabase / Neon / Postgres）
- [ ] 规划 Prisma datasource 切换
- [ ] 规划真实行情的服务端采集方式
