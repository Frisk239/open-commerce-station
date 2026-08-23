# open-commerce-station 产品需求文档（Foundation v1）

**状态：** Ready for agent  
**产品边界：** 中国站 / 全球站，一次部署仅选择一种 Independent Station 口味  
**交付形态：** 开源、源码交付的 Foundation，不提供托管 SaaS 或代运营  
**需求基线：** 已接受的产品与架构决定优先；可交互原型作为页面、交互与验收路径参考

## Problem Statement

希望经营自有品牌独立站的 Merchant，通常需要在“从零开发”和“把生意交给托管平台”之间做取舍。前者需要持续写代码才能完成上架、收款、履约、售后和客服，后者则让 Merchant 依赖平台的账号、租户模型与产品边界。这个项目的目标是提供第三条路：交付一套 Merchant 自己部署、自己拥有、功能完整到可以卖货的开源 Foundation。

当前仓库已经形成清晰的领域语言、33 项已接受决定、四份专题设计和一套可交互原型，但正式应用和共享模块仍主要是边界占位。若直接按页面逐个实现，容易出现以下问题：

- 中国站与全球站被错误做成同一 Merchant Portal 中的店铺切换器，背离“一次部署一种口味”。
- Catalog、Order、Shopper、Inventory 等共享规则在两个应用中重复，支付和地区差异又反向污染共享核心。
- 原型中的假支付、内存状态和简化状态字段被误当成生产语义，导致回调重复下单、库存超卖、退款状态混乱或数据在重启后丢失。
- Store identity、四篇说明、语言货币、Notice Mail、客服与订单各自保存一份相似数据，Merchant 改一次却不能全站生效。
- 功能清单不断吸收主题市场、员工权限、税务、微信支付、营销等非首版能力，使“部署 → 配置 → 卖出第一单”的核心闭环迟迟无法完成。

因此需要一份以 Merchant 和 Shopper 的可观察结果为中心、同时明确模块边界、状态语义、验收接缝与首版范围的 PRD，作为正式实现的单一产品基线。

## Solution

交付一套源码形式的 Independent Station Foundation。采用者部署时选择中国站或全球站；每个部署拥有一个 Storefront 和一个 Merchant Portal，共享中立的 Commerce Core，但通过配置与插件组合各自的地区、支付和展示行为。

Merchant 无需修改应用代码，即可在 Merchant Portal 完成 Store identity、Catalog、分类、价格与库存、Discount Code、Shipping Rate、说明页、支付、Notice Mail 和 Storefront Contact 的配置，并处理订单、Fulfillment、Return Request 与 Inbox。Shopper 可以公开浏览，使用邮箱密码建立 Shopper Account，在库存与运费均有效时完成支付，随后查询订单、运单与售后状态。

Foundation v1 的发布标准是完成下面的真实闭环，而不只是还原原型屏幕：

1. 新部署以一套完整但 Catalog 为空的默认 Theme 启动，Merchant 无需写代码即可配置成可销售 Storefront。
2. 中国站可用支付宝收款，并保留不可启用的微信支付入口；全球站可用 PayPal 和 Stripe 收款。
3. 支付、库存扣减、Order 创建和通知均由服务端处理，能抵抗重复请求与重复回调。
4. Merchant 能从新订单一路完成 Fulfillment、Return Request 决策和退款结果记录；Shopper 能看到一致状态。
5. Storefront Contact 与 Merchant Portal Inbox 在 v1 内可用；真实 AI Support、自动订单上下文和 Inbox 内退款动作保留明确接口，但不是首版发布阻塞项。
6. 中国站和全球站在桌面与手机上都能完成主路径，并保持品牌 Storefront 与安静经营工具的视觉分工。

产品成功不以页面数量衡量，而以以下结果衡量：一名 Merchant 能从空白部署开始，在不改应用代码的前提下完成店铺配置、上架、收款、发货和售后；一名 Shopper 能从浏览走到支付成功并持续查询自己的订单；两个口味共享一致的 Commerce 规则，同时不会泄漏彼此的地区和支付实现。

## User Stories

### Foundation 与首次经营

1. 作为 Merchant，我希望获得完整源码并部署到自己控制的环境，以便拥有自己的 Independent Station，而不是依赖托管租户。

2. 作为 Merchant，我希望每次部署只呈现中国站或全球站其中一种口味，以便经营时不会面对无关市场的设置和流程。

3. 作为 Merchant，我希望部署完成后得到功能完整但 Catalog 为空的 Storefront，以便从自己的内容开始，而不是清理行业示例数据。

4. 作为 Merchant，我希望空白 Storefront 仍显示 Store identity、页脚、导航和友好的待上架文案，以便新店看起来是尚未开售的品牌站，而不是系统报错页。

5. 作为 Merchant，我希望首次进入 Merchant Portal 就能看到阻塞开售的待办，以便优先完成 Store identity、支付、Shipping Rate、说明页和首个 Product。

6. 作为 Merchant，我希望日常经营所需设置都能在 Merchant Portal 完成，以便上线不依赖修改源码。

7. 作为 Merchant，我希望 Merchant Portal 首版只有一个 owner 登录，以便先用最小权限模型安全经营。

