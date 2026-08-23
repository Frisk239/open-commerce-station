# 支付凭据交接与使用指南

> 本文只说明变量契约、使用边界和验证结果；不记录任何真实密钥、账号、密码、订单号、签名或支付链接。

## 适用范围

本仓库当前只准备三套测试环境凭据：PayPal Sandbox、Stripe Test Mode 和支付宝沙箱。它们用于后续集成与自动化验证，不能用于生产收款。

真实值仅存在于仓库根目录的 `.env.local`。提交的 `.env.example` 是唯一公开的变量契约，所有新环境都应从它创建自己的本地 `.env.local`。

## 安全规则

1. 不要提交、复制或在日志、截图、Issue、PR 描述和源码中粘贴 `.env.local` 的内容。
2. 服务端专用密钥只能在服务端或受控的本地测试环境使用；尤其不要把 `PAYPAL_CLIENT_SECRET`、`STRIPE_SECRET_KEY`、`ALIPAY_APP_PRIVATE_KEY` 或任何测试账号密码交给客户端。
3. 保持支付宝应用私钥在 `.env.local` 中的单行格式，不要改写进源码或文档；签名库需要何种转换，应由后续实现的适配层在内存中处理。
4. 需要轮换时，先在对应平台生成或重置测试凭据，再只更新本地 `.env.local`，随后重新执行本文的验证清单。

## 变量分组

| 平台 | 变量 | 用途 |
| --- | --- | --- |
| PayPal Sandbox | `PAYPAL_ENVIRONMENT`、`PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET` | 在 Sandbox API 上取得服务端访问令牌并调用支付接口。 |
| PayPal Sandbox | `PAYPAL_SANDBOX_BUSINESS_EMAIL`、`PAYPAL_SANDBOX_BUSINESS_PASSWORD` | 沙箱商家（收款方）网页登录和收款测试。 |
| PayPal Sandbox | `PAYPAL_SANDBOX_PERSONAL_EMAIL`、`PAYPAL_SANDBOX_PERSONAL_PASSWORD` | 沙箱个人买家（付款方）登录和付款测试。 |
| Stripe Test Mode | `STRIPE_MODE`、`STRIPE_PUBLISHABLE_KEY`、`STRIPE_SECRET_KEY` | 测试模式的客户端公开密钥与服务端 API 密钥。 |
| 支付宝沙箱 | `ALIPAY_ENVIRONMENT`、`ALIPAY_APP_ID`、`ALIPAY_GATEWAY_URL` | 选择支付宝沙箱应用与网关。 |
| 支付宝沙箱 | `ALIPAY_APP_PRIVATE_KEY`、`ALIPAY_APP_PUBLIC_KEY`、`ALIPAY_PUBLIC_KEY` | 请求 RSA2 签名、应用公钥登记核对和支付宝响应/回调验签。 |
| 支付宝沙箱 | `ALIPAY_SANDBOX_MERCHANT_ACCOUNT`、`ALIPAY_SANDBOX_MERCHANT_LOGIN_PASSWORD`、`ALIPAY_SANDBOX_MERCHANT_PID` | 沙箱商家（收款方）账号与身份标识。 |
| 支付宝沙箱 | `ALIPAY_SANDBOX_BUYER_ACCOUNT`、`ALIPAY_SANDBOX_BUYER_LOGIN_PASSWORD`、`ALIPAY_SANDBOX_BUYER_PAYMENT_PASSWORD`、`ALIPAY_SANDBOX_BUYER_UID` | 沙箱买家（付款方）登录、支付与身份标识。 |

## 后续接手时的使用方式

### 通用启动清单

1. 确认根目录存在本地 `.env.local`；若没有，复制 `.env.example` 后由凭据持有人填入真实本地值。
2. 读取变量时只从运行时环境注入，不把值硬编码到任何应用、共享核心、配置样例或插件说明中。
3. 使用对应的 `*_ENVIRONMENT` 或 `*_MODE` 明确选择 Sandbox/Test；上线前必须另行创建生产环境变量，不能把本地文件直接提升到生产。
4. 集成完成后按“验证状态”做一次最小闭环测试，并取消或清理只为验证创建的测试对象。

### PayPal Sandbox

