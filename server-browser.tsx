"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, Users } from "lucide-react";
import { leaveServer, requestJoin, toggleFavorite } from "@/lib/actions/community";
import type { ServerCardModel } from "@/lib/load";
import { fieldClass, SubmitButton } from "./ui";
import { Avatar } from "./logo";

export function ServerCard({ server, returnTo }: { server: ServerCardModel; returnTo: string }) {
  const router = useRouter();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-card shadow-lg transition hover:-translate-y-0.5 hover:border-accent/40">
      <div className="relative h-28 bg-gradient-to-br from-accent to-violet">
        {server.bannerUrl ? <img src={server.bannerUrl} alt="" className="h-full w-full object-cover" /> : null}
        {server.isMember ? (
          <button
            type="button"
            aria-label={server.favorite ? "Remove favourite" : "Favourite server"}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-black/40 text-white"
            onClick={async () => {
              await toggleFavorite(server.id);
              router.refresh();
            }}
          >
            <Star size={16} className={server.favorite ? "fill-warn text-warn" : ""} />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="-mt-10">
            <Avatar name={server.name} url={server.iconUrl} size={56} />
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="truncate font-semibold">{server.name}</h2>
            <p className="text-xs text-muted">{server.category}</p>
          </div>
        </div>
        <p className="line-clamp-2 min-h-10 text-sm text-muted">{server.description || "No description yet."}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${server.visibility === "PUBLIC" ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
            {server.visibility === "PUBLIC" ? "Public" : "Private"}
          </span>
          {server.departmentTags.map((tag) => (
            <span key={tag.name} className="rounded-full bg-panel px-2 py-0.5 text-[11px] text-muted" style={{ boxShadow: `inset 0 0 0 1px ${tag.color}55` }}>
              {tag.name}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Users size={13} /> {server.memberCount} members</span>
          <span>{server.departmentCount} departments</span>
          <span className="text-ok">{server.onlineCount} online</span>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {server.discordUrl ? (
            <a href={server.discordUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-3 text-sm font-medium text-white">
              Join Discord
            </a>
          ) : null}
          {server.isMember ? (
            <Link href={`/s/${server.id}`} className="inline-flex h-10 items-center rounded-xl bg-accent px-3 text-sm font-medium text-white">
              Enter Server
            </Link>
          ) : (
            <form action={requestJoin}>
              <input type="hidden" name="serverId" value={server.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton>{server.joinMode === "APPROVAL" ? "Request to join" : "Join server"}</SubmitButton>
            </form>
          )}
          {server.isMember && server.role !== "OWNER" ? (
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-xl bg-panel px-3 text-sm text-muted hover:text-ink"
              onClick={async () => {
                if (!confirm(`Leave ${server.name}?`)) return;
                await leaveServer(server.id);
              }}
            >
              Leave
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ServerBrowser({ servers }: { servers: ServerCardModel[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return servers;
    return servers.filter((server) =>
      [server.name, server.description, server.category, ...server.departmentTags.map((tag) => tag.name)]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, servers]);
  const favourites = servers.filter((server) => server.favorite);
  const recent = [...servers]
    .filter((server) => server.lastVisitedAt)
    .sort((a, b) => (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? ""))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className={`${fieldClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your servers" />
      </label>
      {query ? (
        <Section title="Search results" servers={filtered} />
      ) : (
        <>
          {favourites.length ? <Section title="Favourites" servers={favourites} /> : null}
          {recent.length ? <Section title="Recently visited" servers={recent} /> : null}
          <Section title="Your servers" servers={servers} empty="Create a server or join one with an invitation to get started." />
        </>
      )}
    </div>
  );
}

function Section({ title, servers, empty }: { title: string; servers: ServerCardModel[]; empty?: string }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {servers.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => <ServerCard key={`${title}-${server.id}`} server={server} returnTo="/home" />)}
        </div>
      )}
    </section>
  );
}
