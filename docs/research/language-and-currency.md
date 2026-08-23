# 语言和货币：别人怎么做

给设计用。不是选技术栈。

## 普遍拆成三层，不要混

1. **软件自己的字**  
   按钮「加入购物车」、后台「保存」、邮件里的固定句子。Shopify 放在主题的语言文件里，用编号去取，不把中文写死在页面里。[店面语言文件](https://shopify.dev/docs/storefronts/themes/architecture/locales/storefront-locale-files)  
   缺译文时，退回店的主语言。[Shopify 说明](https://help.shopify.com/en/manual/international/localization-and-translation)

2. **老板写的内容**  
   商品名、说明页。主语言一份，其他语言老板自己填或以后用翻译工具。软件不会自动编造商品名。

3. **货币**  
   和语言分开。Medusa：地区管收哪种钱、税；语言管看哪种字。[Medusa 店面语言](https://docs.medusajs.com/resources/storefront-development/localization)  
   InnoShop / BeikeShop：前台可切语言和货币；后台也能切界面语言；汇率可手填或以后对接牌价。

## 不要做的

- 把「加入购物车」在代码里写死成中文：出海站每一页都要改，后面加法语更痛。  
- 第一版就做二十种软件语言：没人维护。  
- 语言和货币绑死（选英语就必须美元）：瑞士看德文付法郎很常见。
