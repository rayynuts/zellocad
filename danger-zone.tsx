"use client";

import { useActionState } from "react";
import { deleteServer, transferOwnership } from "@/lib/actions/community";
import type { ActionState } from "@/lib/actions/types";
import { Banner, Button, fieldClass } from "./ui";

export function DangerZone({
  serverId,
  serverName,
  members,
}: {
  serverId: string;
  serverName: string;
  members: { id: string; label: string }[];
}) {
  const [transferState, transferAction, transferPending] = useActionState(transferOwnership, {} as ActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteServer, {} as ActionState);
  return (
    <div className="space-y-4">
      <form action={transferAction} className="space-y-3 rounded-2xl border border-warn/30 bg-card p-4">
        <h2 className="font-semibold">Transfer ownership</h2>
        <Banner error={transferState.error} />
        <input type="hidden" name="serverId" value={serverId} />
        <select className={fieldClass} name="newOwnerId" required>
          <option value="">Choose a member</option>
          {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
        </select>
        <input className={fieldClass} name="confirmName" placeholder={`Type ${serverName} to confirm`} required />
        <Button type="submit" disabled={transferPending}>{transferPending ? "Transferring..." : "Transfer ownership"}</Button>
      </form>
      <form action={deleteAction} className="space-y-3 rounded-2xl border border-danger/40 bg-card p-4">
        <h2 className="font-semibold text-danger">Delete server</h2>
        <p className="text-sm text-muted">This removes the server, its members, departments, calls, and records.</p>
        <Banner error={deleteState.error} />
        <input type="hidden" name="serverId" value={serverId} />
        <input className={fieldClass} name="confirmName" placeholder={`Type ${serverName} to confirm`} required />
        <Button type="submit" variant="danger" disabled={deletePending}>{deletePending ? "Deleting..." : "Delete server"}</Button>
      </form>
    </div>
  );
}
