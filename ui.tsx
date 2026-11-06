"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { cx } from "@/lib/format";

export const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#10131B] px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-accent";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "ok" }) {
  const styles = {
    primary: "bg-accent text-white hover:brightness-110",
    ghost: "bg-panel text-ink hover:bg-[#31405c]",
    danger: "bg-danger text-white hover:brightness-110",
    ok: "bg-ok text-[#062117] hover:brightness-110",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Working...",
  variant = "primary",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "ghost" | "danger" | "ok";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function Banner({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>;
  if (success) return <div className="rounded-xl border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">{success}</div>;
  return null;
}

const NOTICES: Record<string, string> = {
  saved: "Changes saved.",
  doc: "Document added.",
  created: "Server created. The dispatch floor is ready.",
  joined: "You joined the server.",
  pending: "Join request submitted. A server manager will review it.",
  left: "You left the server.",
  deleted: "Server deleted.",
  invite: "Invitation created.",
  revoked: "Invitation revoked.",
  reviewed: "Decision saved.",
  role: "Role updated.",
  removed: "Member removed.",
  announced: "Announcement sent to server members.",
  transferred: "Ownership transferred.",
  applied: "Application submitted.",
  cancelled: "Application cancelled.",
  status: "Status updated.",
  sent: "Message added to the radio log.",
  marker: "Marker removed.",
};

export function QueryBanner({ error, notice }: { error?: string; notice?: string }) {
  if (error) return <Banner error={error} />;
  if (notice && NOTICES[notice]) return <Banner success={NOTICES[notice]} />;
  return null;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function PageIntro({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "Copied" : label}
    </Button>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-card px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
