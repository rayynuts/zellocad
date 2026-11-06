import { requireUser } from "@/lib/auth";
import { loadNotifications } from "@/lib/load";
import { PlatformFrame } from "@/components/platform-frame";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notes = await loadNotifications(user.id);
  return (
    <PlatformFrame
      user={{ username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl }}
      notifications={notes.items}
      unread={notes.unread}
    >
      {children}
    </PlatformFrame>
  );
}
