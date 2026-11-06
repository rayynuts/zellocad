import { randomBytes } from "crypto";
import { DEFAULT_DEPARTMENTS } from "./constants";
import { prisma } from "./prisma";
import { slugify } from "./format";

export async function nextCallsign(serverId: string, username: string) {
  const base = username.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "UNIT";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const callsign = `${base}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const existing = await prisma.unit.findUnique({
      where: { serverId_callsign: { serverId, callsign } },
    });
    if (!existing) return callsign;
  }
  return `UNIT-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export function landPoint(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return { x: 520 + (hash % 520), y: 150 + ((hash >> 8) % 430) };
}

export async function acceptMember(serverId: string, user: { id: string; username: string; displayName: string }) {
  const existing = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: user.id } },
  });
  if (existing) return existing;
  const member = await prisma.serverMember.create({
    data: { serverId, userId: user.id, role: "MEMBER" },
  });
  const civilian = await prisma.department.findFirst({ where: { serverId, slug: "civilian" } });
  if (civilian) {
    await prisma.departmentMember.create({
      data: { departmentId: civilian.id, userId: user.id, role: "MEMBER" },
    }).catch(() => undefined);
  }
  const callsign = await nextCallsign(serverId, user.username);
  const point = landPoint(user.username + serverId);
  await prisma.unit.create({
    data: {
      serverId,
      userId: user.id,
      callsign,
      displayName: user.displayName,
      departmentId: civilian?.id,
      status: "AVAILABLE",
      posX: point.x,
      posY: point.y,
    },
  });
  return member;
}

export async function createServerRecord(input: {
  owner: { id: string; username: string; displayName: string };
  name: string;
  description: string;
  category: string;
  visibility: string;
  joinMode: string;
  discordUrl: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
}) {
  const slug = `${slugify(input.name)}-${randomBytes(3).toString("hex")}`;
  return prisma.$transaction(async (tx) => {
    const server = await tx.server.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        category: input.category,
        visibility: input.visibility,
        joinMode: input.joinMode,
        discordUrl: input.discordUrl,
        iconUrl: input.iconUrl,
        bannerUrl: input.bannerUrl,
        ownerId: input.owner.id,
      },
    });
    await tx.serverMember.create({
      data: { serverId: server.id, userId: input.owner.id, role: "OWNER", lastVisitedAt: new Date() },
    });
    let communicationsId: string | null = null;
    let civilianId: string | null = null;
    for (const department of DEFAULT_DEPARTMENTS) {
      const created = await tx.department.create({
        data: { ...department, serverId: server.id },
      });
      if (department.slug === "communications") communicationsId = created.id;
      if (department.slug === "civilian") civilianId = created.id;
    }
    if (communicationsId) {
      await tx.departmentMember.create({
        data: { departmentId: communicationsId, userId: input.owner.id, role: "DIRECTOR" },
      });
    }
    if (civilianId) {
      await tx.departmentMember.create({
        data: { departmentId: civilianId, userId: input.owner.id, role: "MEMBER" },
      });
    }
    const callsign = `DISP-${randomBytes(2).toString("hex").toUpperCase()}`;
    await tx.unit.create({
      data: {
        serverId: server.id,
        userId: input.owner.id,
        departmentId: communicationsId,
        callsign,
        displayName: input.owner.displayName,
        status: "AVAILABLE",
        posX: 760,
        posY: 300,
      },
    });
    return server;
  });
}
