import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PasswordForm, ProfileForm } from "@/components/profile-forms";
import { formatWhen, serverRoleLabel } from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const memberships = await prisma.serverMember.findMany({
    where: { userId: user.id },
    include: { server: { select: { id: true, name: true, ownerId: true } } },
    orderBy: { joinedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted">@{user.username} · joined {formatWhen(user.createdAt)}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileForm user={user} />
        <PasswordForm />
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/5 bg-card p-4">
          <h2 className="font-semibold">Owned servers</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {memberships.filter((item) => item.server.ownerId === user.id).map((item) => (
              <li key={item.id}><Link className="text-accent" href={`/s/${item.server.id}`}>{item.server.name}</Link></li>
            ))}
            {memberships.every((item) => item.server.ownerId !== user.id) ? <li className="text-muted">You do not own a server yet.</li> : null}
          </ul>
        </article>
        <article className="rounded-2xl border border-white/5 bg-card p-4">
          <h2 className="font-semibold">Joined servers</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {memberships.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <Link className="text-accent" href={`/s/${item.server.id}`}>{item.server.name}</Link>
                <span className="text-muted">{serverRoleLabel(item.role)}</span>
              </li>
            ))}
            {memberships.length === 0 ? <li className="text-muted">You have not joined a server yet.</li> : null}
          </ul>
        </article>
      </section>
    </div>
  );
}
