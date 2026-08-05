/* eslint-disable react/no-unescaped-entities */
import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = { title: "Mentions légales | TaDiff", description: "Informations légales relatives au site TaDiff." };

export default async function LegalNoticePage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales" introduction="Les informations ci-dessous identifient l'editeur et les prestataires responsables du fonctionnement de tadiff.com.">
      <LegalSection title="Editeur">
        <p>{legalInformation.operatorName} - {legalInformation.operatorLegalForm}</p>
        <p>{legalInformation.operatorAddress}</p>
        <p>{legalInformation.operatorRegistration}</p>
        <p>{legalInformation.operatorVat}</p>
        <p>Contact : <a className="text-accent underline" href={`mailto:${legalInformation.legalEmail}`}>{legalInformation.legalEmail}</a></p>
        {legalInformation.professionalPhone ? <p>Téléphone : {legalInformation.professionalPhone}</p> : null}
        <p>Directeur de la publication : {legalInformation.publicationDirector}</p>
      </LegalSection>
      <LegalSection title="Transition TaDiff">
        <p>Le service TaDiff est provisoirement exploité par {legalInformation.operatorName}. Après constitution et reprise de l'activité, l'identité de la société TaDiff remplacera celle de l'exploitant actuel sur cette page et dans les documents contractuels.</p>
      </LegalSection>
      <LegalSection title="Hebergement">
        <p>Le site public est heberge par Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, Etats-Unis.</p>
        <p>L&apos;application TaDiff est hebergee par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, Etats-Unis.</p>
        <p>La base de donnees, l&apos;authentification et le stockage principal sont fournis par Supabase, Inc. Cloudflare R2 peut etre utilise comme stockage documentaire alternatif lorsqu&apos;il est active pour le service.</p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>La structure, les textes, l&apos;interface, les éléments graphiques et le logiciel TaDiff sont proteges par les droits de propriété intellectuelle applicables. Toute reutilisation non autorisee est interdite, hors exceptions prevues par la loi.</p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>Pour toute question sur le site, son contenu ou vos données personnelles : <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
