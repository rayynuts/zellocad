"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "../auth";
import { makeInviteCode } from "../auth";
import { requireMembership } from "../access";
import { CATEGORIES } from "../constants";
import { safePath } from "../format";
import { acceptMember, createServerRecord } from "../membership";
import { bounce, done } from "../nav";
import { managerIds, notify, notifyUsers } from "../notify";
import { canManageServer, isServerOwner } from "../permissions";
import { prisma } from "../prisma";
import { normalizeDiscord, resolveImage, extractCode } from "../uploads";
import type { ActionState } from "./types";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refresh(serverId?: string) {
  revalidatePath("/home");
  revalidatePath("/discover");
  revalidatePath("/join");
  if (serverId) revalidatePath(`/s/${serverId}`, "layout");
}

async function requireManager(serverId: string) {
  const ctx = await requireMembership(serverId);
  if (!canManageServer(ctx.member.role)) {
    bounce(`/s/${serverId}/settings`, "You do not have permission to manage this server.");
  }
  return ctx;
}

async function requireOwner(serverId: string) {
  const ctx = await requireMembership(serverId);
  if (!isServerOwner(ctx.member.role)) {
    bounce(`/s/${serverId}/settings`, "Only the server owner can edit this server.");
  }
  return ctx;
}

const serverSchema = z.object({
  name: z.string().trim().min(2, "Server name must be at least 2 characters.").max(48, "Server name must be 48 characters or fewer."),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer."),
  category: z.string(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  joinMode: z.enum(["AUTOMATIC", "APPROVAL"]),
});

export async function createServer(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = serverSchema.safeParse({
    name: text(form, "name"),
    description: text(form, "description"),
    category: text(form, "category") || "Roleplay",
    visibility: text(form, "visibility") || "PRIVATE",
    joinMode: text(form, "joinMode") || "APPROVAL",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the server form." };
  if (!CATEGORIES.includes(parsed.data.category as (typeof CATEGORIES)[number])) return { error: "Choose a community category." };
  const discord = normalizeDiscord(text(form, "discordUrl"));
  if (discord === null) return { error: "Enter a discord.gg or discord.com/invite link, or leave it blank." };
  const icon = await resolveImage(form, "icon", "iconUrl", "removeIcon", "icons", 2 * 1024 * 1024);
  if (icon.error) return { error: icon.error };
  const banner = await resolveImage(form, "banner", "bannerUrl", "removeBanner", "banners", 5 * 1024 * 1024);
  if (banner.error) return { error: banner.error };
  const server = await createServerRecord({
    owner: user,
    name: parsed.data.name,
    description: parsed.data.description,
    category: parsed.data.category,
    visibility: parsed.data.visibility,
    joinMode: parsed.data.joinMode,
    discordUrl: discord || null,
    iconUrl: icon.url ?? null,
    bannerUrl: banner.url ?? null,
  });
  refresh(server.id);
  redirect(`/s/${server.id}?notice=created`);
}

export async function updateServerGeneral(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (!isServerOwner(ctx.member.role)) return { error: "Only the server owner can edit this server." };
  const parsed = serverSchema.pick({ name: true, description: true, category: true }).safeParse({
    name: text(form, "name"),
    description: text(form, "description"),
    category: text(form, "category") || ctx.server.category,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the server form." };
  if (!CATEGORIES.includes(parsed.data.category as (typeof CATEGORIES)[number])) return { error: "Choose a community category." };
  const discord = normalizeDiscord(text(form, "discordUrl"));
  if (discord === null) return { error: "Enter a discord.gg or discord.com/invite link, or leave it blank." };
  const icon = await resolveImage(form, "icon", "iconUrl", "removeIcon", "icons", 2 * 1024 * 1024);
  if (icon.error) return { error: icon.error };
  const banner = await resolveImage(form, "banner", "bannerUrl", "removeBanner", "banners", 5 * 1024 * 1024);
  if (banner.error) return { error: banner.error };
  await prisma.server.update({
    where: { id: ctx.server.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      discordUrl: discord || null,
      ...(icon.url !== undefined ? { iconUrl: icon.url } : {}),
      ...(banner.url !== undefined ? { bannerUrl: banner.url } : {}),
    },
  });
  refresh(ctx.server.id);
  return { success: "Server settings saved." };
}

export async function updateVisibility(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireOwner(serverId);
  const visibility = text(form, "visibility") === "PUBLIC" ? "PUBLIC" : "PRIVATE";
  await prisma.server.update({ where: { id: ctx.server.id }, data: { visibility } });
  refresh(ctx.server.id);
  done(`/s/${ctx.server.id}/settings?tab=visibility`, "saved");
}

export async function updateJoinMode(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireOwner(serverId);
  const joinMode = text(form, "joinMode") === "AUTOMATIC" ? "AUTOMATIC" : "APPROVAL";
  await prisma.server.update({ where: { id: ctx.server.id }, data: { joinMode } });
  refresh(ctx.server.id);
  done(`/s/${ctx.server.id}/settings?tab=joining`, "saved");
}

export async function createInvitation(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireManager(serverId);
  const expiry = text(form, "expiresAt");
  let expiresAt: Date | null = null;
  if (expiry) {
    const parsed = new Date(expiry);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now()) {
      bounce(`/s/${serverId}/invitations`, "Choose an expiry time in the future, or leave it blank.");
    }
    expiresAt = parsed;
  }
  const maxRaw = text(form, "maxUses");
  let maxUses: number | null = null;
  if (maxRaw) {
    const value = Number(maxRaw);
    if (!Number.isInteger(value) || value < 1 || value > 500) {
      bounce(`/s/${serverId}/invitations`, "Max uses must be a whole number from 1 to 500.");
    }
    maxUses = value;
  }
  const username = text(form, "username").toLowerCase();
  let recipient: { id: string } | null = null;
  if (username) {
    recipient = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!recipient) bounce(`/s/${serverId}/invitations`, "No account uses that username.");
  }
  const code = makeInviteCode();
  await prisma.invitation.create({
    data: {
      serverId: ctx.server.id,
      code,
      createdById: ctx.user.id,
      expiresAt,
      maxUses,
    },
  });
  if (recipient && recipient.id !== ctx.user.id) {
    await notify(recipient.id, {
      serverId: ctx.server.id,
      type: "INVITE",
      title: `Invitation to ${ctx.server.name}`,
      body: `${ctx.user.displayName} sent you an invitation.`,
      href: `/join?code=${code}`,
    });
  }
  refresh(ctx.server.id);
  done(`/s/${serverId}/invitations`, "invite");
}

export async function revokeInvitation(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireManager(serverId);
  const invitationId = text(form, "invitationId");
  await prisma.invitation.updateMany({
    where: { id: invitationId, serverId: ctx.server.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  refresh(ctx.server.id);
  done(`/s/${serverId}/invitations`, "revoked");
}

export async function joinWithCode(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const code = extractCode(text(form, "code"));
  if (!code) return { error: "Enter an invitation code or invitation URL." };
  const invite = await prisma.invitation.findUnique({ where: { code }, include: { server: true } });
  if (!invite) return { error: "Invalid invitation." };
  if (invite.revokedAt) return { error: "This invitation has been revoked." };
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return { error: "This invitation has expired." };
  if (invite.maxUses != null && invite.useCount >= invite.maxUses) return { error: "This invitation has no uses remaining." };
  const existing = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId: invite.serverId, userId: user.id } },
  });
  if (existing) return { error: "You are already a member of this server." };
  const pending = await prisma.joinRequest.findFirst({
    where: { serverId: invite.serverId, userId: user.id, status: "PENDING" },
  });
  if (pending) return { error: "Your join request is already pending approval." };

  if (invite.server.joinMode === "AUTOMATIC") {
    await acceptMember(invite.serverId, user);
    await prisma.invitation.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } });
    refresh(invite.serverId);
    redirect(`/s/${invite.serverId}?notice=joined`);
  }

  await prisma.joinRequest.create({
    data: { serverId: invite.serverId, userId: user.id, invitationId: invite.id, status: "PENDING" },
  });
  await prisma.invitation.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } });
  const managers = (await managerIds(invite.serverId)).filter((id) => id !== user.id);
  await notifyUsers(managers, {
    serverId: invite.serverId,
    type: "JOIN_REQUEST",
    title: "Join request",
    body: `${user.displayName} requested to join ${invite.server.name}.`,
    href: `/s/${invite.serverId}/settings?tab=joining`,
  });
  refresh(invite.serverId);
  redirect("/join?notice=pending");
}

