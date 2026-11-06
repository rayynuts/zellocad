import { prisma } from "./prisma";

export async function notify(
  userId: string,
  input: { serverId?: string | null; type: string; title: string; body: string; href?: string },
) {
  await prisma.notification.create({
    data: {
      userId,
      serverId: input.serverId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}

export async function notifyUsers(
  userIds: string[],
  input: { serverId?: string | null; type: string; title: string; body: string; href?: string },
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      serverId: input.serverId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}

export async function managerIds(serverId: string) {
  const rows = await prisma.serverMember.findMany({
    where: { serverId, role: { in: ["OWNER", "ADMINISTRATOR"] } },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}
