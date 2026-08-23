"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, TrashSimple, X } from "@phosphor-icons/react/dist/ssr";
import { Button, Card, Input, Textarea, Toggle } from "@/components/ui";
import { pic, regenSeed } from "@/lib/img";
import { useFlavorState, useT } from "@/lib/hooks";
import { useShop } from "@/mock/store";
import type { LocaleCode, Flavor, Product } from "@/lib/types";

interface OptRow {
  id: string;
  namePrimary: string;
  nameSecond: string;
  valuesPrimary: string;
  valuesSecond: string;
}

interface MatrixRow {
  key: string;
  selection: Record<string, string>;
  labels: string;
  price: string;
  compareAt: string;
  stock: string;
}

function parseValues(s: string): string[] {
  return s.split(/[,，、]/).map((v) => v.trim()).filter(Boolean);
}

function buildCombos(rows: OptRow[]): Array<{ key: string; selection: Record<string, string>; labels: string }> {
  const opts = rows
    .map((r) => ({
      id: r.id,
      values: parseValues(r.valuesPrimary).map((v, j) => ({ id: `${r.id}:${j}`, label: v })),
    }))
    .filter((o) => o.values.length > 0);
  if (opts.length === 0) return [{ key: "single", selection: {}, labels: "" }];
  let combos: Array<{ key: string; selection: Record<string, string>; labels: string }> = [
    { key: "", selection: {}, labels: "" },
  ];
  for (const opt of opts) {
    const next: typeof combos = [];
    for (const c of combos) {
      for (const v of opt.values) {
        next.push({
          key: `${c.key}|${v.id}`,
          selection: { ...c.selection, [opt.id]: v.id },
          labels: c.labels ? `${c.labels} / ${v.label}` : v.label,
        });
      }
    }
    combos = next;
  }
  return combos;
}

