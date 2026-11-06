import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { addRadio } from "@/lib/actions/cad";
import { formatWhen } from "@/lib/format";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";

export const metadata = { title: "Radio" };

export default async function RadioPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const [messages, departments] = await Promise.all([
    prisma.radioMessage.findMany({
      where: { serverId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { user: { select: { displayName: true } }, department: { select: { name: true, color: true } } },
    }),
    prisma.departmentMember.findMany({ where: { userId: user.id, department: { serverId } }, include: { department: true } }),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Radio log</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      <div className="max-h-[60vh] space-y-2 overflow-auto rounded-2xl border border-white/5 bg-card p-3">
        {messages.length === 0 ? <p className="text-sm text-muted">The channel is quiet.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className="rounded-xl bg-panel px-3 py-2 text-sm">
            <p className="text-xs text-muted">
              <span style={{ color: message.department?.color }}>{message.department?.name ?? "County"}</span>
              {" · "}{message.user.displayName} · {formatWhen(message.createdAt)}
            </p>
            <p>{message.message}</p>
          </article>
        ))}
      </div>
      {member.role === "GUEST" ? <p className="text-sm text-muted">Guests cannot transmit.</p> : (
        <form action={addRadio} className="flex flex-col gap-2 md:flex-row">
          <input type="hidden" name="serverId" value={serverId} />
          <select className={fieldClass} name="departmentId" defaultValue={departments[0]?.departmentId ?? ""}>
            <option value="">No department tag</option>
            {departments.map((seat) => <option key={seat.id} value={seat.departmentId}>{seat.department.name}</option>)}
          </select>
          <input className={fieldClass} name="message" placeholder="Radio message" required maxLength={500} />
          <SubmitButton pendingLabel="Sending...">Send</SubmitButton>
        </form>
      )}
    </div>
  );
}
