import { cx } from "@/lib/format";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 text-ink", className)}>
      <svg width={compact ? 28 : 36} height={compact ? 28 : 36} viewBox="0 0 48 48" aria-hidden>
        <rect width="48" height="48" rx="14" fill="#527DFF" />
        <path d="M24 34v3" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19 37.5h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M24 11.5a7.2 7.2 0 0 1 7.2 7.2c0 2.8-1.6 4.6-3.1 6.1-.9.9-1.5 1.7-1.5 3h-5.2c0-1.3-.6-2.1-1.5-3-1.5-1.5-3.1-3.3-3.1-6.1A7.2 7.2 0 0 1 24 11.5Z"
          stroke="white"
          strokeWidth="2.2"
        />
        <path d="M13.5 18.8a11 11 0 0 1 21 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 18.8a14.5 14.5 0 0 1 28 0" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      </svg>
      <span className={cx("font-semibold tracking-tight", compact ? "text-sm" : "text-lg")}>
        Zello <span className="text-accent">CAD</span>
      </span>
    </span>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (url) {
    return <img src={url} alt="" width={size} height={size} className="rounded-xl object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="grid place-items-center rounded-xl bg-accent/20 font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {letters || "Z"}
    </span>
  );
}
