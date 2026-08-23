# open-commerce-station

The open-source source tree for building a real Independent Station. This project publishes source only.

## Language

**Foundation**:
The source in this repository. Features are complete enough to sell; Catalog and Storefront content start empty. After someone deploys it, the Merchant configures it in the Merchant Portal and goes to production without writing application code. This project does not host stores, sell tenancy, or deliver a turnkey site as a service.
_Avoid_: SaaS, 交钥匙交付, 半成品框架, 空白模板 (that phrase means empty content, not a missing product)

**Independent Station**:
One branded Storefront the Merchant owns and operates. One deploy is exactly one flavor: China Station or Global Station. Not a stall on a marketplace, not a mini-program mall, and not a multi-store platform.
_Avoid_: 商城平台, 多商户市场, 小程序商城, 多店后台

**China Station**:
The Independent Station flavor for selling in Mainland China. The Merchant deploys this flavor when they sell domestically. First payment is Alipay. WeChat Pay is later, same checkout socket. The Portal shows WeChat greyed as coming later.
_Avoid_: 国内商城, store-cn (that's a directory name)

**Global Station**:
The Independent Station flavor for selling outside Mainland China. The Merchant deploys this flavor when they sell overseas. Payments are PayPal and Stripe. The owner picks languages and currencies; software UI ships Chinese and English. Default English and USD.
_Avoid_: 出海商城, 跨境平台, store-global (that's a directory name)

**Merchant**:
The person or organization that owns the Independent Station and operates it from the Merchant Portal. They do not write application code. Someone else may deploy the Foundation for them.
_Avoid_: 卖家, 店主, 管理员, operator, developer

**Merchant Portal**:
The signed-in back office where the Merchant edits Store identity, content, Catalog, payments, orders, and the Inbox. The first version is one owner login. Extra staff logins wait.
_Avoid_: Admin, Dashboard, CMS, 后台, 建站器, 店员权限

**Store identity**:
The shop's public name: store name, logo, tab icon, footer line. China Station may also show filing numbers the owner typed. One settings page drives header, checkout, mail, and footer.
_Avoid_: 品牌中台, 多套 logo

**Theme**:
The Storefront look. The first ship is one default blank store. The Merchant changes content, images, and Catalog; they do not draw new page layouts. A theme shop waits.
_Avoid_: 装修, 页面搭建, 主题市场

**Catalog**:
The Merchant's sellable Products, images, and related content. A new station's Catalog is empty. Groups (categories) are empty too; the owner creates them. The Storefront still has an all-products list.
_Avoid_: 商品库, inventory (until stock is a real concept), 行业分类模板

**Sell Price**:
What the Shopper pays for that buyable combination. The owner sets it on the product. An optional original price may show crossed out. Checkout does not add tax on top in the first version.
_Avoid_: 促销价引擎, 税务引擎

**Discount Code**:
A string the Shopper types at checkout, set by the owner. For a person or a campaign. Comes off Sell Price; one code per checkout. Not 拼团 or 砍价.
_Avoid_: 营销中心

**Product**:
One listing on the Storefront: name, story, photos. Physical goods that must be shipped. The Merchant does not get a clothing-only or electronics-only product type baked in.
_Avoid_: 货品, 虚拟商品

**Option**:
A choice the Merchant names themselves, such as color or size or capacity. The Foundation does not hardcode those names.
_Avoid_: 属性, 行业模板

**Variant**:
One buyable combination of those choices, with its own price and stock. A product with no choices still has exactly one Variant. Stock 0 cannot be added to cart or paid. Backorder waits.
_Avoid_: SKU as the product name, 规格矩阵, 缺货预订

**Group**:
An owner-created, optionally nested way to organize the Catalog. A Product may belong to any number of Groups; deleting a Group never deletes its Products.
_Avoid_: preset taxonomy, industry category tree, 分类模板

**Cart**:
A Shopper's pending Variant quantities before Checkout. It is not a price or stock source of truth; the server revalidates both when the Cart changes and again at Checkout.
_Avoid_: Order draft, trusted client total

**Storefront**:
The public branded site Shoppers browse and buy from.
_Avoid_: 商城前台, 官网, 装修页

**Shopper**:
A person who browses the Storefront and may place orders.
_Avoid_: 用户, 买家, customer, 会员

**Shopper Account**:
The signed-in identity required to check out. Browsing does not require it. First version: email and password. SMS and Google-style one-tap wait. Not a loyalty club.
_Avoid_: 会员, 积分, guest checkout, OAuth in v1

**Shipping Rate**:
A delivery price the Merchant configures (by region, weight, or free-over-amount). Checkout cannot finish a physical order without one. This is not a carrier booking API.
_Avoid_: 运费模板 (implementation name), 快递接口, 电子面单

**Fulfillment**:
After payment, the Merchant marks the order shipped and records a tracking number. The Shopper sees that tracking on order status.
_Avoid_: 仓储, 3PL, 打单

**Primary language**:
The store’s main language. Merchant content is written here first. Other languages the owner turns on fall back here when empty.
_Avoid_: locale as the product name

**Accounting currency**:
The one currency the Portal uses to count money. Extra currencies the owner turns on use typed rates in the first version.
_Avoid_: 汇率中台, Shopify Markets

**Notice Mail**:
System email only, in the first version: Shopper paid, Shopper shipped (with tracking), owner got a new order. The owner fills the send-from mailbox. Not SMS. Not marketing blasts. Not the Inbox.
_Avoid_: 短信通道, 邮件营销, 发卡邮件 as the product

**Storefront Contact**:
An on-site chat widget on the Storefront. The Shopper talks without leaving the site. The Merchant turns it on in the Portal; they do not paste theme code. WeChat / WhatsApp launchers are not the Storefront door.
_Avoid_: 在线客服脚本, 美洽, Intercom, 微信悬浮窗, wa.me

**Inbox**:
The Merchant Portal surface where staff reply to Shopper conversations (on-site chat and email at least). It is part of the station, not a second product the Merchant must host.
_Avoid_: helpdesk, Zendesk, Chatwoot (those are references, not the product name)

**Order-aware Support**:
Inbox actions that see the Shopper's order, tracking, and refund. This belongs in the product. It may ship after Storefront Contact and Inbox.
_Avoid_: Gorgias, 工单系统

**Return Request**:
The Shopper asks to cancel or send goods back. Money does not move until the Merchant agrees. Unshipped orders can refund after agree; delivered orders wait until the Merchant has the goods back (or agrees otherwise).
_Avoid_: 仅退款 as a platform-forced rule, chargeback

**AI Support**:
An optional helper in the same on-site chat. It reads the store's handbook (policies, FAQ, pages) and, when the Shopper is signed in, the order being discussed. Staff can take over that same conversation. It must not approve refunds or send money.
_Avoid_: 机器人客服 as a separate product, autopilot refunds, stuffing the whole catalog into one prompt

**Store Handbook**:
The lasting written answers already on the Storefront. Four reserved pages always exist: privacy, terms, returns, shipping. Checkout and the footer always link them. Empty body shows that the owner has not written them yet and does not block pay. AI Support looks these pages up. Not a second document center, and not the live order.
_Avoid_: 向量库 as the product name, 提示词大全, 上传知识库文件, 法律中心
