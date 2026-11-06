"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "../access";
import { slugify } from "../format";
import { bounce, done } from "../nav";
import { notify, notifyUsers, managerIds } from "../notify";
import { canManageDepartment, canManageServer, canReviewDepartment } from "../permissions";
import { prisma } from "../prisma";
import { DEPT_ICONS } from "../constants";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function refresh(serverId: string) {
  revalidatePath(`/s/${serverId}`, "layout");
}

async function departmentInServer(serverId: string, departmentId: string) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, serverId } });
  if (!department) bounce(`/s/${serverId}/departments`, "That department no longer exists.");
  return department;
}

export async function createDepartment(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  if (!canManageServer(ctx.member.role)) bounce(`/s/${serverId}/departments`, "You do not have permission to create departments.");
  const name = text(form, "name");
  const description = text(form, "description");
  const color = text(form, "color") || "#527DFF";
  const icon = text(form, "icon") || "Building2";
  const access = text(form, "access");
  if (name.length < 2 || name.length > 48) bounce(`/s/${serverId}/departments`, "Department name must be 2–48 characters.");
  if (description.length > 400) bounce(`/s/${serverId}/departments`, "Description must be 400 characters or fewer.");
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) bounce(`/s/${serverId}/departments`, "Choose a valid colour.");
  if (!DEPT_ICONS.includes(icon as (typeof DEPT_ICONS)[number])) bounce(`/s/${serverId}/departments`, "Choose a department icon.");
  if (!["OPEN", "LOCKED", "APPLICATION"].includes(access)) bounce(`/s/${serverId}/departments`, "Choose an access setting.");
  let slug = slugify(name);
  let suffix = 2;
  while (await prisma.department.findUnique({ where: { serverId_slug: { serverId, slug } } })) {
    slug = `${slugify(name)}-${suffix}`;
    suffix += 1;
  }
  const department = await prisma.department.create({
    data: { serverId, name, slug, description, color, icon, access },
  });
  refresh(serverId);
  done(`/s/${serverId}/departments/${department.id}`, "created");
}

export async function updateDepartment(form: FormData) {
  const serverId = text(form, "serverId");
  const departmentId = text(form, "departmentId");
  const ctx = await requireMembership(serverId);
  const department = await departmentInServer(serverId, departmentId);
  if (!(await canManageDepartment(ctx.user.id, ctx.member.role, department.id))) {
    bounce(`/s/${serverId}/departments/${departmentId}`, "You do not have permission to edit this department.");
  }
  const name = text(form, "name");
  const description = text(form, "description");
  const color = text(form, "color");
  const icon = text(form, "icon");
  const access = text(form, "access");
  if (name.length < 2 || name.length > 48) bounce(`/s/${serverId}/departments/${departmentId}`, "Department name must be 2–48 characters.");
  if (description.length > 400) bounce(`/s/${serverId}/departments/${departmentId}`, "Description must be 400 characters or fewer.");
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) bounce(`/s/${serverId}/departments/${departmentId}`, "Choose a valid colour.");
  if (!DEPT_ICONS.includes(icon as (typeof DEPT_ICONS)[number])) bounce(`/s/${serverId}/departments/${departmentId}`, "Choose a department icon.");
  if (!["OPEN", "LOCKED", "APPLICATION"].includes(access)) bounce(`/s/${serverId}/departments/${departmentId}`, "Choose an access setting.");
  await prisma.department.update({
    where: { id: department.id },
    data: { name, description, color, icon, access },
  });
  refresh(serverId);
  done(`/s/${serverId}/departments/${departmentId}`, "saved");
}

export async function deleteDepartment(form: FormData) {
  const serverId = text(form, "serverId");
  const departmentId = text(form, "departmentId");
  const ctx = await requireMembership(serverId);
  if (!canManageServer(ctx.member.role)) bounce(`/s/${serverId}/departments`, "Only a server owner or administrator can delete a department.");
  const department = await departmentInServer(serverId, departmentId);
  if (text(form, "confirmName") !== department.name) {
    bounce(`/s/${serverId}/departments/${departmentId}`, "Type the department name exactly to confirm.");
  }
  await prisma.department.delete({ where: { id: department.id } });
  refresh(serverId);
  done(`/s/${serverId}/departments`, "deleted");
}

export async function joinOpenDepartment(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  const department = await departmentInServer(serverId, text(form, "departmentId"));
  if (department.access !== "OPEN") {
    bounce(`/s/${serverId}/departments/${department.id}`, "This department is not open. Locked departments are assigned by staff, and others require an application.");
  }
  const existing = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId: department.id, userId: ctx.user.id } },
  });
  if (existing) bounce(`/s/${serverId}/departments/${department.id}`, "You are already in this department.");
  await prisma.departmentMember.create({ data: { departmentId: department.id, userId: ctx.user.id, role: "MEMBER" } });
  refresh(serverId);
  done(`/s/${serverId}/departments/${department.id}`, "joined");
}

