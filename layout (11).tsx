import { requireMembership } from "@/lib/access";
import { loadNotifications } from "@/lib/load";
import { prisma } from "@/lib/prisma";
import { CadShell } from "@/components/cad-shell";

export const dynamic = "force-dynamic";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const { user, member, server } = await requireMembership(serverId);
  await prisma.serverMember.update({ where: { id: member.id }, data: { lastVisitedAt: new Date() } });
  const [notes, unit, departments] = await Promise.all([
    loadNotifications(user.id),
    prisma.unit.findUnique({ where: { serverId_userId: { serverId, userId: user.id } }, select: { status: true } }),
    prisma.department.findMany({ where: { serverId }, select: { id: true, slug: true, name: true } }),
  ]);
  return (
    <CadShell
      server={{ id: server.id, name: server.name, iconUrl: server.iconUrl, visibility: server.visibility }}
      discordUrl={server.discordUrl}
      user={{ username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }}
      unread={notes.unread}
      departments={departments}
      unitStatus={unit?.status ?? "UNAVAILABLE"}
      canSetStatus={member.role !== "GUEST" && Boolean(unit)}
      role={member.role}
    >
      {children}
    </CadShell>
  );
}
