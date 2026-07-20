/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = {
  title: "Politique de confidentialite | TaDiff",
  description: "Comment TaDiff collecte, utilise et protege les donnees personnelles.",
};

export default async function PrivacyPage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow="Vos donnees" title="Politique de confidentialite" introduction="Cette politique explique quelles donnees TaDiff utilise, pourquoi elles sont necessaires et comment exercer vos droits. Elle couvre le site public, les inscriptions a la beta et le cockpit TaDiff.">
      <LegalSection title="Responsable du traitement">
        <p>{legalInformation.operatorName} determine les finalites et les moyens des traitements decrits ici.</p>
        <p>Lors de la reprise du service par la societe TaDiff, les personnes concernees seront informees de l'identite du nouveau responsable et de la date du transfert.</p>
        <p>Contact RGPD : <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
      <LegalSection title="Donnees traitees">
        <LegalList>
          <li>Inscription beta : compagnie, nom, email, telephone facultatif, ville, discipline et besoin principal.</li>
          <li>Compte : identite, email, compagnie, role et informations de connexion.</li>
          <li>Cockpit : contacts professionnels, spectacles, dates, documents, finances, contrats, subventions et actions saisies par la compagnie.</li>
          <li>Securite et support : adresse IP, navigateur, pages du cockpit consultees, date et heure de connexion.</li>
          <li>Facturation : offre, statut de l&apos;abonnement, identifiants techniques Stripe et documents comptables. TaDiff ne stocke pas les numeros de carte bancaire.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Pourquoi nous les utilisons">
        <LegalList>
          <li>Gerer la beta et repondre aux demandes : mesures precontractuelles.</li>
          <li>Creer et faire fonctionner le cockpit : execution du contrat.</li>
          <li>Assurer la securite, prevenir les abus et aider les utilisateurs : interet legitime de TaDiff.</li>
          <li>Gerer les paiements et la comptabilite : execution du contrat et obligations legales.</li>
          <li>Envoyer des informations commerciales : consentement lorsqu&apos;il est requis, avec desinscription possible a tout moment.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Destinataires et prestataires">
        <p>Les donnees sont accessibles uniquement aux personnes autorisees de TaDiff et, selon le service utilise, a ses prestataires techniques : Supabase pour l&apos;authentification, la base et le stockage, Vercel pour l&apos;hebergement de l&apos;application, et Stripe pour le paiement.</p>
        <p>Certains traitements peuvent impliquer un transfert hors de l&apos;Espace economique europeen, encadre par les mecanismes prevus par le RGPD.</p>
      </LegalSection>
      <LegalSection title="Durees de conservation">
        <LegalList>
          <li>Demandes beta et prospects : jusqu&apos;a 3 ans apres le dernier contact, sauf opposition plus tot.</li>
          <li>Compte et donnees du cockpit : pendant la relation contractuelle, puis le temps necessaire a la cloture, a l&apos;export et aux obligations legales.</li>
          <li>Journaux de connexion et de navigation authentifiee : 90 jours.</li>
          <li>Pieces comptables et factures : 10 ans lorsque la loi l&apos;impose.</li>
          <li>Demandes d&apos;exercice de droits : le temps necessaire au traitement et a la preuve de la reponse.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Vos droits">
        <p>Vous pouvez demander l&apos;acces, la rectification, l&apos;effacement ou la portabilite de vos donnees, limiter leur traitement, vous y opposer, ou retirer votre consentement lorsqu&apos;il constitue la base du traitement.</p>
        <p>Envoyez votre demande a <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}?subject=Exercice%20de%20mes%20droits%20RGPD`}>{legalInformation.privacyEmail}</a>. Une preuve d&apos;identite ne sera demandee qu&apos;en cas de doute raisonnable. Vous pouvez egalement saisir la <a className="text-accent underline" href="https://www.cnil.fr/fr/plaintes" rel="noreferrer" target="_blank">CNIL</a>.</p>
      </LegalSection>
      <LegalSection title="Securite et incidents">
        <p>TaDiff met en place des controles d&apos;acces par compagnie, des droits limites par role, des communications chiffrees et des journaux de securite. Les incidents sont analyses et, lorsque le RGPD l&apos;exige, notifies a la CNIL et aux personnes concernees.</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>La gestion des traceurs est detaillee dans notre <Link className="text-accent underline" href="/cookies">politique relative aux cookies</Link>. TaDiff n&apos;utilise actuellement aucun cookie publicitaire.</p>
      </LegalSection>
      <LegalSection title="Audience publique">
        <p>TaDiff mesure les pages publiques consultees, les clics sur certains appels a l&apos;action, la provenance et la conversion en inscription beta. Cette mesure repose sur un identifiant aleatoire limite a la session de l&apos;onglet. Aucune adresse IP, adresse email ou empreinte de l&apos;appareil n&apos;est enregistree dans ce traitement. Les evenements sont supprimes apres 90 jours et l&apos;opposition est disponible sur la page Cookies.</p>
      </LegalSection>
      <LegalSection title="Donnees des clients">
        <p>Lorsque TaDiff heberge les contacts et documents saisis par une compagnie pour son propre compte, les obligations de sous-traitance sont detaillees dans l'<Link className="text-accent underline" href="/annexe-rgpd">annexe RGPD</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
