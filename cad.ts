"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireMembership } from "../access";
import { CALL_CATEGORIES, CALL_PRIORITIES, CALL_STATUSES, UNIT_STATUSES, locationPoint } from "../constants";
import { bounce, done } from "../nav";
import { isDispatcher } from "../permissions";
import { prisma } from "../prisma";
import type { ActionState } from "./types";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refresh(serverId: string) {
  revalidatePath(`/s/${serverId}`, "layout");
}

async function dispatcherContext(serverId: string) {
  const ctx = await requireMembership(serverId);
  const allowed = await isDispatcher(ctx.user.id, serverId, ctx.member.role);
  return { ...ctx, allowed };
}

function unitStatusForCall(status: string) {
  if (status === "EN_ROUTE") return "EN_ROUTE";
  if (status === "ON_SCENE") return "ON_SCENE";
  if (status === "DISPATCHED") return "BUSY";
  return null;
}

async function syncAssignments(callId: string, unitIds: string[], status: string, posX: number, posY: number) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call) return;
  await prisma.callAssignment.deleteMany({ where: { callId } });
  const closing = status === "COMPLETED" || status === "CANCELLED";
  if (!closing && unitIds.length) {
    await prisma.callAssignment.createMany({
      data: unitIds.map((unitId) => ({ callId, unitId })),
    });
  }
  const previously = await prisma.unit.findMany({ where: { currentCallId: callId } });
  const keep = new Set(closing ? [] : unitIds);
  for (const unit of previously) {
    if (!keep.has(unit.id)) {
      await prisma.unit.update({
        where: { id: unit.id },
        data: { currentCallId: null, status: unit.status === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE" },
      });
    }
  }
  const mapped = unitStatusForCall(status);
  for (let index = 0; index < unitIds.length; index += 1) {
    if (closing) {
      await prisma.unit.update({
        where: { id: unitIds[index] },
        data: { currentCallId: null, status: "AVAILABLE" },
      });
      continue;
    }
    const angle = index * 0.9;
    await prisma.unit.update({
      where: { id: unitIds[index] },
      data: {
        currentCallId: callId,
        status: mapped ?? "BUSY",
        posX: posX + Math.cos(angle) * 36,
        posY: posY + Math.sin(angle) * 36,
      },
    });
  }
}

export async function createCall(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) return { error: "You do not have permission to create calls." };
  const title = text(form, "title");
  const category = text(form, "category");
  const priority = text(form, "priority") || "MEDIUM";
  const location = text(form, "location");
  const description = text(form, "description");
  const notes = text(form, "notes");
  if (title.length < 3 || title.length > 80) return { error: "Call title must be 3–80 characters." };
  if (!CALL_CATEGORIES.includes(category as (typeof CALL_CATEGORIES)[number])) return { error: "Choose a call category." };
  if (!CALL_PRIORITIES.includes(priority as (typeof CALL_PRIORITIES)[number])) return { error: "Choose a priority." };
  if (!location) return { error: "Choose a call location." };
  if (description.length > 2000) return { error: "Description must be 2000 characters or fewer." };
  const point = locationPoint(location);
  const call = await prisma.call.create({
    data: {
      serverId,
      title,
      category,
      priority,
      location,
      description,
      notes,
      posX: point.x,
      posY: point.y,
      status: "PENDING",
      createdById: ctx.user.id,
    },
  });
  await prisma.mapMarker.create({
    data: {
      serverId,
      callId: call.id,
      label: title,
      posX: point.x,
      posY: point.y,
      createdById: ctx.user.id,
    },
  });
  const unitIds = form.getAll("unitId").map(String).filter(Boolean);
  const units = await prisma.unit.findMany({ where: { serverId, id: { in: unitIds } }, select: { id: true } });
  await syncAssignments(call.id, units.map((unit) => unit.id), "PENDING", point.x, point.y);
  refresh(serverId);
  return { success: "Call created." };
}

