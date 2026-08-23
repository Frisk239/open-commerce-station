import { describe, expect, it } from "vitest";
import { parseStoreIdentityFields, StoreIdentityFormError } from "../src/identity";

describe("Store identity form boundary", () => {
  it("normalizes the fields the deep update interface accepts", () => {
    const form = new FormData();
    form.set("name", "  Atlas Goods  ");
    form.set("contactEmail", "hello@example.test");

    expect(parseStoreIdentityFields(form)).toMatchObject({
      name: "Atlas Goods",
      contactEmail: "hello@example.test",
      footerLine: "",
    });
  });

  it("rejects a missing name and malformed contact email", () => {
    const form = new FormData();
    form.set("name", "");
    form.set("contactEmail", "not-an-email");

    expect(() => parseStoreIdentityFields(form)).toThrow(StoreIdentityFormError);
  });
});
