import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Diet } from "@/lib/billing";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "bg-surface text-ink border border-line hover:border-ink-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "text-bad hover:bg-bad/10",
};
const sizeClass = {
  sm: "h-9 px-3 text-[0.875rem] gap-1.5 rounded-md",
  md: "h-11 px-4 text-[1rem] gap-2 rounded-lg",
  lg: "h-14 px-6 text-[1.125rem] gap-2 rounded-lg",
};

export function buttonClass(variant: Variant = "secondary", size: keyof typeof sizeClass = "md", extra = "") {
  return `press inline-flex select-none items-center justify-center font-[600] whitespace-nowrap disabled:opacity-45 disabled:pointer-events-none ${variantClass[variant]} ${sizeClass[size]} ${extra}`;
}

export function Button({ variant = "secondary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizeClass }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "secondary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizeClass }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/** A sheet of paper on the counter: flat, no shadow. Hierarchy comes from tone, not elevation. */
export function Sheet({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-xl border border-line bg-surface ${className}`} {...props} />;
}

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`grid content-start gap-1.5 ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="text-[0.875rem] text-bad">{error}</span> : hint ? <span className="text-[0.875rem] leading-snug text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-[1rem] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 aria-invalid:border-bad";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`${inputClass} appearance-none bg-[length:12px] bg-[right_0.85rem_center] bg-no-repeat pr-9 ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5' fill='none' stroke='%235b628a' stroke-width='1.6'/%3E%3C/svg%3E\")" }}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} h-auto min-h-20 py-2.5 ${className}`} {...props} />;
}

/** Segmented control: a row of mutually exclusive choices. */
export function Segmented<T extends string>({ value, onChange, options, label, className = "" }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-lg border border-line bg-surface-2/60 p-[3px] ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`press h-9 flex-1 rounded-md px-3 text-[0.9375rem] font-[560] ${value === o.value ? "bg-surface text-ink ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The FSSAI veg / non-veg / egg square every Indian menu uses. */
export function DietMark({ diet, className = "" }: { diet: Diet; className?: string }) {
  const color = diet === "veg" ? "#1f8a3b" : diet === "egg" ? "#c9930b" : "#b3261e";
  const label = diet === "veg" ? "Veg" : diet === "egg" ? "Contains egg" : "Non-veg";
  return (
    <span role="img" aria-label={label} title={label} className={`inline-grid size-3.5 shrink-0 place-items-center rounded-[3px] border-[1.5px] bg-white ${className}`} style={{ borderColor: color }}>
      {diet === "nonveg" ? (
        <svg viewBox="0 0 10 10" className="size-2">
          <path d="M5 1.5 9 8.5H1Z" fill={color} />
        </svg>
      ) : (
        <span className="size-1.5 rounded-full" style={{ background: color }} />
      )}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-10">
      <div className="min-w-0">
        <h1 className="display">{title}</h1>
        {description && <div className="lede mt-3">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Nothing here yet: a dashed tear-line box that says what to do next. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-xl border-2 border-dashed border-line px-6 py-10 sm:px-10 sm:py-14">
      <h2 className="title">{title}</h2>
      {children && <div className="max-w-[56ch] text-[1rem] text-ink-2">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