8. 作为 Merchant，我希望中国站和全球站沿用一致的 Catalog、Order 与经营语言，以便理解和维护同一套产品心智模型。

### Store identity、Theme 与 Store Handbook

9. 作为 Merchant，我希望在一个设置页填写店名，以便 Storefront、Checkout、Notice Mail 和浏览器标题使用同一身份。

10. 作为 Merchant，我希望上传一次店铺标志，以便 Storefront 页眉、Checkout 页眉和 Notice Mail 信头同步更新。

11. 作为 Merchant，我希望未上传标志时自动回退显示店名，以便任何阶段都不会出现破损品牌位。

12. 作为 Merchant，我希望上传标签页小图标，并在缺失时获得可靠回退，以便浏览器标签仍可识别这家店。

13. 作为 Merchant，我希望填写顾客可见联系邮箱和页脚一行字，以便 Shopper 能识别并联系店铺。

14. 作为中国站 Merchant，我希望选填 ICP 与公安备案信息，以便满足自己的备案展示需要。

15. 作为中国站 Shopper，我希望备案号能够跳转到官方查询入口，以便核验站点主体。

16. 作为全球站 Merchant，我希望设置中不出现中国备案字段，以便地区差异清晰且不制造困惑。

17. 作为 Merchant，我希望使用一套完成度高的默认 Theme 编辑内容和图片，以便快速开店而无需搭建页面布局。

18. 作为 Merchant，我希望系统预留隐私、服务条款、退货说明和运费说明四篇固定页面，以便形成 Store Handbook 的基础。

19. 作为 Merchant，我希望按已启用语言分别编辑四篇说明，以便不同语言的 Shopper 阅读对应内容。

20. 作为 Shopper，我希望 Checkout 和 Storefront 页脚始终能打开四篇说明，以便支付前了解关键规则。

21. 作为 Shopper，我希望说明正文为空时看到“店主尚未填写”的明确提示，以便知道这是未完成内容而不是加载失败。

22. 作为 Merchant，我希望空说明页不会阻止收款，但 Merchant Portal 会持续提醒，以便先打通交易又不会遗忘信任内容。

### Catalog、Product、Option、Variant 与分类

23. 作为 Merchant，我希望创建、编辑、上下架和删除 Product，以便维护自己的 Catalog。

24. 作为 Merchant，我希望为 Product 填写名称、故事和多张真实图片，以便 Storefront 能用品牌方式介绍商品。

25. 作为 Merchant，我希望从自己磁盘上传并管理 Product 图片，以便首版不依赖对象存储服务。

26. 作为 Merchant，我希望按主语言先填写 Product，再为已启用的其他语言补译文，以便内容生产有清晰主次。

27. 作为 Merchant，我希望自己命名 Option，例如颜色、尺寸或容量，以便 Foundation 不锁定任何行业模板。

28. 作为 Merchant，我希望为每个 Option 添加、编辑和删除可选值，以便准确表达商品的购买选择。

29. 作为 Merchant，我希望系统根据 Option 组合形成 Variant，以便每个可买组合拥有独立经营数据。

30. 作为 Merchant，我希望没有 Option 的 Product 仍自动拥有一个 Variant，以便所有 Product 共享一致购买模型。

31. 作为 Merchant，我希望为每个 Variant 设置 Sell Price，以便 Shopper 支付正确价格。

32. 作为 Merchant，我希望为每个 Variant 选填 original price，以便 Storefront 在适当时显示划线参考价。

33. 作为 Merchant，我希望为每个 Variant 设置库存，以便控制具体组合是否可买。

34. 作为 Merchant，我希望为可发货的 Variant 记录计费重量，以便按重量匹配 Shipping Rate。

35. 作为 Merchant，我希望看到库存为零或低库存的 Variant，以便及时补货。

36. 作为 Shopper，我希望切换 Option 后立即看到对应 Variant 的价格、original price 和库存状态，以便做出购买选择。

37. 作为 Shopper，我希望库存为零的 Variant 明确显示售罄且无法加入购物车，以便不会为不可交付商品付款。

38. 作为 Merchant，我希望创建、编辑、排序和删除分类，以便按自己的业务组织 Catalog。

39. 作为 Merchant，我希望分类可以有父子层级，以便表达简单的嵌套商品分组。

40. 作为 Merchant，我希望把一个 Product 放入零个、一个或多个分类，以便灵活组织 Storefront。

41. 作为 Merchant，我希望删除分类不会删除 Product，以便重组导航时不破坏 Catalog。

42. 作为 Shopper，我希望始终有“全部商品”入口，以便 Merchant 尚未建立分类时仍能浏览已上架 Product。

43. 作为 Shopper，我希望按分类和搜索词筛选已上架 Product，以便更快找到目标商品。

44. 作为 Shopper，我希望看不到未上架 Product，以便 Storefront 只展示 Merchant 当前在售内容。

### 价格、Discount Code 与购物车

45. 作为 Merchant，我希望创建按比例减免的 Discount Code，以便为活动或特定 Shopper 提供优惠。