export async function applyToDepartment(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  const department = await departmentInServer(serverId, text(form, "departmentId"));
  const back = `/s/${serverId}/applications`;
  if (department.access !== "APPLICATION") bounce(back, "This department does not accept applications.");
  const existing = await prisma.departmentMember.findUnique({
    where: { departmentId_userId: { departmentId: department.id, userId: ctx.user.id } },
  });
  if (existing) bounce(back, "You are already in this department.");
  const pending = await prisma.departmentApplication.findFirst({
    where: { departmentId: department.id, userId: ctx.user.id, status: "PENDING" },
  });
  if (pending) bounce(back, "You already have a pending application for this department.");
  const message = text(form, "message");
  if (message.length < 10 || message.length > 1500) bounce(back, "Application message must be 10–1500 characters.");
  await prisma.departmentApplication.create({
    data: { departmentId: department.id, userId: ctx.user.id, message },
  });
  const leads = await prisma.departmentMember.findMany({
    where: { departmentId: department.id, role: { in: ["DIRECTOR", "SUPERVISOR"] } },
    select: { userId: true },
  });
  const recipients = [...leads.map((lead) => lead.userId), ...(await managerIds(serverId))].filter((id) => id !== ctx.user.id);
  await notifyUsers(recipients, {
    serverId,
    type: "DEPT_APPLICATION",
    title: `${department.name} application`,
    body: `${ctx.user.displayName} applied to ${department.name}.`,
    href: `/s/${serverId}/applications`,
  });
  refresh(serverId);
  done(back, "applied");
}

export async function cancelApplication(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  const applicationId = text(form, "applicationId");
  const application = await prisma.departmentApplication.findFirst({
    where: { id: applicationId, userId: ctx.user.id, status: "PENDING", department: { serverId } },
  });
  if (!application) bounce(`/s/${serverId}/applications`, "That application cannot be cancelled.");
  await prisma.departmentApplication.delete({ where: { id: application.id } });
  refresh(serverId);
  done(`/s/${serverId}/applications`, "cancelled");
}

export async function reviewApplication(form: FormData) {
  const serverId = text(form, "serverId");
  const ctx = await requireMembership(serverId);
  const applicationId = text(form, "applicationId");
  const decision = text(form, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const decisionMessage = text(form, "decisionMessage").slice(0, 500);
  const application = await prisma.departmentApplication.findFirst({
    where: { id: applicationId, status: "PENDING", department: { serverId } },
    include: { department: true, user: { select: { id: true, displayName: true } } },
  });
  if (!application) bounce(`/s/${serverId}/applications`, "That application is no longer pending.");
  if (!(await canReviewDepartment(ctx.user.id, ctx.member.role, application.departmentId))) {
    bounce(`/s/${serverId}/applications`, "You do not have permission to review this application.");
  }
  if (decision === "APPROVED") {
    await prisma.departmentMember.upsert({
      where: { departmentId_userId: { departmentId: application.departmentId, userId: application.userId } },
      update: {},
      create: { departmentId: application.departmentId, userId: application.userId, role: "MEMBER" },
    });
  }
  await prisma.departmentApplication.update({
    where: { id: application.id },
    data: { status: decision, decisionMessage, reviewedAt: new Date(), reviewedById: ctx.user.id },
  });
  await notify(application.userId, {
    serverId,
    type: decision === "APPROVED" ? "DEPT_APPROVED" : "DEPT_REJECTED",
    title: decision === "APPROVED" ? "Application approved" : "Application declined",
    body: decisionMessage
      ? `${application.department.name}: ${decisionMessage}`
      : `Your application to ${application.department.name} was ${decision === "APPROVED" ? "approved" : "declined"}.`,
    href: `/s/${serverId}/applications`,
  });
  refresh(serverId);
  done(`/s/${serverId}/applications`, "reviewed");
}

export async function setDepartmentRole(form: FormData) {
  const serverId = text(form, "serverId");
  const departmentId = text(form, "departmentId");
  const ctx = await requireMembership(serverId);
  const department = await departmentInServer(serverId, departmentId);
  if (!(await canManageDepartment(ctx.user.id, ctx.member.role, department.id))) {
    bounce(`/s/${serverId}/departments/${departmentId}`, "You do not have permission to manage this department.");
  }
  const userId = text(form, "userId");
  const role = text(form, "role");
  if (!["DIRECTOR", "SUPERVISOR", "MEMBER"].includes(role)) {
    bounce(`/s/${serverId}/departments/${departmentId}`, "Choose a valid department role.");
  }
  const serverMember = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!serverMember) bounce(`/s/${serverId}/departments/${departmentId}`, "That person is not a member of this server.");
  await prisma.departmentMember.upsert({
    where: { departmentId_userId: { departmentId, userId } },
    update: { role },
    create: { departmentId, userId, role },
  });
  await notify(userId, {
    serverId,
    type: "ROLE_CHANGE",
    title: `${department.name} role updated`,
    body: `Your role in ${department.name} is now ${role === "DIRECTOR" ? "Department Director" : role === "SUPERVISOR" ? "Department Supervisor" : "Department Member"}.`,
    href: `/s/${serverId}/departments/${departmentId}`,
  });
  refresh(serverId);
  done(`/s/${serverId}/departments/${departmentId}`, "role");
}

export async function removeDepartmentMember(form: FormData) {
  const serverId = text(form, "serverId");
  const departmentId = text(form, "departmentId");
  const ctx = await requireMembership(serverId);
  const department = await departmentInServer(serverId, departmentId);
  if (!(await canManageDepartment(ctx.user.id, ctx.member.role, department.id))) {
    bounce(`/s/${serverId}/departments/${departmentId}`, "You do not have permission to manage this department.");
  }
  const userId = text(form, "userId");
  await prisma.departmentMember.deleteMany({ where: { departmentId, userId } });
  refresh(serverId);
  done(`/s/${serverId}/departments/${departmentId}`, "removed");
}
