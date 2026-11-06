import { headers } from "next/headers";
import { requireMembership } from "@/lib/access";
import { canManageServer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { InviteTools } from "@/components/invite-tools";
import { QueryBanner } from "@/components/ui";

export const metadata = { title: "Invitations" };

export default async function InvitationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { member } = await requireMembership(serverId);
  if (!canManageServer(member.role)) {
    return <QueryBanner error="Only the owner and administrators can manage invitations." />;
  }
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("x-forwarded-host") ?? headerList.get("host")}`;
  const invites = await prisma.invitation.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <p className="text-sm text-muted">Codes are checked on the server. Private communities can only be entered with a valid invitation.</p>
      </div>
      <QueryBanner error={query.error} notice={query.notice} />
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
  );
}
