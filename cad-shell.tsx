"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronDown, LogOut, Plus, Radio, UserRound } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { setOwnStatus } from "@/lib/actions/cad";
import { UNIT_STATUSES, UNIT_STATUS_LABEL } from "@/lib/constants";
import { cx } from "@/lib/format";
import type { MenuUser } from "./top-nav";

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "text-[#3DDC84]",
  BUSY: "text-[#F0A84D]",
  EN_ROUTE: "text-[#7EB6FF]",
  ON_SCENE: "text-[#7EB6FF]",
  UNAVAILABLE: "text-[#F05B65]",
};

export function CadShell({
  server,
  discordUrl,
  user,
  unread,
  departments,
  unitStatus,
  canSetStatus,
  role,
  children,
}: {
  server: { id: string; name: string; iconUrl: string | null; visibility: string };
  discordUrl: string | null;
  user: MenuUser;
  unread: number;
  departments: { id: string; slug: string; name: string }[];
  unitStatus: string;
  canSetStatus: boolean;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/s/${server.id}`;
  const dept = (slug: string) => {
    const found = departments.find((item) => item.slug === slug);
    return found ? `${base}/departments/${found.id}` : `${base}/departments`;
  };
  const onDept = (slug: string) => {
    const found = departments.find((item) => item.slug === slug);
    return found ? pathname.startsWith(`${base}/departments/${found.id}`) : false;
  };
  const links = [
    { href: base, label: "Home", active: pathname === base },
    { href: `${base}/dispatch`, label: "Dispatch", active: pathname.startsWith(`${base}/dispatch`) || pathname.startsWith(`${base}/calls`) },
    { href: dept("civilian"), label: "Civilian", active: onDept("civilian") },
    { href: dept("police"), label: "Law Enforcement", active: onDept("police") || onDept("sheriff") },
    { href: dept("fire"), label: "Fire / EMS", active: onDept("fire") },
    { href: dept("dot"), label: "DOT", active: onDept("dot") },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e0d] text-ink">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-white/5 bg-[#0b0e0d] px-3 md:gap-2 md:px-5">
        <SystemMenu serverId={server.id} serverName={server.name} discordUrl={discordUrl} role={role} />
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cx(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm transition",
                link.active ? "bg-[#1c3a2c] text-white" : "text-[#c5cdc8] hover:bg-white/5 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <StatusMenu serverId={server.id} status={unitStatus} enabled={canSetStatus} />
        <AccountMenu user={user} unread={unread} />
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-6">{children}</main>
    </div>
  );
}

function SystemMenu({ serverId, serverName, discordUrl, role }: { serverId: string; serverName: string; discordUrl: string | null; role: string }) {
  const [open, setOpen] = useState(false);
  const base = `/s/${serverId}`;
  const items = [
    { href: "/servers/new", label: "Create a server" },
    { href: "/home", label: "Your servers" },
    { href: "/discover", label: "Discover servers" },
    { href: "/join", label: "Join with a code" },
    { href: `${base}/calls`, label: "Active calls" },
    { href: `${base}/units`, label: "Unit roster" },
    { href: `${base}/history`, label: "Call history" },
    { href: `${base}/resources`, label: "Resources" },
    { href: `${base}/departments`, label: "Departments" },
    { href: `${base}/applications`, label: "Applications" },
    { href: `${base}/reports`, label: "Reports" },
    { href: `${base}/bolo`, label: "BOLO board" },
    { href: `${base}/radio`, label: "Radio log" },
    { href: `${base}/members`, label: "Server members" },
    { href: `${base}/invitations`, label: "Invitations" },
    ...(role === "OWNER" ? [{ href: `${base}/settings`, label: "Edit server" }] : []),
    ...(role === "ADMINISTRATOR" ? [{ href: `${base}/settings?tab=members`, label: "Member tools" }] : []),
  ];
  return (
    <div className="relative shrink-0">
      <button type="button" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-bold tracking-wide text-white hover:bg-white/5" onClick={() => setOpen((value) => !value)}>
        <Radio size={16} className="text-[#3DDC84]" />
        CAD SYSTEM
        <ChevronDown size={14} className="text-[#9aa59e]" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute left-3 top-12 w-64 rounded-2xl border border-white/10 bg-[#141a18] p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="truncate px-2 py-1 text-xs text-[#8d9892]">{serverName}</p>
            <Link href="/servers/new" className="mb-1 flex items-center gap-2 rounded-xl bg-[#1c3a2c] px-2 py-2 text-sm font-medium text-white" onClick={() => setOpen(false)}>
              <Plus size={15} /> Create a server
            </Link>
            {items.slice(1).map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-xl px-2 py-2 text-sm text-[#d5ddd8] hover:bg-white/5" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            {discordUrl ? (
              <a href={discordUrl} target="_blank" rel="noreferrer noopener" className="mt-1 block rounded-xl px-2 py-2 text-sm text-[#8ea1ff] hover:bg-white/5" onClick={() => setOpen(false)}>
                Join Discord
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusMenu({ serverId, status, enabled }: { serverId: string; status: string; enabled: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const label = UNIT_STATUS_LABEL[status] ?? "Unavailable";
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={cx("flex items-center gap-1 px-2 py-1 text-sm font-semibold", STATUS_COLOR[status] ?? "text-[#F05B65]")}
        onClick={() => enabled && setOpen((value) => !value)}
        aria-label="Unit status"
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute right-14 top-12 w-44 rounded-2xl border border-white/10 bg-[#141a18] p-1.5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            {UNIT_STATUSES.map((item) => (
              <form key={item} action={setOwnStatus}>
                <input type="hidden" name="serverId" value={serverId} />
                <input type="hidden" name="status" value={item} />
                <input type="hidden" name="returnTo" value={pathname} />
                <button type="submit" className={cx("block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5", item === status ? "bg-white/5" : "", STATUS_COLOR[item])}>
                  {UNIT_STATUS_LABEL[item]}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({ user, unread }: { user: MenuUser; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button" className="relative grid size-9 place-items-center overflow-hidden rounded-full bg-[#3DDC84] text-[#06210f]" aria-label="Account menu" onClick={() => setOpen((value) => !value)}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <UserRound size={18} strokeWidth={2.4} />
        )}
        {unread > 0 ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#F05B65] ring-2 ring-[#0b0e0d]" /> : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute right-3 top-12 w-56 rounded-2xl border border-white/10 bg-[#141a18] p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="px-2 py-1 text-sm font-medium">{user.displayName}</p>
            <p className="px-2 pb-2 text-xs text-[#8d9892]">@{user.username}</p>
            <Link href="/profile" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-white/5" onClick={() => setOpen(false)}>
              <UserRound size={16} /> Profile and settings
            </Link>
            <Link href="/notifications" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-white/5" onClick={() => setOpen(false)}>
              <Bell size={16} /> Notifications{unread > 0 ? ` (${unread})` : ""}
            </Link>
            <form action={logout}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-white/5">
                <LogOut size={16} /> Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
