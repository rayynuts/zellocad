import { requireUser } from "@/lib/auth";
import { loadServerCards } from "@/lib/load";
import { JoinCodeForm } from "@/components/auth-forms";
import { ServerCard } from "@/components/server-browser";
import { QueryBanner, fieldClass } from "@/components/ui";

export const metadata = { title: "Join" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string; q?: string; error?: string; notice?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const q = query.q?.trim() ?? "";
  const servers = await loadServerCards(user.id, {
    visibility: "PUBLIC",
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
            { departments: { some: { name: { contains: q } } } },
          ],
        }
      : {}),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Join a server</h1>
        <p className="text-sm text-muted">Use an invitation for a private server, or request access to a public one.</p>
      </div>
      <QueryBanner error={query.error} notice={query.notice} />
      <JoinCodeForm initialCode={query.code ?? ""} />
      <form className="flex gap-2">
        <input className={fieldClass} name="q" defaultValue={q} placeholder="Search public servers" />
        <button className="h-10 rounded-xl bg-panel px-4 text-sm" type="submit">Search</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {servers.map((server) => <ServerCard key={server.id} server={server} returnTo="/join" />)}
      </div>
    </div>
  );
}
