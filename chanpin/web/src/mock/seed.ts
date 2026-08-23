import { pic } from "@/lib/img";
import type {
  Category,
  Discount,
  Flavor,
  FlavorState,
  L10n,
  Order,
  Policy,
  Product,
  Settings,
  ShippingRate,
} from "@/lib/types";
import { POLICY_SLUGS } from "@/lib/types";

export const OWNER_EMAIL = "owner@demo.shop";
export const OWNER_PASS = "demo";

const DEMO_SHOPPERS = [
  { email: "jane@demo.shop", password: "demo", name: "Jane" },
  { email: "jian@demo.shop", password: "demo", name: "小简" },
];

/** 首页文案是店的内容，不进软件字典 */
export const HOME_COPY: Record<Flavor, { heroTitle: L10n; heroSub: L10n; featuredLine: L10n; aboutTitle: L10n; aboutBody: L10n; heroSeed: string; aboutSeed: string }> = {
  cn: {
    heroTitle: { zh: "少而好的家物", en: "Few things, chosen well" },
    heroSub: { zh: "实木、陶与织物。每一件都挑过、用过，才敢上架。", en: "Solid wood, stoneware and natural linen. Used daily before they go on sale." },
    featuredLine: { zh: "从一件天天用得上的东西开始。", en: "Start with the piece you'll use every day." },
    aboutTitle: { zh: "关于拾木", en: "About Shimu" },
    aboutBody: {
      zh: "拾木家居 2021 年从一间小工作室开始。我们只做自己愿意天天用的东西：木头要结实，陶要顺手，织物要经得起洗。数量不多，慢慢补。",
      en: "Shimu started in 2021 from a small workshop. We only make things we use daily: wood that holds up, stoneware that feels right, linen that survives the wash.",
    },
    heroSeed: "shimu-hero-room-9",
    aboutSeed: "shimu-about-workshop-4",
  },
  global: {
    heroTitle: { zh: "经得起天天用的家物", en: "Home goods, quietly made to last" },
    heroSub: { zh: "实木、陶器与亚麻。款式不多，件件选过。", en: "Solid wood, stoneware and natural linen. Few things, chosen well." },
    featuredLine: { zh: "从天天够得着的那一件开始。", en: "Begin with the thing you reach for daily." },
    aboutTitle: { zh: "关于 North & Pine", en: "About North & Pine" },
    aboutBody: {
      zh: "North & Pine 2021 年从一间小工坊起步。我们只做自己也天天用的东西：木头结实，陶器顺手，亚麻经得起洗。上得慢，做得稳。",
      en: "North & Pine started in 2021 from a small workshop. We only make things we use daily: wood that holds up, stoneware that feels right, linen that survives the wash. Restocked slowly, made to stay.",
    },
    heroSeed: "np-hero-room-7",
    aboutSeed: "np-about-workshop-3",
  },
};

function defaultPolicyTitles(flavor: Flavor): Policy[] {
  const titles: L10n[] =
    flavor === "cn"
      ? [{ zh: "隐私", en: "Privacy" }, { zh: "服务条款", en: "Terms of Service" }, { zh: "退货说明", en: "Returns" }, { zh: "运费说明", en: "Shipping" }]
      : [{ zh: "隐私", en: "Privacy" }, { zh: "服务条款", en: "Terms of Service" }, { zh: "退货说明", en: "Returns" }, { zh: "运费说明", en: "Shipping" }];
  return POLICY_SLUGS.map((slug, i) => ({ slug, title: titles[i], body: { zh: "", en: "" } }));
}

/* ---------------- 国内站：拾木家居 ---------------- */

function cnCategories(): Category[] {
  return [
    { id: "c-living", slug: "living", name: { zh: "客厅", en: "Living room" } },
    { id: "c-bedroom", slug: "bedroom", name: { zh: "卧室", en: "Bedroom" } },
    { id: "c-dining", slug: "dining", name: { zh: "餐厨", en: "Kitchen & dining" } },
  ];
}

