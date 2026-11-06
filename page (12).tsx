import Link from "next/link";
import { requireMembership } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { QueryBanner } from "@/components/ui";

export const metadata = { title: "Home" };

const PORTALS = [
  { key: "civilian", title: "Civilian", subtitle: "Character services & records", slug: "civilian", body: "#6d7b68", head: "#8d6b52" },
  { key: "dispatcher", title: "Dispatcher", subtitle: "Calls & active units", href: "dispatch", body: "#3c615c", head: "#8d6b52" },
  { key: "police", title: "Law Enforcement", subtitle: "Police department portal", slug: "police", body: "#2c4e86", head: "#8d6b52" },
  { key: "fire", title: "Fire / EMS", subtitle: "Emergency services", slug: "fire", body: "#7a3a46", head: "#8d6b52" },
  { key: "ems", title: "EMS", subtitle: "Medical response", slug: "ems", body: "#8a5a38", head: "#8d6b52" },
  { key: "dot", title: "DOT", subtitle: "Roadside & transport", slug: "dot", body: "#a07a34", head: "#8d6b52" },
] as const;

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ serverId: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { serverId } = await params;
  const query = await searchParams;
  await requireMembership(serverId);
  const departments = await prisma.department.findMany({ where: { serverId }, select: { id: true, slug: true } });
  const bySlug = new Map(departments.map((department) => [department.slug, department.id]));

  return (
    <div className="space-y-4">
      <QueryBanner error={query.error} notice={query.notice} />
      <div className="grid gap-4 md:grid-cols-2">
        {PORTALS.map((portal) => {
          const departmentId = "slug" in portal ? bySlug.get(portal.slug) : undefined;
          const href = "href" in portal ? `/s/${serverId}/${portal.href}` : departmentId ? `/s/${serverId}/departments/${departmentId}` : `/s/${serverId}/departments`;
          return (
            <Link
              key={portal.key}
              href={href}
              className="group relative h-[248px] overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#121816] transition hover:border-white/20"
            >
              <figure className="pointer-events-none absolute inset-x-0 top-1 flex justify-center" aria-hidden>
                <PersonMark body={portal.body} head={portal.head} />
              </figure>
              <div className="absolute bottom-5 left-6 right-6">
                <h2 className="text-[1.35rem] font-bold leading-tight tracking-tight text-white">{portal.title}</h2>
                <p className="mt-0.5 text-[15px] text-[#9aa59e]">{portal.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PersonMark({ body, head }: { body: string; head: string }) {
  return (
    <svg width="220" height="250" viewBox="0 0 220 250" className="h-[236px] w-[208px]">
      <circle cx="110" cy="58" r="36" fill={head} stroke="#161412" strokeWidth="8" />
      <path
        d="M34 250V148c0-32 26-50 76-50s76 18 76 50V250"
        fill={body}
        stroke="#161412"
        strokeWidth="8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
