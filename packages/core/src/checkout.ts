import type { CurrencyCode, LocalizedText, StationFlavor } from "./index";

export type DiscountKind = "percentage" | "fixed";

export interface DiscountRuleView {
  readonly id: string;
  readonly code: string;
  readonly kind: DiscountKind;
  readonly percentageBps?: number;
  readonly amountMinor?: number;
  readonly enabled: boolean;
}

export interface ShippingRateView {
  readonly id: string;
  readonly name: LocalizedText;
  readonly enabled: boolean;
  readonly countryCodes: readonly string[];
  readonly regions: readonly string[];
  readonly minWeightGrams: number;
  readonly maxWeightGrams?: number;
  readonly priceMinor: number;
  readonly freeOverMinor?: number;
  readonly position: number;
}

export interface CheckoutAddress {
  readonly recipientName: string;
  readonly phone: string;
  readonly countryCode: string;
  readonly region: string;
  readonly city: string;
  readonly district?: string;
  readonly postalCode?: string;
  readonly line1: string;
  readonly line2?: string;
}

export interface CartLineView {
  readonly variantId: string;
  readonly productId: string;
  readonly productSlug: string;
  readonly productName: LocalizedText;
  readonly variantLabel: string;
  readonly imageUrl?: string;
  readonly sellPriceMinor: number;
  readonly stock: number;
  readonly weightGrams: number;
  readonly quantity: number;
  readonly available: boolean;
}

export interface CartView {
  readonly lines: readonly CartLineView[];
  readonly quantity: number;
  readonly subtotalMinor: number;
  readonly hasInvalidLines: boolean;
}

export interface ShippingQuoteOption {
  readonly id: string;
  readonly name: LocalizedText;
  readonly priceMinor: number;
  readonly free: boolean;
}

export interface CheckoutQuote {
  readonly flavor: StationFlavor;
  readonly currency: CurrencyCode;
  readonly lines: readonly CartLineView[];
  readonly subtotalMinor: number;
  readonly discountCode?: string;
  readonly discountMinor: number;
  readonly discountedSubtotalMinor: number;
  readonly totalWeightGrams: number;
  readonly shippingOptions: readonly ShippingQuoteOption[];
  readonly selectedShippingRateId: string;
  readonly shippingMinor: number;
  readonly totalMinor: number;
}

export type CheckoutValidationErrorCode = "empty-cart" | "invalid-cart" | "invalid-address" | "invalid-discount" | "no-shipping-rate" | "invalid-shipping-rate";

