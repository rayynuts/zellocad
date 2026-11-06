import { requireMembership } from "@/lib/access";
import { canReviewDepartment } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { applyToDepartment, cancelApplication, reviewApplication } from "@/lib/actions/departments";
import { fieldClass, QueryBanner, SubmitButton } from "@/components/ui";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { user, member } = await requireMembership(serverId);
  const departments = await prisma.department.findMany({
    where: { serverId },
    include: {
      members: { where: { userId: user.id }, select: { id: true } },
      applications: { where: { userId: user.id }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  const reviewIds: string[] = [];
  for (const department of departments) {
    if (await canReviewDepartment(user.id, member.role, department.id)) reviewIds.push(department.id);
  }
  const queue = reviewIds.length
    ? await prisma.departmentApplication.findMany({
        where: { departmentId: { in: reviewIds }, status: "PENDING" },
        include: { user: { select: { displayName: true, username: true } }, department: true },
        orderBy: { createdAt: "asc" },
      })
    : [];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Applications</h1>
      <QueryBanner error={query.error} notice={query.notice} />
      <div className="grid gap-3">
        {departments.filter((department) => department.access === "APPLICATION").map((department) => {
          const pending = department.applications.find((item) => item.status === "PENDING");
          const memberOf = department.members.length > 0;
          return (
            <article key={department.id} className="rounded-2xl border border-white/5 bg-card p-4">
              <h2 className="font-semibold">{department.name}</h2>
              <p className="text-sm text-muted">{department.description}</p>
              {memberOf ? <p className="mt-2 text-sm text-ok">You are in this department.</p> : null}
              {pending ? (
                <form action={cancelApplication} className="mt-2">
                  <input type="hidden" name="serverId" value={serverId} />
                  <input type="hidden" name="applicationId" value={pending.id} />
                  <p className="mb-2 text-sm text-warn">Application pending.</p>
                  <SubmitButton variant="ghost">Cancel application</SubmitButton>
                </form>
              ) : null}
              {!memberOf && !pending ? (
                <form action={applyToDepartment} className="mt-3 space-y-2">
                  <input type="hidden" name="serverId" value={serverId} />
                  <input type="hidden" name="departmentId" value={department.id} />
                  <textarea className={`${fieldClass} min-h-24`} name="message" placeholder="Why should this department accept you?" required minLength={10} />
                  <SubmitButton>Submit application</SubmitButton>
                </form>
              ) : null}
              {department.applications.filter((item) => item.status !== "PENDING").slice(0, 3).map((item) => (
                <p key={item.id} className="mt-2 text-xs text-muted">{item.status === "APPROVED" ? "Approved" : "Declined"}{item.decisionMessage ? `: ${item.decisionMessage}` : ""}</p>
              ))}
            </article>
          );
        })}
      </div>
      {queue.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Review queue</h2>
          {queue.map((item) => (
            <form key={item.id} action={reviewApplication} className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
              <input type="hidden" name="serverId" value={serverId} />
              <input type="hidden" name="applicationId" value={item.id} />
              <p className="font-medium">{item.user.displayName} · {item.department.name}</p>
              <p className="text-xs text-muted">@{item.user.username}</p>
              <p className="whitespace-pre-wrap text-sm">{item.message}</p>
              <textarea className={fieldClass} name="decisionMessage" placeholder="Optional decision message" />
              <div className="flex gap-2">
                <button className="h-10 rounded-xl bg-ok px-3 text-sm font-medium text-[#062117]" name="decision" value="APPROVED" type="submit">Approve</button>
                <button className="h-10 rounded-xl bg-danger px-3 text-sm font-medium text-white" name="decision" value="REJECTED" type="submit">Reject</button>
              </div>
            </form>
          ))}
        </section>
      ) : null}
    </div>
  );
}
