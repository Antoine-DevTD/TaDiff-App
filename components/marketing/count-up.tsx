"use client";

import { useEffect, useRef, useState } from "react";

const frenchNumber = new Intl.NumberFormat("fr-FR");

/** Compte de 0 vers `value` quand l'element entre dans le viewport. */
export function CountUp({ value, suffix }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let raf = 0;
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            const start = performance.now();
            const duration = 1300;
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(value * eased));
              if (progress < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {frenchNumber.format(display)}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
