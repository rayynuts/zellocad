import { requireMembership } from "@/lib/access";
import { canManageServer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { MemberTable } from "@/components/member-table";
import { QueryBanner } from "@/components/ui";
import { serverRoleLabel } from "@/lib/format";

export const metadata = { title: "Members" };

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { member } = await requireMembership(serverId);
  const members = await prisma.serverMember.findMany({
    where: { serverId },
    include: { user: { select: { id: true, displayName: true, username: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Server members</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      {canManageServer(member.role) ? (
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
      ) : (
        <ul className="space-y-2">
          {members.map((item) => (
            <li key={item.id} className="rounded-2xl bg-card p-3 text-sm">{item.user.displayName} · @{item.user.username} · {serverRoleLabel(item.role)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
