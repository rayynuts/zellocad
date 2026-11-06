"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ClipboardList,
  Copy,
  FileText,
  Folder,
  Globe,
  Headset,
  History,
  Home,
  LayoutGrid,
  Link2,
  List,
  MoreVertical,
  Radio,
  Settings,
  Shield,
  Siren,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { leaveServer, toggleFavorite } from "@/lib/actions/community";
import type { ServerCardModel } from "@/lib/load";
import { cx } from "@/lib/format";
import { UserMenu, type MenuUser } from "./top-nav";

const LINKS = [
  { key: "home", label: "Home", icon: Home, color: "text-[#6ea8ff]", path: "" },
  { key: "roster", label: "Roster", icon: Users, color: "text-[#3dcc8a]", path: "/units" },
  { key: "resources", label: "Resources", icon: Folder, color: "text-[#e7a0a0]", path: "/resources" },
  { key: "cad", label: "CAD", icon: Globe, color: "text-[#b794f6]", path: "/dispatch" },
] as const;

export function MyServers({ servers, user }: { servers: ServerCardModel[]; user: MenuUser }) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">My Servers & Departments</h1>
          <p className="mt-1 text-sm text-[#8d8d8d]">Here are the servers and departments that you are a member of.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Grid view"
            className={cx("grid size-9 place-items-center rounded-full", layout === "grid" ? "bg-[#3a3a3a] text-white" : "bg-[#2a2a2a] text-[#bdbdbd]")}
            onClick={() => setLayout("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            aria-label="List view"
            className={cx("grid size-9 place-items-center rounded-full", layout === "list" ? "bg-[#3a3a3a] text-white" : "bg-[#2a2a2a] text-[#bdbdbd]")}
            onClick={() => setLayout("list")}
          >
            <List size={16} />
          </button>
          <UserMenu user={user} plain />
        </div>
      </div>
      {servers.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#141414] px-4 py-10 text-center text-sm text-[#8d8d8d]">
          You are not in a server yet. Open the account menu to create or join one.
        </p>
      ) : (
        <div className={layout === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
          {servers.map((server) => (
            <ServerTile key={server.id} server={server} layout={layout} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServerTile({ server, layout }: { server: ServerCardModel; layout: "grid" | "list" }) {
  const [menu, setMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const owner = server.role === "OWNER";
  const extra = Math.max(0, server.memberCount - server.memberPreview.length);
  return (
    <article className={cx("relative rounded-2xl border border-white/10 bg-[#141414]", layout === "list" && "md:flex")}>
      <div className={cx("overflow-hidden bg-[linear-gradient(160deg,#1a2420,#121212_55%,#1a1814)]", layout === "list" ? "h-28 rounded-t-2xl md:h-auto md:w-56 md:shrink-0 md:rounded-l-2xl md:rounded-tr-none" : "h-28 rounded-t-2xl")}>
        {server.bannerUrl ? <img src={server.bannerUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2 pr-8">
          <h2 className="text-[15px] font-semibold leading-snug text-white">{server.name}</h2>
        </div>
        <button
          ref={buttonRef}
          type="button"
          aria-label={`${server.name} menu`}
          aria-expanded={menu}
          className={cx("absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-[#c8c8c8] hover:bg-white/10 hover:text-white", menu && "bg-white/10 text-white")}
          onClick={() => setMenu((value) => !value)}
        >
          <MoreVertical size={16} />
        </button>
        {menu ? <ServerMenu server={server} anchor={buttonRef.current} owner={owner} onClose={() => setMenu(false)} /> : null}
        <div className="flex items-center justify-between gap-3 text-sm text-[#c8c8c8]">
          <span className="inline-flex items-center gap-2">
            <Users size={15} className="text-[#8d8d8d]" />
            {server.memberCount} {server.memberCount === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center">
            {server.memberPreview.filter((member) => member.avatarUrl).map((member) => (
              <span key={member.avatarUrl} className="-ml-1.5 first:ml-0" title={member.name}>
                <img src={member.avatarUrl ?? ""} alt="" className="size-6 rounded-full object-cover ring-2 ring-[#141414]" />
              </span>
            ))}
            {extra > 0 ? <span className="ml-1 text-xs text-[#3dcc8a]">+{extra}</span> : null}
          </span>
        </div>
        {owner ? (
          <Link href={`/s/${server.id}/settings`} className="inline-flex items-center gap-2 text-sm font-medium text-[#3dcc8a]">
            <Shield size={15} /> Edit server
          </Link>
        ) : null}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.key} href={`/s/${server.id}${link.path}`} className={cx("inline-flex items-center gap-2 text-sm font-medium", link.color)}>
                <Icon size={15} /> {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const MENU_LINKS = [
  { label: "Home", path: "", icon: Home },
  { label: "CAD", path: "/dispatch", icon: Headset },
  { label: "Active calls", path: "/calls", icon: Siren },
  { label: "Call history", path: "/history", icon: History },
  { label: "Roster", path: "/units", icon: Users },
  { label: "Resources", path: "/resources", icon: Folder },
  { label: "Applications", path: "/applications", icon: FileText },
  { label: "Reports", path: "/reports", icon: ClipboardList },
  { label: "BOLO board", path: "/bolo", icon: AlertTriangle },
  { label: "Radio log", path: "/radio", icon: Radio },
  { label: "Members", path: "/members", icon: Users },
  { label: "Invitations", path: "/invitations", icon: Ticket },
] as const;

function ServerMenu({
  server,
  anchor,
  owner,
  onClose,
}: {
  server: ServerCardModel;
  anchor: HTMLButtonElement | null;
  owner: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [box, setBox] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function place() {
      const rect = anchor?.getBoundingClientRect();
      if (!rect) return;
      const width = 248;
      const height = panelRef.current?.offsetHeight ?? 420;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const below = rect.bottom + 8;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below;
      setBox({ top, left });
    }
    place();
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onClose);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onClose);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  if (typeof document === "undefined") return null;
  const href = `${window.location.origin}/s/${server.id}`;

  return createPortal(
    <div className="fixed inset-0 z-[80]" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="menu"
        className="absolute max-h-[min(32rem,calc(100vh-1rem))] w-[248px] overflow-auto rounded-2xl border border-white/10 bg-[#1b1b1b] p-1.5 shadow-2xl"
        style={{ top: box.top, left: box.left }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="truncate px-2.5 py-2 text-xs text-[#8d8d8d]">{server.name}</p>
        {MENU_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path || "home"} href={`/s/${server.id}${item.path}`} role="menuitem" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#ededed] hover:bg-white/10" onClick={onClose}>
              <Icon size={15} className="text-[#9a9a9a]" /> {item.label}
            </Link>
          );
        })}
        {owner ? (
          <Link href={`/s/${server.id}/settings`} role="menuitem" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#3dcc8a] hover:bg-white/10" onClick={onClose}>
            <Settings size={15} /> Edit server
          </Link>
        ) : null}
        <div className="my-1 h-px bg-white/10" />
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[#ededed] hover:bg-white/10"
          onClick={async () => {
            await toggleFavorite(server.id);
            onClose();
            router.refresh();
          }}
        >
          <Star size={15} className={server.favorite ? "fill-[#f0a84d] text-[#f0a84d]" : "text-[#9a9a9a]"} />
          {server.favorite ? "Remove favourite" : "Favourite"}
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[#ededed] hover:bg-white/10"
          onClick={async () => {
            await navigator.clipboard.writeText(href);
            setCopied(true);
          }}
        >
          <Copy size={15} className="text-[#9a9a9a]" /> {copied ? "Link copied" : "Copy server link"}
        </button>
        {server.discordUrl ? (
          <a href={server.discordUrl} target="_blank" rel="noreferrer noopener" role="menuitem" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[#8ea1ff] hover:bg-white/10" onClick={onClose}>
            <Link2 size={15} /> Join Discord
          </a>
        ) : null}
        {server.role !== "OWNER" ? (
          confirmLeave ? (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-xl bg-[#3a1c1c] px-2.5 py-2 text-left text-sm text-[#f0a0a0]"
              onClick={() => leaveServer(server.id)}
            >
              Confirm leave
            </button>
          ) : (
            <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[#f0a0a0] hover:bg-white/10" onClick={() => setConfirmLeave(true)}>
              Leave server
            </button>
          )
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
