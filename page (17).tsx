import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/access";
import { canManageDepartment, canManageServer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteDepartment, joinOpenDepartment, removeDepartmentMember, setDepartmentRole, updateDepartment } from "@/lib/actions/departments";
import { DEPT_ICONS } from "@/lib/constants";
import { deptRoleLabel, formatWhen } from "@/lib/format";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";

export const metadata = { title: "Department" };

export default async function DepartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string; deptId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId, deptId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const department = await prisma.department.findFirst({
    where: { id: deptId, serverId },
    include: { members: { include: { user: { select: { id: true, displayName: true, username: true } } }, orderBy: { joinedAt: "asc" } } },
  });
  if (!department) notFound();
  const manageable = await canManageDepartment(user.id, member.role, department.id);
  const mine = department.members.some((item) => item.userId === user.id);
  const serverMembers = manageable
    ? await prisma.serverMember.findMany({ where: { serverId }, include: { user: { select: { id: true, displayName: true, username: true } } } })
    : [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{department.name}</h1>
        <p className="text-sm text-muted">{department.description}</p>
      </div>
      <QueryBanner error={query.error} notice={query.notice} />
      {!mine && department.access === "OPEN" ? (
        <form action={joinOpenDepartment}>
          <input type="hidden" name="serverId" value={serverId} />
          <input type="hidden" name="departmentId" value={department.id} />
          <SubmitButton>Join department</SubmitButton>
        </form>
      ) : null}
      {department.access === "LOCKED" ? <p className="text-sm text-muted">This department is locked. Only authorised staff can add members.</p> : null}
      {department.access === "APPLICATION" && !mine ? <p className="text-sm text-muted">This department requires an application. Submit one from the Applications page.</p> : null}
      <div className="space-y-2">
        {department.members.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/5 bg-card p-3 text-sm">
            <div>
              <p className="font-medium">{item.user.displayName}</p>
              <p className="text-xs text-muted">@{item.user.username} · {deptRoleLabel(item.role)} · {formatWhen(item.joinedAt)}</p>
            </div>
            {manageable ? (
              <form action={removeDepartmentMember}>
                <input type="hidden" name="serverId" value={serverId} />
                <input type="hidden" name="departmentId" value={department.id} />
                <input type="hidden" name="userId" value={item.userId} />
                <SubmitButton variant="danger">Remove</SubmitButton>
              </form>
            ) : null}
          </article>
        ))}
      </div>
      {manageable ? (
        <form action={setDepartmentRole} className="grid gap-2 rounded-2xl border border-white/5 bg-card p-4 md:grid-cols-3">
          <h2 className="md:col-span-3 font-semibold">Assign director, supervisor, or member</h2>
          <input type="hidden" name="serverId" value={serverId} />
          <input type="hidden" name="departmentId" value={department.id} />
          <select className={fieldClass} name="userId" required>
            {serverMembers.map((item) => <option key={item.userId} value={item.userId}>{item.user.displayName} (@{item.user.username})</option>)}
          </select>
          <select className={fieldClass} name="role" defaultValue="MEMBER">
            <option value="DIRECTOR">Department Director</option>
            <option value="SUPERVISOR">Department Supervisor</option>
            <option value="MEMBER">Department Member</option>
          </select>
          <SubmitButton>Save assignment</SubmitButton>
        </form>
      ) : null}
      {manageable ? (
        <form action={updateDepartment} className="grid gap-3 rounded-2xl border border-white/5 bg-card p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold">Department settings</h2>
          <input type="hidden" name="serverId" value={serverId} />
          <input type="hidden" name="departmentId" value={department.id} />
          <input className={fieldClass} name="name" defaultValue={department.name} />
          <input className={fieldClass} name="color" type="color" defaultValue={department.color} />
          <select className={fieldClass} name="icon" defaultValue={department.icon}>{DEPT_ICONS.map((icon) => <option key={icon}>{icon}</option>)}</select>
          <select className={fieldClass} name="access" defaultValue={department.access}>
            <option value="OPEN">Open — anyone in the server can join</option>
            <option value="LOCKED">Locked — staff assign members</option>
            <option value="APPLICATION">Application required</option>
          </select>
          <textarea className={`${fieldClass} md:col-span-2`} name="description" defaultValue={department.description} />
          <SubmitButton>Save department</SubmitButton>
        </form>
      ) : null}
      {canManageServer(member.role) ? (
        <form action={deleteDepartment} className="space-y-2 rounded-2xl border border-danger/40 bg-card p-4">
          <h2 className="font-semibold text-danger">Delete department</h2>
          <input type="hidden" name="serverId" value={serverId} />
          <input type="hidden" name="departmentId" value={department.id} />
          <input className={fieldClass} name="confirmName" placeholder={`Type ${department.name} to confirm`} />
          <SubmitButton variant="danger">Delete department</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
