import Link from "next/link";
import { headers } from "next/headers";
import { requireMembership } from "@/lib/access";
import { canManageServer, isServerOwner } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { leaveServer, postAnnouncement, reviewJoin, updateJoinMode, updateVisibility } from "@/lib/actions/community";
import { ServerComposer } from "@/components/server-composer";
import { InviteTools } from "@/components/invite-tools";
import { MemberTable } from "@/components/member-table";
import { DangerZone } from "@/components/danger-zone";
import { QueryBanner, SubmitButton, fieldClass } from "@/components/ui";
import { deptRoleLabel, serverRoleLabel } from "@/lib/format";

export const metadata = { title: "Settings" };

const TABS = [
  ["general", "General"],
  ["visibility", "Visibility"],
  ["joining", "Joining"],
  ["members", "Members"],
  ["roles", "Roles and permissions"],
  ["danger", "Danger zone"],
] as const;

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ tab?: string; error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member, server } = await requireMembership(serverId);
  const owner = isServerOwner(member.role);
  const manager = canManageServer(member.role);
  const tabs = TABS.filter((item) => {
    if (item[0] === "general" || item[0] === "visibility" || item[0] === "joining" || item[0] === "danger") return owner;
    return manager;
  });
  const tab = tabs.some((item) => item[0] === query.tab) ? query.tab! : owner ? "general" : "members";
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("x-forwarded-host") ?? headerList.get("host")}`;
  const [invites, requests, members] = await Promise.all([
    prisma.invitation.findMany({ where: { serverId }, orderBy: { createdAt: "desc" }, include: { createdBy: { select: { displayName: true } } } }),
    prisma.joinRequest.findMany({ where: { serverId, status: "PENDING" }, include: { user: { select: { displayName: true, username: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.serverMember.findMany({ where: { serverId }, include: { user: { select: { id: true, displayName: true, username: true } } }, orderBy: { joinedAt: "asc" } }),
  ]);

  if (!manager) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-2xl border border-white/10 bg-[#141816] p-6">
        <h1 className="text-2xl font-semibold">Server settings</h1>
        <QueryBanner error={query.error} notice={query.notice} />
        <p className="text-sm text-[#c5cdc8]">Only the server owner can edit {server.name}. Your role is {serverRoleLabel(member.role)}.</p>
        <form action={leaveServer.bind(null, serverId)}><SubmitButton variant="danger">Leave server</SubmitButton></form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d9892]">Server</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{server.name}</h1>
          <p className="mt-1 text-sm text-[#a3aea8]">{owner ? "You own this server. Name, images, visibility, and joining stay with you." : "Only the owner can edit this server. You can still manage members."}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${owner ? "bg-[#1c3a2c] text-[#3DDC84]" : "bg-white/5 text-[#c5cdc8]"}`}>{serverRoleLabel(member.role)}</span>
      </div>
      <QueryBanner error={query.error} notice={query.notice} />
      <div className="flex gap-1 overflow-auto border-b border-white/10">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/s/${serverId}/settings?tab=${id}`} className={`shrink-0 border-b-2 px-3 py-2.5 text-sm ${tab === id ? "border-[#3DDC84] text-white" : "border-transparent text-[#8d9892] hover:text-white"}`}>{label}</Link>
        ))}
      </div>
      {tab === "general" ? (
        <div className="space-y-4">
          <ServerComposer mode="edit" server={server} />
          <form action={postAnnouncement} className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
            <h2 className="font-semibold">Server announcement</h2>
            <input type="hidden" name="serverId" value={serverId} />
            <input className={fieldClass} name="title" placeholder="Title" required />
            <textarea className={`${fieldClass} min-h-24`} name="body" placeholder="Message for every member" required />
            <SubmitButton>Send announcement</SubmitButton>
          </form>
        </div>
      ) : null}
      {tab === "visibility" ? (
        <form action={updateVisibility} className="space-y-3 rounded-2xl border border-white/5 bg-card p-4">
          <input type="hidden" name="serverId" value={serverId} />
          <label className="flex gap-2 text-sm"><input type="radio" name="visibility" value="PUBLIC" defaultChecked={server.visibility === "PUBLIC"} /> Public server — shown in discovery</label>
          <label className="flex gap-2 text-sm"><input type="radio" name="visibility" value="PRIVATE" defaultChecked={server.visibility === "PRIVATE"} /> Private server — hidden from discovery</label>
          <p className="text-xs text-muted">Private servers never appear in search results. Public visibility does not bypass the joining rules.</p>
          <SubmitButton>Save visibility</SubmitButton>
        </form>
      ) : null}
      {tab === "joining" ? (
        <div className="space-y-4">
          <form action={updateJoinMode} className="space-y-3 rounded-2xl border border-white/5 bg-card p-4">
            <input type="hidden" name="serverId" value={serverId} />
            <label className="flex gap-2 text-sm"><input type="radio" name="joinMode" value="AUTOMATIC" defaultChecked={server.joinMode === "AUTOMATIC"} /> Automatic joining</label>
            <label className="flex gap-2 text-sm"><input type="radio" name="joinMode" value="APPROVAL" defaultChecked={server.joinMode === "APPROVAL"} /> Approval required</label>
            <SubmitButton>Save joining</SubmitButton>
          </form>
          <div className="space-y-2">
            <h2 className="font-semibold">Pending join requests</h2>
            {requests.length === 0 ? <p className="text-sm text-muted">No pending requests.</p> : null}
            {requests.map((request) => (
              <form key={request.id} action={reviewJoin} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card p-3 text-sm">
                <span>{request.user.displayName} (@{request.user.username})</span>
                <input type="hidden" name="serverId" value={serverId} />
                <input type="hidden" name="requestId" value={request.id} />
                <div className="flex gap-2">
                  <button className="h-10 rounded-xl bg-ok px-3 text-sm font-medium text-[#062117]" name="decision" value="APPROVED">Approve</button>
                  <button className="h-10 rounded-xl bg-danger px-3 text-sm font-medium text-white" name="decision" value="REJECTED">Reject</button>
                </div>
              </form>
            ))}
          </div>
          <InviteTools
            serverId={serverId}
            origin={origin}
            invites={invites.map((invite) => ({
              id: invite.id,
              code: invite.code,
              useCount: invite.useCount,
              maxUses: invite.maxUses,
              expiresAt: invite.expiresAt?.toISOString() ?? null,
              revokedAt: invite.revokedAt?.toISOString() ?? null,
              createdAt: invite.createdAt.toISOString(),
              creator: invite.createdBy.displayName,
            }))}
          />
        </div>
      ) : null}
      {tab === "members" ? (
        <MemberTable
          serverId={serverId}
          actorRole={member.role}
          members={members.map((item) => ({
            id: item.id,
            userId: item.userId,
            role: item.role,
            joinedAt: item.joinedAt.toISOString(),
            displayName: item.user.displayName,
            username: item.user.username,
          }))}
        />
      ) : null}
      {tab === "roles" ? (
        <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-4 text-sm">
          <p>Server roles are Owner, Administrator, Member, and Guest. Department roles are Director, Supervisor, and Member, and they are assigned inside each department.</p>
          <ul className="space-y-2 text-muted">
            <li><strong className="text-ink">Server Owner</strong> — full control, including delete and ownership transfer. You are {serverRoleLabel(member.role)}.</li>
            <li><strong className="text-ink">Server Administrator</strong> — members, invitations, and departments. Cannot edit the server profile, visibility, joining rules, or delete the server.</li>
            <li><strong className="text-ink">Department Director</strong> — edits that department, assigns supervisors, and reviews applications. {deptRoleLabel("DIRECTOR")}.</li>
            <li><strong className="text-ink">Department Supervisor</strong> — reviews applications for that department.</li>
            <li><strong className="text-ink">Department Member</strong> — works inside an approved department.</li>
            <li><strong className="text-ink">Guest</strong> — can view the CAD but cannot dispatch, file reports, or use the radio.</li>
            <li>Dispatch actions are limited to the owner, administrators, and members of Communications / Dispatch. The server checks this on every action.</li>
          </ul>
          <p>Signed in as {user.displayName}. Department assignments live on each department page.</p>
        </div>
      ) : null}
      {tab === "danger" && owner ? (
        <DangerZone
          serverId={serverId}
          serverName={server.name}
          members={members.filter((item) => item.userId !== user.id).map((item) => ({ id: item.userId, label: `${item.user.displayName} (@${item.user.username})` }))}
        />
      ) : null}
    </div>
  );
}
