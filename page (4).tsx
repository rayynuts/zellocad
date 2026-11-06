import { requireUser } from "@/lib/auth";
import { loadServerCards } from "@/lib/load";
import { MyServers } from "@/components/my-servers";
import { QueryBanner } from "@/components/ui";

export const metadata = { title: "My Servers & Departments" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const servers = await loadServerCards(user.id, { members: { some: { userId: user.id } } });
  return (
    <div className="space-y-4">
      <QueryBanner error={query.error} notice={query.notice} />
      <MyServers
        servers={servers}
        user={{ username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }}
      />
    </div>
  );
}
