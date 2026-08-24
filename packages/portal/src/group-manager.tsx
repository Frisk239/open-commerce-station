import { pickLocalizedText } from "@ocs/core";
import type { CatalogGroupView, LocaleCode, StationFlavor } from "@ocs/core";

interface GroupManagerProps {
  readonly flavor: StationFlavor;
  readonly groups: readonly CatalogGroupView[];
  readonly saveAction: (formData: FormData) => void | Promise<void>;
  readonly deleteAction: (formData: FormData) => void | Promise<void>;
  readonly saved?: boolean;
  readonly error?: "invalid-fields" | "not-found";
}

const copy = {
  cn: { eyebrow: "商家后台 · 分组", title: "商品分组", intro: "分组可留空、嵌套与排序；删除分组不会删除商品。", create: "新建分组", name: "分组名", parent: "上级分组", root: "无上级", position: "排序", save: "保存", remove: "删除", saved: "分组已保存。", error: "没有保存：请检查名称、排序和嵌套关系。" },
  global: { eyebrow: "Merchant Portal · Groups", title: "Product groups", intro: "Groups may be empty, nested, and ordered. Deleting a Group never deletes Products.", create: "New group", name: "Group name", parent: "Parent Group", root: "No parent", position: "Position", save: "Save", remove: "Delete", saved: "Group saved.", error: "Not saved: check the name, position, and nesting." },
} as const;

function GroupFields({ locale, labels, groups, group }: { readonly locale: LocaleCode; readonly labels: typeof copy[StationFlavor]; readonly groups: readonly CatalogGroupView[]; readonly group?: CatalogGroupView }) {
  return (
    <>
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <label className="text-xs font-semibold text-stone-600">{labels.name}<input name="name" required maxLength={160} defaultValue={group ? pickLocalizedText(group.name, locale, locale) : ""} className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-950" /></label>
      <label className="text-xs font-semibold text-stone-600">{labels.parent}<select name="parentId" defaultValue={group?.parentId ?? ""} className="mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-950"><option value="">{labels.root}</option>{groups.filter((candidate) => candidate.id !== group?.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{pickLocalizedText(candidate.name, locale, locale)}</option>)}</select></label>
      <label className="text-xs font-semibold text-stone-600">{labels.position}<input name="position" required type="number" min="0" step="1" defaultValue={group?.position ?? groups.length} className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-950" /></label>
    </>
  );
}

export function GroupManager({ flavor, groups, saveAction, deleteAction, saved, error }: GroupManagerProps) {
  const locale: LocaleCode = flavor === "cn" ? "zh" : "en";
  const labels = copy[flavor];
  return (
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{labels.eyebrow}</p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">{labels.title}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-stone-600">{labels.intro}</p>
      {saved ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{labels.saved}</p> : null}
      {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{labels.error}</p> : null}

      <form action={saveAction} className="mt-8 grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:grid-cols-[2fr_2fr_1fr_auto] md:items-end md:p-7">
        <GroupFields locale={locale} labels={labels} groups={groups} />
        <button type="submit" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white">{labels.create}</button>
      </form>

      <div className="mt-6 space-y-3">
        {groups.map((group) => (
          <div key={group.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:grid-cols-[2fr_2fr_1fr_auto_auto] md:items-end">
            <form action={saveAction} className="contents"><GroupFields locale={locale} labels={labels} groups={groups} group={group} /><button type="submit" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">{labels.save}</button></form>
            <form action={deleteAction}><input type="hidden" name="id" value={group.id} /><button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-red-700">{labels.remove}</button></form>
          </div>
        ))}
      </div>
    </section>
  );
}
