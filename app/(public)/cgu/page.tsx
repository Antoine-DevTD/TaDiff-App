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
    <LegalPage eyebrow={`Version ${legalInformation.legalVersion}`} title="Conditions generales d'utilisation" introduction="Les presentes conditions encadrent l'acces au site et au cockpit TaDiff par les compagnies, leurs membres et les utilisateurs invites.">
      <LegalNotice>
        TaDiff est actuellement exploite par <strong>{legalInformation.operatorName}</strong>. La future societe TaDiff pourra se substituer a cet exploitant apres information des utilisateurs, dans les conditions decrites ci-dessous.
      </LegalNotice>

      <LegalSection title="1. Objet">
        <p>TaDiff est un service en ligne de pilotage pour les compagnies du spectacle vivant. Il permet notamment de centraliser les spectacles, contacts professionnels, dates de diffusion, relances, documents, donnees financieres, contrats, subventions et informations de production.</p>
        <p>Les presentes CGU definissent les droits et obligations applicables a toute personne accedant au service. Les conditions commerciales de l'abonnement figurent dans les <Link className="text-accent underline" href="/cgv">CGV</Link>.</p>
      </LegalSection>

      <LegalSection title="2. Acceptation">
        <p>L'utilisation d'un compte implique l'acceptation des CGU en vigueur. L'utilisateur qui accepte pour une compagnie declare disposer du pouvoir necessaire pour engager cette structure.</p>
        <p>TaDiff conserve la version acceptee, la date, le compte concerne et les elements techniques necessaires a la preuve de l'acceptation.</p>
      </LegalSection>

      <LegalSection title="3. Acces au service">
        <p>L'acces necessite un compte personnel. Les identifiants ne doivent pas etre partages. L'utilisateur doit communiquer des informations exactes, maintenir son adresse email accessible et avertir rapidement TaDiff de tout acces suspect.</p>
        <p>La compagnie est responsable des invitations, des roles accordes et de la suppression des acces devenus inutiles. Chaque membre agit dans les limites du role qui lui est attribue : proprietaire, administrateur, membre ou lecture seule.</p>
      </LegalSection>

      <LegalSection title="4. Beta">
        <p>Pendant la beta, certaines fonctions peuvent etre incompletes, modifiees ou temporairement indisponibles. Les retours peuvent etre utilises pour corriger et ameliorer le produit, sans publication d'informations confidentielles.</p>
        <p>TaDiff s'engage a ne pas presenter comme operationnelle une fonction qui ne l'est pas et a informer les utilisateurs lorsqu'une operation importante repose encore sur une simulation ou une limite connue.</p>
      </LegalSection>

      <LegalSection title="5. Utilisation autorisee">
        <p>Le service doit etre utilise pour l'activite professionnelle, associative, culturelle ou artistique de la compagnie. Il est interdit :</p>
        <LegalList>
          <li>de contourner les controles d'acces ou de tenter d'acceder a l'espace d'une autre compagnie ;</li>
          <li>d'introduire un code malveillant, de saturer le service ou d'automatiser des requetes de maniere abusive ;</li>
          <li>de stocker ou diffuser des contenus illicites, portant atteinte aux droits de tiers ou sans lien raisonnable avec le service ;</li>
          <li>d'utiliser les fonctions email pour du spam, du demarchage illicite ou sans base legale ;</li>
          <li>de revendre, copier ou mettre a disposition le logiciel TaDiff en dehors des droits accordes.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Donnees et contenus">
        <p>La compagnie conserve la propriete et la responsabilite des donnees et documents qu'elle importe. Elle garantit disposer des droits et bases legales necessaires, notamment pour les contacts, contrats, textes, photographies, affiches et donnees financieres.</p>
        <p>Elle accorde a TaDiff une licence strictement limitee a l'hebergement, la copie technique, la sauvegarde, la conversion et le traitement necessaires a la fourniture du service. TaDiff ne peut ni vendre ces contenus ni les utiliser pour entrainer un modele d'intelligence artificielle sans autorisation specifique.</p>
      </LegalSection>

      <LegalSection title="7. Confidentialite">
        <p>TaDiff traite comme confidentiels les documents, informations commerciales, donnees financieres et contenus non publics confies par les compagnies. L'acces est limite aux personnes autorisees et aux prestataires necessaires au fonctionnement du service.</p>
        <p>Cette obligation ne couvre pas les informations devenues publiques sans faute de TaDiff, deja connues licitement ou dont la communication est imposee par la loi.</p>
      </LegalSection>

      <LegalSection title="8. Disponibilite et maintenance">
        <p>TaDiff met en oeuvre des moyens raisonnables pour assurer la disponibilite et la securite du service. Sauf engagement particulier ecrit, aucun taux de disponibilite garanti n'est promis pendant la beta.</p>
        <p>Des interruptions peuvent intervenir pour maintenance, mise a jour, incident de securite, defaillance d'un prestataire ou force majeure. Les maintenances previsibles sont annoncees dans la mesure du possible.</p>
      </LegalSection>

      <LegalSection title="9. Support">
        <p>Le support est joignable a <a className="text-accent underline" href={`mailto:${legalInformation.supportEmail}`}>{legalInformation.supportEmail}</a>. Pendant la beta, TaDiff fournit une assistance selon ses disponibilites et sans delai de resolution garanti, sauf accord particulier.</p>
      </LegalSection>

      <LegalSection title="10. Propriete intellectuelle">
        <p>Le logiciel, l'architecture, la marque, les interfaces, les textes et les elements propres a TaDiff restent la propriete de leur titulaire. L'abonnement accorde uniquement un droit personnel, non exclusif, non cessible et temporaire d'utiliser le service.</p>
        <p>Aucun droit sur les contenus propres de la compagnie n'est transfere a TaDiff, sous reserve de la licence technique definie a l'article 6.</p>
      </LegalSection>

      <LegalSection title="11. Suspension">
        <p>TaDiff peut suspendre tout ou partie d'un acces en cas de risque de securite, utilisation illicite, violation grave des CGU, impaye ou atteinte au service. Lorsque la situation le permet, la compagnie est informee et dispose d'un delai raisonnable pour remedier au manquement.</p>
        <p>Une suspension urgente peut etre immediate lorsqu'elle est necessaire pour proteger les donnees, les utilisateurs ou l'infrastructure.</p>
      </LegalSection>

      <LegalSection title="12. Responsabilite">
        <p>TaDiff fournit un outil d'aide au pilotage. Les calculs, alertes, suggestions, subventions detectees, modeles de documents et futures reponses d'intelligence artificielle doivent etre verifies par l'utilisateur. Ils ne constituent pas un conseil juridique, comptable, fiscal ou financier.</p>
        <p>La compagnie reste responsable de ses declarations, depots, echeances, contrats, campagnes et decisions. TaDiff n'est pas responsable d'un dommage cause par une donnee erronee, un usage contraire aux instructions, un service tiers ou un evenement hors de son controle.</p>
        <p>Les limitations de responsabilite ne s'appliquent pas en cas de faute lourde, dol, dommage corporel ou lorsque la loi interdit de limiter la responsabilite.</p>
      </LegalSection>

      <LegalSection title="13. Fin du compte">
        <p>A la fin de l'abonnement, la compagnie peut demander ou realiser un export de ses donnees. Sauf obligation legale ou incident empechant l'operation, une periode de recuperation de 30 jours est prevue avant suppression des donnees actives.</p>
        <p>Les donnees peuvent subsister temporairement dans les sauvegardes techniques jusqu'a leur rotation. Les pieces devant etre conservees en application de la loi restent archivees avec un acces limite.</p>
      </LegalSection>

      <LegalSection title="14. Evolution des CGU">
        <p>TaDiff peut modifier les CGU pour faire evoluer le service, respecter la loi ou renforcer la securite. Les changements importants sont notifies avant leur entree en vigueur. Une nouvelle acceptation est demandee lorsque la nature du changement l'exige.</p>
      </LegalSection>

      <LegalSection title="15. Transition vers TaDiff">
        <p>Jusqu'a la constitution et la reprise effective de l'activite par la societe TaDiff, le service est exploite et facture par {legalInformation.operatorName}. Les utilisateurs seront informes de la date, de l'identite et des coordonnees de la nouvelle entite.</p>
        <p>Le transfert de l'exploitation devra assurer la continuite des comptes, abonnements, droits, obligations et engagements de confidentialite. Il ne pourra pas reduire retroactivement les droits acquis ni autoriser un nouvel usage des donnees sans base legale.</p>
      </LegalSection>

      <LegalSection title="16. Droit applicable">
        <p>Les CGU sont regies par le droit francais. Les parties cherchent d'abord une solution amiable. A defaut, le litige releve des juridictions competentes selon les regles applicables, sans priver une partie d'une protection imperative.</p>
      </LegalSection>
    </LegalPage>
  );
}