46. 作为 Merchant，我希望创建按固定金额减免的 Discount Code，以便支持明确金额的优惠。

47. 作为 Merchant，我希望启用、停用、编辑和删除 Discount Code，以便控制优惠生命周期。

48. 作为 Merchant，我希望 Discount Code 从 Sell Price 小计中扣减，而不是从 original price 扣减，以便计算口径一致。

49. 作为 Shopper，我希望每次 Checkout 只能使用一个有效 Discount Code，以便订单金额简单透明。

50. 作为 Shopper，我希望无效或已停用的 Discount Code 返回清晰反馈，以便能改正输入而不是误以为已优惠。

51. 作为 Shopper，我希望把一个有库存的 Variant 加入购物车，以便稍后统一结算。

52. 作为 Shopper，我希望购物车按 Variant 区分行项目，以便相同 Product 的不同组合不会混在一起。

53. 作为 Shopper，我希望修改购物车数量时不超过实时可售库存，以便避免无效数量。

54. 作为 Shopper，我希望删除购物车行或清空购物车，以便随时调整购买决定。

55. 作为 Shopper，我希望购物车显示 Product、Variant 选择、单价、数量和行小计，以便核对购买内容。

56. 作为 Shopper，我希望商品下架、删除或库存变化后，购物车在 Checkout 前得到重新校验，以便不支付已失效内容。

### Shopper Account 与身份

57. 作为匿名 Shopper，我希望无需登录即可浏览 Storefront、Product 和说明页，以便低摩擦了解商品。

58. 作为匿名 Shopper，我希望从购物车前往 Checkout 时被要求登录或注册，以便 Order 能归属到 Shopper Account。

59. 作为 Shopper，我希望使用邮箱和密码注册 Shopper Account，以便在中国站和全球站都使用统一、可实现的首版身份方式。

60. 作为 Shopper，我希望使用邮箱和密码登录，以便查看自己的地址和订单。

61. 作为 Shopper，我希望登录后回到原本要访问的 Checkout 或订单页面，以便流程不中断。

62. 作为 Shopper，我希望通过 Notice Mail 发起密码重置，以便忘记密码时恢复访问。

63. 作为 Shopper，我希望只能访问属于自己的 Order，以便订单、地址和运单信息不会泄露给其他账号。

64. 作为 Merchant，我希望 owner 登录与 Shopper Account 明确隔离，以便前台账号不能进入 Merchant Portal。

### Shipping Rate 与 Checkout

65. 作为 Merchant，我希望创建、编辑、启用和删除 Shipping Rate，以便为实物商品配置可用配送方式。

66. 作为 Merchant，我希望 Shipping Rate 可以按配送地区匹配，以便向不同目的地提供正确价格。

67. 作为 Merchant，我希望 Shipping Rate 可以按购物车总重量匹配，以便重货与轻货使用不同价格。

68. 作为 Merchant，我希望 Shipping Rate 可以设置满额包邮阈值，以便按订单金额提供免邮。

69. 作为中国站 Shopper，我希望地址按中国省、市、区及详细地址收集，以便 Merchant 能正确发货。

70. 作为全球站 Shopper，我希望地址支持国家、州/地区、城市、邮编和详细地址，以便国际配送信息完整。

71. 作为 Shopper，我希望 Checkout 只展示与地址、重量和金额匹配的 Shipping Rate，以便不会选到不可用配送。

72. 作为 Shopper，我希望没有可用 Shipping Rate 时不能支付，并得到如何处理的明确提示，以便不会生成无法履约的 Order。

73. 作为 Shopper，我希望 Checkout 汇总商品小计、Discount Code、Shipping Rate 和总计，以便知道最终支付构成。

74. 作为 Shopper，我希望 Checkout 不额外增加税行，以便首版遵循“标价即实付”。

75. 作为 Shopper，我希望支付前再次看到四篇说明的链接，以便在最终确认前检查规则。

76. 作为 Shopper，我希望在手机上顺畅完成地址、Shipping Rate、优惠与支付，以便不依赖桌面设备。

### 支付与 Order 创建

77. 作为中国站 Merchant，我希望启用并配置支付宝，以便在中国站收款。

78. 作为中国站 Shopper，我希望在 Checkout 选择支付宝并完成适合当前设备的网页支付流程，以便支付 Order。

79. 作为中国站 Merchant，我希望在支付设置中看到微信支付的保留位置但不能启用，以便未来扩展不会误导当前经营。

80. 作为中国站 Shopper，我希望微信支付显示“稍后开放”且不可点击，以便不会进入未实现流程。

81. 作为全球站 Merchant，我希望分别启用或停用 PayPal 和 Stripe，以便选择自己的收款方式。

82. 作为全球站 Shopper，我希望只看到 Merchant 已启用的全球支付方式，以便 Checkout 与实际配置一致。

83. 作为全球站 Shopper，我希望通过 PayPal 支付，以便使用 PayPal 账户完成购买。

84. 作为全球站 Shopper，我希望通过 Stripe 支持的 PaymentIntent 流程支付，以便安全完成卡支付及所需验证。

