/* eslint-disable react/no-unescaped-entities */
import { LegalList, LegalNotice, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { getLegalInformation } from "@/lib/legal";

export const metadata = {
  title: "Annexe RGPD | TaDiff",
  description: "Accord de traitement des données pour les clients TaDiff.",
};

export default async function DataProcessingPage() {
  const legalInformation = await getLegalInformation();
  return (
    <LegalPage eyebrow={`Version ${legalInformation.legalVersion}`} title="Annexe relative au traitement des données" introduction="Cette annexe encadre les traitements effectues par TaDiff pour le compte des compagnies clientes, conformement a l'article 28 du RGPD.">
      <LegalNotice>
        Cette annexe fait partie du contrat TaDiff. Le client est le responsable de traitement des données qu'il confie au cockpit ; {legalInformation.operatorName}, exploitant actuel de TaDiff, agit comme sous-traitant.
      </LegalNotice>

      <LegalSection title="1. Parties et roles">
        <p>Le client détermine pourquoi et comment il utilise les données de ses contacts, salariés, artistes, partenaires, programmateurs et autres personnes. Il est responsable de la licité de cette collecte et de l'information des personnes.</p>
        <p>TaDiff traite ces données uniquement pour fournir, securiser, maintenir et assister le service, sur instruction documentee du client. TaDiff reste responsable de ses traitements propres, notamment la gestion des comptes, la facturation et la sécurité globale.</p>
      </LegalSection>

      <LegalSection title="2. Traitements couverts">
        <LegalList>
          <li>hébergement, organisation, consultation, recherche et export des données ;</li>
          <li>gestion des contacts, spectacles, dates, campagnes, documents, contrats et finances ;</li>
          <li>sauvegarde, restauration, journalisation, support et sécurité ;</li>
          <li>envoi d'emails ou automatisations uniquement lorsque la fonction est activee par le client ;</li>
          <li>fonctions d'intelligence artificielle uniquement après information sur le fournisseur, les données envoyees et les reglages applicables.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Personnes et données">
        <p>Les personnes peuvent inclure les utilisateurs, contacts professionnels, artistes, techniciens, salariés, prestataires, donateurs, mecenes et representants de structures culturelles.</p>
        <p>Les données peuvent inclure identité, coordonnees, fonctions, historique de relation, disponibilites, contrats, remuneration, pièces administratives, messages et documents importes. Le client s'engage a ne pas importer de données sensibles sans necessite, base legale et mesures adaptees.</p>
      </LegalSection>

      <LegalSection title="4. Instructions">
        <p>Les CGU, les reglages du compte et les actions realisees dans le cockpit constituent les instructions documentees du client. TaDiff informe le client si une instruction lui parait contraire au droit applicable, sauf interdiction legale.</p>
        <p>TaDiff ne vend pas les données du client, ne les utilise pas pour sa propre prospection et ne les intègre pas à un entraînement d'IA sans accord distinct, explicite et documenté.</p>
      </LegalSection>

      <LegalSection title="5. Confidentialite">
        <p>Les personnes autorisées à traiter les données sont soumises a une obligation de confidentialité et n'y accèdent que dans la mesure nécessaire a leurs missions. Les accès de support aux espaces clients doivent être limités, tracés et justifiés.</p>
      </LegalSection>

      <LegalSection title="6. Sécurité">
        <LegalList>
          <li>chiffrement des communications ;</li>
          <li>authentification et separation logique des compagnies ;</li>
          <li>contrôle des rôles et limitation des privilèges ;</li>
          <li>journalisation des accès sensibles et conservation limitée ;</li>
          <li>mises à jour, sauvegardes et procedures de restauration adaptees ;</li>
          <li>procedure de gestion des incidents et des violations de données.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Sous-traitants ulterieurs">
        <p>TaDiff peut recourir a des prestataires pour l'hébergement, la base de données, le stockage, l'authentification, le paiement et les communications. La liste initiale comprend Supabase, Vercel et Stripe selon les fonctions activees.</p>
        <p>TaDiff impose a ces prestataires des obligations de protection appropriees. Le client est informe d'un ajout ou remplacement significatif et peut formuler une objection motivee liee a la protection des données.</p>
      </LegalSection>

      <LegalSection title="8. Transferts internationaux">
        <p>Lorsque des données sont traitées hors de l'Espace économique européen, TaDiff veille à l'existence d'un mécanisme reconnu : décision d'adéquation, clauses contractuelles types ou autre garantie autorisée, complétée si nécessaire par une évaluation et des mesures additionnelles.</p>
      </LegalSection>

      <LegalSection title="9. Droits des personnes">
        <p>TaDiff aide le client, dans la mesure du possible, a repondre aux demandes d'accès, rectification, effacement, opposition, limitation et portabilite. Une demande recue directement concernant des données gerees pour le client lui est transmise, sauf obligation contraire.</p>
      </LegalSection>

      <LegalSection title="10. Incident">
        <p>TaDiff informe le client dans les meilleurs delais après avoir pris connaissance d'une violation affectant ses données. L'information disponible precise la nature, les catégories de personnes et données, les conséquences probables et les mesures prises ou proposees.</p>
        <p>Le client reste responsable de la notification a l'autorite et aux personnes lorsque cette obligation lui incombe. TaDiff lui fournit une assistance raisonnable.</p>
      </LegalSection>

      <LegalSection title="11. Analyses et conformite">
        <p>TaDiff fournit les informations raisonnablement nécessaires pour démontrer le respect de cette annexe et coopère aux analyses d'impact liées au service. Les audits doivent être proportionnés, planifiés, confidentiels et éviter de compromettre la sécurité des autres clients.</p>
      </LegalSection>

      <LegalSection title="12. Fin de prestation">
        <p>À la demande du client et selon les fonctions disponibles, les données sont restituées dans un format exploitable. Après la période de récupération annoncée, elles sont supprimées ou anonymisées, sauf obligation légale de conservation.</p>
        <p>Les copies résiduelles de sauvegarde sont protégées, ne sont pas remises en production sauf restauration nécessaire et disparaissent selon leur cycle de rotation documenté.</p>
      </LegalSection>

      <LegalSection title="13. Transition d'exploitant">
        <p>En cas de transfert du service de {legalInformation.operatorName} a la societe TaDiff, la nouvelle entite reprend les obligations de sous-traitant. Le client est informe de son identité, de ses coordonnees et de la date d'effet avant le transfert operationnel.</p>
      </LegalSection>

      <LegalSection title="14. Contact données">
        <p>Les demandes relatives a cette annexe peuvent être adressees a <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
