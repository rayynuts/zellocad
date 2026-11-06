import { requireMembership } from "@/lib/access";
import { isDispatcher } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteBolo, saveBolo } from "@/lib/actions/cad";
import { formatWhen } from "@/lib/format";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";

export const metadata = { title: "BOLO" };

export default async function BoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const allowed = await isDispatcher(user.id, serverId, member.role);
  const bolos = await prisma.bolo.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">BOLO board</h1>
      <p className="text-sm text-muted">Fictional roleplay notices for this server only.</p>
      <QueryBanner error={query.error} notice={query.notice} />
      {allowed ? (
        <form action={saveBolo} className="grid gap-2 rounded-2xl border border-white/5 bg-card p-4">
          <input type="hidden" name="serverId" value={serverId} />
          <input className={fieldClass} name="title" placeholder="Notice title" required />
          <textarea className={`${fieldClass} min-h-24`} name="description" placeholder="Description" required />
          <select className={fieldClass} name="status" defaultValue="ACTIVE">
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <SubmitButton>Post notice</SubmitButton>
        </form>
      ) : <p className="text-sm text-muted">Dispatchers and server managers can post notices.</p>}
      <div className="space-y-3">
        {bolos.map((bolo) => (
          <article key={bolo.id} className="rounded-2xl border border-white/5 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{bolo.title}</h2>
              <span className={`text-xs ${bolo.status === "ACTIVE" ? "text-ok" : "text-muted"}`}>{bolo.status === "ACTIVE" ? "Active" : "Expired"}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{bolo.description}</p>
            <p className="mt-2 text-xs text-muted">{bolo.createdBy.displayName} · {formatWhen(bolo.createdAt)}</p>
            {allowed ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={saveBolo} className="flex gap-2">
                  <input type="hidden" name="serverId" value={serverId} />
                  <input type="hidden" name="boloId" value={bolo.id} />
                  <input type="hidden" name="title" value={bolo.title} />
                  <input type="hidden" name="description" value={bolo.description} />
                  <input type="hidden" name="status" value={bolo.status === "ACTIVE" ? "EXPIRED" : "ACTIVE"} />
                  <SubmitButton variant="ghost">{bolo.status === "ACTIVE" ? "Mark expired" : "Mark active"}</SubmitButton>
                </form>
                <form action={deleteBolo}>
                  <input type="hidden" name="serverId" value={serverId} />
                  <input type="hidden" name="boloId" value={bolo.id} />
                  <SubmitButton variant="danger">Remove</SubmitButton>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
