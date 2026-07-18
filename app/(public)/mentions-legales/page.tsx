/* eslint-disable react/no-unescaped-entities */
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { legalInformation } from "@/lib/legal";

export const metadata = { title: "Mentions legales | TaDiff", description: "Informations legales relatives au site TaDiff." };

export default function LegalNoticePage() {
  return (
    <LegalPage eyebrow="Informations legales" title="Mentions legales" introduction="Les informations ci-dessous identifient l'editeur et les prestataires responsables du fonctionnement de tadiff.com.">
      <LegalSection title="Editeur">
        <p>{legalInformation.operatorName} - {legalInformation.operatorLegalForm}</p>
        <p>{legalInformation.operatorAddress}</p>
        <p>{legalInformation.operatorRegistration}</p>
        <p>{legalInformation.operatorVat}</p>
        <p>Contact : <a className="text-accent underline" href="mailto:contact@tadiff.com">contact@tadiff.com</a></p>
        <p>Directeur de la publication : {legalInformation.publicationDirector}</p>
      </LegalSection>
      <LegalSection title="Transition TaDiff">
        <p>Le service TaDiff est provisoirement exploite par {legalInformation.operatorName}. Apres constitution et reprise de l'activite, l'identite de la societe TaDiff remplacera celle de l'exploitant actuel sur cette page et dans les documents contractuels.</p>
      </LegalSection>
      <LegalSection title="Hebergement">
        <p>L&apos;application web est hebergee par Vercel Inc. Les donnees applicatives, l&apos;authentification et les fichiers sont fournis par Supabase Inc. Les coordonnees a jour de ces prestataires figurent sur leurs sites officiels.</p>
      </LegalSection>
      <LegalSection title="Propriete intellectuelle">
        <p>La structure, les textes, l&apos;interface, les elements graphiques et le logiciel TaDiff sont proteges par les droits de propriete intellectuelle applicables. Toute reutilisation non autorisee est interdite, hors exceptions prevues par la loi.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Pour toute question sur le site, son contenu ou vos donnees personnelles : <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
