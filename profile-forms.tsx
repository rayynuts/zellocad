"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/types";
import { ImageField } from "./image-field";
import { Banner, Button, fieldClass } from "./ui";

export function ProfileForm({ user }: { user: { displayName: string; email: string; avatarUrl: string | null } }) {
  const [state, action, pending] = useActionState(updateProfile, {} as ActionState);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-white/5 bg-card p-4">
      <h2 className="font-semibold">Profile</h2>
      <Banner error={state.error} success={state.success} />
      <label className="block space-y-1.5 text-sm"><span>Display name</span><input className={fieldClass} name="displayName" defaultValue={user.displayName} required /></label>
      <label className="block space-y-1.5 text-sm"><span>Email</span><input className={fieldClass} type="email" name="email" defaultValue={user.email} required /></label>
      <ImageField label="Profile picture" fileName="avatar" urlName="avatarUrl" removeName="removeAvatar" current={user.avatarUrl} maxMb={2} square hint="PNG, JPG, WEBP, or GIF up to 2 MB." />
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {} as ActionState);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-white/5 bg-card p-4">
      <h2 className="font-semibold">Password</h2>
      <Banner error={state.error} success={state.success} />
      <input className={fieldClass} type="password" name="current" placeholder="Current password" required />
      <input className={fieldClass} type="password" name="next" placeholder="New password" minLength={8} required />
      <input className={fieldClass} type="password" name="confirm" placeholder="Confirm new password" minLength={8} required />
      <Button type="submit" disabled={pending}>{pending ? "Updating..." : "Update password"}</Button>
    </form>
  );
}
