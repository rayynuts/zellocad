"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LogOut, UserRound } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/community";
import type { NotificationModel } from "@/lib/load";
import { formatWhen } from "@/lib/format";
import { Avatar, Logo } from "./logo";

export type MenuUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export function NotificationMenu({ items, unread }: { items: NotificationModel[]; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="relative grid size-10 place-items-center rounded-xl bg-panel text-ink transition hover:bg-[#31405c]"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-card p-2 shadow-2xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={async () => {
                await markAllNotificationsRead();
                router.refresh();
              }}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 space-y-1 overflow-auto">
            {items.length === 0 ? <p className="px-2 py-6 text-center text-sm text-muted">You are all caught up.</p> : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full rounded-xl px-2 py-2 text-left transition hover:bg-panel ${item.read ? "opacity-70" : ""}`}
                onClick={async () => {
                  await markNotificationRead(item.id);
                  setOpen(false);
                  if (item.href) router.push(item.href);
                  else router.refresh();
                }}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {!item.read ? <span className="size-1.5 rounded-full bg-accent" /> : null}
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{item.body}</span>
                <span className="mt-1 block text-[11px] text-muted">{formatWhen(item.createdAt)}</span>
              </button>
            ))}
          </div>
          <Link href="/notifications" className="mt-1 block rounded-xl px-2 py-2 text-center text-sm text-accent hover:bg-panel" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function UserMenu({ user, plain = false }: { user: MenuUser; plain?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" className={plain ? "grid size-9 place-items-center rounded-full bg-[#2a2a2a] text-[#d0d0d0]" : "rounded-xl"} aria-label="Account menu" onClick={() => setOpen((value) => !value)}>
        {plain ? <UserRound size={16} /> : <Avatar name={user.displayName} url={user.avatarUrl} size={40} />}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-card p-2 shadow-2xl">
          <p className="px-2 py-1 text-sm font-medium">{user.displayName}</p>
          <p className="px-2 pb-2 text-xs text-muted">@{user.username}</p>
          <Link href="/servers/new" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-panel" onClick={() => setOpen(false)}>
            Create a server
          </Link>
          <Link href="/join" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-panel" onClick={() => setOpen(false)}>
            Join a server
          </Link>
          <Link href="/discover" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-panel" onClick={() => setOpen(false)}>
            Discover servers
          </Link>
          <Link href="/notifications" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-panel" onClick={() => setOpen(false)}>
            Notifications
          </Link>
          <Link href="/profile" className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-panel" onClick={() => setOpen(false)}>
            <UserRound size={16} /> Profile and settings
          </Link>
          <form action={logout}>
            <button type="submit" className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-panel">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function TopNav({
  user,
  notifications,
  unread,
}: {
  user: MenuUser;
  notifications: NotificationModel[];
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-sidebar/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/home" className="shrink-0">
          <Logo compact />
        </Link>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/discover" className="hidden rounded-xl px-3 py-2 text-muted transition hover:bg-panel hover:text-ink sm:inline">
            Discover
          </Link>
          <Link href="/join" className="hidden rounded-xl px-3 py-2 text-muted transition hover:bg-panel hover:text-ink sm:inline">
            Join
          </Link>
          <NotificationMenu items={notifications} unread={unread} />
          <UserMenu user={user} />
        </nav>
      </div>
    </header>
  );
}
