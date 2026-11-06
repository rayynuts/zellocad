import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type ServerCardModel = {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  discordUrl: string | null;
  visibility: string;
  joinMode: string;
  category: string;
  memberCount: number;
  departmentCount: number;
  onlineCount: number;
  departmentTags: { name: string; color: string }[];
  favorite: boolean;
  isMember: boolean;
  role: string | null;
  lastVisitedAt: string | null;
  memberPreview: { name: string; avatarUrl: string | null }[];
};

export type NotificationModel = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export async function loadNotifications(userId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return {
    unread,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
    })) satisfies NotificationModel[],
  };
}

export async function loadServerCards(userId: string | null, where: Prisma.ServerWhereInput) {
  const servers = await prisma.server.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      departments: { select: { name: true, color: true }, take: 4, orderBy: { name: "asc" } },
      _count: { select: { members: true, departments: true } },
      members: { select: { userId: true, favorite: true, lastVisitedAt: true, role: true, user: { select: { displayName: true, avatarUrl: true } } } },
    },
  });
  const userIds = [...new Set(servers.flatMap((server) => server.members.map((member) => member.userId)))];
  const sessions = userIds.length
    ? await prisma.session.findMany({
        where: { userId: { in: userIds }, expiresAt: { gt: new Date() } },
        select: { userId: true },
        distinct: ["userId"],
      })
    : [];
  const online = new Set(sessions.map((session) => session.userId));
  return servers.map((server) => {
    const mine = userId ? server.members.find((member) => member.userId === userId) : undefined;
    return {
      id: server.id,
      name: server.name,
      description: server.description,
      iconUrl: server.iconUrl,
      bannerUrl: server.bannerUrl,
      discordUrl: server.discordUrl,
      visibility: server.visibility,
      joinMode: server.joinMode,
      category: server.category,
      memberCount: server._count.members,
      departmentCount: server._count.departments,
      onlineCount: server.members.filter((member) => online.has(member.userId)).length,
      departmentTags: server.departments.map((department) => ({ name: department.name, color: department.color })),
      favorite: Boolean(mine?.favorite),
      isMember: Boolean(mine),
      role: mine?.role ?? null,
      lastVisitedAt: mine?.lastVisitedAt?.toISOString() ?? null,
      memberPreview: server.members.slice(0, 3).map((member) => ({ name: member.user.displayName, avatarUrl: member.user.avatarUrl })),
    } satisfies ServerCardModel;
  });
}