85. 作为 Merchant，我希望支付凭据只保存在服务端环境中，以便密钥不会进入浏览器、日志或仓库。

86. 作为 Merchant，我希望系统验证支付提供方的回调或通知，以便只有可信结果能改变 Order 状态。

87. 作为 Merchant，我希望重复支付回调不会重复创建 Order、重复扣库存或重复发 Notice Mail，以便外部重试保持安全。

88. 作为 Shopper，我希望支付结果不确定时看到可恢复状态，而不是被错误告知成功或要求盲目重付，以便避免重复扣款。

89. 作为 Shopper，我希望支付成功后的 Order 保存当时的商品名、Variant、价格、币种、折扣、运费和地址快照，以便以后 Catalog 变化不会改写历史。

90. 作为 Merchant，我希望支付成功与库存扣减在同一受控业务流程内只执行一次，以便防止超卖和账实不符。

91. 作为 Shopper，我希望支付成功后立即看到 Order 编号与成功页，以便确认购买已经成立。

92. 作为 Shopper，我希望支付成功后购物车被清空，以便不会重复提交同一批商品。

### Order、Fulfillment 与 Notice Mail

93. 作为 Merchant，我希望 Merchant Portal 首页显示待发货 Order、待处理 Return Request 和未读会话数量，以便快速处理今日工作。

94. 作为 Merchant，我希望按时间查看 Order 列表及支付、Fulfillment 和 Return Request 状态，以便掌握经营进度。

95. 作为 Merchant，我希望打开 Order 查看行项目、金额构成、地址、支付方式和 Shopper 信息，以便核对订单。

96. 作为 Merchant，我希望对已支付且未退款的 Order 填写运单号并标记已发货，以便完成首版 Fulfillment。

97. 作为 Merchant，我希望未填写运单号时不能标记发货，以便 Shopper 不会收到无跟踪信息的发货状态。

98. 作为 Shopper，我希望在 Shopper Account 中查看自己的 Order 列表，以便持续了解购买记录。

99. 作为 Shopper，我希望查看 Order 详情、状态和运单号，以便自行查询配送进度。

100. 作为 Shopper，我希望支付成功后收到 Notice Mail，以便在离开 Storefront 后仍有购买凭据。

101. 作为 Merchant，我希望新 Order 成立后收到 Notice Mail，以便及时开始处理。

102. 作为 Shopper，我希望 Order 标记发货后收到带运单号的 Notice Mail，以便跟踪包裹。

103. 作为 Merchant，我希望在一个发信设置页配置 owner SMTP 和发件信息，以便 Foundation 不依赖项目方托管邮件服务。

104. 作为 Merchant，我希望发送失败被记录并可重试，以便临时 SMTP 故障不会让通知永久丢失。

105. 作为 Merchant，我希望 Notice Mail 使用最新 Store identity，但 Order 内容使用下单快照，以便品牌一致且历史准确。

### Return Request 与退款

106. 作为 Shopper，我希望从自己的 Order 详情提交 Return Request 和原因，以便发起取消或退货。

107. 作为 Shopper，我希望提交 Return Request 不会自动退款，以便 Merchant 可以先核验情况。

108. 作为 Merchant，我希望在 Merchant Portal 看到待处理 Return Request 队列，以便集中同意或拒绝。

109. 作为 Merchant，我希望查看 Return Request 原因和相关 Order，以便做出有上下文的决定。

110. 作为 Merchant，我希望拒绝 Return Request 时记录说明，以便 Shopper 知道结果。

111. 作为 Shopper，我希望看到 Return Request 已提交、被拒绝、等待寄回或已退款等明确状态，以便知道下一步。

112. 作为 Merchant，我希望对未发货 Order 同意 Return Request 后发起原支付路径退款，以便无需寄回不存在的包裹。

113. 作为 Merchant，我希望对已发货 Order 同意 Return Request 后先进入等待寄回，而不是立即退款，以便先收回商品。

114. 作为 Merchant，我希望确认收到退货后再发起原支付路径退款，以便资金动作符合售后决定。

115. 作为 Merchant，我希望退款请求和支付提供方退款结果保持幂等，以便重试不会重复退钱。

116. 作为 Shopper，我希望退款成功后在 Order 中看到最终结果，以便无需反复联系客服确认。

### Storefront Contact 与 Inbox

117. 作为 Merchant，我希望从 Merchant Portal 打开或关闭 Storefront Contact，以便决定是否接受站内会话。

118. 作为 Shopper，我希望在 Storefront 内直接打开聊天窗，以便无需跳转微信、WhatsApp 或第三方站点。

119. 作为手机 Shopper，我希望聊天入口和聊天窗不遮挡商品购买条或支付按钮，以便客服与交易互不妨碍。

120. 作为匿名 Shopper，我希望能发起访客会话，以便购买前询问问题。

121. 作为 Merchant，我希望 Storefront Contact 的新消息进入 Merchant Portal Inbox，以便在同一经营界面回复。

122. 作为 Merchant，我希望 Inbox 显示会话列表、未读状态、最近消息和更新时间，以便判断处理顺序。

123. 作为 Merchant，我希望在 Inbox 中回复 Shopper，以便完成基础人工客服闭环。

