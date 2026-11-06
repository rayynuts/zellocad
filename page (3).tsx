import { requireUser } from "@/lib/auth";
import { loadServerCards } from "@/lib/load";
import { ServerCard } from "@/components/server-browser";
import { EmptyState, QueryBanner, fieldClass } from "@/components/ui";

export const metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; notice?: string }> }) {
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Discover servers</h1>
        <p className="text-sm text-muted">Only public communities are listed. Private servers stay hidden.</p>
      </div>
      <QueryBanner error={query.error} notice={query.notice} />
      <form className="flex gap-2">
        <input className={fieldClass} name="q" defaultValue={q} placeholder="Search name, description, department, or category" />
        <button className="h-10 rounded-xl bg-accent px-4 text-sm font-medium text-white" type="submit">Search</button>
      </form>
      {servers.length === 0 ? <EmptyState title="No public servers" body="Try another search, or create a public server of your own." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => <ServerCard key={server.id} server={server} returnTo={q ? `/discover?q=${encodeURIComponent(q)}` : "/discover"} />)}
        </div>
      )}
    </div>
  );
}
