import { describe, expect, it } from "vitest";
import { resolveShopperReturnPath } from "../src/shopper";

describe("Shopper return paths", () => {
  it("allows only the two Shopper destinations used by the account flow", () => {
    expect(resolveShopperReturnPath("/account")).toBe("/account");
    expect(resolveShopperReturnPath("/checkout")).toBe("/checkout");
    expect(resolveShopperReturnPath("//example.com")).toBe("/checkout");
    expect(resolveShopperReturnPath("/\\example.com")).toBe("/checkout");
    expect(resolveShopperReturnPath(null)).toBe("/checkout");
  });
});
