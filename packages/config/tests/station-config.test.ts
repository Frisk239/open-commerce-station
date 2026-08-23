import { describe, expect, it } from "vitest";
import { getStationConfig } from "../src/index";

describe("one deploy, one station flavor", () => {
  it("composes China Station without global payment capabilities", () => {
    expect(getStationConfig("cn")).toMatchObject({
      primaryLocale: "zh",
      accountingCurrency: "CNY",
      filingFields: true,
    });
    expect(getStationConfig("cn").payments).toEqual([
      { capability: "alipay", availability: "available" },
      { capability: "wechat", availability: "coming-later" },
    ]);
  });

  it("composes Global Station without China filing fields", () => {
    expect(getStationConfig("global")).toMatchObject({
      primaryLocale: "en",
      accountingCurrency: "USD",
      filingFields: false,
    });
  });
});
