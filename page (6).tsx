import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/community";
import { formatWhen } from "@/lib/format";
import { SubmitButton } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <form action={markAllNotificationsRead}><SubmitButton variant="ghost">Mark all as read</SubmitButton></form>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted">No notifications yet.</p> : null}
        {items.map((item) => (
          <article key={item.id} className={`rounded-2xl border border-white/5 bg-card p-4 ${item.read ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-medium">{item.title}</h2>
                <p className="text-sm text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-muted">{formatWhen(item.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                {item.href ? <Link className="text-sm text-accent" href={item.href}>Open</Link> : null}
                {!item.read ? (
                  <form action={markNotificationRead.bind(null, item.id)}>
                    <SubmitButton variant="ghost">Mark read</SubmitButton>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
