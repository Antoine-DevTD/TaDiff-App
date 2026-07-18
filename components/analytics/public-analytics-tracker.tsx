"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackPublicEvent } from "@/lib/public-analytics";

export function PublicAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackPublicEvent({ eventType: "page_view", path: pathname });
  }, [pathname, searchParams]);

  useEffect(() => {
    function trackClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tracked = target.closest<HTMLElement>("[data-analytics]");
      if (!tracked) return;

      trackPublicEvent({
        eventType: "cta_click",
        eventName: tracked.dataset.analytics,
        target: tracked.getAttribute("href") || "",
      });
    }

    document.addEventListener("click", trackClick);
    return () => document.removeEventListener("click", trackClick);
  }, []);

  return null;
}
