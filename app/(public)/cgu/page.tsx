/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { LegalList, LegalNotice, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = {
  title: "Conditions generales d'utilisation | TaDiff",
  description: "Conditions d'utilisation du cockpit TaDiff.",
};

export default async function TermsOfUsePage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow={`Version ${legalInformation.legalVersion}`} title="Conditions generales d'utilisation" introduction="Les presentes conditions encadrent l'accès au site et au cockpit TaDiff par les compagnies, leurs membres et les utilisateurs invites.">
      <LegalNotice>
        TaDiff est actuellement exploite par <strong>{legalInformation.operatorName}</strong>. La future societe TaDiff pourra se substituer a cet exploitant après information des utilisateurs, dans les conditions decrites ci-dessous.
      </LegalNotice>

      <LegalSection title="1. Objet">
        <p>TaDiff est un service en ligne de pilotage pour les compagnies du spectacle vivant. Il permet notamment de centraliser les spectacles, contacts professionnels, dates de diffusion, relances, documents, données financières, contrats, subventions et informations de production.</p>
        <p>Les presentes CGU definissent les droits et obligations applicables a toute personne accedant au service. Les conditions commerciales de l'abonnement figurent dans les <Link className="text-accent underline" href="/cgv">CGV</Link>.</p>
      </LegalSection>

      <LegalSection title="2. Acceptation">
        <p>L'utilisation d'un compte implique l'acceptation des CGU en vigueur. L'utilisateur qui accepte pour une compagnie déclare disposer du pouvoir nécessaire pour engager cette structure.</p>
        <p>TaDiff conserve la version acceptée, la date, le compte concerné et les éléments techniques nécessaires a la preuve de l'acceptation.</p>
      </LegalSection>

      <LegalSection title="3. Accès au service">
        <p>L'accès necessite un compte personnel. Les identifiants ne doivent pas être partages. L'utilisateur doit communiquer des informations exactes, maintenir son adresse email accessible et avertir rapidement TaDiff de tout accès suspect.</p>
        <p>La compagnie est responsable des invitations, des roles accordes et de la suppression des accès devenus inutiles. Chaque membre agit dans les limités du rôle qui lui est attribue : proprietaire, administrateur, membre ou lecture seule.</p>
      </LegalSection>

      <LegalSection title="4. Bêta">
        <p>Pendant la bêta, certaines fonctions peuvent être incompletes, modifiees ou temporairement indisponibles. Les retours peuvent être utilises pour corriger et améliorer le produit, sans publication d'informations confidentielles.</p>
        <p>TaDiff s'engage à ne pas présenter comme opérationnelle une fonction qui ne l'est pas et à informer les utilisateurs lorsqu'une opération importante repose encore sur une simulation ou une limite connue.</p>
      </LegalSection>

      <LegalSection title="5. Utilisation autorisee">
        <p>Le service doit être utilisé pour l'activité professionnelle, associative, culturelle ou artistique de la compagnie. Il est interdit :</p>
        <LegalList>
          <li>de contourner les controles d'accès ou de tenter d'acceder a l'espace d'une autre compagnie ;</li>
          <li>d'introduire un code malveillant, de saturer le service ou d'automatiser des requetes de maniere abusive ;</li>
          <li>de stocker ou diffuser des contenus illicites, portant atteinte aux droits de tiers ou sans lien raisonnable avec le service ;</li>
          <li>d'utiliser les fonctions email pour du spam, du demarchage illicite ou sans base legale ;</li>
          <li>de revendre, copier ou mettre a disposition le logiciel TaDiff en dehors des droits accordes.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Données et contenus">
        <p>La compagnie conserve la propriété et la responsabilité des données et documents qu'elle importe. Elle garantit disposer des droits et bases légales nécessaires, notamment pour les contacts, contrats, textes, photographies, affiches et données financières.</p>
        <p>Elle accorde a TaDiff une licence strictement limitée a l'hébergement, la copie technique, la sauvegarde, la conversion et le traitement nécessaires a la fourniture du service. TaDiff ne peut ni vendre ces contenus ni les utiliser pour entraîner un modèle d'intelligence artificielle sans autorisation spécifique.</p>
      </LegalSection>

      <LegalSection title="7. Confidentialite">
        <p>TaDiff traite comme confidentiels les documents, informations commerciales, données financières et contenus non publics confiés par les compagnies. L'accès est limité aux personnes autorisées et aux prestataires nécessaires au fonctionnement du service.</p>
        <p>Cette obligation ne couvre pas les informations devenues publiques sans faute de TaDiff, déjà connues licitement ou dont la communication est imposée par la loi.</p>
      </LegalSection>

      <LegalSection title="8. Disponibilite et maintenance">
        <p>TaDiff met en oeuvre des moyens raisonnables pour assurer la disponibilite et la sécurité du service. Sauf engagement particulier ecrit, aucun taux de disponibilite garanti n'est promis pendant la bêta.</p>
        <p>Des interruptions peuvent intervenir pour maintenance, mise à jour, incident de sécurité, defaillance d'un prestataire ou force majeure. Les maintenances prévisibles sont annoncees dans la mesure du possible.</p>
      </LegalSection>

      <LegalSection title="9. Support">
        <p>Le support est joignable a <a className="text-accent underline" href={`mailto:${legalInformation.supportEmail}`}>{legalInformation.supportEmail}</a>. Pendant la bêta, TaDiff fournit une assistance selon ses disponibilites et sans delai de resolution garanti, sauf accord particulier.</p>
      </LegalSection>

      <LegalSection title="10. Propriété intellectuelle">
        <p>Le logiciel, l'architecture, la marque, les interfaces, les textes et les éléments propres a TaDiff restent la propriété de leur titulaire. L'abonnement accorde uniquement un droit personnel, non exclusif, non cessible et temporaire d'utiliser le service.</p>
        <p>Aucun droit sur les contenus propres de la compagnie n'est transfere a TaDiff, sous réserve de la licence technique definie a l'article 6.</p>
      </LegalSection>

      <LegalSection title="11. Suspension">
        <p>TaDiff peut suspendre tout ou partie d'un accès en cas de risque de sécurité, utilisation illicite, violation grave des CGU, impaye ou atteinte au service. Lorsque la situation le permet, la compagnie est informee et dispose d'un delai raisonnable pour remedier au manquement.</p>
        <p>Une suspension urgente peut être immédiate lorsqu'elle est nécessaire pour proteger les données, les utilisateurs ou l'infrastructure.</p>
      </LegalSection>

      <LegalSection title="12. Responsabilité">
        <p>TaDiff fournit un outil d'aide au pilotage. Les calculs, alertes, suggestions, subventions detectees, modeles de documents et futures reponses d'intelligence artificielle doivent être verifies par l'utilisateur. Ils ne constituent pas un conseil juridique, comptable, fiscal ou financier.</p>
        <p>La compagnie reste responsable de ses déclarations, dépôts, échéances, contrats, campagnes et décisions. TaDiff n'est pas responsable d'un dommage causé par une donnée erronée, un usage contraire aux instructions, un service tiers ou un événement hors de son contrôle.</p>
        <p>Les limitations de responsabilité ne s'appliquent pas en cas de faute lourde, dol, dommage corporel ou lorsque la loi interdit de limiter la responsabilité.</p>
      </LegalSection>

      <LegalSection title="13. Fin du compte">
        <p>A la fin de l'abonnement, la compagnie peut demander ou realiser un export de ses données. Sauf obligation legale ou incident empechant l'opération, une période de recuperation de 30 jours est prevue avant suppression des données actives.</p>
        <p>Les données peuvent subsister temporairement dans les sauvegardes techniques jusqu'à leur rotation. Les pièces devant être conservées en application de la loi restent archivées avec un accès limité.</p>
      </LegalSection>

      <LegalSection title="14. Evolution des CGU">
        <p>TaDiff peut modifier les CGU pour faire evoluer le service, respecter la loi ou renforcer la sécurité. Les changements importants sont notifies avant leur entree en vigueur. Une nouvelle acceptation est demandée lorsque la nature du changement l'exige.</p>
      </LegalSection>

      <LegalSection title="15. Transition vers TaDiff">
        <p>Jusqu'a la constitution et la reprise effective de l'activité par la societe TaDiff, le service est exploite et facture par {legalInformation.operatorName}. Les utilisateurs seront informes de la date, de l'identité et des coordonnees de la nouvelle entite.</p>
        <p>Le transfert de l'exploitation devra assurer la continuite des comptes, abonnements, droits, obligations et engagements de confidentialité. Il ne pourra pas reduire retroactivement les droits acquis ni autoriser un nouvel usage des données sans base legale.</p>
      </LegalSection>

      <LegalSection title="16. Droit applicable">
        <p>Les CGU sont regies par le droit français. Les parties cherchent d'abord une solution amiable. A defaut, le litige releve des juridictions competentes selon les regles applicables, sans priver une partie d'une protection imperative.</p>
      </LegalSection>
    </LegalPage>
  );
}
