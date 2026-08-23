# Merchant names the choices; every product has buyable combinations

The catalog is generic. A Product is a listing. Options are names the Merchant types (color, size, capacity—whatever they sell). Each buyable mix is a Variant with its own price and stock. A product with no extra choices still has one Variant. We do not ship industry packs that lock in “服装 = 颜色+尺码”. Convenience starter sets can wait.

**Status:** accepted

**Considered Options:** no variants in v1; hardcoded color/size; industry templates; merchant-named options with a single-variant default

**Consequences:** Portal product form is blank fields the Merchant fills. Storefront PDP shows whatever choices they defined. Cart and stock always sit on the Variant, even when there is only one.
