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
        Exploitant et vendeur actuel : <strong>{legalInformation.operatorName}</strong>. Offre beta affichee : <strong>{legalInformation.betaPrice}</strong>. Les mentions administratives definitives doivent etre completees avant le premier encaissement.
      </LegalNotice>

      <LegalSection title="1. Vendeur">
        <p>{legalInformation.operatorName}, {legalInformation.operatorLegalForm}, dont le siege est situe {legalInformation.operatorAddress}, immatriculation : {legalInformation.operatorRegistration}, TVA : {legalInformation.operatorVat}.</p>
        <p>Contact commercial et facturation : <a className="text-accent underline" href={`mailto:${legalInformation.billingEmail}`}>{legalInformation.billingEmail}</a>.</p>
      </LegalSection>

      <LegalSection title="2. Champ d'application">
        <p>Les CGV s'appliquent aux abonnements souscrits par des compagnies, associations, entrepreneurs et autres structures agissant pour leurs besoins professionnels. Elles completent les <Link className="text-accent underline" href="/cgu">CGU</Link>.</p>
        <p>En cas de contradiction, les conditions particulieres figurant sur un devis ou un bon de commande accepte prevalent sur les CGV.</p>
      </LegalSection>

      <LegalSection title="3. Offre beta">
        <p>L'offre beta donne acces aux fonctions rendues disponibles dans le cockpit pendant la periode de test. Son prix de reference est de {legalInformation.betaPrice}. Le perimetre exact, les limites d'usage et les fonctions actives sont presentes avant la souscription.</p>
        <p>Les fonctions annoncees comme futures, experimentales ou en preparation ne constituent pas une caracteristique garantie de l'offre souscrite.</p>
      </LegalSection>

      <LegalSection title="4. Commande">
        <p>La commande est formee lorsque le client choisit une offre, renseigne les informations demandees, accepte les CGU et CGV, puis valide le paiement. TaDiff adresse une confirmation sur un support durable.</p>
        <p>Le client verifie l'identite de la structure facturee et l'exactitude de ses informations. TaDiff peut refuser une commande illegitime, incomplete, frauduleuse ou emanant d'un client avec lequel existe un litige de paiement.</p>
      </LegalSection>

      <LegalSection title="5. Prix et taxes">
        <p>Les prix sont affiches dans la devise et selon le regime de TVA indiques avant paiement. Le caractere HT ou TTC doit etre visible sur la page de souscription et la facture.</p>
        <p>TaDiff peut modifier ses prix pour les periodes futures. Le client est informe au moins 30 jours avant l'application d'une hausse a son abonnement et peut resilier avant son entree en vigueur.</p>
      </LegalSection>

      <LegalSection title="6. Paiement">
        <p>Le paiement est effectue par carte bancaire via Stripe. Le client autorise les prelevements recurrents correspondant a la periodicite choisie. Les donnees completes de carte sont traitees par Stripe et ne sont pas stockees par TaDiff.</p>
        <p>La facture est mise a disposition ou envoyee electroniquement. Le client accepte ce mode de facturation et signale rapidement toute erreur.</p>
      </LegalSection>

      <LegalSection title="7. Duree et renouvellement">
        <p>Sauf indication differente lors de la commande, l'abonnement beta est mensuel, sans engagement minimum, et se renouvelle chaque mois jusqu'a resiliation.</p>
        <p>La resiliation prend effet a la fin de la periode deja payee. Toute periode commencee reste due et n'est pas remboursee, sauf obligation legale, double paiement ou manquement imputable a TaDiff justifiant un remboursement.</p>
      </LegalSection>

      <LegalSection title="8. Resiliation">
        <p>Le client peut resilier depuis son espace lorsque la fonction est disponible ou en ecrivant a {legalInformation.billingEmail}. TaDiff confirme la prise en compte et la date de fin d'acces.</p>
        <p>TaDiff peut resilier en cas de violation grave, impaye persistant, fraude ou usage mettant en danger le service, apres mise en demeure lorsque la situation permet une regularisation.</p>
      </LegalSection>

      <LegalSection title="9. Impayes">
        <p>En cas d'echec de paiement, TaDiff peut effectuer de nouvelles tentatives, demander un autre moyen de paiement et suspendre l'acces apres information du client.</p>
        <p>Pour les clients professionnels, toute somme payee apres son echeance peut produire, de plein droit et sans rappel, des penalites au taux de refinancement de la Banque centrale europeenne applicable majore de 10 points, sans pouvoir etre inferieur au minimum legal. Une indemnite forfaitaire de 40 EUR pour frais de recouvrement est due lorsqu'elle est applicable, avec indemnisation complementaire sur justificatifs si les frais exposes sont superieurs.</p>
      </LegalSection>

      <LegalSection title="10. Obligations de TaDiff">
        <LegalList>
          <li>fournir l'acces aux fonctions comprises dans l'offre ;</li>
          <li>mettre en oeuvre des mesures de securite adaptees ;</li>
          <li>informer des incidents ou interruptions significatifs lorsqu'ils affectent le client ;</li>
          <li>traiter les donnees selon les CGU, la politique de confidentialite et l'annexe RGPD ;</li>
          <li>permettre la recuperation des donnees dans les conditions annoncees.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. Obligations du client">
        <LegalList>
          <li>payer les sommes dues et maintenir ses informations de facturation a jour ;</li>
          <li>administrer les acces de ses membres et proteger les identifiants ;</li>
          <li>utiliser le service conformement a la loi et aux droits des tiers ;</li>
          <li>verifier les calculs, modeles, alertes et suggestions avant toute decision ;</li>
          <li>conserver ses propres exemplaires des documents critiques lorsque son activite l'exige.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="12. Responsabilite">
        <p>Chaque partie repond des dommages directs previsibles causes par ses manquements. Sous reserve des exclusions interdites par la loi, la responsabilite totale de TaDiff au titre d'une periode de douze mois est limitee aux sommes hors taxes payees par le client pendant cette periode.</p>
        <p>Cette limitation ne s'applique pas en cas de faute lourde, dol, dommage corporel, atteinte imputable a la confidentialite ou aux donnees personnelles lorsque la loi l'interdit, ni aux obligations qui ne peuvent legalement etre limitees.</p>
      </LegalSection>

      <LegalSection title="13. Force majeure">
        <p>Aucune partie n'est responsable d'un retard ou manquement directement cause par un evenement de force majeure reconnu par le droit francais. La partie concernee informe l'autre et limite les consequences. Si l'empechement dure plus de 30 jours, chaque partie peut mettre fin au service affecte sans penalite.</p>
      </LegalSection>

      <LegalSection title="14. Donnees personnelles">
        <p>Pour les donnees de compte et de facturation, TaDiff agit comme responsable de traitement. Pour les donnees que la compagnie saisit concernant ses contacts et membres, TaDiff agit en principe comme sous-traitant. Les obligations correspondantes figurent dans l'<Link className="text-accent underline" href="/annexe-rgpd">annexe RGPD</Link>.</p>
      </LegalSection>

      <LegalSection title="15. Reclamations">
        <p>Toute reclamation doit etre adressee a {legalInformation.supportEmail}, avec les informations permettant d'identifier le compte et le probleme. Les parties tentent de trouver une solution amiable avant toute action.</p>
      </LegalSection>

      <LegalSection title="16. Transfert vers TaDiff">
        <p>Lors de la constitution de la societe TaDiff et de la reprise de l'activite, {legalInformation.operatorName} pourra transferer le contrat a cette societe, sous reserve d'en informer le client et d'assurer la continuite des obligations, des donnees, des abonnements et des droits acquis.</p>
        <p>Si ce transfert entraine une modification substantielle defavorable, le client pourra resilier avant sa prise d'effet.</p>
      </LegalSection>

      <LegalSection title="17. Droit et litiges">
        <p>Les CGV sont soumises au droit francais. Apres tentative amiable, les litiges entre professionnels relevent des juridictions determinees par les regles de procedure applicables. Une clause attributive specifique ne devra etre ajoutee qu'apres choix du siege et validation juridique.</p>
      </LegalSection>
    </LegalPage>
  );
}
