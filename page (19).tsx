import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CALL_STATUS_LABEL } from "@/lib/constants";
import { formatWhen } from "@/lib/format";
import { fieldClass } from "@/components/ui";

export const metadata = { title: "Call history" };

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { serverId } = await params;
  const q = (await searchParams).q?.trim() ?? "";
  await requireMembership(serverId);
  const calls = await prisma.call.findMany({
    where: {
      serverId,
      status: { in: ["COMPLETED", "CANCELLED"] },
      ...(q ? { OR: [{ title: { contains: q } }, { location: { contains: q } }, { description: { contains: q } }] } : {}),
    },
    orderBy: { closedAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Call history</h1>
      <form className="flex gap-2">
        <input className={fieldClass} name="q" defaultValue={q} placeholder="Search closed calls" />
        <button className="h-10 rounded-xl bg-panel px-4 text-sm" type="submit">Search</button>
      </form>
      <div className="space-y-2">
        {calls.length === 0 ? <p className="text-sm text-muted">No closed calls yet.</p> : null}
        {calls.map((call) => (
          <article key={call.id} className="rounded-2xl border border-white/5 bg-card p-4 text-sm">
            <p className="font-medium">{call.title}</p>
            <p className="text-muted">{call.location} · {CALL_STATUS_LABEL[call.status]} · {formatWhen(call.closedAt ?? call.updatedAt)}</p>
            <p className="mt-1">{call.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
