/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = {
  title: "Politique de confidentialité | TaDiff",
  description: "Comment TaDiff collecte, utilise et protège les données personnelles.",
};

export default async function PrivacyPage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow="Vos données" title="Politique de confidentialité" introduction="Cette politique explique quelles données TaDiff utilise, pourquoi elles sont nécessaires et comment exercer vos droits. Elle couvre le site public, les inscriptions à la bêta et le cockpit TaDiff.">
      <LegalSection title="Responsable du traitement">
        <p>{legalInformation.operatorName} détermine les finalites et les moyens des traitements decrits ici.</p>
        <p>Lors de la reprise du service par la societe TaDiff, les personnes concernees seront informees de l'identité du nouveau responsable et de la date du transfert.</p>
        <p>Contact RGPD : <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
      <LegalSection title="Données traitées">
        <LegalList>
          <li>Inscription bêta : compagnie, nom, email, téléphone facultatif, ville, discipline et besoin principal.</li>
          <li>Compte : identité, email, compagnie, rôle et informations de connexion.</li>
          <li>Cockpit : contacts professionnels, spectacles, dates, documents, finances, contrats, subventions et actions saisies par la compagnie.</li>
          <li>Sécurité et support : adresse IP, navigateur, pages du cockpit consultées, date et heure de connexion.</li>
          <li>William : question adressée a l&apos;assistant, contexte strictement nécessaire a la réponse, consommation de credits et catégorie générale de la demande.</li>
          <li>Facturation : offre, statut de l&apos;abonnement, identifiants techniques Stripe et documents comptables. TaDiff ne stocke pas les numeros de carte bancaire.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Pourquoi nous les utilisons">
        <LegalList>
          <li>Gérer la bêta et repondre aux demandes : mesures precontractuelles.</li>
          <li>Créer et faire fonctionner le cockpit : execution du contrat.</li>
          <li>Assurer la sécurité, prevenir les abus et aider les utilisateurs : interet legitime de TaDiff.</li>
          <li>Gérer les paiements et la comptabilite : execution du contrat et obligations légales.</li>
          <li>Envoyer des informations commerciales : consentement lorsqu&apos;il est requis, avec desinscription possible a tout moment.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Destinataires et prestataires">
        <p>Les données sont accessibles uniquement aux personnes autorisées de TaDiff et, selon le service utilisé, à ses prestataires techniques : Supabase pour l&apos;authentification, la base et le stockage, Vercel pour l&apos;hébergement de l&apos;application, et Stripe pour le paiement.</p>
        <p>Certains traitements peuvent impliquer un transfert hors de l&apos;Espace économique européen, encadre par les mecanismes prevus par le RGPD.</p>
      </LegalSection>
      <LegalSection title="Durees de conservation">
        <LegalList>
          <li>Demandes bêta et prospects : jusqu&apos;a 3 ans après le dernier contact, sauf opposition plus tot.</li>
          <li>Compte et données du cockpit : pendant la relation contractuelle, puis le temps nécessaire a la clôture, a l&apos;export et aux obligations légales.</li>
          <li>Journaux de connexion et de navigation authentifiee : 90 jours.</li>
          <li>Extraits statistiques des questions adressees a William : 90 jours. Les emails et numeros de téléphone sont masques avant enregistrement.</li>
          <li>Pièces comptables et factures : 10 ans lorsque la loi l&apos;impose.</li>
          <li>Demandes d&apos;exercice de droits : le temps nécessaire au traitement et a la preuve de la réponse.</li>
        </LegalList>
      </LegalSection>
      <LegalSection title="Vos droits">
        <p>Vous pouvez demander l&apos;accès, la rectification, l&apos;effacement ou la portabilite de vos données, limiter leur traitement, vous y opposer, ou retirer votre consentement lorsqu&apos;il constitue la base du traitement.</p>
        <p>Envoyez votre demande a <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}?subject=Exercice%20de%20mes%20droits%20RGPD`}>{legalInformation.privacyEmail}</a>. Une preuve d&apos;identité ne sera demandée qu&apos;en cas de doute raisonnable. Vous pouvez egalement saisir la <a className="text-accent underline" href="https://www.cnil.fr/fr/plaintes" rel="noreferrer" target="_blank">CNIL</a>.</p>
      </LegalSection>
      <LegalSection title="Sécurité et incidents">
        <p>TaDiff met en place des controles d&apos;accès par compagnie, des droits limités par rôle, des communications chiffrees et des journaux de sécurité. Les incidents sont analyses et, lorsque le RGPD l&apos;exige, notifies a la CNIL et aux personnes concernees.</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>La gestion des traceurs est détaillée dans notre <Link className="text-accent underline" href="/cookies">politique relative aux cookies</Link>. TaDiff n&apos;utilise actuellement aucun cookie publicitaire.</p>
      </LegalSection>
      <LegalSection title="Audience publique">
        <p>TaDiff mesure les pages publiques consultées, les clics sur certains appels à l&apos;action, la provenance et la conversion en inscription bêta. Cette mesure repose sur un identifiant aléatoire limité à la session de l&apos;onglet. Aucune adresse IP, adresse email ou empreinte de l&apos;appareil n&apos;est enregistrée dans ce traitement. Les événements sont supprimés après 90 jours et l&apos;opposition est disponible sur la page Cookies.</p>
      </LegalSection>
      <LegalSection title="Assistant William">
        <p>Lorsque William est active pour un compte, la question et le contexte utile de la compagnie sont transmis au fournisseur d&apos;intelligence artificielle configure par TaDiff afin de produire la réponse. Les reponses restent indicatives et doivent être verifiees avant toute décision juridique, sociale, fiscale ou financiere.</p>
        <p>TaDiff conserve séparément un extrait limité de la question afin de mesurer les thèmes demandés et les réponses à améliorer. Cet extrait est réservé aux administrateurs autorisés, n&apos;inclut pas le dossier opérationnel transmis au modèle et est automatiquement supprimé après 90 jours.</p>
      </LegalSection>
      <LegalSection title="Données des clients">
        <p>Lorsque TaDiff heberge les contacts et documents saisis par une compagnie pour son propre compte, les obligations de sous-traitance sont detaillees dans l'<Link className="text-accent underline" href="/annexe-rgpd">annexe RGPD</Link>.</p>
      </LegalSection>
    </LegalPage>
  );
}
