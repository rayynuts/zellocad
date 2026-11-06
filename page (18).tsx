import { requireMembership } from "@/lib/access";
import { isDispatcher } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DispatchBoard } from "@/components/dispatch-board";
import { QueryBanner } from "@/components/ui";

export const metadata = { title: "Dispatch" };

export default async function DispatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ call?: string; error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const allowed = await isDispatcher(user.id, serverId, member.role);
  const [calls, units] = await Promise.all([
    prisma.call.findMany({
      where: { serverId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      include: { assignments: true },
    }),
    prisma.unit.findMany({ where: { serverId }, orderBy: { callsign: "asc" } }),
  ]);
  if (!allowed) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Dispatch Center</h1>
        <QueryBanner error="You can view active calls, but only communications staff and server managers can dispatch." />
        <ul className="space-y-2 text-sm">
          {calls.map((call) => <li key={call.id} className="rounded-xl bg-card p-3">{call.title} · {call.location} · {call.status}</li>)}
          {calls.length === 0 ? <li className="text-muted">No open calls.</li> : null}
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dispatch Center</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      <DispatchBoard
        serverId={serverId}
        initialCallId={query.call}
        calls={calls.map((call) => ({
          id: call.id,
          title: call.title,
          category: call.category,
          priority: call.priority,
          location: call.location,
          description: call.description,
          status: call.status,
          notes: call.notes,
          createdAt: call.createdAt.toISOString(),
          unitIds: call.assignments.map((item) => item.unitId),
        }))}
        units={units.map((unit) => ({ id: unit.id, callsign: unit.callsign, displayName: unit.displayName, status: unit.status }))}
      />
    </div>
  );
}
