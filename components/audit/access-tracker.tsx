"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function AccessTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const payload = JSON.stringify({
      eventType: "page_view",
      path: pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/audit/access",
        new Blob([payload], { type: "application/json" }),
      );
      return;
    }

    void fetch("/api/audit/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
