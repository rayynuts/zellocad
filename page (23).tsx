import { requireMembership } from "@/lib/access";
import { isDispatcher } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ReportDesk } from "@/components/report-desk";
import { fieldClass } from "@/components/ui";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { serverId } = await params;
  const q = (await searchParams).q?.trim() ?? "";
  const { user, member } = await requireMembership(serverId);
  const dispatcher = await isDispatcher(user.id, serverId, member.role);
  const reports = await prisma.report.findMany({
    where: q ? { serverId, OR: [{ title: { contains: q } }, { body: { contains: q } }] } : { serverId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { displayName: true } } },
  });
  const manager = member.role === "OWNER" || member.role === "ADMINISTRATOR" || dispatcher;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <form className="flex gap-2">
        <input className={fieldClass} name="q" defaultValue={q} placeholder="Search reports" />
        <button className="h-10 rounded-xl bg-panel px-4 text-sm" type="submit">Search</button>
      </form>
      {member.role === "GUEST" ? <p className="text-sm text-muted">Guests can read reports but cannot file them.</p> : null}
      <ReportDesk
        serverId={serverId}
        canCreate={member.role !== "GUEST"}
        reports={reports.map((report) => ({
          id: report.id,
          title: report.title,
          body: report.body,
          createdAt: report.createdAt.toISOString(),
          author: report.author.displayName,
          canEdit: report.authorId === user.id || manager,
        }))}
      />
    </div>
  );
}
