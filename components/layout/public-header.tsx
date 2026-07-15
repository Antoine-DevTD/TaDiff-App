import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { publicNavItems } from "@/lib/constants";
import { TadiffMark } from "@/components/brand/tadiff-mark";

export function PublicHeader() {
  return (
    <>
      <div className="beta-band sticky top-0 z-30 border-b border-white/15 text-white shadow-lg shadow-ink/10">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4 text-sm sm:px-6 lg:px-8">
          <Link href="/beta" className="flex min-w-0 items-center gap-2 font-medium">
            <span className="beta-dot h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
            <span className="truncate">
              Beta de lancement : 10 places a 19,99 EUR / mois
            </span>
          </Link>
          <Link
            href="/beta"
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold !text-accent shadow-sm transition hover:-translate-y-0.5 sm:px-4"
          >
            Reserver
          </Link>
        </div>
      </div>
      <header className="sticky top-12 z-20 border-b border-border/80 bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <TadiffMark className="h-8 w-8" />
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
            <ButtonLink href="/beta" className="hidden sm:inline-flex">
              Rejoindre la beta
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="sm:hidden">
              Connexion
            </ButtonLink>
          </div>
        </div>
      </header>
    </>
  );
}
