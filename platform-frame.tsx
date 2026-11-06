"use client";

import { usePathname } from "next/navigation";
import type { NotificationModel } from "@/lib/load";
import { TopNav, type MenuUser } from "./top-nav";

export function PlatformFrame({
  user,
  notifications,
  unread,
  children,
}: {
  user: MenuUser;
  notifications: NotificationModel[];
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = pathname === "/home";
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-ink">
      {bare ? null : <TopNav user={user} notifications={notifications} unread={unread} />}
      <div className={`mx-auto w-full px-4 py-6 ${bare ? "max-w-7xl md:py-8" : "max-w-6xl"}`}>{children}</div>
    </div>
  );
}
