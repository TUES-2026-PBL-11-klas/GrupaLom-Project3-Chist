"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";

export function NotificationBridge() {
  const { notifications, dismissNotification } = useApp();
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      const fn = n.type === "error" ? toast.error : n.type === "success" ? toast.success : toast;
      fn(n.message, { duration: n.duration ?? 4000, onAutoClose: () => dismissNotification(n.id) });
    }
  }, [notifications, dismissNotification]);

  return null;
}
