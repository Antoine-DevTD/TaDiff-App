/* eslint-disable react/no-unescaped-entities */
import { LegalList, LegalNotice, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { legalInformation } from "@/lib/legal";

export const metadata = {
  title: "Annexe RGPD | TaDiff",
  description: "Accord de traitement des donnees pour les clients TaDiff.",
};

export default function DataProcessingPage() {
  return (
    <LegalPage eyebrow={`Version ${legalInformation.legalVersion}`} title="Annexe relative au traitement des donnees" introduction="Cette annexe encadre les traitements effectues par TaDiff pour le compte des compagnies clientes, conformement a l'article 28 du RGPD.">
      <LegalNotice>
        Cette annexe fait partie du contrat TaDiff. Le client est le responsable de traitement des donnees qu'il confie au cockpit ; {legalInformation.operatorName}, exploitant actuel de TaDiff, agit comme sous-traitant.
      </LegalNotice>

      <LegalSection title="1. Parties et roles">
        <p>Le client determine pourquoi et comment il utilise les donnees de ses contacts, salaries, artistes, partenaires, programmateurs et autres personnes. Il est responsable de la licite de cette collecte et de l'information des personnes.</p>
        <p>TaDiff traite ces donnees uniquement pour fournir, securiser, maintenir et assister le service, sur instruction documentee du client. TaDiff reste responsable de ses traitements propres, notamment la gestion des comptes, la facturation et la securite globale.</p>
      </LegalSection>

      <LegalSection title="2. Traitements couverts">
        <LegalList>
          <li>hebergement, organisation, consultation, recherche et export des donnees ;</li>
          <li>gestion des contacts, spectacles, dates, campagnes, documents, contrats et finances ;</li>
          <li>sauvegarde, restauration, journalisation, support et securite ;</li>
          <li>envoi d'emails ou automatisations uniquement lorsque la fonction est activee par le client ;</li>
          <li>fonctions d'intelligence artificielle uniquement apres information sur le fournisseur, les donnees envoyees et les reglages applicables.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Personnes et donnees">
        <p>Les personnes peuvent inclure les utilisateurs, contacts professionnels, artistes, techniciens, salaries, prestataires, donateurs, mecenes et representants de structures culturelles.</p>
        <p>Les donnees peuvent inclure identite, coordonnees, fonctions, historique de relation, disponibilites, contrats, remuneration, pieces administratives, messages et documents importes. Le client s'engage a ne pas importer de donnees sensibles sans necessite, base legale et mesures adaptees.</p>
      </LegalSection>

      <LegalSection title="4. Instructions">
        <p>Les CGU, les reglages du compte et les actions realisees dans le cockpit constituent les instructions documentees du client. TaDiff informe le client si une instruction lui parait contraire au droit applicable, sauf interdiction legale.</p>
        <p>TaDiff ne vend pas les donnees du client, ne les utilise pas pour sa propre prospection et ne les integre pas a un entrainement d'IA sans accord distinct, explicite et documente.</p>
      </LegalSection>

      <LegalSection title="5. Confidentialite">
        <p>Les personnes autorisees a traiter les donnees sont soumises a une obligation de confidentialite et n'y accedent que dans la mesure necessaire a leurs missions. Les acces de support aux espaces clients doivent etre limites, traces et justifies.</p>
      </LegalSection>

      <LegalSection title="6. Securite">
        <LegalList>
          <li>chiffrement des communications ;</li>
          <li>authentification et separation logique des compagnies ;</li>
          <li>controle des roles et limitation des privileges ;</li>
          <li>journalisation des acces sensibles et conservation limitee ;</li>
          <li>mises a jour, sauvegardes et procedures de restauration adaptees ;</li>
          <li>procedure de gestion des incidents et des violations de donnees.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Sous-traitants ulterieurs">
        <p>TaDiff peut recourir a des prestataires pour l'hebergement, la base de donnees, le stockage, l'authentification, le paiement et les communications. La liste initiale comprend Supabase, Vercel et Stripe selon les fonctions activees.</p>
        <p>TaDiff impose a ces prestataires des obligations de protection appropriees. Le client est informe d'un ajout ou remplacement significatif et peut formuler une objection motivee liee a la protection des donnees.</p>
      </LegalSection>

      <LegalSection title="8. Transferts internationaux">
        <p>Lorsque des donnees sont traitees hors de l'Espace economique europeen, TaDiff veille a l'existence d'un mecanisme reconnu : decision d'adequation, clauses contractuelles types ou autre garantie autorisee, complete si necessaire par une evaluation et des mesures additionnelles.</p>
      </LegalSection>

      <LegalSection title="9. Droits des personnes">
        <p>TaDiff aide le client, dans la mesure du possible, a repondre aux demandes d'acces, rectification, effacement, opposition, limitation et portabilite. Une demande recue directement concernant des donnees gerees pour le client lui est transmise, sauf obligation contraire.</p>
      </LegalSection>

      <LegalSection title="10. Incident">
        <p>TaDiff informe le client dans les meilleurs delais apres avoir pris connaissance d'une violation affectant ses donnees. L'information disponible precise la nature, les categories de personnes et donnees, les consequences probables et les mesures prises ou proposees.</p>
        <p>Le client reste responsable de la notification a l'autorite et aux personnes lorsque cette obligation lui incombe. TaDiff lui fournit une assistance raisonnable.</p>
      </LegalSection>

      <LegalSection title="11. Analyses et conformite">
        <p>TaDiff fournit les informations raisonnablement necessaires pour demontrer le respect de cette annexe et coopere aux analyses d'impact liees au service. Les audits doivent etre proportionnes, planifies, confidentiels et eviter de compromettre la securite des autres clients.</p>
      </LegalSection>

      <LegalSection title="12. Fin de prestation">
        <p>A la demande du client et selon les fonctions disponibles, les donnees sont restituees dans un format exploitable. Apres la periode de recuperation annoncee, elles sont supprimees ou anonymisees, sauf obligation legale de conservation.</p>
        <p>Les copies residuelles de sauvegarde sont protegees, ne sont pas remises en production sauf restauration necessaire et disparaissent selon leur cycle de rotation documente.</p>
      </LegalSection>

      <LegalSection title="13. Transition d'exploitant">
        <p>En cas de transfert du service de {legalInformation.operatorName} a la societe TaDiff, la nouvelle entite reprend les obligations de sous-traitant. Le client est informe de son identite, de ses coordonnees et de la date d'effet avant le transfert operationnel.</p>
      </LegalSection>

      <LegalSection title="14. Contact donnees">
        <p>Les demandes relatives a cette annexe peuvent etre adressees a <a className="text-accent underline" href={`mailto:${legalInformation.privacyEmail}`}>{legalInformation.privacyEmail}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
