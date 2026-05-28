"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

type Signal = {
  count: number;
  latest: string | null;
};

type RealtimeContextType = {
  signals: Record<string, Signal>;
  hasUnread: (key: string) => boolean;
  markSeen: (key: string) => void;
  refreshNow: () => void;
};

export const REALTIME_REFRESH_EVENT = "nepalstay:data-refresh";

const RealtimeContext = createContext<RealtimeContextType>({
  signals: {},
  hasUnread: () => false,
  markSeen: () => {},
  refreshNow: () => {},
});

const PATH_KEYS: Array<{ prefix: string; key: string }> = [
  { prefix: "/customer/bookings", key: "bookings" },
  { prefix: "/vendor/bookings", key: "bookings" },
  { prefix: "/admin/bookings", key: "bookings" },
  { prefix: "/vendor/invoices", key: "invoices" },
  { prefix: "/admin/invoices", key: "invoices" },
  { prefix: "/vendor/fnmis", key: "fnmis" },
  { prefix: "/admin/fnmis", key: "fnmis" },
  { prefix: "/vendor/reviews", key: "reviews" },
  { prefix: "/admin/reviews", key: "reviews" },
  { prefix: "/customer/complaints", key: "complaints" },
  { prefix: "/admin/complaints", key: "complaints" },
];

function storageKey(userId: string | undefined, key: string) {
  return `ns_seen_${userId ?? "guest"}_${key}`;
}

function signalSignature(signals: Record<string, Signal>) {
  return Object.entries(signals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value.count}:${value.latest ?? ""}`)
    .join("|");
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userId = (session?.user as any)?.id as string | undefined;
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [seen, setSeen] = useState<Record<string, string>>({});
  const signatureRef = useRef("");

  const loadSeen = useCallback(() => {
    if (typeof window === "undefined") return;
    const next: Record<string, string> = {};
    Object.keys(signals).forEach((key) => {
      next[key] = localStorage.getItem(storageKey(userId, key)) ?? "";
    });
    setSeen(next);
  }, [signals, userId]);

  const markSeen = useCallback((key: string) => {
    const latest = signals[key]?.latest;
    if (!latest || typeof window === "undefined") return;
    localStorage.setItem(storageKey(userId, key), latest);
    setSeen((prev) => ({ ...prev, [key]: latest }));
  }, [signals, userId]);

  const refreshNow = useCallback(async () => {
    if (!session?.user) {
      setSignals({});
      return;
    }

    try {
      const res = await fetch("/api/notifications/status", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) return;

      const next = json.data ?? {};
      const nextSignature = signalSignature(next);
      const changed = signatureRef.current && signatureRef.current !== nextSignature;
      signatureRef.current = nextSignature;
      setSignals(next);

      if (changed && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT, { detail: next }));
      }
    } catch {
      // Keep the last known signal state if a poll misses.
    }
  }, [session]);

  useEffect(() => {
    refreshNow();
    const interval = window.setInterval(refreshNow, 5000);
    const onFocus = () => refreshNow();
    const onVisibility = () => {
      if (!document.hidden) refreshNow();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshNow]);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const requestMethod = typeof input === "string" || input instanceof URL ? undefined : input.method;
      const method = (init?.method ?? requestMethod ?? "GET").toUpperCase();
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const resolvedUrl = new URL(url, window.location.href);
      const isApiMutation =
        method !== "GET" &&
        resolvedUrl.origin === window.location.origin &&
        resolvedUrl.pathname.startsWith("/api/");

      if (isApiMutation) {
        window.setTimeout(() => {
          refreshNow();
          window.dispatchEvent(new CustomEvent(REALTIME_REFRESH_EVENT));
        }, 250);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [refreshNow]);

  useEffect(() => { loadSeen(); }, [loadSeen]);

  useEffect(() => {
    const match = PATH_KEYS.find(({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/"));
    if (match) markSeen(match.key);
  }, [markSeen, pathname]);

  const value = useMemo<RealtimeContextType>(() => ({
    signals,
    hasUnread: (key: string) => {
      const latest = signals[key]?.latest;
      return Boolean(latest && seen[key] !== latest);
    },
    markSeen,
    refreshNow,
  }), [markSeen, refreshNow, seen, signals]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
