import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-neutral-600">{sub}</p>}
    </div>
  );
}

const btn = {
  primary: "bg-wine text-white hover:bg-wine-dark",
  secondary: "border border-neutral-300 bg-white text-ink hover:bg-neutral-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-wine hover:bg-wine-light",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof btn }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-50 ${btn[variant]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof btn }) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${btn[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-wine focus:ring-2 focus:ring-wine/20"
      {...props}
    />
  );
}

export function Select(props: ComponentProps<"select">) {
  return (
    <select
      className="h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-wine focus:ring-2 focus:ring-wine/20"
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600">
      {children}
    </label>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    error: "border-red-300 bg-red-50 text-red-800",
    ok: "border-green-300 bg-green-50 text-green-900",
  }[kind];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${c}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "open" | "closed" | "visible" | "wine" }) {
  const c = {
    neutral: "bg-neutral-100 text-neutral-700",
    open: "bg-green-100 text-green-800",
    closed: "bg-neutral-800 text-white",
    visible: "bg-amber-100 text-amber-900",
    wine: "bg-wine-light text-wine",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Place({ n }: { n: number }) {
  const medal = n === 1 ? "bg-gold text-white" : n === 2 ? "bg-neutral-400 text-white" : n === 3 ? "bg-amber-700 text-white" : "bg-neutral-100 text-neutral-700";
  return <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold ${medal}`}>{n}</span>;
}

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${small ? "h-8 w-8 text-base" : "h-10 w-10 text-lg"} inline-flex items-center justify-center rounded-full bg-wine font-bold text-white`}>RN</span>
      <span className={`${small ? "text-base" : "text-lg"} font-bold tracking-tight`}>Raks Noor Festival</span>
    </div>
  );
}
