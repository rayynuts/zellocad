import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CALL_STATUS_LABEL, PRIORITY_LABEL } from "@/lib/constants";
import { formatWhen } from "@/lib/format";

export const metadata = { title: "Active calls" };

export default async function CallsPage({ params }: { params: Promise<{ serverId: string }> }) {
  const { serverId } = await params;
  await requireMembership(serverId);
  const calls = await prisma.call.findMany({
    where: { serverId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    include: { assignments: { include: { unit: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Active calls</h1>
      <div className="space-y-3">
        {calls.length === 0 ? <p className="text-sm text-muted">No active calls.</p> : null}
        {calls.map((call) => (
          <article key={call.id} className="rounded-2xl border border-white/5 bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{call.title}</h2>
                <p className="text-sm text-muted">{call.category} · {call.location}</p>
                <p className="mt-2 text-sm">{call.description || "No description."}</p>
                <p className="mt-2 text-xs text-muted">Units: {call.assignments.map((item) => item.unit.callsign).join(", ") || "Unassigned"} · {formatWhen(call.createdAt)}</p>
              </div>
              <div className="text-right text-sm">
                <p>{PRIORITY_LABEL[call.priority]}</p>
                <p className="text-muted">{CALL_STATUS_LABEL[call.status]}</p>
                <Link className="text-accent" href={`/s/${serverId}/dispatch?call=${call.id}`}>Dispatch</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
