"use client";

import Link from "next/link";
import { useFlavorState, useT, useLocale } from "@/lib/hooks";
import { pickText, type Flavor } from "@/lib/types";

export function Footer({ flavor }: { flavor: Flavor }) {
  const st = useFlavorState(flavor);
  const t = useT(flavor);
  const locale = useLocale(flavor);
  const s = st.settings;
  const year = 2026;

  return (
    <footer className="mt-24 border-t border-line bg-mist/60">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm" aria-label="policies">
          {st.policies.map((p) => (
            <Link
              key={p.slug}
              href={`/${flavor}/pages/${p.slug}`}
              className="text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              {pickText(p.title, locale, s.primaryLocale)}
            </Link>
          ))}
          {s.contactEmail ? (
            <a href={`mailto:${s.contactEmail}`} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
              {s.contactEmail}
            </a>
          ) : null}
        </nav>

        <p className="mt-6 text-sm text-ink-faint">
          {s.footerLine?.trim() ? s.footerLine : `© ${year} ${s.name}`}
        </p>

        {flavor === "cn" && (s.icp || s.policeRecord) ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint">
            {s.icp ? (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-ink-soft hover:underline"
              >
                {s.icp}
              </a>
            ) : null}
            {s.policeRecord ? (
              <a
                href={`https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent(s.policeRecord.replace(/[^0-9]/g, ""))}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-ink-soft hover:underline"
              >
                {s.policeBadgeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.policeBadgeUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                ) : null}
                {s.policeRecord}
              </a>
            ) : null}
          </p>
        ) : null}

        <p className="mt-10 text-xs text-ink-faint/60">
          <Link href="/" className="hover:text-ink-faint">
            {t("footer.prototype")}
          </Link>
        </p>
      </div>
    </footer>
  );
}