export async function requestJoin(form: FormData) {
  const user = await requireUser();
  const serverId = text(form, "serverId");
  const returnTo = safePath(text(form, "returnTo"), "/discover");
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server || server.visibility !== "PUBLIC") bounce(returnTo, "Access denied.");
  const existing = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: user.id } },
  });
  if (existing) bounce(returnTo, "You are already a member of this server.");
  const pending = await prisma.joinRequest.findFirst({ where: { serverId, userId: user.id, status: "PENDING" } });
  if (pending) bounce(returnTo, "Your join request is already pending approval.");
  if (server.joinMode === "AUTOMATIC") {
    await acceptMember(serverId, user);
    refresh(serverId);
    redirect(`/s/${serverId}?notice=joined`);
  }
  await prisma.joinRequest.create({ data: { serverId, userId: user.id, status: "PENDING" } });
  const managers = (await managerIds(serverId)).filter((id) => id !== user.id);
  await notifyUsers(managers, {
    serverId,
    type: "JOIN_REQUEST",
    title: "Join request",
    body: `${user.displayName} requested to join ${server.name}.`,
    href: `/s/${serverId}/settings?tab=joining`,
  });
  refresh(serverId);
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=pending`);
}

export async function reviewJoin(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireManager(serverId);
  const requestId = text(form, "requestId");
  const decision = text(form, "decision");
  const request = await prisma.joinRequest.findFirst({
    where: { id: requestId, serverId: ctx.server.id, status: "PENDING" },
    include: { user: { select: { id: true, username: true, displayName: true } } },
  });
  if (!request) bounce(`/s/${serverId}/settings?tab=joining`, "That join request is no longer pending.");
  if (decision === "APPROVED") {
    await acceptMember(ctx.server.id, request.user);
    await prisma.joinRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: ctx.user.id },
    });
    await notify(request.userId, {
      serverId: ctx.server.id,
      type: "JOIN_APPROVED",
      title: "Join approved",
      body: `You were approved to join ${ctx.server.name}.`,
      href: `/s/${ctx.server.id}`,
    });
  } else {
    await prisma.joinRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: ctx.user.id },
    });
    await notify(request.userId, {
      serverId: ctx.server.id,
      type: "JOIN_REJECTED",
      title: "Join request declined",
      body: `Your request to join ${ctx.server.name} was declined.`,
      href: "/discover",
    });
  }
  refresh(ctx.server.id);
  done(`/s/${serverId}/settings?tab=joining`, "reviewed");
}

export async function toggleFavorite(serverId: string) {
  const user = await requireUser();
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: user.id } },
  });
  if (!member) return;
  await prisma.serverMember.update({ where: { id: member.id }, data: { favorite: !member.favorite } });
  revalidatePath("/home");
}

export async function leaveServer(serverId: string) {
  const ctx = await requireMembership(serverId);
  if (ctx.member.role === "OWNER") bounce("/home", "Transfer ownership before leaving this server.");
  await prisma.$transaction([
    prisma.callAssignment.deleteMany({ where: { unit: { serverId, userId: ctx.user.id } } }),
    prisma.departmentMember.deleteMany({ where: { userId: ctx.user.id, department: { serverId } } }),
    prisma.unit.deleteMany({ where: { serverId, userId: ctx.user.id } }),
    prisma.serverMember.delete({ where: { id: ctx.member.id } }),
  ]);
  refresh(serverId);
  redirect("/home?notice=left");
}

export async function updateMemberRole(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireManager(serverId);
  const memberId = text(form, "memberId");
  const role = text(form, "role");
  if (!["ADMINISTRATOR", "MEMBER", "GUEST"].includes(role)) {
    bounce(`/s/${serverId}/members`, "Choose a valid role.");
  }
  const target = await prisma.serverMember.findFirst({
    where: { id: memberId, serverId },
    include: { user: { select: { id: true, displayName: true } } },
  });
  if (!target) bounce(`/s/${serverId}/members`, "That member is no longer on this server.");
  if (target.role === "OWNER" || target.userId === ctx.server.ownerId) {
    bounce(`/s/${serverId}/members`, "Transfer ownership to change the owner's role.");
  }
  if (ctx.member.role === "ADMINISTRATOR" && target.role === "ADMINISTRATOR") {
    bounce(`/s/${serverId}/members`, "Only the owner can change another administrator.");
  }
  await prisma.serverMember.update({ where: { id: target.id }, data: { role } });
  await notify(target.userId, {
    serverId,
    type: "ROLE_CHANGE",
    title: "Server role updated",
    body: `Your role on ${ctx.server.name} is now ${role === "ADMINISTRATOR" ? "Server Administrator" : role === "GUEST" ? "Guest" : "Member"}.`,
    href: `/s/${serverId}/members`,
  });
  refresh(serverId);
  done(`/s/${serverId}/members`, "role");
}

export async function removeMember(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireManager(serverId);
  const memberId = text(form, "memberId");
  const target = await prisma.serverMember.findFirst({ where: { id: memberId, serverId } });
  if (!target) bounce(`/s/${serverId}/members`, "That member is no longer on this server.");
  if (target.role === "OWNER") bounce(`/s/${serverId}/members`, "The owner cannot be removed.");
  if (ctx.member.role === "ADMINISTRATOR" && target.role === "ADMINISTRATOR") {
    bounce(`/s/${serverId}/members`, "Only the owner can remove an administrator.");
  }
  await prisma.$transaction([
    prisma.callAssignment.deleteMany({ where: { unit: { serverId, userId: target.userId } } }),
    prisma.departmentMember.deleteMany({ where: { userId: target.userId, department: { serverId } } }),
    prisma.unit.deleteMany({ where: { serverId, userId: target.userId } }),
    prisma.serverMember.delete({ where: { id: target.id } }),
  ]);
  await notify(target.userId, {
    serverId,
    type: "ROLE_CHANGE",
    title: "Removed from server",
    body: `You were removed from ${ctx.server.name}.`,
    href: "/home",
  });
  refresh(serverId);
  done(`/s/${serverId}/members`, "removed");
}

export async function deleteServer(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (ctx.member.role !== "OWNER") return { error: "Only the server owner can delete this server." };
  if (text(form, "confirmName") !== ctx.server.name) return { error: "Type the server name exactly to confirm." };
  await prisma.notification.deleteMany({ where: { serverId } });
  await prisma.server.delete({ where: { id: serverId } });
  refresh();
  redirect("/home?notice=deleted");
}

export async function transferOwnership(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (ctx.member.role !== "OWNER") return { error: "Only the server owner can transfer ownership." };
  if (text(form, "confirmName") !== ctx.server.name) return { error: "Type the server name exactly to confirm." };
  const newOwnerId = text(form, "newOwnerId");
  const nextOwner = await prisma.serverMember.findFirst({
    where: { serverId, userId: newOwnerId },
    include: { user: { select: { displayName: true } } },
  });
  if (!nextOwner || nextOwner.userId === ctx.user.id) return { error: "Choose another member to receive ownership." };
  await prisma.$transaction([
    prisma.server.update({ where: { id: serverId }, data: { ownerId: nextOwner.userId } }),
    prisma.serverMember.update({ where: { id: nextOwner.id }, data: { role: "OWNER" } }),
    prisma.serverMember.update({ where: { id: ctx.member.id }, data: { role: "ADMINISTRATOR" } }),
  ]);
  await notify(nextOwner.userId, {
    serverId,
    type: "ROLE_CHANGE",
    title: "You are the server owner",
    body: `${ctx.user.displayName} transferred ownership of ${ctx.server.name} to you.`,
    href: `/s/${serverId}/settings`,
  });
  refresh(serverId);
  redirect(`/s/${serverId}/settings?tab=danger&notice=transferred`);
}

export async function postAnnouncement(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireOwner(serverId);
  const title = text(form, "title");
  const body = text(form, "body");
  if (title.length < 2 || title.length > 80) bounce(`/s/${serverId}/settings?tab=general`, "Announcement title must be 2–80 characters.");
  if (body.length < 2 || body.length > 500) bounce(`/s/${serverId}/settings?tab=general`, "Announcement must be 2–500 characters.");
  const members = await prisma.serverMember.findMany({ where: { serverId }, select: { userId: true } });
  await notifyUsers(
    members.map((member) => member.userId).filter((id) => id !== ctx.user.id),
    { serverId, type: "ANNOUNCEMENT", title, body, href: `/s/${serverId}` },
  );
  refresh(serverId);
  done(`/s/${serverId}/settings?tab=general`, "announced");
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}
