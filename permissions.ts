import { prisma } from "./prisma";

export function isServerOwner(role: string) {
  return role === "OWNER";
}

export function canManageServer(role: string) {
  return role === "OWNER" || role === "ADMINISTRATOR";
}

export async function isDispatcher(userId: string, serverId: string, role: string) {
  if (role === "GUEST") return false;
  if (role === "OWNER" || role === "ADMINISTRATOR") return true;
  const seat = await prisma.departmentMember.findFirst({
    where: { userId, department: { serverId, slug: "communications" } },
    select: { id: true },
  });
  return Boolean(seat);
}

export async function canManageDepartment(userId: string, serverRole: string, departmentId: string) {
  if (canManageServer(serverRole)) return true;
  const seat = await prisma.departmentMember.findFirst({
    where: { userId, departmentId, role: "DIRECTOR" },
    select: { id: true },
  });
  return Boolean(seat);
}

export async function canReviewDepartment(userId: string, serverRole: string, departmentId: string) {
  if (canManageServer(serverRole)) return true;
  const seat = await prisma.departmentMember.findFirst({
    where: { userId, departmentId, role: { in: ["DIRECTOR", "SUPERVISOR"] } },
    select: { id: true },
  });
  return Boolean(seat);
}
