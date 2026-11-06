"use client";

import { useActionState } from "react";
import { login, register } from "@/lib/actions/auth";
import { joinWithCode } from "@/lib/actions/community";
import type { ActionState } from "@/lib/actions/types";
import { Banner, Button, fieldClass } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {} as ActionState);
  return (
    <form action={action} className="space-y-4">
      <Banner error={state.error} />
      <label className="block space-y-1.5 text-sm">
        <span>Email or username</span>
        <input className={fieldClass} name="identifier" autoComplete="username" required />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span>Password</span>
        <input className={fieldClass} name="password" type="password" autoComplete="current-password" required />
      </label>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="remember" className="size-4 accent-[#527DFF]" />
        Remember this session for 30 days
      </label>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}

export function JoinCodeForm({ initialCode = "" }: { initialCode?: string }) {
  const [state, action, pending] = useActionState(joinWithCode, {} as ActionState);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-white/5 bg-card p-4">
      <h2 className="font-semibold">Invitation</h2>
      <Banner error={state.error} />
      <input className={fieldClass} name="code" defaultValue={initialCode} placeholder="Invitation code or full URL" required />
      <Button type="submit" disabled={pending}>{pending ? "Checking..." : "Continue"}</Button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, {} as ActionState);
  return (
    <form action={action} className="space-y-4">
      <Banner error={state.error} />
      <label className="block space-y-1.5 text-sm">
        <span>Username</span>
        <input className={fieldClass} name="username" autoComplete="username" minLength={3} maxLength={20} required />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span>Email</span>
        <input className={fieldClass} name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span>Password</span>
        <input className={fieldClass} name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span>Confirm password</span>
        <input className={fieldClass} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account..." : "Create account"}</Button>
    </form>
  );
}
