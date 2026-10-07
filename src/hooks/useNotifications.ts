import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SecurityReportNotification } from "@/types/notification";

const MAX_NOTIFICATIONS = 20;

export function useNotifications() {
  const [notifications, setNotifications] = useState<SecurityReportNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<SecurityReportNotification>("security-report://received", (event) => {
      setNotifications((current) => [event.payload, ...current].slice(0, MAX_NOTIFICATIONS));
      setUnreadCount((count) => count + 1);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  function markAllRead() {
    setUnreadCount(0);
  }

  return { notifications, unreadCount, markAllRead };
}
