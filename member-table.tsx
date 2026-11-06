"use client";

import { useMemo, useState } from "react";
import { removeMember, updateMemberRole } from "@/lib/actions/community";
import { formatWhen, serverRoleLabel } from "@/lib/format";
import { fieldClass, SubmitButton } from "./ui";

export function MemberTable({
  serverId,
  actorRole,
  members,
}: {
  serverId: string;
  actorRole: string;
  members: { id: string; userId: string; role: string; joinedAt: string; displayName: string; username: string }[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((member) => `${member.displayName} ${member.username} ${member.role}`.toLowerCase().includes(needle));
  }, [members, query]);
  return (
    <div className="space-y-3">
      <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" />
      <div className="space-y-2">
        {filtered.map((member) => {
          const locked = member.role === "OWNER" || (actorRole === "ADMINISTRATOR" && member.role === "ADMINISTRATOR");
          return (
            <article key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-card p-3">
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-xs text-muted">@{member.username} · {serverRoleLabel(member.role)} · joined {formatWhen(member.joinedAt)}</p>
              </div>
              {locked ? <span className="text-xs text-muted">{serverRoleLabel(member.role)}</span> : (
                <div className="flex flex-wrap gap-2">
                  <form action={updateMemberRole} className="flex gap-2">
                    <input type="hidden" name="serverId" value={serverId} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <select className={fieldClass} name="role" defaultValue={member.role}>
                      <option value="ADMINISTRATOR">Server Administrator</option>
                      <option value="MEMBER">Member</option>
                      <option value="GUEST">Guest</option>
                    </select>
                    <SubmitButton>Save role</SubmitButton>
                  </form>
                  <form action={removeMember}>
                    <input type="hidden" name="serverId" value={serverId} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <SubmitButton variant="danger">Remove</SubmitButton>
                  </form>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