export async function updateCall(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) bounce(`/s/${serverId}/dispatch`, "You do not have permission to update calls.");
  const callId = text(form, "callId");
  const call = await prisma.call.findFirst({ where: { id: callId, serverId } });
  if (!call) bounce(`/s/${serverId}/dispatch`, "That call no longer exists.");
  const title = text(form, "title");
  const category = text(form, "category");
  const priority = text(form, "priority");
  const location = text(form, "location");
  const description = text(form, "description");
  const notes = text(form, "notes");
  const status = text(form, "status");
  if (title.length < 3 || title.length > 80) bounce(`/s/${serverId}/dispatch?call=${callId}`, "Call title must be 3–80 characters.");
  if (!CALL_CATEGORIES.includes(category as (typeof CALL_CATEGORIES)[number])) bounce(`/s/${serverId}/dispatch?call=${callId}`, "Choose a call category.");
  if (!CALL_PRIORITIES.includes(priority as (typeof CALL_PRIORITIES)[number])) bounce(`/s/${serverId}/dispatch?call=${callId}`, "Choose a priority.");
  if (!CALL_STATUSES.includes(status as (typeof CALL_STATUSES)[number])) bounce(`/s/${serverId}/dispatch?call=${callId}`, "Choose a call status.");
  if (!location) bounce(`/s/${serverId}/dispatch?call=${callId}`, "Choose a call location.");
  const point = locationPoint(location);
  const closing = status === "COMPLETED" || status === "CANCELLED";
  await prisma.call.update({
    where: { id: call.id },
    data: {
      title,
      category,
      priority,
      location,
      description: description.slice(0, 2000),
      notes: notes.slice(0, 4000),
      status,
      posX: point.x,
      posY: point.y,
      closedAt: closing ? call.closedAt ?? new Date() : null,
    },
  });
  await prisma.mapMarker.updateMany({
    where: { callId: call.id },
    data: { label: title, posX: point.x, posY: point.y },
  });
  const unitIds = form.getAll("unitId").map(String);
  const units = await prisma.unit.findMany({ where: { serverId, id: { in: unitIds } }, select: { id: true } });
  await syncAssignments(call.id, units.map((unit) => unit.id), status, point.x, point.y);
  refresh(serverId);
  done(`/s/${serverId}/dispatch?call=${callId}`, "saved");
}

export async function setOwnStatus(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (ctx.member.role === "GUEST") bounce(`/s/${serverId}/units`, "Guests cannot update a unit status.");
  const status = text(form, "status");
  const requested = text(form, "returnTo");
  const back = requested.startsWith(`/s/${serverId}`) && !requested.startsWith("//") ? requested.split("#")[0] : `/s/${serverId}`;
  if (!UNIT_STATUSES.includes(status as (typeof UNIT_STATUSES)[number])) bounce(back, "Choose a valid status.");
  const unit = await prisma.unit.findUnique({ where: { serverId_userId: { serverId, userId: ctx.user.id } } });
  if (!unit) bounce(back, "You do not have a unit on this server.");
  await prisma.unit.update({
    where: { id: unit.id },
    data: {
      status,
      currentCallId: status === "AVAILABLE" || status === "UNAVAILABLE" ? null : unit.currentCallId,
    },
  });
  if (status === "AVAILABLE" || status === "UNAVAILABLE") {
    await prisma.callAssignment.deleteMany({ where: { unitId: unit.id, call: { status: { in: ["PENDING", "DISPATCHED", "EN_ROUTE", "ON_SCENE"] } } } });
  }
  refresh(serverId);
  done(back, "status");
}

export async function updateUnit(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  const unitId = text(form, "unitId");
  const unit = await prisma.unit.findFirst({ where: { id: unitId, serverId } });
  if (!unit) bounce(`/s/${serverId}/units`, "That unit no longer exists.");
  const dispatcher = await isDispatcher(ctx.user.id, serverId, ctx.member.role);
  const owns = unit.userId === ctx.user.id && ctx.member.role !== "GUEST";
  if (!dispatcher && !owns) bounce(`/s/${serverId}/units`, "You can only edit your own unit.");
  const callsign = text(form, "callsign").toUpperCase();
  const displayName = text(form, "displayName");
  const departmentId = text(form, "departmentId");
  if (!/^[A-Z0-9-]{2,16}$/.test(callsign)) bounce(`/s/${serverId}/units`, "Callsign must be 2–16 letters, numbers, or hyphens.");
  if (displayName.length < 2 || displayName.length > 32) bounce(`/s/${serverId}/units`, "Display name must be 2–32 characters.");
  let nextDepartment: string | null = null;
  if (departmentId) {
    const membership = await prisma.departmentMember.findUnique({
      where: { departmentId_userId: { departmentId, userId: unit.userId } },
    });
    const department = await prisma.department.findFirst({ where: { id: departmentId, serverId } });
    if (!department || (!membership && !dispatcher)) {
      bounce(`/s/${serverId}/units`, "Assign a department that this member belongs to.");
    }
    nextDepartment = department.id;
  }
  try {
    await prisma.unit.update({
      where: { id: unit.id },
      data: { callsign, displayName, departmentId: nextDepartment },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      bounce(`/s/${serverId}/units`, "That callsign is already in use on this server.");
    }
    throw error;
  }
  refresh(serverId);
  done(`/s/${serverId}/units`, "saved");
}

export async function createMarker(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) return { error: "You do not have permission to place map markers." };
  const label = text(form, "label");
  const posX = Number(text(form, "posX"));
  const posY = Number(text(form, "posY"));
  const callId = text(form, "callId");
  if (label.length < 2 || label.length > 60) return { error: "Marker label must be 2–60 characters." };
  if (!Number.isFinite(posX) || !Number.isFinite(posY)) return { error: "Choose a point on the map." };
  let linked: string | null = null;
  if (callId) {
    const call = await prisma.call.findFirst({ where: { id: callId, serverId } });
    if (!call) return { error: "That call is not on this server." };
    linked = call.id;
  }
  await prisma.mapMarker.create({
    data: {
      serverId,
      label,
      posX: Math.min(1180, Math.max(20, posX)),
      posY: Math.min(740, Math.max(20, posY)),
      callId: linked,
      createdById: ctx.user.id,
    },
  });
  refresh(serverId);
  return { success: "Marker placed." };
}

