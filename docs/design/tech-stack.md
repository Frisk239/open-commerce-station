# 技术栈（第一版）

给实现和 `chanpin/` 用。产品形态仍以已拍板的说明为准。

## 选定

| 层 | 选择 | 备注 |
| --- | --- | --- |
| 语言 | TypeScript | 店面、后台、插件一条线 |
| 网页 | Next.js | 店面和 Merchant Portal 都是它 |
| 应用 | `store-cn` / `store-global` | 两套可分开部署，共用 packages |
| 包管理 | pnpm 单仓 | |
| 样式 | Tailwind | 外观跟原型，不跟组件市场 |
| 登录 | Auth.js，邮箱密码 | OAuth 以后 |
| 数据库 | PostgreSQL | 订单商品的准绳 |
| 读写库 | Prisma | |
| 缓存/会话/以后排队 | Redis | 不把订单只放这里 |
| 图 | 商家磁盘 | Docker 挂盘；不上 MinIO |
| 信 | 老板 SMTP + Nodemailer | 三封通知 |
| 开发环境 | Docker 跑 Postgres 和 Redis | 本机已有 Docker |

收款插件仍是：国内支付宝（微信灰着）、出海 PayPal 和 Stripe。差异在 `packages/plugins`，不进核心。

## 开发时容器里有什么

- PostgreSQL  
- Redis  
- 网站进程在本机或再放一个容器均可  

图目录挂盘。没有 MinIO。

## 明确第一版不做

换数据库、MinIO、云对象存储、短信、托管邮件商、第二套后台框架。

## 下一步

`chanpin/` 做可点原型，屏幕按产品文档走，技术上按本栈（Next.js + Tailwind），验收后再按原型写真正的店。