124. 作为 Shopper，我希望在同一会话中收到 Merchant 的回复，以便对话保持连续。

125. 作为 Merchant，我希望未来的 AI Support 和外部渠道复用同一 Conversation 接口，以便扩展时不出现第三套客服产品。

### 语言与货币

126. 作为 Merchant，我希望选择 Storefront 主语言，并且主语言不能被删除，以便所有内容都有稳定回退。

127. 作为 Merchant，我希望启用中文或英文 Storefront 语言，以便服务目标 Shopper。

128. 作为 Merchant，我希望选择自己的 Merchant Portal 显示语言，以便不影响 Shopper 当前语言。

129. 作为 Shopper，我希望切换 Storefront 语言时软件按钮和固定文案同步变化，以便界面一致。

130. 作为 Shopper，我希望某项 Merchant 内容缺少当前语言译文时回退主语言，以便不出现空标题或空说明。

131. 作为 Merchant，我希望选择唯一的 accounting currency，以便 Merchant Portal 的金额统计有统一口径。

132. 作为 Merchant，我希望启用额外展示货币并手工填写相对 accounting currency 的汇率，以便首版不依赖实时汇率服务。

133. 作为 Shopper，我希望语言与货币可以分开切换，以便使用自己理解的语言和希望的支付货币。

134. 作为 Shopper，我希望价格、original price、Discount Code 和 Shipping Rate 使用同一结算币种展示，以便金额可核对。

135. 作为 Shopper，我希望支付通道不支持当前展示币种时看到明确回退到 accounting currency 的说明，以便确认真实扣款币种。

136. 作为 Merchant，我希望历史 Order 保留实际支付币种、汇率和金额快照，以便后续汇率变化不改写账目。

### 质量、安全与可运营性

137. 作为 Merchant，我希望 Catalog、Order、账号和配置保存在 PostgreSQL 中，以便服务重启后业务数据仍然可靠。

138. 作为 Merchant，我希望 Product 图片和店铺图片保存在可挂载、可备份的 Merchant 磁盘中，以便首版部署简单且数据归自己。

139. 作为 Merchant，我希望会话与缓存故障不会成为 Order 和 Catalog 的事实来源，以便 Redis 故障不导致核心数据丢失。

140. 作为 Merchant，我希望备份范围明确包含 PostgreSQL 与图片磁盘，以便能够恢复 Independent Station。

141. 作为 Shopper，我希望关键表单有可读错误、键盘焦点与无障碍标签，以便不同操作方式都能完成购买。

142. 作为 Shopper，我希望减少动态效果的系统偏好得到尊重，以便界面不会造成不适。

143. 作为 Shopper，我希望桌面和手机宽度都能完成浏览、登录、购物车、Checkout、支付结果和 Order 查询，以便设备不成为交易障碍。

144. 作为 Merchant，我希望桌面和常见平板宽度都能使用 Merchant Portal 的核心经营页，以便随时处理订单。

145. 作为 Merchant，我希望支付、退款、登录和设置变更具有不泄露密钥与密码的日志，以便排错同时保护凭据。

146. 作为 Merchant，我希望关键业务动作留下时间和结果记录，以便追踪支付、Fulfillment、Return Request、退款和 Notice Mail 状态。

## Implementation Decisions

1. **产品与部署边界。** 中国站与全球站是两个可独立部署的应用组合，不在运行时提供跨站切换。每个部署只拥有一个 Storefront、一个 Merchant Portal、一套数据和一个 owner。源码可以共享模块，但产品体验不能呈现为多店或多租户平台。

2. **应用组成。** Storefront 与 Merchant Portal 都使用 Next.js 和 TypeScript，并由 pnpm 单仓管理。Tailwind 负责样式实现，但视觉语言以已验收原型为准，不引入第二套后台框架或通用组件市场来替代产品设计。

3. **模块边界。** Commerce Core 拥有 provider-neutral 的 Catalog、Pricing、Inventory、Cart、Checkout、Order、Shopper Account、Return Request 和 Conversation 规则；应用配置负责选择站点口味、语言、货币和能力；插件负责支付提供方、Notice Mail 传输及以后可能的地区扩展。支付协议、地区地址与展示逻辑不得进入 Commerce Core。

4. **数据事实来源。** PostgreSQL 是 Store identity、Catalog、Shopper Account、Order、Return Request、Conversation 和配置的事实来源；Prisma 管理 schema、迁移与类型。Redis 只承担会话、缓存和可选任务队列，不能成为 Order 或 Catalog 的唯一存储。Product 图片与店铺图片保存在挂载的 Merchant 磁盘。

5. **账号与权限。** Auth.js 的邮箱密码凭据流同时服务 Shopper Account 和 owner 登录，但二者拥有分离的会话与授权检查。首版只有一个 owner；所有 Merchant Portal 写操作都必须在服务端验证 owner 身份。Shopper 对 Order、地址、Return Request 和 Conversation 的读取必须按已登录邮箱归属过滤。

