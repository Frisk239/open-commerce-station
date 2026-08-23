import { chromium } from "playwright";

const base = "http://localhost:3000";
const findings = [];

async function shot(page, name) {
  await page.screenshot({ path: `scripts/shots/${name}.png`, fullPage: false });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(15000);

  // 1 home picker copy vs persist
  await page.goto(base);
  const pickerCopy = await page.locator("p").nth(1).innerText();
  findings.push({ id: "picker-copy", text: pickerCopy });

  // 2 empty store
  await page.getByRole("button", { name: "空白店" }).nth(1).click();
  await page.getByRole("link", { name: "进店面" }).nth(1).click();
  await page.waitForURL("**/global");
  const emptyH1 = await page.locator("h1").first().innerText().catch(() => "");
  const emptyBody = await page.locator("body").innerText();
  findings.push({
    id: "empty-store",
    h1: emptyH1,
    hasPlaceholder: emptyBody.includes("即将") || emptyBody.toLowerCase().includes("coming") || emptyBody.includes("上架") || emptyBody.includes("yet"),
    hasMyShop: emptyBody.includes("My Shop") || emptyBody.includes("我的店"),
    hasPrivacy: emptyBody.includes("Privacy") || emptyBody.includes("隐私"),
  });

  // 3 demo store buy flow
  await page.goto(base);
  await page.getByRole("link", { name: "进店面" }).nth(1).click();
  await page.waitForURL("**/global");
  await page.getByRole("link", { name: /Linen Pillow Cover/ }).first().click();
  await page.getByRole("button", { name: /Add to cart|加入/i }).click();
  await page.getByRole("link", { name: /Cart/ }).click();
  await page.getByRole("link", { name: /Check out|去结账|Checkout/i }).click();
  const needLogin = await page.locator("body").innerText();
  findings.push({ id: "checkout-login-gate", needLogin: /sign in|登录/i.test(needLogin) });

  await page.getByRole("link", { name: /Sign in|登录/i }).first().click();
  await page.getByLabel(/Email|邮箱/i).fill("jane@demo.shop");
  await page.getByLabel(/Password|密码/i).fill("demo");
  await page.getByRole("button", { name: /Sign in|登录/i }).click();
  await page.waitForURL("**/checkout**");

  await page.getByLabel(/Name|姓名/i).fill("Jane Weaver");
  await page.locator("input").nth(2).fill("228 S Clinton St");
  const labels = await page.locator("label").allInnerTexts();
  findings.push({ id: "checkout-labels", labels });

  // fill remaining address fields by placeholder or order
  const inputs = page.locator("input");
  const count = await inputs.count();
  // After name, typically phone, line1, line2, city, region, zip, country
  // We'll fill empty required by looking at value
  for (let i = 0; i < count; i++) {
    const v = await inputs.nth(i).inputValue();
    if (!v) {
      const auto = await inputs.nth(i).getAttribute("autocomplete");
      if (auto === "address-line1") await inputs.nth(i).fill("228 S Clinton St");
      else if (auto === "address-line2") await inputs.nth(i).fill("Apt 4B");
      else if (auto === "address-level2") await inputs.nth(i).fill("Chicago");
      else if (auto === "address-level1") await inputs.nth(i).fill("IL");
      else if (auto === "postal-code") await inputs.nth(i).fill("60661");
      else if (auto === "country-name") await inputs.nth(i).fill("United States");
      else if (auto === "tel") await inputs.nth(i).fill("5550142890");
    }
  }

  await page.getByRole("button", { name: /Standard shipping/i }).click();
  await page.getByPlaceholder(/code|码/i).fill("WELCOME10");
  await page.getByRole("button", { name: /Apply|应用/i }).click();
  const summary = await page.locator("aside").innerText();
  findings.push({ id: "checkout-summary", summary: summary.slice(0, 500) });

  const wechat = await page.locator("body").innerText();
  findings.push({ id: "wechat-on-global", hasWechat: /WeChat|微信/.test(wechat) && !/PayPal/.test(wechat) === false });

  await page.getByRole("button", { name: /PayPal/i }).click();
  await page.waitForURL("**/account/orders/**", { timeout: 10000 });
  const paid = await page.locator("body").innerText();
  findings.push({
    id: "paid",
    url: page.url(),
    hasMail: /mail|邮件|subject|下单成功|order confirmed/i.test(paid),
    hasTax: /tax|税/.test(paid.toLowerCase()) && /VAT|销售税/.test(paid),
    snippet: paid.slice(0, 800),
  });

  // sold out variant
  await page.goto(`${base}/global/products/ash-side-table`);
  await page.getByRole("button", { name: /Walnut/i }).click();
  const sold = await page.locator("body").innerText();
  findings.push({
    id: "sold-out",
    soldOut: /sold out|售罄|已售完/i.test(sold),
    addDisabled: await page.getByRole("button", { name: /Add to cart|加入/i }).isDisabled().catch(() => null),
  });

  // CN wechat grey
  await page.goto(`${base}/cn/checkout`);
  // may redirect empty cart
  const cnBody = await page.locator("body").innerText();
  findings.push({ id: "cn-checkout-empty-or-login", snippet: cnBody.slice(0, 200) });

  await page.goto(`${base}/cn`);
  const cnFooter = await page.locator("footer").innerText();
  findings.push({ id: "cn-footer", footer: cnFooter });

  await page.goto(`${base}/global/portal`);
  await page.getByLabel(/Email|邮箱/i).fill("owner@demo.shop");
  await page.getByLabel(/Password|密码/i).fill("demo");
  await page.getByRole("button", { name: /Sign in|登录/i }).click();
  await page.waitForTimeout(800);
  const portal = await page.locator("body").innerText();
  findings.push({ id: "portal-home", snippet: portal.slice(0, 600) });

  await page.goto(`${base}/global/portal/settings/payments`);
  const pay = await page.locator("body").innerText();
  findings.push({ id: "portal-payments", hasWechatGrey: /稍后|Coming later|WeChat/.test(pay), snippet: pay.slice(0, 400) });

  await page.goto(`${base}/cn/portal/settings`);
  await page.getByLabel(/Email|邮箱/i).fill("owner@demo.shop").catch(() => {});
  const settings = await page.locator("body").innerText();
  findings.push({ id: "cn-settings", hasIcp: /ICP|备案/.test(settings), snippet: settings.slice(0, 500) });

  await page.goto(`${base}/global/portal/settings/language-currency`);
  const lang = await page.locator("body").innerText();
  findings.push({ id: "lang-currency", snippet: lang.slice(0, 500) });

  console.log(JSON.stringify(findings, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
