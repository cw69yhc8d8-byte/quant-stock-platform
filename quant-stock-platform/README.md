# quant-stock-platform

量化炒股网页平台原型，定位为“投资研究、量化分析和交易复盘辅助系统”。

## 当前状态

项目当前已经具备：

- Next.js + TypeScript + Tailwind CSS 前端原型
- Prisma + SQLite 本地数据库
- mock fallback
- 数据源适配层：`mock / akshare / tushare`
- DataRefreshLog 刷新日志
- AkShare 本地 Python 架构
- 线上部署安全降级：生产环境默认 `mock`

## 当前边界

- 不做自动交易
- 不做实盘下单
- 不做登录注册
- 不承诺收益
- 不做复杂 AI 预测
- 线上部署阶段默认不启用 AkShare

## 本地运行

```bash
cd /Users/duhongtao/Documents/股票推荐/quant-stock-platform
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

如果当前电脑没有系统级 Node/npm，可先临时加入本地 Node：

```bash
export PATH="$HOME/.cache/codex-local-node/current/bin:$PATH"
```

## 本地数据库

本地开发默认使用：

```env
DATABASE_URL="file:./dev.db"
```

初始化数据库：

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

兼容旧脚本：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 数据源配置

`.env` 示例：

```env
DATABASE_URL="file:./dev.db"
DATA_PROVIDER="mock"
TUSHARE_TOKEN=""
AKSHARE_BASE_URL=""
```

可选 provider：

```text
mock
akshare
tushare
```

### 生产环境规则

- 如果 `DATA_PROVIDER` 未设置：默认 `mock`
- 如果 `DATA_PROVIDER=akshare` 且当前是 production：自动降级为 `mock`
- 如果生产环境没有可用数据库：自动 fallback，不会白屏

## AkShare 仅本地开发使用

1. 安装 Python 3
2. 安装依赖：

```bash
python3 -m pip install -r scripts/akshare/requirements.txt
```

3. 本地 `.env` 切换：

```env
DATA_PROVIDER="akshare"
```

4. 启动项目后打开：

```text
http://localhost:3000/settings
```

然后点击刷新按钮。

### 注意

- AkShare 依赖本地 Python 环境
- AkShare 不适合直接运行在 Vercel Serverless
- 线上部署时会自动禁用 AkShare，改用 mock fallback

## API 测试

```bash
curl http://localhost:3000/api/market/overview
curl http://localhost:3000/api/sectors
curl http://localhost:3000/api/stocks
curl http://localhost:3000/api/stocks/688981
curl http://localhost:3000/api/report/latest
curl http://localhost:3000/api/journal
curl http://localhost:3000/api/system/data-provider
curl http://localhost:3000/api/system/refresh-logs
curl http://localhost:3000/api/data-refresh/logs
curl -X POST http://localhost:3000/api/system/refresh \
  -H "Content-Type: application/json" \
  -d '{"taskType":"all"}'
```

## Vercel 部署结论

当前版本可以用于：

- 展示投研系统网页
- 展示 mock / fallback 数据
- 展示系统设置、数据源状态、风险提示
- 手机和电脑通过互联网访问

当前版本不用于：

- 在线真实行情拉取
- 在线 AkShare 执行
- 在线数据库持久化

更完整的上线步骤见：

- [DEPLOYMENT.md](/Users/duhongtao/Documents/股票推荐/quant-stock-platform/DEPLOYMENT.md)
- [CHECKLIST.md](/Users/duhongtao/Documents/股票推荐/quant-stock-platform/CHECKLIST.md)

## 风险提示

本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。