6. **Store identity 单一来源。** 店名、标志、小图标、联系邮箱、页脚文字及中国备案字段由同一设置聚合管理。Storefront、Checkout、Notice Mail 与浏览器元数据读取同一份配置，并实现“标志缺失回退店名、页脚缺失回退版权行、备案缺失不渲染”的规则。

7. **Theme 与内容边界。** 首版只有一套默认 Theme。Merchant 可以编辑预设内容位、图片、Catalog 和说明页，不能拖拽任意页面结构。四篇说明是固定 Policy 实体，新部署即存在；空正文可公开访问且不阻塞 Checkout。

8. **Catalog 聚合。** Product 保存 listing 内容、图片、分类和 Option；Variant 是唯一可购买、可定价、可计库存的单元。无 Option Product 自动产生一个 Variant。每个 Variant 保存 Sell Price、可选 original price、库存和用于 Shipping Rate 匹配的重量。分类支持可选父分类，但分类删除只解除关联，不级联删除 Product。

9. **金额表达。** 所有持久化金额使用最小货币单位和明确 Currency Code，不用浮点数保存。Merchant Portal 以 accounting currency 记账；额外货币保存 Merchant 手填汇率。Checkout 对 Product、Discount Code 与 Shipping Rate 使用同一转换口径，并在 Order 中冻结实际支付币种、汇率和所有金额明细。

10. **Discount Code。** 首版只支持 active 状态、比例减免或固定金额减免，一个 Checkout 最多应用一个 Code。折扣基数是 Sell Price 小计；固定金额先按统一汇率转换到结算币种，并且减免不得超过商品小计。original price 不参与结算。

11. **Shipping Rate。** Shipping Rate 由名称、启用状态、适用地区、重量范围、价格和可选满额包邮阈值组成。Checkout 根据经过折扣后的商品金额、总重量和地址匹配可用 Rate；没有匹配 Rate 时阻止支付。首版只报价与记录，不连接承运商下单或面单 API。

12. **Checkout 服务。** Checkout 的服务器端入口负责验证会话、Variant active 状态、库存、地址、Shipping Rate、Discount Code、币种和支付方式，客户端汇总只用于展示。任何客户端提交的价格、折扣和总计都不作为事实来源。

13. **库存与并发。** 发起外部支付前，为本次 Checkout 创建可过期的库存保留和待支付记录；成功通知在数据库事务中确认一次 Order 并将保留转为正式扣减，失败或超时释放保留。相同 Checkout 和相同提供方事件必须幂等，避免最后一件商品被多次售出或重复扣减。

14. **Order 状态拆分。** 正式实现不沿用原型中把多个概念压进单一状态的做法。Order 分别记录 payment status、fulfillment status 和 return status；显示层再组合成人可读状态。Order Line、地址、Shipping Rate、Discount Code、币种和金额均保存下单快照。

15. **支付插件契约。** 支付插件至少提供创建支付、验证同步返回或异步通知、查询状态和退款的 provider-neutral 能力，并保存外部交易标识与幂等键。中国站组合支付宝插件并暴露禁用的微信支付能力位；全球站组合 PayPal 与 Stripe 插件。Stripe 使用 PaymentIntent，不使用旧式原始 Token 流程。

16. **支付安全。** 私钥、secret、沙箱账号和 SMTP 密码只从服务端运行环境读取，不写入数据库明文字段、客户端包、日志、截图、Issue 或 Notice Mail。支付通知必须验签，金额、币种、商户身份和本地待支付记录必须全部匹配后才能确认。

17. **Fulfillment。** 首版只有手工 Fulfillment：Merchant 为已支付、未退款 Order 填写非空运单号并标记 shipped。动作需幂等并记录时间；Shopper Order 详情和 shipped Notice Mail 从同一 Fulfillment 记录读取。

18. **Return Request 状态机。** Shopper 可从自己的 Order 提交一次待处理请求。Merchant 可拒绝并记录说明；同意未发货 Order 时进入退款处理；同意已发货 Order 时进入 waiting for goods，只有 Merchant 确认收回后才进入退款处理。支付插件退款成功后才标记 refunded；失败保持可重试状态，不伪装成功。

19. **Notice Mail。** Nodemailer 使用 owner 提供的 SMTP 发送 paid、shipped 和 new-order 三封 Notice Mail。发送由领域事件触发并使用唯一事件键去重；失败必须记录，且可通过 Redis 队列或等价机制重试。首版不提供营销活动、订阅列表或 SMS。

20. **Conversation 与 Inbox。** Storefront Contact 是站内 widget，开启后可由匿名或已登录 Shopper 发起 Conversation；Message、未读状态与更新时间持久化到 PostgreSQL。Merchant 在同一 Merchant Portal Inbox 中查看和回复。Conversation 接口预留参与者角色、外部渠道与上下文引用，但首版不依赖第三方客服主机。

21. **AI Support 后续接口。** 真实 AI Support 不进入 v1 发布门槛，但 Conversation 模型和 Support service 必须允许以后插入 AI 参与者、人工接管标记和授权后的 Order 引用。未来 AI 只能查询 Store Handbook 与当前登录 Shopper 的相关 Order，涉及退款或找人工时必须升级，不能审批或执行退款。

