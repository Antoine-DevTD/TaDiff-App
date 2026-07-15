# Mise en conformite RGPD de TaDiff

Ce document est le registre de travail technique et organisationnel. Il ne remplace pas la validation d'un juriste ou d'un DPO.

## Deja integre dans l'application

- Politique de confidentialite publique : `/confidentialite`.
- Politique cookies publique : `/cookies`.
- Mentions legales publiques : `/mentions-legales`.
- Information sous le formulaire d'inscription beta.
- Liens permanents dans le pied de page.
- Acces aux donnees cloisonne par compagnie avec RLS Supabase et roles applicatifs.
- Journal d'acces reserve aux super administrateurs.
- Migration `029_rgpd_access_event_retention.sql` pour supprimer les journaux de plus de 90 jours.
- Aucun cookie publicitaire ou outil de profilage declare dans le code actuel.

## A faire avant l'ouverture de la beta

1. Renseigner dans Vercel les variables `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_LEGAL_DIRECTOR` et `NEXT_PUBLIC_PRIVACY_EMAIL`.
2. Remplacer la mention "societe en cours de constitution" des que la structure existe, puis ajouter forme juridique, capital, SIREN/RCS et numero de TVA si applicable.
3. Appliquer la migration `sql/029_rgpd_access_event_retention.sql`.
4. Dans Supabase Cron, planifier chaque jour : `delete from public.access_events where created_at < now() - interval '90 days';`.
5. Signer ou accepter les DPA/accords de sous-traitance de Supabase, Vercel, Stripe et de tout futur outil email ou IA.
6. Verifier la region du projet Supabase et documenter les transferts hors EEE ainsi que les garanties utilisees.
7. Definir qui recoit les demandes envoyees a l'adresse RGPD et une procedure de reponse sous un mois.
8. Finaliser les CGU et CGV de la beta, notamment abonnement, support, disponibilite, responsabilite, resiliation et restitution des donnees.

## Registre simplifie des traitements

| Traitement | Personnes | Donnees principales | Finalite | Base | Conservation proposee |
| --- | --- | --- | --- | --- | --- |
| Liste beta | Prospects | Identite, contact, compagnie, besoin | Gerer les reservations et le lancement | Mesures precontractuelles | 3 ans apres le dernier contact |
| Comptes | Utilisateurs | Identite, email, role, compagnie | Authentification et acces | Contrat | Duree du compte puis cloture |
| Cockpit | Membres, contacts professionnels | Spectacles, contacts, dates, documents, finances | Fournir le service | Contrat | Duree du contrat puis export/suppression |
| Securite | Utilisateurs | IP, navigateur, pages, horodatage | Securite, support, preuve d'acces | Interet legitime | 90 jours |
| Facturation | Clients | Societe, offre, paiement, factures | Paiement et comptabilite | Contrat et obligation legale | Jusqu'a 10 ans pour les pieces comptables |
| Support et retours | Utilisateurs beta | Message, contexte, compte | Corriger et ameliorer le produit | Contrat ou interet legitime | 2 ans apres cloture proposee |

## Processus a formaliser

### Demande d'acces, correction, export ou suppression

- Enregistrer la date, l'identite du demandeur et la demande.
- Verifier l'identite uniquement en cas de doute raisonnable.
- Identifier les donnees dans Auth, les tables, Storage, Stripe et les sauvegardes.
- Repondre sous un mois, ou expliquer une prolongation autorisee.
- Conserver une preuve minimale de la reponse sans garder inutilement le dossier complet.

### Fin de contrat

- Offrir un export des donnees et documents de la compagnie.
- Definir une fenetre de recuperation, proposee a 30 jours.
- Supprimer ou anonymiser ensuite les donnees actives, hors obligations legales.
- Documenter le delai de disparition des sauvegardes chez les prestataires.

### Violation de donnees

- Isoler l'incident et conserver les preuves techniques.
- Evaluer les donnees, les personnes, le volume et les consequences.
- Inscrire l'incident dans un registre interne.
- Notifier la CNIL sous 72 heures lorsque le risque l'exige.
- Informer rapidement les personnes si le risque est eleve.

## Points a revoir a chaque nouvelle integration

- Banque ouverte, email, IA/William, transcription Whisper, analytics et import de bases externes.
- Donnees envoyees, pays de traitement, duree, sous-traitants ulterieurs et methode de suppression.
- Necessite d'un consentement ou possibilite de fonctionner avec une base legale differente.
- Mise a jour de la politique de confidentialite et du registre avant activation en production.
