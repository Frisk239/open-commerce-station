import { describe, expect, it } from "vitest";
import { chinaPoliceRecordUrl, createBlankStore, pickLocalizedText, resolveStoreIdentity } from "../src/index";

describe("blank Independent Station", () => {
  it("reserves the four Store Handbook pages", () => {
    const store = createBlankStore("cn");
    expect(store.policies.map((policy) => policy.slug)).toEqual(["privacy", "terms", "returns", "shipping"]);
    expect(store.policies.every((policy) => Object.keys(policy.body).length === 0)).toBe(true);
  });

  it("uses a human store name and derived footer before the Merchant configures it", () => {
    expect(resolveStoreIdentity("cn", {}, 2026)).toMatchObject({ name: "我的店", footerLine: "© 2026 我的店" });
    expect(resolveStoreIdentity("global", {}, 2026)).toMatchObject({ name: "My Shop", footerLine: "© 2026 My Shop" });
  });

  it("never exposes China filing fields in Global Station", () => {
    expect(resolveStoreIdentity("global", { name: "North & Pine", icp: "example" }, 2026)).toEqual({
      name: "North & Pine",
      footerLine: "© 2026 North & Pine",
    });
  });

  it("falls back Merchant content to the primary language", () => {
    expect(pickLocalizedText({ en: "Linen" }, "zh", "en")).toBe("Linen");
  });

  it("builds the official China police filing query URL from the record", () => {
    expect(chinaPoliceRecordUrl("沪公网安备 123 号")).toBe(
      "https://beian.mps.gov.cn/#/query/webSearch?code=%E6%B2%AA%E5%85%AC%E7%BD%91%E5%AE%89%E5%A4%87%20123%20%E5%8F%B7",
    );
  });
});
