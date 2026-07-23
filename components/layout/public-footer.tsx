import Link from "next/link";
import { TadiffMark } from "@/components/brand/tadiff-mark";

const columns = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalites", href: "/#fonctionnalites" },
      { label: "A quoi ca sert", href: "/#usages" },
      { label: "Calculateur", href: "/#calculateur" },
      { label: "Tarifs", href: "/pricing" },
    ],
  },
  {
    title: "Compagnie",
    links: [
      { label: "Réserver la bêta", href: "/beta" },
      { label: "Se connecter", href: "/login" },
      { label: "Bêta 19,99 EUR / mois", href: "/beta" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "CGU", href: "/cgu" },
      { label: "CGV", href: "/cgv" },
      { label: "Confidentialite", href: "/confidentialite" },
      { label: "Annexe RGPD", href: "/annexe-rgpd" },
      { label: "Cookies", href: "/cookies" },
      { label: "Mentions légales", href: "/mentions-legales" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-panel">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <TadiffMark className="h-9 w-9" />
              <span className="text-lg font-semibold">TaDiff</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted">
              Le cockpit de pilotage des compagnies de spectacle vivant : dates,
              subventions, trésorerie et dossiers au même endroit.
            </p>
            <Link
              href="/beta"
              data-analytics="beta_footer"
              className="mt-5 inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold !text-white transition hover:bg-accent-strong"
            >
              Réserver la bêta
            </Link>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link className="text-foreground/80 transition hover:text-accent" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} TaDiff. Tous droits réservés.</p>
          <p>Fait pour le spectacle vivant.</p>
        </div>
      </div>
    </footer>
  );
}
