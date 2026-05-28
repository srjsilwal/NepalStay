"use client";

import { useEffect, useRef } from "react";
import { REALTIME_REFRESH_EVENT } from "@/components/providers/RealtimeProvider";

export function useRealtimeRefresh(callback: () => void | Promise<void>) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const onRefresh = () => {
      void callbackRef.current();
    };

    window.addEventListener(REALTIME_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(REALTIME_REFRESH_EVENT, onRefresh);
  }, []);
}
