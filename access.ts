import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { prisma } from "./prisma";

export async function requireMembership(serverId: string) {
  const user = await requireUser();
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: user.id } },
    include: { server: true },
  });
  if (!member) redirect(`/home?error=${encodeURIComponent("Access denied.")}`);
  return { user, member, server: member.server };
}
