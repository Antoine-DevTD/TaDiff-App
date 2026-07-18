import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { AnalyticsPreference } from "@/components/analytics/analytics-preference";

export const metadata = { title: "Cookies | TaDiff", description: "Les cookies et traceurs utilises par TaDiff." };

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Traceurs" title="Politique relative aux cookies" introduction="TaDiff limite les cookies aux besoins techniques du service. Aucun cookie publicitaire ou de profilage n'est actuellement utilise.">
      <LegalSection title="Cookies necessaires">
        <LegalList>
          <li>Session Supabase : maintient la connexion et protege l&apos;acces au compte.</li>
          <li>Maintenance TaDiff : permet un acces technique temporaire et securise pendant une maintenance.</li>
          <li>Preferences locales : memorise uniquement les choix indispensables a l&apos;interface lorsqu&apos;ils sont actives.</li>
        </LegalList>
        <p>Ces traceurs sont strictement necessaires au service demande et ne peuvent pas etre desactives sans empecher certaines fonctions.</p>
      </LegalSection>
      <LegalSection title="Mesure d'audience">
        <p>TaDiff mesure les pages publiques consultees, les clics sur certains boutons, la provenance de la visite et les inscriptions beta. Cette mesure utilise un identifiant aleatoire limite a l&apos;onglet du navigateur. Elle ne collecte ni adresse IP, ni email, ni empreinte de l&apos;appareil et ne permet aucun suivi entre plusieurs sites.</p>
        <p>Les evenements sont conserves 90 jours. Le signal &laquo; Do Not Track &raquo; du navigateur est respecte et vous pouvez vous opposer a cette mesure ci-dessous.</p>
        <AnalyticsPreference />
        <p>Les pages consultees dans le cockpit connecte peuvent par ailleurs etre journalisees pendant 90 jours pour la securite et le support. Ce journal est associe au compte et n&apos;est pas utilise a des fins publicitaires.</p>
      </LegalSection>
      <LegalSection title="Evolution">
        <p>Si TaDiff ajoute un outil non strictement necessaire, il sera bloque avant consentement. Le choix d&apos;accepter ou de refuser sera propose avec la meme facilite et pourra etre modifie a tout moment.</p>
      </LegalSection>
    </LegalPage>
  );
}