22. **语言分层。** 软件字符串使用稳定 key，并随包提供中文、英文两套语言包；Merchant 内容按已启用语言保存；缺失内容回退 Storefront 主语言。Merchant Portal 显示语言与 Shopper 当前 Storefront 语言完全独立。语言和货币也独立切换。

23. **地区组合。** 中国站默认中文、CNY、中国地址和支付宝，并允许额外语言；全球站默认英文、USD、国际地址、PayPal 与 Stripe，并允许额外语言和货币。地区默认值来自应用配置，不在 Commerce Core 中用条件分支散落实现。

24. **响应式与可访问性。** 原型的品牌 Storefront、安静 Merchant Portal、移动购买条、移动单列 Checkout 和不遮挡交易的聊天入口作为交互基线。核心表单、导航、Option 选择、状态反馈和弹层必须支持键盘、可见焦点、语义标签和 reduced-motion。

25. **运维可恢复性。** 开发环境使用 Docker 运行 PostgreSQL 与 Redis，图片目录使用挂载卷。部署文档必须明确数据库迁移、环境变量、健康检查、备份 PostgreSQL 与图片卷、恢复步骤以及支付/SMTP 沙箱到生产的切换边界；项目本身不提供托管服务。

26. **实现切片。** 正式实现按可演示纵向闭环推进：先完成应用壳、持久化、身份与 Store identity；再完成 Catalog 到 Checkout 的真实数据路径；随后为每个口味接通一个支付闭环和 Order/Fulfillment；最后完成 Return Request、Notice Mail、Storefront Contact/Inbox、双语双币及移动端硬化。每个切片必须保持已完成路径可运行，不以批量搭空页面代替闭环。

## Testing Decisions

1. **好测试的定义。** 测试只断言 Merchant 或 Shopper 可观察到的行为、持久化结果和外部契约，不断言 React 组件内部状态、Prisma 调用次数或私有函数结构。重构模块而不改变业务结果时，测试不应大面积重写。

2. **主要测试接缝只有一个。** 最高优先级接缝是每个已部署 Next.js 应用的公开边界：浏览器 UI 加公开 HTTP 回调。自动化从 Storefront 或 Merchant Portal 发起操作，经真实服务、PostgreSQL、Redis 和磁盘测试目录，再从 UI、数据库可观察结果或回调响应验证结果。中国站和全球站共享同一套场景契约，仅在配置与支付期望上参数化。

3. **外部提供方仍从应用边界验证。** 支付与 SMTP 测试不直接断言插件内部实现。日常测试使用符合插件契约的确定性 adapter double，经公开 Checkout、支付通知、退款和 Notice Mail 流程驱动；独立的受控沙箱作业再对支付宝、PayPal、Stripe 和 owner SMTP 验证真实 provider 契约。沙箱作业不得记录密钥、账号密码、支付链接或完整外部交易标识。

4. **现有 prior art。** 可交互原型的十条必点故事和 5 分钟演示路径是首要验收样例；现有浏览器验收脚本提供了空白店、登录门、优惠、支付成功、售罄、支付口味、备案与 Merchant Portal 的场景雏形。正式工程应把这些场景迁入声明完整依赖、可在 CI 重复运行的浏览器测试，而不是依赖手工说明或原型本地状态。

5. **必须覆盖的端到端主路径。** 两个口味都要验证空白部署 → owner 登录 → 配 Store identity/Policy/Shipping Rate/支付 → 建 Product/Variant/库存 → Shopper 浏览 → 登录 → Checkout → 成功支付 → paid/new-order Notice Mail → Merchant 发货 → shipped Notice Mail → Shopper 看运单。

6. **必须覆盖的库存与金额路径。** 验证 0 库存不可加购、购物车数量封顶、Checkout 再校验、并发争抢最后库存只成功一次、重复支付通知只建一个 Order；验证比例与固定 Discount Code、满额包邮、地区/重量 Rate、无税行、币种换算和 Order 金额快照。

7. **必须覆盖的支付路径。** 中国站只显示可用支付宝和禁用微信；全球站按 Merchant 配置显示 PayPal/Stripe。对每个已启用 provider 验证成功、Shopper 取消、失败、同步返回早于异步通知、通知重复、验签失败、金额或币种不匹配、状态查询恢复和退款重试。

8. **必须覆盖的 Return Request 路径。** 验证未发货同意后退款、未发货拒绝、已发货同意后 waiting for goods、确认收货后退款、重复决定和重复退款幂等，以及 Shopper 与 Merchant 两侧状态一致。

9. **必须覆盖的身份与隐私路径。** 验证匿名可浏览但不能 Checkout、登录回跳、注册重复邮箱、owner 与 Shopper 会话隔离、Shopper 不能读取他人 Order/Return Request/Conversation、未登录会话不泄露任何 Order。

10. **必须覆盖的配置传播路径。** 验证改店名或标志后 Storefront/Checkout/Notice Mail 同步；移除标志回退店名；中国备案有值才显示且链接正确；全球站无备案字段；空 Policy 可打开且不挡支付；缺译文回退主语言；Merchant Portal 语言不改变 Storefront 语言。

