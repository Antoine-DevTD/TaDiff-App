import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "min-h-11 w-full rounded-md border border-border bg-white/5 px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25",
        className,
      )}
      {...props}
    />
  );
  },
);
