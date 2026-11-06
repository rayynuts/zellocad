import { requireMembership } from "@/lib/access";
import { isServerOwner } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ZelloCad2 } from "@/components/zello-cad-2";
import { QueryBanner } from "@/components/ui";

export const metadata = { title: "Resources" };

export default async function ResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  const { member, server } = await requireMembership(serverId);
  const docs = await prisma.resourceDoc.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, url: true },
  });

  return (
    <div className="space-y-4">
      <QueryBanner error={query.error} notice={query.notice} />
      <ZelloCad2
        serverId={serverId}
        serverName={server.name}
        owner={isServerOwner(member.role)}
        applicationUrl={server.applicationUrl}
        docs={docs}
      />
    </div>
  );
}
