# DEPLOYMENT

## 1. 本地运行步骤

```bash
cd /Users/duhongtao/Documents/股票推荐/quant-stock-platform
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

如果需要本地数据库：

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 2. GitHub 上传步骤

1. 确认 `.env` 没有提交
2. 确认 `dev.db` 没有提交
3. 执行：

```bash
git status
git add quant-stock-platform
git commit -m "v5: prepare deployment-safe mock fallback version"
```

4. 再推送到你的 GitHub 仓库：

```bash
git push origin <your-branch>
```

## 3. Vercel 导入项目步骤

1. 打开 [Vercel](https://vercel.com/)
2. 点击 `Add New Project`
3. 选择 GitHub 仓库
4. 选择子目录或直接选择当前项目所在仓库
5. Framework 选择 `Next.js`
6. Build Command 默认读取 `package.json` 即可

## 4. Vercel 环境变量

推荐只设置：

```env
DATA_PROVIDER=mock
```

### DATABASE_URL

当前阶段：

- 可以先不设置
- 不建议在线上继续使用本地 SQLite `dev.db`
- 生产环境没有数据库时，系统会自动 fallback 到 mock

### 不要在线上设置

```env
DATA_PROVIDER=akshare
```

原因：

- AkShare 依赖本地 Python
- Vercel Serverless 不适合直接跑本地 Python + AkShare 刷数链路

如果误设为 `akshare`，系统会自动降级为 `mock`。

## 5. 线上访问方式

Vercel 部署完成后会得到一个地址，例如：

```text
https://your-project-name.vercel.app
```

你可以直接访问：

- `/`
- `/market`
- `/sectors`
- `/stocks`
- `/report`
- `/journal`
- `/settings`

## 6. 手机访问方式

部署完成后，直接在手机浏览器打开你的 Vercel 地址即可。

例如：

```text
https://your-project-name.vercel.app/market
```

## 7. 常见错误

### build 失败

先本地执行：

```bash
npm run lint
npm run build
```

### DATABASE_URL 错误

当前阶段如果线上没有数据库，系统应该自动 fallback 到 mock。

### Prisma Client 未生成

本地先执行：

```bash
npm run prisma:generate
```

### AkShare 不能在线上运行

这是当前阶段的设计结果，不是 bug。线上版本先只跑 mock provider。

## 8. 下一阶段数据库迁移建议

下一阶段建议从 SQLite 迁移到真正的线上数据库，例如：

- Supabase Postgres
- Neon Postgres
- Railway Postgres

迁移方向：

1. 把 Prisma datasource 改为 Postgres
2. 把 Vercel 环境变量中的 `DATABASE_URL` 指向线上数据库
3. 保留当前 mock fallback 作为降级兜底

## 9. 风险提示

本系统仅用于投资研究、量化分析和交易复盘，不构成任何投资建议。股市有风险，交易需谨慎。所有买卖决策由用户自行承担。
