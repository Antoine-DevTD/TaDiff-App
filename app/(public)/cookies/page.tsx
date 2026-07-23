import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { AnalyticsPreference } from "@/components/analytics/analytics-preference";

export const metadata = { title: "Cookies | TaDiff", description: "Les cookies et traceurs utilises par TaDiff." };

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Traceurs" title="Politique relative aux cookies" introduction="TaDiff limite les cookies aux besoins techniques du service. Aucun cookie publicitaire ou de profilage n'est actuellement utilisé.">
      <LegalSection title="Cookies nécessaires">
        <LegalList>
          <li>Session Supabase : maintient la connexion et protège l&apos;accès au compte.</li>
          <li>Maintenance TaDiff : permet un accès technique temporaire et sécurisé pendant une maintenance.</li>
          <li>Preferences locales : memorise uniquement les choix indispensables a l&apos;interface lorsqu&apos;ils sont actives.</li>
        </LegalList>
        <p>Ces traceurs sont strictement nécessaires au service demande et ne peuvent pas être désactivés sans empêcher certaines fonctions.</p>
      </LegalSection>
      <LegalSection title="Mesure d'audience">
        <p>TaDiff mesure les pages publiques consultées, les clics sur certains boutons, la provenance de la visite et les inscriptions bêta. Cette mesure utilise un identifiant aléatoire limité à l&apos;onglet du navigateur. Elle ne collecte ni adresse IP, ni email, ni empreinte de l&apos;appareil et ne permet aucun suivi entre plusieurs sites.</p>
        <p>Les evenements sont conserves 90 jours. Le signal &laquo; Do Not Track &raquo; du navigateur est respecte et vous pouvez vous opposer a cette mesure ci-dessous.</p>
        <AnalyticsPreference />
        <p>Les pages consultées dans le cockpit connecté peuvent par ailleurs être journalisées pendant 90 jours pour la sécurité et le support. Ce journal est associé au compte et n&apos;est pas utilisé à des fins publicitaires.</p>
      </LegalSection>
      <LegalSection title="Evolution">
        <p>Si TaDiff ajoute un outil non strictement nécessaire, il sera bloque avant consentement. Le choix d&apos;accepter ou de refuser sera propose avec la même facilité et pourra être modifié a tout moment.</p>
      </LegalSection>
    </LegalPage>
  );
}