export async function deleteMarker(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) bounce(`/s/${serverId}`, "You do not have permission to remove markers.");
  await prisma.mapMarker.deleteMany({ where: { id: text(form, "markerId"), serverId } });
  refresh(serverId);
  done(`/s/${serverId}`, "marker");
}

export async function saveReport(_prev: ActionState, form: FormData): Promise<ActionState> {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (ctx.member.role === "GUEST") return { error: "Guests cannot file reports." };
  const reportId = text(form, "reportId");
  const title = text(form, "title");
  const body = text(form, "body");
  if (title.length < 3 || title.length > 100) return { error: "Report title must be 3–100 characters." };
  if (body.length < 10 || body.length > 8000) return { error: "Report must be 10–8000 characters." };
  if (reportId) {
    const report = await prisma.report.findFirst({ where: { id: reportId, serverId } });
    if (!report) return { error: "That report no longer exists." };
    const dispatcher = await isDispatcher(ctx.user.id, serverId, ctx.member.role);
    if (report.authorId !== ctx.user.id && !dispatcher && ctx.member.role !== "OWNER" && ctx.member.role !== "ADMINISTRATOR") {
      return { error: "You do not have permission to edit this report." };
    }
    await prisma.report.update({ where: { id: report.id }, data: { title, body } });
  } else {
    await prisma.report.create({ data: { serverId, title, body, authorId: ctx.user.id } });
  }
  refresh(serverId);
  return { success: reportId ? "Report updated." : "Report filed." };
}

export async function saveBolo(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) bounce(`/s/${serverId}/bolo`, "You do not have permission to post BOLOs.");
  const boloId = text(form, "boloId");
  const title = text(form, "title");
  const description = text(form, "description");
  const status = text(form, "status") === "EXPIRED" ? "EXPIRED" : "ACTIVE";
  if (title.length < 3 || title.length > 80) bounce(`/s/${serverId}/bolo`, "BOLO title must be 3–80 characters.");
  if (description.length < 3 || description.length > 1000) bounce(`/s/${serverId}/bolo`, "BOLO description must be 3–1000 characters.");
  if (boloId) {
    await prisma.bolo.updateMany({ where: { id: boloId, serverId }, data: { title, description, status } });
  } else {
    await prisma.bolo.create({ data: { serverId, title, description, status, createdById: ctx.user.id } });
  }
  refresh(serverId);
  done(`/s/${serverId}/bolo`, "saved");
}

export async function deleteBolo(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await dispatcherContext(serverId);
  if (!ctx.allowed) bounce(`/s/${serverId}/bolo`, "You do not have permission to remove BOLOs.");
  await prisma.bolo.deleteMany({ where: { id: text(form, "boloId"), serverId } });
  refresh(serverId);
  done(`/s/${serverId}/bolo`, "removed");
}

export async function addRadio(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (ctx.member.role === "GUEST") bounce(`/s/${serverId}/radio`, "Guests cannot transmit on the radio log.");
  const message = text(form, "message");
  if (message.length < 1 || message.length > 500) bounce(`/s/${serverId}/radio`, "Radio message must be 1–500 characters.");
  const departmentId = text(form, "departmentId");
  let linked: string | null = null;
  if (departmentId) {
    const seat = await prisma.departmentMember.findUnique({
      where: { departmentId_userId: { departmentId, userId: ctx.user.id } },
    });
    const department = await prisma.department.findFirst({ where: { id: departmentId, serverId } });
    if (!department || !seat) bounce(`/s/${serverId}/radio`, "Choose one of your departments.");
    linked = department.id;
  }
  await prisma.radioMessage.create({
    data: { serverId, userId: ctx.user.id, departmentId: linked, message },
  });
  refresh(serverId);
  done(`/s/${serverId}/radio`, "sent");
}
