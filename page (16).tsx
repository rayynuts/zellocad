import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { canManageServer } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createDepartment } from "@/lib/actions/departments";
import { DEPT_ICONS } from "@/lib/constants";
import { DeptIcon } from "@/components/dept-icon";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { member } = await requireMembership(serverId);
  const departments = await prisma.department.findMany({
    where: { serverId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } }, members: { where: { role: "DIRECTOR" }, include: { user: { select: { displayName: true } } } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Departments</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      <div className="grid gap-3 md:grid-cols-2">
        {departments.map((department) => (
          <Link key={department.id} href={`/s/${serverId}/departments/${department.id}`} className="rounded-2xl border border-white/5 bg-card p-4 transition hover:border-accent/40">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl" style={{ background: `${department.color}22`, color: department.color }}><DeptIcon name={department.icon} /></span>
              <div>
                <h2 className="font-semibold">{department.name}</h2>
                <p className="text-xs text-muted">{department.access === "OPEN" ? "Open" : department.access === "LOCKED" ? "Locked" : "Application required"} · {department._count.members} members</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted">{department.description}</p>
            <p className="mt-2 text-xs text-muted">Director: {department.members.map((item) => item.user.displayName).join(", ") || "Unassigned"}</p>
          </Link>
        ))}
      </div>
      {canManageServer(member.role) ? (
        <form action={createDepartment} className="grid gap-3 rounded-2xl border border-white/5 bg-card p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 font-semibold">New department</h2>
          <input type="hidden" name="serverId" value={serverId} />
          <input className={fieldClass} name="name" placeholder="Name" required />
          <input className={fieldClass} name="color" type="color" defaultValue="#527DFF" />
          <select className={fieldClass} name="icon" defaultValue="Building2">{DEPT_ICONS.map((icon) => <option key={icon}>{icon}</option>)}</select>
          <select className={fieldClass} name="access" defaultValue="APPLICATION">
            <option value="OPEN">Open</option>
            <option value="LOCKED">Locked</option>
            <option value="APPLICATION">Application required</option>
          </select>
          <textarea className={`${fieldClass} md:col-span-2`} name="description" placeholder="Description" />
          <SubmitButton>Create department</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