1. 使用 `PAYPAL_CLIENT_ID` 与 `PAYPAL_CLIENT_SECRET` 在 PayPal Sandbox 获取服务端访问令牌。
2. 后续支付 API 继续使用 Sandbox 端点，不要混用生产域名或生产账户。
3. 收款场景使用 Business 测试账号；付款确认使用 Personal 测试账号。
4. 测试完成后只记录无敏感的状态、HTTP 结果和测试日期，不记录令牌、订单标识或账号信息。

### Stripe Test Mode

1. 只在 `STRIPE_MODE=test` 时使用本地测试密钥。
2. `STRIPE_SECRET_KEY` 只可在服务器侧调用 Stripe API；`STRIPE_PUBLISHABLE_KEY` 才是可交给受信任客户端配置的公开键。
3. 使用 Stripe 推荐的 PaymentIntent 流程完成测试；不要为了兼容旧样例而依赖已被账户集成设置限制的原始 Token 创建接口。
4. 为验证创建的测试 PaymentIntent 应在不需要时取消或清理。

### 支付宝沙箱

1. 所有应用请求使用 `ALIPAY_APP_PRIVATE_KEY` 以 RSA2 签名，并带上 `ALIPAY_APP_ID`。
2. 所有支付宝同步响应和异步通知都要用 `ALIPAY_PUBLIC_KEY` 验签；应用公钥不能替代支付宝公钥。
3. 请求只发送到 `ALIPAY_GATEWAY_URL` 指向的沙箱网关。商家账号是收款方，买家账号及其支付密码只用于沙箱付款确认。
4. 沙箱支付金额和结果均为虚拟测试数据，不会从现实银行卡或真实余额扣款；仍应避免用真实用户信息或生产订单标识进行测试。

## 凭据验证状态（2026-08-23）

| 平台 | 已完成的验证 | 结果 |
| --- | --- | --- |
| PayPal Sandbox | 使用应用 Client ID/Secret 获取 OAuth 访问令牌 | 通过（HTTP 200） |
| PayPal Sandbox | Business 商家与 Personal 买家测试账号网页登录 | 通过 |
| Stripe Test Mode | 使用 Secret Key 读取测试账户余额 | 通过（HTTP 200） |
| Stripe Test Mode | 创建仅测试用途的 PaymentIntent、用 Publishable Key 读取其 client secret、随后取消 | 通过（均为 HTTP 200） |
| Stripe Test Mode | 旧版原始 Token 创建接口 | 未作为失败处理：该账户的集成设置限制了该旧接口；后续应使用 PaymentIntent 流程。 |
| 支付宝沙箱 | 以应用私钥签名 `alipay.trade.query`，并以支付宝公钥验证响应签名 | 通过（预期得到“测试订单不存在”的业务响应） |
| 支付宝沙箱 | 商家收款、买家付款的完整虚拟支付链路 | 通过：0.01 元沙箱支付返回成功，未发生真实扣款。 |
| 支付宝沙箱 | 商家网页账密登录 | 账号和密码已触发官方验证码校验；因浏览器对登录后的目标回跳有限制，未把网页最终回跳单列为通过项。交易收款链路已验证可用。 |

## 交接后的复验清单

- [ ] `.env.local` 存在且仍被 Git 忽略。
- [ ] `.env.example` 与 `.env.local` 的变量名一致，样例中没有真实值。
- [ ] PayPal 能取得 Sandbox 访问令牌，并使用 Business/Personal 测试账号完成收付款角色验证。
- [ ] Stripe 的 Secret Key 与 Publishable Key 均在 Test Mode 的 PaymentIntent 最小流程中可用，测试对象已取消或清理。
- [ ] 支付宝请求签名和响应验签均通过；商家与买家账号能完成最小沙箱付款闭环。
- [ ] 新增任何凭据文件前，先将其命名为本地文件并确认其命中 `.gitignore`。

## Git 忽略保护

以下规则已经在根目录 `.gitignore` 中启用：

- `.env.local`
- `.env.*.local`
- `*.local.*`
- `credentials.local.*`
- `config/credentials.local.*`

`reference/` 下的本地参考项目也会被忽略（保留 `reference/README.md`）。这与凭据隔离无关，但可避免把大型参考仓库误提交到本项目。
