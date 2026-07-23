/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { LegalList, LegalNotice, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = {
  title: "Conditions generales de vente | TaDiff",
  description: "Conditions commerciales de l'abonnement TaDiff.",
};

export default async function TermsOfSalePage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow={`Version ${legalInformation.legalVersion}`} title="Conditions generales de vente" introduction="Ces conditions encadrent la souscription et la facturation des abonnements professionnels au service TaDiff.">
      <LegalNotice>
        Exploitant et vendeur actuel : <strong>{legalInformation.operatorName}</strong>. Offre bêta affichee : <strong>{legalInformation.betaPrice}</strong>. Les mentions administratives definitives doivent être completees avant le premier encaissement.
      </LegalNotice>

      <LegalSection title="1. Vendeur">
        <p>{legalInformation.operatorName}, {legalInformation.operatorLegalForm}, dont le siege est situe {legalInformation.operatorAddress}, immatriculation : {legalInformation.operatorRegistration}, TVA : {legalInformation.operatorVat}.</p>
        <p>Contact commercial et facturation : <a className="text-accent underline" href={`mailto:${legalInformation.billingEmail}`}>{legalInformation.billingEmail}</a>.</p>
      </LegalSection>

      <LegalSection title="2. Champ d'application">
        <p>Les CGV s'appliquent aux abonnements souscrits par des compagnies, associations, entrepreneurs et autres structures agissant pour leurs besoins professionnels. Elles completent les <Link className="text-accent underline" href="/cgu">CGU</Link>.</p>
        <p>En cas de contradiction, les conditions particulieres figurant sur un devis ou un bon de commande accepte prevalent sur les CGV.</p>
      </LegalSection>

      <LegalSection title="3. Offre bêta">
        <p>L'offre bêta donne accès aux fonctions rendues disponibles dans le cockpit pendant la période de test. Son prix de référence est de {legalInformation.betaPrice}. Le périmètre exact, les limites d'usage et les fonctions actives sont présentés avant la souscription.</p>
        <p>Les fonctions annoncees comme futures, experimentales ou en preparation ne constituent pas une caracteristique garantie de l'offre souscrite.</p>
      </LegalSection>

      <LegalSection title="4. Commande">
        <p>La commande est formee lorsque le client choisit une offre, renseigne les informations demandées, accepte les CGU et CGV, puis valide le paiement. TaDiff adresse une confirmation sur un support durable.</p>
        <p>Le client vérifie l'identité de la structure facturée et l'exactitude de ses informations. TaDiff peut refuser une commande illégitime, incomplète, frauduleuse ou émanant d'un client avec lequel existe un litige de paiement.</p>
      </LegalSection>

      <LegalSection title="5. Prix et taxes">
        <p>Les prix sont affiches dans la devise et selon le regime de TVA indiques avant paiement. Le caractere HT ou TTC doit être visible sur la page de souscription et la facture.</p>
        <p>TaDiff peut modifier ses prix pour les periodes futures. Le client est informe au moins 30 jours avant l'application d'une hausse a son abonnement et peut resilier avant son entree en vigueur.</p>
      </LegalSection>

      <LegalSection title="6. Paiement">
        <p>Le paiement est effectué par carte bancaire via Stripe. Le client autorise les prélèvements récurrents correspondant a la périodicité choisie. Les données complètes de carte sont traitées par Stripe et ne sont pas stockées par TaDiff.</p>
        <p>La facture est mise a disposition ou envoyee electroniquement. Le client accepte ce mode de facturation et signale rapidement toute erreur.</p>
      </LegalSection>

      <LegalSection title="7. Duree et renouvellement">
        <p>Sauf indication differente lors de la commande, l'abonnement bêta est mensuel, sans engagement minimum, et se renouvelle chaque mois jusqu'a resiliation.</p>
        <p>La résiliation prend effet à la fin de la période déjà payée. Toute période commencée reste due et n'est pas remboursée, sauf obligation légale, double paiement ou manquement imputable à TaDiff justifiant un remboursement.</p>
      </LegalSection>

      <LegalSection title="8. Resiliation">
        <p>Le client peut resilier depuis son espace lorsque la fonction est disponible ou en ecrivant a {legalInformation.billingEmail}. TaDiff confirme la prise en compte et la date de fin d'accès.</p>
        <p>TaDiff peut resilier en cas de violation grave, impaye persistant, fraude ou usage mettant en danger le service, après mise en demeure lorsque la situation permet une regularisation.</p>
      </LegalSection>

      <LegalSection title="9. Impayes">
        <p>En cas d'echec de paiement, TaDiff peut effectuer de nouvelles tentatives, demander un autre moyen de paiement et suspendre l'accès après information du client.</p>
        <p>Pour les clients professionnels, toute somme payee après son échéance peut produire, de plein droit et sans rappel, des penalites au taux de refinancement de la Banque centrale europeenne applicable majore de 10 points, sans pouvoir être inferieur au minimum legal. Une indemnite forfaitaire de 40 EUR pour frais de recouvrement est due lorsqu'elle est applicable, avec indemnisation complementaire sur justificatifs si les frais exposes sont superieurs.</p>
      </LegalSection>

      <LegalSection title="10. Obligations de TaDiff">
        <LegalList>
          <li>fournir l'accès aux fonctions comprises dans l'offre ;</li>
          <li>mettre en oeuvre des mesures de sécurité adaptees ;</li>
          <li>informer des incidents ou interruptions significatifs lorsqu'ils affectent le client ;</li>
          <li>traiter les données selon les CGU, la politique de confidentialité et l'annexe RGPD ;</li>
          <li>permettre la recuperation des données dans les conditions annoncees.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. Obligations du client">
        <LegalList>
          <li>payer les sommes dues et maintenir ses informations de facturation à jour ;</li>
          <li>administrer les accès de ses membres et proteger les identifiants ;</li>
          <li>utiliser le service conformement a la loi et aux droits des tiers ;</li>
          <li>vérifier les calculs, modeles, alertes et suggestions avant toute décision ;</li>
          <li>conserver ses propres exemplaires des documents critiques lorsque son activité l'exige.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="12. Responsabilité">
        <p>Chaque partie répond des dommages directs prévisibles causés par ses manquements. Sous réserve des exclusions interdites par la loi, la responsabilité totale de TaDiff au titre d'une période de douze mois est limitée aux sommes hors taxes payées par le client pendant cette période.</p>
        <p>Cette limitation ne s'applique pas en cas de faute lourde, dol, dommage corporel, atteinte imputable a la confidentialité ou aux données personnelles lorsque la loi l'interdit, ni aux obligations qui ne peuvent legalement être limitées.</p>
      </LegalSection>

      <LegalSection title="13. Force majeure">
        <p>Aucune partie n'est responsable d'un retard ou manquement directement causé par un événement de force majeure reconnu par le droit français. La partie concernée informe l'autre et limite les conséquences. Si l'empêchement dure plus de 30 jours, chaque partie peut mettre fin au service affecté sans pénalité.</p>
      </LegalSection>

      <LegalSection title="14. Données personnelles">
        <p>Pour les données de compte et de facturation, TaDiff agit comme responsable de traitement. Pour les données que la compagnie saisit concernant ses contacts et membres, TaDiff agit en principe comme sous-traitant. Les obligations correspondantes figurent dans l'<Link className="text-accent underline" href="/annexe-rgpd">annexe RGPD</Link>.</p>
      </LegalSection>

      <LegalSection title="15. Reclamations">
        <p>Toute reclamation doit être adressée a {legalInformation.supportEmail}, avec les informations permettant d'identifier le compte et le probleme. Les parties tentent de trouver une solution amiable avant toute action.</p>
      </LegalSection>

      <LegalSection title="16. Transfert vers TaDiff">
        <p>Lors de la constitution de la societe TaDiff et de la reprise de l'activité, {legalInformation.operatorName} pourra transferer le contrat a cette societe, sous réserve d'en informer le client et d'assurer la continuite des obligations, des données, des abonnements et des droits acquis.</p>
        <p>Si ce transfert entraine une modification substantielle defavorable, le client pourra resilier avant sa prise d'effet.</p>
      </LegalSection>

      <LegalSection title="17. Droit et litiges">
        <p>Les CGV sont soumises au droit français. Après tentative amiable, les litiges entre professionnels relèvent des juridictions déterminées par les règles de procédure applicables. Une clause attributive spécifique ne devra être ajoutée qu'après choix du siège et validation juridique.</p>
      </LegalSection>
    </LegalPage>
  );
}
