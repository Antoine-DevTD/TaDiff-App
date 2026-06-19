import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { publicNavItems } from "@/lib/constants";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          TaDiff
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {publicNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            Demarrer
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" className="sm:hidden">
            Connexion
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
