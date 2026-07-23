import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { publicNavItems } from "@/lib/constants";
import { TadiffMark } from "@/components/brand/tadiff-mark";
import { getBetaSignupStats } from "@/lib/supabase/queries";
import { betaReservedSeatLimit } from "@/lib/beta";

export async function PublicHeader() {
  const stats = await getBetaSignupStats();
  const betaMessage =
    stats.remainingReservedSeats === 0
      ? "Bêta complète : liste d'attente ouverte"
      : stats.remainingReservedSeats === 1
        ? "Dernière place bêta disponible à 19,99 EUR / mois"
        : `Bêta de lancement : ${betaReservedSeatLimit} places à 19,99 EUR / mois`;
  return (
    <>
      <div className="beta-band sticky top-0 z-30 border-b border-white/15 text-white shadow-lg shadow-ink/10">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 text-sm sm:h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 font-semibold">
            <span className="beta-dot h-3 w-3 shrink-0 rounded-full bg-white" />
            <span className="min-w-0 truncate">
              {betaMessage}
              <span className="hidden font-medium text-white/80 md:inline"> - demarrage le 6 aout</span>
            </span>
          </div>
          <Link
            href="/beta"
            data-analytics="beta_banner_button"
            className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold !text-accent shadow-sm transition hover:-translate-y-0.5 sm:px-5 sm:text-sm"
          >
            {stats.remainingReservedSeats === 0 ? (
              "Liste d'attente"
            ) : (
              <>
                <span className="sm:hidden">Réserver</span>
                <span className="hidden sm:inline">Réserver ma place</span>
              </>
            )}
          </Link>
        </div>
      </div>
      <header className="sticky top-14 z-20 border-b border-border/80 bg-background/92 backdrop-blur sm:top-16">
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
            <ButtonLink href="/login" variant="secondary" data-analytics="login_header">
              Connexion
            </ButtonLink>
          </div>
        </div>
      </header>
    </>
  );
}
