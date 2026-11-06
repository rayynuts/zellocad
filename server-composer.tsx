"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { createServer, updateServerGeneral } from "@/lib/actions/community";
import type { ActionState } from "@/lib/actions/types";
import { ImageField } from "./image-field";
import { Banner, Button, fieldClass } from "./ui";

type ServerDefaults = {
  id: string;
  name: string;
  description: string;
  category: string;
  discordUrl: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
};

export function ServerComposer({ mode, server }: { mode: "create" | "edit"; server?: ServerDefaults }) {
  const action = mode === "create" ? createServer : updateServerGeneral;
  const [state, formAction, pending] = useActionState(action, {} as ActionState);
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {server ? <input type="hidden" name="serverId" value={server.id} /> : null}
      <div className="space-y-4 rounded-2xl border border-white/5 bg-card p-4 md:p-5">
        <Banner error={state.error} success={state.success} />
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Server name</span>
          <input className={fieldClass} name="name" required minLength={2} maxLength={48} defaultValue={server?.name ?? ""} />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Description</span>
          <textarea className={`${fieldClass} min-h-28`} name="description" maxLength={500} defaultValue={server?.description ?? ""} />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Community category</span>
          <select className={fieldClass} name="category" defaultValue={server?.category ?? "Roleplay"}>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Discord invitation URL</span>
          <input className={fieldClass} name="discordUrl" placeholder="https://discord.gg/your-community" defaultValue={server?.discordUrl ?? ""} />
          <span className="block text-xs text-muted">Optional. The Join Discord button opens this link in a new tab. It does not join Discord for the user.</span>
        </label>
        {mode === "create" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-2 rounded-xl bg-panel p-3">
              <legend className="px-1 text-sm font-medium">Visibility</legend>
              <label className="flex gap-2 text-sm"><input type="radio" name="visibility" value="PUBLIC" /> Public — listed in discovery</label>
              <label className="flex gap-2 text-sm"><input type="radio" name="visibility" value="PRIVATE" defaultChecked /> Private — hidden, invitation only</label>
            </fieldset>
            <fieldset className="space-y-2 rounded-xl bg-panel p-3">
              <legend className="px-1 text-sm font-medium">Joining</legend>
              <label className="flex gap-2 text-sm"><input type="radio" name="joinMode" value="AUTOMATIC" /> Automatic — accept valid access immediately</label>
              <label className="flex gap-2 text-sm"><input type="radio" name="joinMode" value="APPROVAL" defaultChecked /> Approval required</label>
              <p className="text-xs text-muted">A public server can still require approval. A private server can still accept a valid invitation automatically.</p>
            </fieldset>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>{pending ? "Saving..." : mode === "create" ? "Create server" : "Save changes"}</Button>
          {mode === "edit" ? <Button type="reset" variant="ghost">Reset</Button> : null}
        </div>
      </div>
      <div className="space-y-5 rounded-2xl border border-white/5 bg-card p-4 md:p-5">
        <ImageField label="Server icon" fileName="icon" urlName="iconUrl" removeName="removeIcon" current={server?.iconUrl} maxMb={2} square hint="PNG, JPG, WEBP, or GIF up to 2 MB." />
        <ImageField label="Server banner" fileName="banner" urlName="bannerUrl" removeName="removeBanner" current={server?.bannerUrl} maxMb={5} hint="PNG, JPG, WEBP, or GIF up to 5 MB." />
      </div>
    </form>
  );
}
