import { createInvitation, revokeInvitation } from "@/lib/actions/community";
import { formatWhen } from "@/lib/format";
import { CopyButton, fieldClass, SubmitButton } from "./ui";

export type InviteRow = {
  id: string;
  code: string;
  useCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  creator: string;
};

function statusOf(invite: InviteRow) {
  if (invite.revokedAt) return "Revoked";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) return "Expired";
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) return "Used up";
  return "Active";
}

export function InviteTools({ serverId, origin, invites }: { serverId: string; origin: string; invites: InviteRow[] }) {
  return (
    <div className="space-y-4">
      <form action={createInvitation} className="grid gap-3 rounded-2xl border border-white/5 bg-card p-4 md:grid-cols-2">
        <input type="hidden" name="serverId" value={serverId} />
        <label className="space-y-1 text-sm">
          <span>Expires</span>
          <input className={fieldClass} type="datetime-local" name="expiresAt" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Max uses</span>
          <input className={fieldClass} type="number" min={1} max={500} name="maxUses" placeholder="Unlimited" />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span>Notify username</span>
          <input className={fieldClass} name="username" placeholder="Optional — sends them the invitation" />
        </label>
        <SubmitButton>Generate invitation</SubmitButton>
      </form>
      <div className="space-y-3">
        {invites.length === 0 ? <p className="text-sm text-muted">No invitations yet.</p> : null}
        {invites.map((invite) => {
          const url = `${origin}/join?code=${invite.code}`;
          return (
            <article key={invite.id} className="rounded-2xl border border-white/5 bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm">{invite.code}</p>
                  <p className="text-xs text-muted">{statusOf(invite)} · {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ""} uses · created by {invite.creator}</p>
                  <p className="text-xs text-muted">{invite.expiresAt ? `Expires ${formatWhen(invite.expiresAt)}` : "No expiry"} · {formatWhen(invite.createdAt)}</p>
                </div>
                <span className="rounded-full bg-panel px-2 py-0.5 text-xs">{statusOf(invite)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton value={invite.code} label="Copy code" />
                <CopyButton value={url} label="Copy link" />
                {!invite.revokedAt ? (
                  <form action={revokeInvitation}>
                    <input type="hidden" name="serverId" value={serverId} />
                    <input type="hidden" name="invitationId" value={invite.id} />
                    <SubmitButton variant="danger">Revoke</SubmitButton>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
