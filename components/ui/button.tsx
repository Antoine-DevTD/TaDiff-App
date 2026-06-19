import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-strong focus-visible:outline-accent",
  secondary:
    "border border-border bg-panel text-foreground hover:bg-panel-strong focus-visible:outline-accent",
  ghost: "text-muted hover:bg-panel-strong hover:text-foreground focus-visible:outline-accent",
};

const baseClass =
  "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return <button className={cn(baseClass, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  className,
  variant = "primary",
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(baseClass, variants[variant], className)} href={href} {...props} />
  );
}