function cnProducts(): Product[] {
  return [
    {
      id: "p1", slug: "ash-side-table", active: true, createdAt: "2026-07-02 10:00",
      name: { zh: "白蜡木小边几", en: "Ash Side Table" },
      story: {
        zh: "白蜡木整板拼接，边缘手工倒角，水性木蜡油 finish。原木色浅而暖，深胡桃稳一点。桌面 42 厘米见方，沙发边、床头都放得下。",
        en: "Solid ash boards, hand-eased edges, water-based oil finish. Natural runs light and warm; walnut reads calmer. The 42cm top fits any sofa or bed.",
      },
      images: [pic("shimu-ash-table-1", 1200, 1500), pic("shimu-ash-table-2", 1200, 1500), pic("shimu-ash-table-3", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-finish", name: { zh: "木色", en: "Finish" },
          values: [
            { id: "v-natural", name: { zh: "原木色", en: "Natural" } },
            { id: "v-walnut", name: { zh: "深胡桃", en: "Walnut" } },
          ],
        },
      ],
      variants: [
        { id: "p1-a", selection: { "o-finish": "v-natural" }, price: 52800, stock: 12 },
        { id: "p1-b", selection: { "o-finish": "v-walnut" }, price: 56800, stock: 0 },
      ],
    },
    {
      id: "p2", slug: "linen-pillow", active: true, createdAt: "2026-07-02 10:00",
      name: { zh: "亚麻抱枕套", en: "Linen Pillow Cover" },
      story: {
        zh: "重磅亚麻，水洗工艺，越用越软。隐形拉链，枕芯不外露。两种颜色都是低饱和的，蹭脏了直接机洗。",
        en: "Heavyweight washed linen that softens with use. Hidden zipper, machine washable. Both colors stay low-key in any room.",
      },
      images: [pic("shimu-linen-pillow-1", 1200, 1500), pic("shimu-linen-pillow-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-color", name: { zh: "颜色", en: "Color" },
          values: [
            { id: "v-oat", name: { zh: "燕麦", en: "Oat" } },
            { id: "v-fog", name: { zh: "雾灰", en: "Fog" } },
          ],
        },
        {
          id: "o-size", name: { zh: "尺寸", en: "Size" },
          values: [
            { id: "v-45", name: { zh: "45×45", en: "45×45" } },
            { id: "v-50", name: { zh: "50×50", en: "50×50" } },
          ],
        },
      ],
      variants: [
        { id: "p2-a", selection: { "o-color": "v-oat", "o-size": "v-45" }, price: 6800, stock: 20 },
        { id: "p2-b", selection: { "o-color": "v-oat", "o-size": "v-50" }, price: 7800, stock: 8 },
        { id: "p2-c", selection: { "o-color": "v-fog", "o-size": "v-45" }, price: 7200, stock: 15 },
        { id: "p2-d", selection: { "o-color": "v-fog", "o-size": "v-50" }, price: 8800, stock: 3 },
      ],
    },
    {
      id: "p3", slug: "stoneware-mug", active: true, createdAt: "2026-07-10 10:00",
      name: { zh: "手作马克杯", en: "Stoneware Mug" },
      story: {
        zh: "景德镇半手工坯，杯壁厚实保温，320 毫升正好一杯。月白偏暖，黛青沉静。入窑一色，出窑万色，每一只釉面都略有不同。",
        en: "Half-handmade stoneware, thick walls that hold heat, 320ml. Moon is warm; Indigo is quiet. Each glaze lands slightly different.",
      },
      images: [pic("shimu-mug-1", 1200, 1500), pic("shimu-mug-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [
        {
          id: "o-glaze", name: { zh: "釉色", en: "Glaze" },
          values: [
            { id: "v-moon", name: { zh: "月白", en: "Moon" } },
            { id: "v-indigo", name: { zh: "黛青", en: "Indigo" } },
          ],
        },
      ],
      variants: [
        { id: "p3-a", selection: { "o-glaze": "v-moon" }, price: 9600, compareAt: 12800, stock: 18 },
        { id: "p3-b", selection: { "o-glaze": "v-indigo" }, price: 9600, compareAt: 12800, stock: 6 },
      ],
    },
    {
      id: "p4", slug: "wool-throw", active: true, createdAt: "2026-07-15 10:00",
      name: { zh: "羊毛针织盖毯", en: "Wool Knit Throw" },
      story: {
        zh: "整条无缝针织，100% 内蒙古羊毛，压在腿上有分量。130×180 厘米，午睡、看剧、阳台都合适。干洗或低温手洗。",
        en: "Seamless whole-garment knit, 100% Inner Mongolian wool with real weight. 130×180cm for naps and sofas. Dry clean or hand wash cold.",
      },
      images: [pic("shimu-wool-throw-1", 1200, 1500), pic("shimu-wool-throw-2", 1200, 1500)],
      categoryIds: ["c-bedroom"],
      options: [],
      variants: [{ id: "p4-a", selection: {}, price: 36800, compareAt: 42800, stock: 9 }],
    },
    {
      id: "p5", slug: "cedar-candle", active: true, createdAt: "2026-07-15 10:00",
      name: { zh: "大豆蜡烛", en: "Soy Candle" },
      story: {
        zh: "大豆蜡混少量蜂蜡，无烟棉芯，燃烧 40 小时左右。雪松是干木香，苔藓与雨更清冷一点。烧完的杯子和 mug 同坯，洗洗能当笔筒。",
        en: "Soy wax with a touch of beeswax, cotton wick, about 40 hours. Cedarwood is dry wood; Moss & Rain runs cooler. The cup matches our mugs when washed out.",
      },
      images: [pic("shimu-candle-1", 1200, 1500), pic("shimu-candle-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-scent", name: { zh: "香型", en: "Scent" },
          values: [
            { id: "v-cedar", name: { zh: "雪松", en: "Cedarwood" } },
            { id: "v-moss", name: { zh: "苔藓与雨", en: "Moss & Rain" } },
          ],
        },
      ],
      variants: [
        { id: "p5-a", selection: { "o-scent": "v-cedar" }, price: 13800, stock: 25 },
        { id: "p5-b", selection: { "o-scent": "v-moss" }, price: 13800, stock: 14 },
      ],
    },
    {
      id: "p6", slug: "brass-tray", active: true, createdAt: "2026-07-20 10:00",
      name: { zh: "黄铜收纳浅盘", en: "Brass Catch-All Tray" },
      story: {
        zh: "整块黄铜冲压成型，不电镀，用久了自然氧化出深色斑。放钥匙、手表、耳钉都合适。20×12 厘米。",
        en: "Pressed from one sheet of solid brass, unplated; it darkens honestly with age. For keys, watches and rings. 20×12cm.",
      },
      images: [pic("shimu-brass-tray-1", 1200, 1500), pic("shimu-brass-tray-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [],
      variants: [{ id: "p6-a", selection: {}, price: 15800, stock: 7 }],
    },
    {
      id: "p7", slug: "table-runner", active: true, createdAt: "2026-07-20 10:00",
      name: { zh: "棉麻长桌旗", en: "Cotton Table Runner" },
      story: {
        zh: "棉麻混纺，本色带麻结，藏蓝近黑。35×180 厘米，两头卷边。可以当桌旗，也可以铺在玄关柜上。",
        en: "Cotton-linen blend with honest slubs in Natural, near-black Navy. 35×180cm with rolled ends. Table or entry console.",
      },
      images: [pic("shimu-runner-1", 1200, 1500), pic("shimu-runner-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [
        {
          id: "o-color", name: { zh: "颜色", en: "Color" },
          values: [
            { id: "v-natural", name: { zh: "本色", en: "Natural" } },
            { id: "v-navy", name: { zh: "藏蓝", en: "Navy" } },
          ],
        },
      ],
      variants: [
        { id: "p7-a", selection: { "o-color": "v-natural" }, price: 11800, stock: 11 },
        { id: "p7-b", selection: { "o-color": "v-navy" }, price: 11800, stock: 10 },
      ],
    },
    {
      id: "p8", slug: "woven-basket", active: true, createdAt: "2026-07-25 10:00",
      name: { zh: "藤编杂物篮", en: "Woven Storage Basket" },
      story: {
        zh: "天然藤条手工编织，带提手。小号放遥控器和线，中号放杂志和抱枕芯。藤色会随时间变深。",
        en: "Hand-woven natural rattan with handles. Small for remotes and cables; Medium for magazines and spare pillow inners. Darkens slowly.",
      },
      images: [pic("shimu-basket-1", 1200, 1500), pic("shimu-basket-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-size", name: { zh: "尺寸", en: "Size" },
          values: [
            { id: "v-s", name: { zh: "小", en: "Small" } },
            { id: "v-m", name: { zh: "中", en: "Medium" } },
          ],
        },
      ],
      variants: [
        { id: "p8-a", selection: { "o-size": "v-s" }, price: 14800, stock: 16 },
        { id: "p8-b", selection: { "o-size": "v-m" }, price: 18800, stock: 12 },
      ],
    },
  ];
}

/* ---------------- 出海站：North & Pine ---------------- */

function globalCategories(): Category[] {
  return [
    { id: "c-living", slug: "living", name: { zh: "客厅", en: "Living room" } },
    { id: "c-bedroom", slug: "bedroom", name: { zh: "卧室", en: "Bedroom" } },
    { id: "c-dining", slug: "dining", name: { zh: "餐厨", en: "Kitchen & dining" } },
  ];
}

function globalProducts(): Product[] {
  return [
    {
      id: "g1", slug: "ash-side-table", active: true, createdAt: "2026-07-02 10:00",
      name: { zh: "白蜡木小边几", en: "Ash Side Table" },
      story: {
        zh: "白蜡木整板拼接，边缘手工倒角。原木色浅暖，胡桃沉稳。42 厘米桌面，沙发边、床头都放得下。",
        en: "Solid ash boards with hand-eased edges and a water-based oil finish. Natural runs light; Walnut reads calm. The 42cm top fits any sofa or bed.",
      },
      images: [pic("np-ash-table-1", 1200, 1500), pic("np-ash-table-2", 1200, 1500), pic("np-ash-table-3", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-finish", name: { zh: "木色", en: "Finish" },
          values: [
            { id: "v-natural", name: { zh: "原木色", en: "Natural" } },
            { id: "v-walnut", name: { zh: "深胡桃", en: "Walnut" } },
          ],
        },
      ],
      variants: [
        { id: "g1-a", selection: { "o-finish": "v-natural" }, price: 7200, stock: 12 },
        { id: "g1-b", selection: { "o-finish": "v-walnut" }, price: 7800, stock: 0 },
      ],
    },
    {
      id: "g2", slug: "linen-pillow", active: true, createdAt: "2026-07-02 10:00",
      name: { zh: "亚麻抱枕套", en: "Linen Pillow Cover" },
      story: {
        zh: "重磅水洗亚麻，越用越软。隐形拉链，可机洗。两种颜色都低饱和。",
        en: "Heavyweight washed linen that softens with use. Hidden zipper, machine washable. Both colors stay low-key.",
      },
      images: [pic("np-linen-pillow-1", 1200, 1500), pic("np-linen-pillow-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-color", name: { zh: "颜色", en: "Color" },
          values: [
            { id: "v-oat", name: { zh: "燕麦", en: "Oat" } },
            { id: "v-fog", name: { zh: "雾灰", en: "Fog" } },
          ],
        },
        {
          id: "o-size", name: { zh: "尺寸", en: "Size" },
          values: [
            { id: "v-18", name: { zh: "18 英寸", en: "18in" } },
            { id: "v-20", name: { zh: "20 英寸", en: "20in" } },
          ],
        },
      ],
      variants: [
        { id: "g2-a", selection: { "o-color": "v-oat", "o-size": "v-18" }, price: 1800, stock: 20 },
        { id: "g2-b", selection: { "o-color": "v-oat", "o-size": "v-20" }, price: 2200, stock: 8 },
        { id: "g2-c", selection: { "o-color": "v-fog", "o-size": "v-18" }, price: 2000, stock: 15 },
        { id: "g2-d", selection: { "o-color": "v-fog", "o-size": "v-20" }, price: 2400, stock: 3 },
      ],
    },
    {
      id: "g3", slug: "stoneware-mug", active: true, createdAt: "2026-07-10 10:00",
      name: { zh: "陶艺马克杯", en: "Stoneware Mug" },
      story: {
        zh: "半手工陶坯，杯壁厚实保温，320 毫升。月白偏暖，黛青沉静。每只釉面略有不同。",
        en: "Half-handmade stoneware, thick walls that hold heat, 320ml. Moon is warm; Indigo is quiet. Each glaze lands slightly different.",
      },
      images: [pic("np-mug-1", 1200, 1500), pic("np-mug-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [
        {
          id: "o-glaze", name: { zh: "釉色", en: "Glaze" },
          values: [
            { id: "v-moon", name: { zh: "月白", en: "Moon" } },
            { id: "v-indigo", name: { zh: "黛青", en: "Indigo" } },
          ],
        },
      ],
      variants: [
        { id: "g3-a", selection: { "o-glaze": "v-moon" }, price: 2600, compareAt: 3400, stock: 18 },
        { id: "g3-b", selection: { "o-glaze": "v-indigo" }, price: 2600, compareAt: 3400, stock: 6 },
      ],
    },
    {
      id: "g4", slug: "wool-knit-throw", active: true, createdAt: "2026-07-15 10:00",
      // 故意没有中文译文：演示「没译的内容回退主语言」
      name: { en: "Wool Knit Throw" },
      story: { en: "Seamless whole-garment knit, 100% wool with real weight. 51×71in for naps and sofas. Dry clean or hand wash cold." },
      images: [pic("np-wool-throw-1", 1200, 1500), pic("np-wool-throw-2", 1200, 1500)],
      categoryIds: ["c-bedroom"],
      options: [],
      variants: [{ id: "g4-a", selection: {}, price: 5800, stock: 9 }],
    },
    {
      id: "g5", slug: "soy-candle", active: true, createdAt: "2026-07-15 10:00",
      name: { zh: "大豆蜡烛", en: "Soy Candle" },
      story: {
        zh: "大豆蜡混少量蜂蜡，无烟棉芯，燃烧约 40 小时。雪松干木香，苔藓与雨更清冷。",
        en: "Soy wax with a touch of beeswax, cotton wick, about 40 hours. Cedarwood is dry wood; Moss & Rain runs cooler.",
      },
      images: [pic("np-candle-1", 1200, 1500), pic("np-candle-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-scent", name: { zh: "香型", en: "Scent" },
          values: [
            { id: "v-cedar", name: { zh: "雪松", en: "Cedarwood" } },
            { id: "v-moss", name: { zh: "苔藓与雨", en: "Moss & Rain" } },
          ],
        },
      ],
      variants: [
        { id: "g5-a", selection: { "o-scent": "v-cedar" }, price: 3200, stock: 25 },
        { id: "g5-b", selection: { "o-scent": "v-moss" }, price: 3200, stock: 14 },
      ],
    },
    {
      id: "g6", slug: "brass-catch-all", active: true, createdAt: "2026-07-20 10:00",
      // 故意没有中文译文
      name: { en: "Brass Catch-All Tray" },
      story: { en: "Pressed from one sheet of solid brass, unplating; it darkens honestly with age. For keys, watches and rings. 8×5in." },
      images: [pic("np-brass-tray-1", 1200, 1500), pic("np-brass-tray-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [],
      variants: [{ id: "g6-a", selection: {}, price: 3600, stock: 7 }],
    },
    {
      id: "g7", slug: "table-runner", active: true, createdAt: "2026-07-20 10:00",
      name: { zh: "棉麻长桌旗", en: "Cotton Table Runner" },
      story: {
        zh: "棉麻混纺，本色带麻结，藏蓝近黑。可铺餐桌或玄关柜。",
        en: "Cotton-linen blend with honest slubs in Natural, near-black Navy. Table or entry console.",
      },
      images: [pic("np-runner-1", 1200, 1500), pic("np-runner-2", 1200, 1500)],
      categoryIds: ["c-dining"],
      options: [
        {
          id: "o-color", name: { zh: "颜色", en: "Color" },
          values: [
            { id: "v-natural", name: { zh: "本色", en: "Natural" } },
            { id: "v-navy", name: { zh: "藏蓝", en: "Navy" } },
          ],
        },
      ],
      variants: [
        { id: "g7-a", selection: { "o-color": "v-natural" }, price: 2800, stock: 11 },
        { id: "g7-b", selection: { "o-color": "v-navy" }, price: 2800, stock: 10 },
      ],
    },
    {
      id: "g8", slug: "woven-basket", active: true, createdAt: "2026-07-25 10:00",
      name: { zh: "藤编收纳篮", en: "Woven Storage Basket" },
      story: {
        zh: "天然藤条手工编织，带提手。小号放杂物，中号放杂志。藤色会随时间变深。",
        en: "Hand-woven natural rattan with handles. Small for cables; Medium for magazines. Darkens slowly.",
      },
      images: [pic("np-basket-1", 1200, 1500), pic("np-basket-2", 1200, 1500)],
      categoryIds: ["c-living"],
      options: [
        {
          id: "o-size", name: { zh: "尺寸", en: "Size" },
          values: [
            { id: "v-s", name: { zh: "小", en: "Small" } },
            { id: "v-m", name: { zh: "中", en: "Medium" } },
          ],
        },
      ],
      variants: [
        { id: "g8-a", selection: { "o-size": "v-s" }, price: 3400, stock: 16 },
        { id: "g8-b", selection: { "o-size": "v-m" }, price: 4200, stock: 12 },
      ],
    },
  ];
}

/* ---------------- 付款 / 配送 / 优惠码 / 说明页 ---------------- */

function cnRates(): ShippingRate[] {
  return [
    { id: "r-std", name: { zh: "标准快递", en: "Standard courier" }, price: 800, freeOver: 19900 },
    { id: "r-sf", name: { zh: "顺丰特快", en: "SF express" }, price: 1800 },
  ];
}

function globalRates(): ShippingRate[] {
  return [
    { id: "r-std", name: { zh: "标准配送", en: "Standard shipping" }, price: 600, freeOver: 12000 },
    { id: "r-exp", name: { zh: "特快", en: "Express" }, price: 1800 },
  ];
}

function cnPolicies(): Policy[] {
  return [
    { slug: "privacy", title: { zh: "隐私", en: "Privacy" }, body: { zh: "", en: "" } },
    { slug: "terms", title: { zh: "服务条款", en: "Terms of Service" }, body: { zh: "", en: "" } },
    {
      slug: "returns",
      title: { zh: "退货说明", en: "Returns" },
      body: {
        zh: "收到货 7 天内可以申请退货。未发货的订单，店主同意后立即退款；已发货的订单，同意后请把商品寄回，店主收到并确认后退款。质量问题退货运费由店主承担，其它情况运费由顾客承担。定制类商品不支持退货。",
        en: "Request a return within 7 days of delivery. Unshipped orders refund right after approval; shipped orders refund once the item arrives back. We cover return shipping for defects; otherwise it is on the shopper.",
      },
    },
    {
      slug: "shipping",
      title: { zh: "运费说明", en: "Shipping" },
      body: {
        zh: "下单后 48 小时内发货，默认标准快递 3-5 天送达，顺丰特快 1-2 天。标准快递 ¥8，订单满 ¥199 免邮；顺丰特快 ¥18。偏远地区可能多 1-2 天。发货后会邮件告知运单号。",
        en: "Orders ship within 48 hours. Standard delivery takes 3-5 days at ¥8, free over ¥199. SF express takes 1-2 days at ¥18. Remote areas may add 1-2 days. You get the tracking by email.",
      },
    },
  ];
}

function globalPolicies(): Policy[] {
  return [
    { slug: "privacy", title: { zh: "隐私", en: "Privacy" }, body: { zh: "", en: "" } },
    { slug: "terms", title: { zh: "服务条款", en: "Terms of Service" }, body: { zh: "", en: "" } },
    {
      slug: "returns",
      title: { zh: "退货说明", en: "Returns" },
      // 中文译文故意留空：演示说明页内容也回退主语言
      body: {
        en: "Request a return within 14 days of delivery. Unshipped orders refund right after approval; shipped orders refund once the item arrives back. We cover return shipping for defects; otherwise it is on the shopper.",
      },
    },
    {
      slug: "shipping",
      title: { zh: "运费说明", en: "Shipping" },
      body: {
        zh: "下单后 48 小时内发货，标准配送 5-12 个工作日送达，特快 2-4 个工作日。标准配送 $6，满 $120 免邮；特快 $18。发货后会邮件告知运单号。",
        en: "Orders ship within 48 hours. Standard delivery takes 5-12 business days at $6, free over $120. Express takes 2-4 business days at $18. You get the tracking by email.",
      },
    },
  ];
}

/* ---------------- 预置订单（顾客 jane 的一旧一新） ---------------- */

function cnOrders(): Order[] {
  return [
    {
      id: "o-cn-1023", number: "CN-1023", createdAt: "2026-08-22 10:12", shopperEmail: "jane@demo.shop",
      lines: [
        { productId: "p2", variantId: "p2-a", name: "亚麻抱枕套", variantLabel: "燕麦 / 45×45", price: 6800, qty: 2, image: pic("shimu-linen-pillow-1", 200, 250) },
        { productId: "p5", variantId: "p5-a", name: "大豆蜡烛", variantLabel: "雪松", price: 13800, qty: 1, image: pic("shimu-candle-1", 200, 250) },
      ],
      address: { name: "小简", phone: "138 0013 8000", line1: "朝阳区望京街道阜通东大街 6 号", line2: "方恒国际中心 B 座 1204", city: "北京市", region: "北京市", zip: "100102", country: "中国" },
      shippingRateId: "r-std", shippingName: "标准快递", shippingPrice: 0,
      discountCode: "WELCOME10", discountOff: 2740,
      subtotal: 27400, total: 24660, method: "alipay", status: "paid",
    },
    {
      id: "o-cn-1021", number: "CN-1021", createdAt: "2026-08-18 09:41", shopperEmail: "jane@demo.shop",
      lines: [
        { productId: "p4", variantId: "p4-a", name: "羊毛针织盖毯", variantLabel: "", price: 36800, qty: 1, image: pic("shimu-wool-throw-1", 200, 250) },
        { productId: "p3", variantId: "p3-a", name: "手作马克杯", variantLabel: "月白", price: 9600, qty: 1, image: pic("shimu-mug-1", 200, 250) },
      ],
      address: { name: "小简", phone: "138 0013 8000", line1: "朝阳区望京街道阜通东大街 6 号", line2: "方恒国际中心 B 座 1204", city: "北京市", region: "北京市", zip: "100102", country: "中国" },
      shippingRateId: "r-std", shippingName: "标准快递", shippingPrice: 0,
      discountOff: 0, subtotal: 46400, total: 46400, method: "alipay",
      status: "shipped", tracking: "SF1357246808812", shippedAt: "2026-08-19 15:20",
    },
  ];
}

function globalOrders(): Order[] {
  return [
    {
      id: "o-ge-2033", number: "GE-2033", createdAt: "2026-08-22 10:12", shopperEmail: "jane@demo.shop",
      lines: [
        { productId: "g4", variantId: "g4-a", name: "Wool Knit Throw", variantLabel: "", price: 5800, qty: 1, image: pic("np-wool-throw-1", 200, 250) },
      ],
      address: { name: "Jane Weaver", phone: "+1 (555) 014-2890", line1: "228 S Clinton St", line2: "Apt 4B", city: "Chicago", region: "IL", zip: "60661", country: "United States" },
      shippingRateId: "r-std", shippingName: "Standard shipping", shippingPrice: 600,
      discountCode: "WELCOME10", discountOff: 580,
      subtotal: 5800, total: 5820, method: "paypal", status: "paid",
    },
    {
      id: "o-ge-2031", number: "GE-2031", createdAt: "2026-08-17 16:05", shopperEmail: "jane@demo.shop",
      lines: [
        { productId: "g2", variantId: "g2-a", name: "Linen Pillow Cover", variantLabel: "Oat / 18in", price: 1800, qty: 2, image: pic("np-linen-pillow-1", 200, 250) },
        { productId: "g5", variantId: "g5-a", name: "Soy Candle", variantLabel: "Cedarwood", price: 3200, qty: 1, image: pic("np-candle-1", 200, 250) },
      ],
      address: { name: "Jane Weaver", phone: "+1 (555) 014-2890", line1: "228 S Clinton St", line2: "Apt 4B", city: "Chicago", region: "IL", zip: "60661", country: "United States" },
      shippingRateId: "r-std", shippingName: "Standard shipping", shippingPrice: 600,
      discountOff: 0, subtotal: 6800, total: 7400, method: "stripe",
      status: "shipped", tracking: "1Z999AA10123456784", shippedAt: "2026-08-18 09:30",
    },
  ];
}

/* ---------------- settings 与组装 ---------------- */

function cnSettings(): Settings {
  return {
    name: "拾木家居",
    contactEmail: "hello@shimu.example",
    primaryLocale: "zh",
    locales: ["zh"],
    accounting: "CNY",
    currencies: [{ code: "CNY", rate: 1 }],
    ownerLocale: "zh",
    payments: { alipay: true, paypal: false, stripe: false },
    smtp: { host: "smtp.example.com", port: "465", user: "notice@shimu.example", pass: "", from: "notice@shimu.example" },
    chatEnabled: true,
    icp: "京ICP备2026123456号-1",
    policeRecord: "京公网安备11010502088888号",
  };
}

function globalSettings(): Settings {
  return {
    name: "North & Pine",
    contactEmail: "hello@northandpine.example",
    primaryLocale: "en",
    locales: ["en", "zh"],
    accounting: "USD",
    currencies: [
      { code: "USD", rate: 1 },
      { code: "EUR", rate: 0.92 },
      { code: "GBP", rate: 0.79 },
    ],
    ownerLocale: "en",
    payments: { alipay: false, paypal: true, stripe: true },
    smtp: { host: "smtp.example.com", port: "587", user: "notice@northandpine.example", pass: "", from: "notice@northandpine.example" },
    chatEnabled: true,
  };
}

export function makeSeed(flavor: Flavor): FlavorState {
  const isCn = flavor === "cn";
  const discounts: Discount[] = [{ id: "d1", code: "WELCOME10", percent: 10, active: true }];
  return {
    settings: isCn ? cnSettings() : globalSettings(),
    categories: isCn ? cnCategories() : globalCategories(),
    products: isCn ? cnProducts() : globalProducts(),
    discounts,
    shippingRates: isCn ? cnRates() : globalRates(),
    policies: isCn ? cnPolicies() : globalPolicies(),
    orders: isCn ? cnOrders() : globalOrders(),
    shoppers: DEMO_SHOPPERS,
    threads: [],
    cart: [],
    seq: 100,
  };
}

/** 默认空白店：刚部署完、老板还没动过的样子 */
export function makeBlank(flavor: Flavor): FlavorState {
  const isCn = flavor === "cn";
  const rates: ShippingRate[] = isCn
    ? [{ id: "r-std", name: { zh: "标准快递", en: "Standard courier" }, price: 800 }]
    : [{ id: "r-std", name: { zh: "标准配送", en: "Standard shipping" }, price: 600 }];
  return {
    settings: {
      name: isCn ? "我的店" : "My Shop",
      primaryLocale: isCn ? "zh" : "en",
      locales: [isCn ? "zh" : "en"],
      accounting: isCn ? "CNY" : "USD",
      currencies: [{ code: isCn ? "CNY" : "USD", rate: 1 }],
      ownerLocale: isCn ? "zh" : "en",
      payments: isCn ? { alipay: true, paypal: false, stripe: false } : { alipay: false, paypal: true, stripe: true },
      smtp: { host: "", port: "", user: "", pass: "", from: "" },
      chatEnabled: true,
    },
    categories: [],
    products: [],
    discounts: [],
    shippingRates: rates,
    policies: defaultPolicyTitles(flavor),
    orders: [],
    shoppers: DEMO_SHOPPERS,
    threads: [],
    cart: [],
    seq: 0,
  };
}
