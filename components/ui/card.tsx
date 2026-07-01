import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const classText = typeof className === "string" ? className : "";
  const hasBackground = /\bbg-[^\s]+/.test(classText);
  const hasPadding = /\b(?:p|px|py|pt|pr|pb|pl)-/.test(classText);
  const hasBorderColor = /\bborder-(?![trblxy]-)(?!\d)(?!solid|dashed|dotted|none)[^\s]+/.test(
    classText,
  );

  return (
    <div
      className={cn(
        "rounded-lg border shadow-sm shadow-ink/5",
        !hasBorderColor && "border-border",
        !hasBackground && "bg-panel",
        !hasPadding && "p-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold text-foreground", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}
