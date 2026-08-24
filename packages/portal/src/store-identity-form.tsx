import type { StationFlavor, StoreIdentity } from "@ocs/core";
import { FilePicker } from "./file-picker";

interface StoreIdentityFormProps {
  readonly flavor: StationFlavor;
  readonly identity: StoreIdentity & { name: string; footerLine: string };
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly saved: boolean;
  readonly error?: "invalid-fields" | "invalid-image";
}

const copy = {
  cn: {
    eyebrow: "商家后台 · 设置",
    title: "店铺资料",
    intro: "这一个页面决定店面页眉、浏览器标题和页脚里的公开身份。",
    preview: "当前公开显示",
    name: "店名",
    email: "顾客能看见的联系邮箱",
    footer: "页脚一行字",
    logo: "横版标志",
    favicon: "浏览器小图标",
    remove: "移除现有图片",
    save: "保存店铺资料",
    saved: "已保存。店面刷新后会读取同一份资料。",
    invalidFields: "没有保存：请检查必填店名、邮箱格式和字段长度。",
    invalidImage: "没有保存：图片必须是真实的 JPG、PNG 或 WebP，且不超过 5 MB。",
    chooseFile: "选择文件",
    noFileChosen: "未选择文件",
  },
  global: {
    eyebrow: "Merchant Portal · Settings",
    title: "Store identity",
    intro: "This one page controls the public identity in the Storefront header, browser title, and footer.",
    preview: "Public preview",
    name: "Store name",
    email: "Shopper-visible contact email",
    footer: "Footer line",
    logo: "Horizontal logo",
    favicon: "Browser icon",
    remove: "Remove current image",
    save: "Save Store identity",
    saved: "Saved. The Storefront reads this same persisted identity on refresh.",
    invalidFields: "Not saved: check the required name, email format, and field lengths.",
    invalidImage: "Not saved: images must be genuine JPG, PNG, or WebP files no larger than 5 MB.",
    chooseFile: "Choose file",
    noFileChosen: "No file chosen",
  },
} as const;

function ImageField({
  id,
  label,
  removeLabel,
  currentUrl,
  removeName,
  chooseFileLabel,
  noFileLabel,
}: {
  readonly id: string;
  readonly label: string;
  readonly removeLabel: string;
  readonly currentUrl?: string;
  readonly removeName: string;
  readonly chooseFileLabel: string;
  readonly noFileLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-stone-900">{label}</label>
      {currentUrl ? <img src={currentUrl} alt="" className="mt-3 h-14 max-w-52 rounded-lg border border-stone-200 bg-white object-contain p-2" /> : null}
      <FilePicker name={id} accept="image/jpeg,image/png,image/webp" buttonLabel={chooseFileLabel} placeholder={noFileLabel} />
      {currentUrl ? (
        <label className="mt-3 flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" name={removeName} className="size-4 accent-emerald-700" />
          {removeLabel}
        </label>
      ) : null}
    </div>
  );
}

export function StoreIdentityForm({ flavor, identity, action, saved, error }: StoreIdentityFormProps) {
  const labels = copy[flavor];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">{labels.eyebrow}</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.035em]">{labels.title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-600">{labels.intro}</p>

        {saved ? <p role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{labels.saved}</p> : null}
        {error ? <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error === "invalid-image" ? labels.invalidImage : labels.invalidFields}</p> : null}

        <form action={action} className="mt-8 space-y-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-7">
          <label className="block text-sm font-semibold text-stone-900">
            {labels.name}
            <input name="name" required maxLength={120} defaultValue={identity.name} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-stone-900">
            {labels.email}
            <input name="contactEmail" type="email" maxLength={320} defaultValue={identity.contactEmail ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-semibold text-stone-900">
            {labels.footer}
            <input name="footerLine" maxLength={240} defaultValue={identity.footerLine} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <ImageField id="logo" label={labels.logo} removeLabel={labels.remove} currentUrl={identity.logoUrl} removeName="removeLogo" chooseFileLabel={labels.chooseFile} noFileLabel={labels.noFileChosen} />
            <ImageField id="favicon" label={labels.favicon} removeLabel={labels.remove} currentUrl={identity.faviconUrl} removeName="removeFavicon" chooseFileLabel={labels.chooseFile} noFileLabel={labels.noFileChosen} />
          </div>

          {flavor === "cn" ? (
            <fieldset className="space-y-5 rounded-2xl border border-stone-200 p-4">
              <legend className="px-2 text-sm font-semibold">国内站备案信息</legend>
              <label className="block text-sm font-semibold">
                ICP 备案号
                <input name="icp" maxLength={120} defaultValue={identity.icp ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-semibold">
                公安备案号
                <input name="policeRecord" maxLength={120} defaultValue={identity.policeRecord ?? ""} className="mt-2 block w-full rounded-xl border border-stone-300 px-4 py-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <ImageField id="policeBadge" label="公安备案小图标" removeLabel={labels.remove} currentUrl={identity.policeBadgeUrl} removeName="removePoliceBadge" chooseFileLabel={labels.chooseFile} noFileLabel={labels.noFileChosen} />
            </fieldset>
          ) : null}

          <button type="submit" className="rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2">{labels.save}</button>
        </form>
      </section>

      <aside className="h-fit rounded-3xl bg-stone-950 p-6 text-white lg:sticky lg:top-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{labels.preview}</p>
        <div className="mt-8 flex min-h-24 items-center border-y border-white/15 py-5">
          {identity.logoUrl ? <img src={identity.logoUrl} alt={identity.name} className="max-h-14 max-w-full object-contain" /> : <span className="font-[family-name:var(--font-display)] text-2xl font-semibold">{identity.name}</span>}
        </div>
        {identity.contactEmail ? <p className="mt-5 break-all text-sm text-stone-300">{identity.contactEmail}</p> : null}
        <p className="mt-8 text-sm text-stone-400">{identity.footerLine}</p>
        {flavor === "cn" && identity.icp ? <p className="mt-3 text-xs text-stone-500">{identity.icp}</p> : null}
      </aside>
    </div>
  );
}