export default function ProductEditor({ params }: { params: Promise<{ flavor: string; id: string }> }) {
  const { flavor, id } = use(params);
  if (flavor !== "cn" && flavor !== "global") notFound();
  const f = flavor as Flavor;

  const st = useFlavorState(f);
  const t = useT(f, "portal");
  const saveProduct = useShop((s) => s.saveProduct);
  const deleteProduct = useShop((s) => s.deleteProduct);
  const toast = useShop((s) => s.toast);
  const router = useRouter();

  const existing = id === "new" ? undefined : st.products.find((p) => p.id === id);
  const isNew = !existing;

  const primary = st.settings.primaryLocale;
  const second: LocaleCode | null = st.settings.locales.find((l) => l !== primary) ?? null;

  const [nameP, setNameP] = useState(existing ? (existing.name[primary] ?? "") : "");
  const [nameS, setNameS] = useState(existing && second ? (existing.name[second] ?? "") : "");
  const [storyP, setStoryP] = useState(existing ? (existing.story[primary] ?? "") : "");
  const [storyS, setStoryS] = useState(existing && second ? (existing.story[second] ?? "") : "");
  const [images, setImages] = useState<string[]>(existing ? existing.images : []);
  const [catIds, setCatIds] = useState<string[]>(existing ? existing.categoryIds : []);
  const [active, setActive] = useState(existing ? existing.active : true);
  const [optRows, setOptRows] = useState<OptRow[]>(() => {
    if (!existing || existing.options.length === 0) return [];
    return existing.options.map((o) => {
      const row: OptRow = {
        id: o.id,
        namePrimary: o.name[primary] ?? "",
        nameSecond: second ? (o.name[second] ?? "") : "",
        valuesPrimary: o.values.map((v) => v.name[primary] ?? "").join(", "),
        valuesSecond: second ? o.values.map((v) => v.name[second] ?? "").join(", ") : "",
      };
      return row;
    });
  });
  const [matrixByRow, setMatrixByRow] = useState<Record<string, MatrixRow>>(() => {
    // 把已有款式的 valueId 映射到「行id:序号」的新组合键，保证编辑时价格库存不丢
    const init: Record<string, MatrixRow> = {};
    if (existing) {
      for (const v of existing.variants) {
        const selection: Record<string, string> = {};
        const labels: string[] = [];
        for (const o of existing.options) {
          const idx = o.values.findIndex((x) => x.id === v.selection[o.id]);
          if (idx >= 0) {
            selection[o.id] = `${o.id}:${idx}`;
            labels.push(o.values[idx].name[primary] ?? "");
          }
        }
        const key =
          existing.options.map((o) => `${o.id}:${selection[o.id] ?? ""}`).join("|") || "single";
        init[key] = {
          key,
          selection,
          labels: labels.filter(Boolean).join(" / "),
          price: (v.price / 100).toString(),
          compareAt: v.compareAt ? (v.compareAt / 100).toString() : "",
          stock: v.stock.toString(),
        };
      }
    }
    return init;
  });
  const [errors, setErrors] = useState<string[]>([]);

  const combos = useMemo(() => buildCombos(optRows), [optRows]);
  const firstPrice = Object.values(matrixByRow)[0]?.price ?? "";
  const currency = st.settings.accounting;
  const primaryName = primary === "zh" ? "中文" : "English";
  const secondName = second === "zh" ? "中文" : "English";

  const setCell = (key: string, patch: Partial<MatrixRow>) =>
    setMatrixByRow((m) => {
      const row =
        m[key] ?? { key, selection: {}, labels: combos.find((c) => c.key === key)?.labels ?? "", price: firstPrice, compareAt: "", stock: "0" };
      return { ...m, [key]: { ...row, ...patch } };
    });

  const shufflePhotos = () => {
    const seed = regenSeed(existing?.id ?? "new");
    setImages([pic(seed, 1200, 1500), pic(`${seed}-2`, 1200, 1500), pic(`${seed}-3`, 1200, 1500)]);
  };

  const save = () => {
    const errs: string[] = [];
    if (!nameP.trim()) errs.push(t("p.products.nameRequired"));
    if (images.length === 0) errs.push(t("p.products.needImage"));
    setErrors(errs);
    if (errs.length > 0) return;

    const name: Product["name"] = { [primary]: nameP.trim() } as Product["name"];
    if (second && nameS.trim()) name[second] = nameS.trim();
    const story: Product["story"] = { [primary]: storyP.trim() } as Product["story"];
    if (second && storyS.trim()) story[second] = storyS.trim();

    const options = optRows
      .map((r) => {
        const valsP = parseValues(r.valuesPrimary);
        const valsS = second ? parseValues(r.valuesSecond) : [];
        return {
          id: r.id,
          name: ({ [primary]: r.namePrimary.trim(), ...(second && r.nameSecond.trim() ? { [second]: r.nameSecond.trim() } : {}) }) as Product["options"][number]["name"],
          values: valsP.map((v, j) => ({
            id: `${r.id}:${j}`,
            name: ({ [primary]: v, ...(second && valsS[j] ? { [second]: valsS[j] } : {}) }) as Product["options"][number]["values"][number]["name"],
          })),
        };
      })
      .filter((o) => o.values.length > 0);

    const variants = combos.map((c) => {
      const row = matrixByRow[c.key];
      return {
        id: existing?.variants.find((v) => {
          const k = options.map((o) => `${o.id}:${v.selection[o.id] ?? ""}`).join("|") || "single";
          return k === c.key;
        })?.id ?? `v-${c.key}-${Math.random().toString(36).slice(2, 7)}`,
        selection: c.selection,
        price: Math.round(parseFloat(row?.price || "0") * 100) || 0,
        compareAt: row?.compareAt ? Math.round(parseFloat(row.compareAt) * 100) : undefined,
        stock: Math.max(0, parseInt(row?.stock || "0", 10) || 0),
      };
    });

    const product: Product = {
      id: existing?.id ?? `prod-${Date.now().toString(36)}`,
      slug: existing?.slug ?? `p-${Date.now().toString(36)}`,
      name,
      story,
      images,
      categoryIds: catIds,
      options,
      variants,
      active,
      createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    saveProduct(f, product);
    toast(t("p.products.saved"));
    router.push(`/${f}/portal/products`);
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/${f}/portal/products`} className="rounded-lg p-1.5 text-ink-soft hover:bg-mist hover:text-ink">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {isNew ? t("p.products.formNew") : t("p.products.formEdit")}
          </h1>
        </div>
        {existing ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (window.confirm(t("p.products.deleteConfirm"))) {
                deleteProduct(f, existing.id);
                router.push(`/${f}/portal/products`);
              }
            }}
          >
            <TrashSimple size={14} />
            {t("p.products.delete")}
          </Button>
        ) : null}
      </div>

      {/* 照片 */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{t("p.products.imagesTitle")}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={shufflePhotos}>
              {t("p.products.regenPhotos")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setImages((imgs) => [...imgs, pic(regenSeed("extra"), 1200, 1500)])}
            >
              <Plus size={13} />
              {t("p.products.addPhoto")}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {images.map((img, i) => (
            <div key={`${img}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="photo h-24 w-20 rounded-lg border border-line object-cover" />
              <button
                type="button"
                aria-label="remove"
                onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white"
              >
                <X size={11} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* 名字与介绍 */}
      <Card className="space-y-4 p-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            {t("p.products.nameTitle")} · {t("p.products.primaryLang")}（{primaryName}）
          </p>
          <Input value={nameP} onChange={(e) => setNameP(e.target.value)} />
        </div>
        {second ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">
              {t("p.products.nameTitle")} · {t("p.products.translation")}（{secondName}）
            </p>
            <Input value={nameS} onChange={(e) => setNameS(e.target.value)} />
          </div>
        ) : null}
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">
            {t("p.products.storyTitle")} · {primaryName}
          </p>
          <Textarea rows={3} value={storyP} onChange={(e) => setStoryP(e.target.value)} />
        </div>
        {second ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">
              {t("p.products.storyTitle")} · {secondName}
            </p>
            <Textarea rows={3} value={storyS} onChange={(e) => setStoryS(e.target.value)} />
          </div>
        ) : null}
      </Card>

      {/* 状态与分类 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.products.statusTitle")}</p>
          <div className="mt-3 flex items-center gap-3">
            <Toggle on={active} onChange={setActive} label={t("p.products.statusTitle")} />
            <p className="text-sm text-ink-soft">{active ? t("p.products.active") : t("p.products.draft")}</p>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">{t("p.products.catsTitle")}</p>
          {st.categories.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-soft">{t("p.cats.empty")}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              {st.categories.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={catIds.includes(c.id)}
                    onChange={(e) =>
                      setCatIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))
                    }
                    className="h-4 w-4 accent-pine-700"
                  />
                  {c.name[primary] ?? Object.values(c.name)[0]}
                </label>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 选项 */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{t("p.products.optionsTitle")}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setOptRows((rows) => [
                ...rows,
                { id: `o-${Date.now().toString(36)}`, namePrimary: "", nameSecond: "", valuesPrimary: "", valuesSecond: "" },
              ])
            }
          >
            <Plus size={13} />
            {t("p.products.addOption")}
          </Button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t("p.products.optionsHint")}</p>

        {optRows.length === 0 ? (
          <p className="mt-4 rounded-lg bg-mist px-4 py-3 text-[13px] text-ink-soft">{t("p.products.singleVariantHint")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {optRows.map((row, idx) => (
              <div key={row.id} className="grid gap-2.5 rounded-lg border border-line-soft p-3.5 sm:grid-cols-2">
                <div className="space-y-2.5">
                  <Input
                    value={row.namePrimary}
                    onChange={(e) =>
                      setOptRows((rows) => rows.map((r, i) => (i === idx ? { ...r, namePrimary: e.target.value } : r)))
                    }
                    placeholder={`${t("p.products.optionName")}（${primaryName}）`}
                  />
                  <Input
                    value={row.valuesPrimary}
                    onChange={(e) =>
                      setOptRows((rows) => rows.map((r, i) => (i === idx ? { ...r, valuesPrimary: e.target.value } : r)))
                    }
                    placeholder={`${t("p.products.optionValues")}（${primaryName}）`}
                  />
                </div>
                {second ? (
                  <div className="space-y-2.5">
                    <Input
                      value={row.nameSecond}
                      onChange={(e) =>
                        setOptRows((rows) => rows.map((r, i) => (i === idx ? { ...r, nameSecond: e.target.value } : r)))
                      }
                      placeholder={`${t("p.products.optionName")}（${secondName}）`}
                    />
                    <Input
                      value={row.valuesSecond}
                      onChange={(e) =>
                        setOptRows((rows) => rows.map((r, i) => (i === idx ? { ...r, valuesSecond: e.target.value } : r)))
                      }
                      placeholder={`${t("p.products.optionValues")}（${secondName}）`}
                    />
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setOptRows((rows) => rows.filter((_, i) => i !== idx))}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    {t("p.disc.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 款式与库存 */}
      <Card className="overflow-x-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-5 py-3.5">
          <p className="text-sm font-semibold text-ink">{t("p.products.variantsTitle")}</p>
          <p className="text-xs text-ink-soft">
            {currency} · {t("p.products.stockHint")}
          </p>
        </div>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line-soft text-left text-xs text-ink-faint">
              <th className="px-5 py-2.5 font-medium">{t("p.products.variants")}</th>
              <th className="px-3 py-2.5 font-medium">{t("p.products.priceCol")}</th>
              <th className="px-3 py-2.5 font-medium">{t("p.products.compareCol")}</th>
              <th className="px-5 py-2.5 font-medium">{t("p.products.stockCol")}</th>
            </tr>
          </thead>
          <tbody>
            {combos.map((c) => {
              const row = matrixByRow[c.key];
              const price = row?.price ?? firstPrice;
              const compareAt = row?.compareAt ?? "";
              const stock = row?.stock ?? "0";
              return (
                <tr key={c.key} className="border-b border-line-soft last:border-b-0">
                  <td className="px-5 py-2.5 text-ink">{c.labels || "-"}</td>
                  <td className="px-3 py-2.5">
                    <Input
                      value={price}
                      inputMode="decimal"
                      onChange={(e) => setCell(c.key, { price: e.target.value })}
                      className="h-8 w-24"
                      aria-label={`${t("p.products.priceCol")} ${c.labels}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      value={compareAt}
                      inputMode="decimal"
                      onChange={(e) => setCell(c.key, { compareAt: e.target.value })}
                      className="h-8 w-24"
                      aria-label={`${t("p.products.compareCol")} ${c.labels}`}
                    />
                  </td>
                  <td className="px-5 py-2.5">
                    <Input
                      value={stock}
                      inputMode="numeric"
                      onChange={(e) => setCell(c.key, { stock: e.target.value })}
                      className="h-8 w-20"
                      aria-label={`${t("p.products.stockCol")} ${c.labels}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-mist/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href={`/${f}/portal/products`} className="text-sm text-ink-soft hover:text-ink hover:underline">
            {t("p.products.backToList")}
          </Link>
          <Button onClick={save}>{t("p.products.save")}</Button>
        </div>
      </div>
    </div>
  );
}
