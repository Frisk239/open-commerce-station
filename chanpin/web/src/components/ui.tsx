"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useEffect } from "react";
import { useShop } from "@/mock/store";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-pine-700 text-white hover:bg-pine-800 disabled:bg-pine-700/50",
  secondary: "bg-white border border-line text-ink hover:bg-mist",
  ghost: "text-ink hover:bg-mist",
  danger: "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink",
        "placeholder:text-ink-faint focus:border-pine-500 focus:outline-none",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink",
        "placeholder:text-ink-faint focus:border-pine-500 focus:outline-none",
        className,
      )}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink",
        "focus:border-pine-500 focus:outline-none",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs leading-relaxed text-ink-soft">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}

export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-full transition-colors",
        on ? "bg-pine-600" : "bg-line",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className="absolute rounded-full bg-white shadow transition-all"
        style={{ height: 18, width: 18, top: 2, left: on ? 20 : 2 }}
      />
    </button>
  );
}

type BadgeTone = "neutral" | "pine" | "amber" | "rose" | "sky";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-mist text-ink-soft",
  pine: "bg-pine-100 text-pine-800",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-800",
  sky: "bg-sky-100 text-sky-800",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-white", className)}>{children}</div>;
}

export function EmptyBlock({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? <div className="mb-4 text-ink-faint">{icon}</div> : null}
      <p className="text-base font-medium text-ink">{title}</p>
      {sub ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">{sub}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Toaster() {
  const toast = useShop((s) => s.ui.toast);
  const clear = useShop((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clear, 2600);
    return () => clearTimeout(timer);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-5 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg" role="status">
      {toast.text}
    </div>
  );
}
