import { requireMembership } from "@/lib/access";
import { isDispatcher } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UNIT_STATUSES, UNIT_STATUS_LABEL } from "@/lib/constants";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";
import { setOwnStatus, updateUnit } from "@/lib/actions/cad";

export const metadata = { title: "Units" };

export default async function UnitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const dispatcher = await isDispatcher(user.id, serverId, member.role);
  const units = await prisma.unit.findMany({
    where: { serverId },
    orderBy: { callsign: "asc" },
    include: {
      department: true,
      currentCall: { select: { title: true } },
      user: { select: { id: true } },
    },
  });
  const seats = await prisma.departmentMember.findMany({
    where: { department: { serverId } },
    include: { department: true },
  });
  const mine = units.find((unit) => unit.userId === user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Unit roster</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      {mine && member.role !== "GUEST" ? (
        <form action={setOwnStatus} className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/5 bg-card p-4">
          <input type="hidden" name="serverId" value={serverId} />
          <label className="text-sm">
            <span className="mb-1 block">Your status · {mine.callsign}</span>
            <select className={fieldClass} name="status" defaultValue={mine.status}>
              {UNIT_STATUSES.map((status) => <option key={status} value={status}>{UNIT_STATUS_LABEL[status]}</option>)}
            </select>
          </label>
          <SubmitButton>Update status</SubmitButton>
        </form>
      ) : null}
      <div className="space-y-3">
        {units.map((unit) => {
          const options = seats.filter((seat) => seat.userId === unit.userId).map((seat) => seat.department);
          const canEdit = dispatcher || (unit.userId === user.id && member.role !== "GUEST");
          return (
            <article key={unit.id} className="rounded-2xl border border-white/5 bg-card p-4">
              <p className="font-medium">{unit.callsign} · {unit.displayName}</p>
              <p className="text-sm text-muted">{unit.department?.name ?? "No department"} · {UNIT_STATUS_LABEL[unit.status]} · {unit.currentCall ? `Assigned: ${unit.currentCall.title}` : "No active call"}</p>
              {canEdit ? (
                <form action={updateUnit} className="mt-3 grid gap-2 md:grid-cols-4">
                  <input type="hidden" name="serverId" value={serverId} />
                  <input type="hidden" name="unitId" value={unit.id} />
                  <input className={fieldClass} name="callsign" defaultValue={unit.callsign} />
                  <input className={fieldClass} name="displayName" defaultValue={unit.displayName} />
                  <select className={fieldClass} name="departmentId" defaultValue={unit.departmentId ?? ""}>
                    <option value="">No department</option>
                    {options.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                  <SubmitButton>Save unit</SubmitButton>
                </form>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
