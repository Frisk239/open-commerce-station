export type ShopperReturnPath = "/account" | "/checkout";

export function resolveShopperReturnPath(input: unknown): ShopperReturnPath {
  return input === "/account" ? "/account" : "/checkout";
}
