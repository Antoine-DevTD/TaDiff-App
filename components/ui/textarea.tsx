import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-md border border-border bg-white/5 px-3 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/25",
        className,
      )}
      {...props}
    />
  );
});