11. **响应式和无障碍验收。** 浏览器矩阵至少包含桌面与常见手机宽度；两种宽度都走完整购买路径。自动检查聊天入口不遮挡商品购买条或支付按钮、核心表单有标签、Option 和导航可用键盘操作、焦点可见，并在 reduced-motion 下取消非必要运动。

12. **持久化与恢复。** 集成测试要证明服务重启后账号、Cart、Order、Return Request、Conversation 和设置仍正确；迁移能从空数据库建立最新 schema；备份恢复后 Product 图片引用与 Order 历史一致；Redis 清空不丢失事实数据。

13. **发布门槛。** 每个实现切片合并前运行 TypeScript 检查、生产构建、数据库迁移验证和相关浏览器故事；支付/退款或权限边界变化还必须运行对应 provider contract 与安全回归。只有中国站和全球站各自的真实主闭环都通过，Foundation v1 才可标记完成。

## Out of Scope

- 由项目方提供托管、租户管理、代部署、代运营、域名售卖或交钥匙建站服务。
- 一个 Merchant Portal 管理多个 Storefront、多个地区口味或多个 Merchant；中国站与全球站之间的数据同步。
- 自由拖拽页面搭建、任意页脚 HTML、Theme marketplace、多套首发 Theme 或品牌色设计器。
- 多 owner、员工账号、角色权限矩阵、审批流和操作分工。
- 数字商品、自动发卡、订阅、礼品卡、套装、预售、缺货预订、多仓与采购管理。
- 游客 Checkout、短信登录、短信通知、Google/Apple/微信 OAuth、积分、等级和会员营销。
- 税引擎、目的地 VAT、关税/DDP、发票申请或数电发票提供方。
- 首版真实微信支付；未来先做桌面 Native 扫码，再分别评估手机浏览器与微信内页面。
- 承运商下单、电子面单、快递轨迹订阅、仓储、3PL 和自动 Fulfillment。
- MinIO、OSS、S3 或其他对象存储；首版仅使用 Merchant 磁盘，未来通过存储插件扩展。
- 实时汇率、按国家自动定价、Shopify Markets 类市场规则和二十种随包后台语言。
- 评价、博客、Cookie 同意、弃单挽回、营销邮件、广告像素、商品 Feed、销售报表与完整 Analytics。
- 拼团、砍价、分销、直播、小程序商城、多商户市场、POS 和 marketplace ERP。
- WhatsApp、微信客服、邮件等外部客服渠道接入；v1 的 Storefront 门是站内 widget。
- 真实模型驱动的 AI Support、自动把 Order 挂入 Conversation、Inbox 内直接审批 Return Request 或执行退款。这些能力属于已规划的后续层，不另起第三套客服产品。
- AI 自动同意 Return Request、自动退款或以“仅退款”规则替 Merchant 做资金决定，任何版本都不允许。

## Further Notes

1. **决定优先级。** 已接受的产品与架构决定高于研究清单和原型实现；专题设计补充字段与验收；原型决定信息架构、交互节奏和视觉方向，但不决定生产数据结构、状态持久化或第三方协议。

2. **原型不能照抄的部分。** 原型使用内存状态、浏览器会话持久化、固定账号、规则型假 AI 和本地假支付，仅用于证明故事可点通。正式实现必须使用 Auth.js、PostgreSQL/Prisma、Redis、Merchant 磁盘、真实支付插件与 owner SMTP，并建立幂等、验签、重试和审计语义。

3. **原型已经证明的产品形态。** 品牌 Storefront 与安静 Merchant Portal 的视觉分工、空白店气质、Catalog 到支付的短路径、设置向页眉/Checkout/Notice Mail 的传播、0 库存阻断、Fulfillment、Return Request 两分支、微信灰位、语言内容回退及移动端布局都应保留。

4. **正式目标补足原型简化。** 原型的 Shipping Rate 主要演示固定价与满额包邮，正式目标还要求地区与重量匹配；原型分类为简单列表，正式目标允许简单父子层级；原型用单一 Order 状态表达多个维度，正式实现必须拆分 payment、fulfillment 和 return 状态。

5. **客服分期。** 原型演示“说明页回答、登录后查这一单、退款词转人工”，它是未来 AI Support 的体验基准。Foundation v1 首先交付 Storefront Contact 与 Inbox；实现 AI 时必须复用 Store Handbook、Conversation 和授权后的 Order 查询，不能把整店订单或全部说明塞进一个长期提示词。

6. **凭据现状。** 本地测试环境已经分别验证 PayPal Sandbox、Stripe Test Mode 的 PaymentIntent 最小流程，以及支付宝沙箱的签名、验签与完整虚拟支付链路。正式开发可以使用既有环境变量契约接手，但任何真实值都不得进入源码、文档、Issue、日志或截图。

7. **完成定义。** “页面存在”不等于功能完成。只有 Merchant 能从空部署配置并经营、Shopper 能完成真实支付并查询 Order、失败和重复事件可恢复、两个口味的范围差异正确、桌面与手机主路径全部通过，才算 Foundation v1 达成。