export class CheckoutValidationError extends Error {
  constructor(readonly code: CheckoutValidationErrorCode, message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

function clean(value: string): string {
  return value.trim();
}

function regionKey(value: string): string {
  return clean(value).toLocaleUpperCase();
}

export function validateCheckoutAddress(flavor: StationFlavor, address: CheckoutAddress): CheckoutAddress {
  const required = [address.recipientName, address.phone, address.countryCode, address.region, address.city, address.line1];
  if (required.some((value) => !clean(value))) {
    throw new CheckoutValidationError("invalid-address", "Complete every required delivery Address field.");
  }
  if (address.recipientName.length > 120 || address.phone.length > 40
    || address.region.length > 120 || address.city.length > 120
    || (address.district?.length ?? 0) > 120 || (address.postalCode?.length ?? 0) > 32
    || address.line1.length > 240 || (address.line2?.length ?? 0) > 240) {
    throw new CheckoutValidationError("invalid-address", "Delivery Address fields are too long.");
  }
  if (!/^[A-Za-z]{2}$/.test(address.countryCode)) {
    throw new CheckoutValidationError("invalid-address", "Country must use a two-letter code.");
  }
  if (flavor === "cn" && (address.countryCode.toUpperCase() !== "CN" || !clean(address.district ?? ""))) {
    throw new CheckoutValidationError("invalid-address", "China Station requires a China province, city, district, and street Address.");
  }
  if (flavor === "global" && !clean(address.postalCode ?? "")) {
    throw new CheckoutValidationError("invalid-address", "Global Station requires a postal code.");
  }
  return address;
}

export function calculateDiscount(subtotalMinor: number, discount: DiscountRuleView | undefined): number {
  if (!discount) return 0;
  if (!discount.enabled) throw new CheckoutValidationError("invalid-discount", "Discount Code is inactive.");
  if (discount.kind === "percentage") {
    const bps = discount.percentageBps;
    if (!Number.isSafeInteger(bps) || !bps || bps <= 0 || bps > 10_000) {
      throw new CheckoutValidationError("invalid-discount", "Discount percentage is invalid.");
    }
    const rounded = Number((BigInt(subtotalMinor) * BigInt(bps) + 5_000n) / 10_000n);
    return Math.min(subtotalMinor, rounded);
  }
  const amount = discount.amountMinor;
  if (!Number.isSafeInteger(amount) || !amount || amount <= 0) {
    throw new CheckoutValidationError("invalid-discount", "Discount amount is invalid.");
  }
  return Math.min(subtotalMinor, amount);
}

export function shippingRateMatches(rate: ShippingRateView, address: CheckoutAddress, totalWeightGrams: number): boolean {
  if (!rate.enabled || totalWeightGrams < rate.minWeightGrams) return false;
  if (rate.maxWeightGrams !== undefined && totalWeightGrams > rate.maxWeightGrams) return false;
  const country = address.countryCode.toUpperCase();
  if (rate.countryCodes.length > 0 && !rate.countryCodes.some((code) => code.toUpperCase() === country)) return false;
  if (rate.regions.length > 0 && !rate.regions.some((region) => regionKey(region) === regionKey(address.region))) return false;
  return true;
}

export function calculateCheckoutQuote(input: {
  readonly flavor: StationFlavor;
  readonly currency: CurrencyCode;
  readonly lines: readonly CartLineView[];
  readonly address: CheckoutAddress;
  readonly shippingRates: readonly ShippingRateView[];
  readonly discount?: DiscountRuleView;
  readonly selectedShippingRateId?: string;
}): CheckoutQuote {
  validateCheckoutAddress(input.flavor, input.address);
  if (input.lines.length === 0) throw new CheckoutValidationError("empty-cart", "Cart is empty.");
  if (input.lines.some((line) => !line.available
    || !Number.isSafeInteger(line.quantity) || line.quantity <= 0
    || !Number.isSafeInteger(line.stock) || line.quantity > line.stock
    || !Number.isSafeInteger(line.sellPriceMinor) || line.sellPriceMinor < 0
    || !Number.isSafeInteger(line.weightGrams) || line.weightGrams < 0)) {
    throw new CheckoutValidationError("invalid-cart", "Cart contains an unavailable or insufficient-stock Variant.");
  }

  let subtotalMinor = 0;
  let totalWeightGrams = 0;
  for (const line of input.lines) {
    subtotalMinor += line.sellPriceMinor * line.quantity;
    totalWeightGrams += line.weightGrams * line.quantity;
  }
  if (!Number.isSafeInteger(subtotalMinor) || !Number.isSafeInteger(totalWeightGrams)) {
    throw new CheckoutValidationError("invalid-cart", "Cart amount or weight exceeds safe limits.");
  }

  const discountMinor = calculateDiscount(subtotalMinor, input.discount);
  const discountedSubtotalMinor = subtotalMinor - discountMinor;
  const shippingOptions = input.shippingRates
    .filter((rate) => shippingRateMatches(rate, input.address, totalWeightGrams))
    .sort((left, right) => left.position - right.position || left.priceMinor - right.priceMinor)
    .map((rate): ShippingQuoteOption => {
      const free = rate.freeOverMinor !== undefined && discountedSubtotalMinor >= rate.freeOverMinor;
      return { id: rate.id, name: rate.name, priceMinor: free ? 0 : rate.priceMinor, free };
    });
  if (shippingOptions.length === 0) throw new CheckoutValidationError("no-shipping-rate", "No Shipping Rate matches this Address and Cart weight.");

  const selected = input.selectedShippingRateId
    ? shippingOptions.find((option) => option.id === input.selectedShippingRateId)
    : shippingOptions[0];
  if (!selected) throw new CheckoutValidationError("invalid-shipping-rate", "Selected Shipping Rate no longer matches this Checkout.");
  const totalMinor = discountedSubtotalMinor + selected.priceMinor;
  if (!Number.isSafeInteger(totalMinor)) throw new CheckoutValidationError("invalid-cart", "Checkout total exceeds safe limits.");

  return {
    flavor: input.flavor,
    currency: input.currency,
    lines: input.lines,
    subtotalMinor,
    discountCode: input.discount?.code,
    discountMinor,
    discountedSubtotalMinor,
    totalWeightGrams,
    shippingOptions,
    selectedShippingRateId: selected.id,
    shippingMinor: selected.priceMinor,
    totalMinor,
  };
}
