# Instructions agent - TaDiff

Ce document est le point d'entree pour toute nouvelle conversation Claude/Codex
sur le projet TaDiff.

Objectif : eviter de repartir de zero, proteger l'etat du repo, et faire avancer
le produit dans la bonne direction.

## 1. A lire en premier

Lire ces fichiers dans cet ordre avant de proposer ou modifier du code :

1. `README.md`
   - stack ;
   - commandes ;
   - setup Supabase ;
   - integrations externes.

2. `developpement.md`
   - vision produit ;
   - planning 23 juillet / 6 aout / 6 septembre / 20 septembre ;
   - modules a construire ;
   - priorites immediates ;
   - exigences issues de Tony.

3. `ressources/notes_tony_application_tadiff.md`
   - synthese du document de Tony ;
   - exigence centrale : pas de fausse maquette apres connexion ;
   - chaque action visible doit fonctionner ou afficher un etat "Fonction prevue - non branchee dans cette version".

4. `sql/*.sql`
   - migrations Supabase deja ecrites ;
   - schema actuel ;
   - RLS ;
   - tables disponibles.

5. `app/(dashboard)/actions.ts`
   - Server Actions deja branchees ;
   - creation contact, spectacle, document, frais fixe, opportunite, relance, devis ;
   - update/delete pipeline.

6. `lib/supabase/queries.ts`
   - lectures Supabase ;
   - fallback mock data si env Supabase absente.

7. `data/mock-data.ts`
   - donnees demo utilisees quand Supabase n'est pas configure.

8. `Contrat/Contre_proposition_TADIFF_Titouan.md`
   - uniquement si la tache touche au contrat, a la propriete intellectuelle, a la maintenance, au capital, aux frais ou a la gouvernance.

## 2. Vision produit

TaDiff est le cockpit de pilotage d'une compagnie de spectacle vivant.

Le produit doit aider une compagnie a :

- savoir quoi faire maintenant ;
- ne pas rater les relances, subventions, contrats et factures ;
- comprendre sa tresorerie sans etre comptable ;
- suivre ses spectacles, contacts, devis, documents, contrats et financements ;
- vendre sans vendre a perte ;
- remplacer une partie de l'administration de production.

Ne pas construire un SaaS generique.
Ne pas utiliser du jargon inutile.
Parler en langage de compagnie.

Exemples de vocabulaire preferable :

- "Carnet de diffusion" plutot que CRM ;
- "Diffusion" ou "Dates possibles" plutot que pipeline ;
- "A faire" plutot que task manager ;
- "Tresorerie" plutot que finance analytics ;
- "Cockpit" pour l'ecran principal.

## 3. Regle produit centrale

Tony a explicitement demande que l'interieur de l'application fonctionne vraiment.

Donc :

- pas de faux boutons ;
- pas de modules simules non signales ;
- pas d'action visible qui ne fait rien ;
- pas de simple maquette derriere la connexion ;
- donnees persistantes quand c'est possible ;
- si une fonction n'est pas branchee, afficher clairement : "Fonction prevue - non branchee dans cette version".

Priorite : rendre les flux existants vraiment operationnels avant d'ajouter trop de nouvelles pages.

## 4. Etat actuel du produit

Deja en place (mise a jour 2026-07-05) :

- etats honnetes : composant `components/ui/planned-feature.tsx` ("Fonction prevue - non branchee" / "Donnees de demonstration") applique sur campagnes, mecenat, billing (Stripe, export FEC) et tresorerie demo ;
- billing_status/plan_code/comped sur companies + roles verrouilles (owner/admin/member/readonly) + helpers d'acces (`lib/supabase/access.ts`, garde `requireWriteAccess` sur toutes les mutations) ;
- saisie du solde de tresorerie (table treasury_snapshots) : cockpit et finances lisent le vrai solde ;
- upload reel de documents sur Supabase Storage (bucket prive, URLs signees, suppression, zip subventions avec vrais fichiers) ;
- CRUD complet spectacles et contacts (pages /shows/[id]/edit, /contacts/[id]/edit), suppression frais fixes et relances ;
- devis : edition complete (statut, montants, echeance) et suppression depuis /billing/[id] ;
- radar subventions branche sur la table grant_opportunities + formulaire d'ajout + changement de statut + import en un clic de 10 dispositifs de reference (`data/reference-grants.ts`) ;
- compagnie de demonstration installable en un clic depuis /settings (`data/demo-company.ts`, action `seedDemoCompany`) : "Compagnie de l'Estran", 3 spectacles, 8 contacts, 7 dates, relances, frais fixes, tresorerie, documents, 3 devis, 4 subventions, dates relatives au jour de l'installation ; refuse si l'espace contient deja des donnees ;
- visite guidee "William (version scriptee)" : moteur spotlight `components/tour/guided-tour.tsx` monte dans le layout dashboard, parcours de 10 etapes dans `data/tour-steps.ts`, ancres `data-tour` sur cockpit/pipeline/shows/subventions/finances/calendar, lanceur `components/tour/tour-launcher.tsx` ;
- checklist onboarding "Commencer" sur le cockpit (`components/onboarding/getting-started.tsx`) : 7 etapes calculees sur les vraies donnees, masquee quand tout est fait ;
- script du webinaire du 23 juillet : `docs/webinaire-23-juillet.md` ;
- mecenat branche sur la table patronage_deals : formulaire d'ajout, changement de statut, suppression ; la demo Estran inclut 3 partenaires mecenat (les packs restent du contenu statique mock) ;
- recuperation de mot de passe : /forgot-password (envoi du lien via Supabase Auth) et /reset-password (nouveau mot de passe apres retour du lien, via /auth/callback) ;
- edition des frais fixes (bouton Modifier sur chaque ligne de /finances) et des relances (bouton Modifier dans la liste /reminders) ;
- logs d'activite (migration 012) : toutes les mutations journalisent via `lib/activity-log.ts` (jamais bloquant), affichage des 15 dernieres actions dans /settings.

- Next.js App Router ;
- TypeScript ;
- Tailwind ;
- Supabase-ready auth/base/RLS ;
- fallback mock data ;
- pages publiques ;
- page beta ;
- login/signup ;
- cockpit/dashboard ;
- spectacles ;
- contacts ;
- diffusion/pipeline ;
- relances ;
- calendrier ;
- subventions ;
- mecenat ;
- campagnes email cote planning ;
- contrats ;
- documents ;
- finances ;
- facturation ;
- parametres ;
- import CSV contacts ;
- creation de devis depuis pipeline ;
- export workspace ;
- page devis imprimable ;
- heartbeat Supabase via GitHub Actions ;
- themes UX theatre + icones dans navigation/titres.

Partiellement en place :

- Supabase : CRUD complet sur spectacle (edit/suppression via /shows/[id]/edit), contact (/contacts/[id]/edit), opportunite, document, relance (fait + suppression), frais fixe (creation + suppression) ; reste : update devis/statut devis, update relance, update frais fixe ;
- documents : upload reel Supabase Storage branche (migration 011) : fichiers 20 Mo max par compagnie, telechargement via URL signee, suppression ; reste : association a contact/devis/contrat, page documents globale avec upload direct ;
- email : planning/templates existent, envoi Resend reel non branche (page campagnes marquee "non branchee") ;
- Stripe : code checkout + webhook branche en mode test (`/api/stripe/webhook`, `STRIPE_PRICE_BETA_MONTHLY`, migration 020). Reste activation operationnelle : appliquer la migration, ajouter `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, le price id beta Stripe, puis tester un paiement complet. Ne pas presenter le paiement comme actif tant que les cles ne sont pas posees ;
- finances : projections + solde saisi OK, vraie compta/transactions/rapprochement bancaire non (import CSV bancaire a venir) ;
- subventions importees : certaines deadlines des dispositifs de reference sont indicatives (precise dans leur champ eligibilite), a verifier avant depot ;
- logs d'activite : non complet ;
- calculateur : fonctionne en UI, mais sauvegarde metier complete a renforcer.

## 5. Priorites de developpement

Priorites court terme avant demo :

1. Cockpit vraiment utile :
   - tresorerie ;
   - prochaines actions ;
   - risques ;
   - documents manquants ;
   - relances ;
   - subventions urgentes.

2. Flux CRUD reels :
   - contact ;
   - spectacle ;
   - opportunite ;
   - relance ;
   - document ;
   - frais fixe ;
   - devis.

3. Permissions et admin :
   - definir roles propres : owner, admin, member, readonly ;
   - empecher l'utilisateur de s'auto-promouvoir ;
   - ajouter statut compagnie : trial, active, comped, past_due, cancelled ;
   - permettre de marquer une compagnie gratuite/beta/partenaire.

4. Documents :
   - upload reel ;
   - stockage par compagnie ;
   - association a spectacle/contact/devis/contrat/subvention ;
   - telechargement ;
   - suppression ;
   - zip dossier subvention.

5. Email :
   - brouillons ;
   - templates ;
   - historique contact ;
   - envoi Resend quand cle disponible ;
   - etat clair si non branche.

6. Stripe/billing :
   - plans ;
   - checkout ;
   - webhook ;
   - statut abonnement ;
   - comptes offerts ;
   - beta gratuite ou beta 19,99 EUR.

7. Finance :
   - frais fixes ;
   - projection ;
   - devis/factures a encaisser ;
   - import CSV bancaire avant open banking.

Ne pas lancer William IA en production sans :

- budget mensuel ;
- quotas ;
- consentement utilisateur sur documents ;
- logs ;
- validation humaine des actions sensibles.

## 6. Architecture actuelle

Principes :

- App Router Next.js ;
- Server Components pour lecture ;
- Server Actions pour mutations ;
- Supabase SSR pour auth et base ;
- RLS cote Supabase ;
- mock fallback si env Supabase absente ;
- garder un graphe de donnees coherent :
  compagnie -> spectacles -> contacts -> opportunites -> relances -> documents -> contrats/devis -> finances.

Fichiers importants :

- `app/(dashboard)/layout.tsx` : layout protege, redirection login si Supabase active.
- `app/(dashboard)/actions.ts` : mutations.
- `lib/supabase/queries.ts` : lectures.
- `lib/supabase/workspace.ts` : compagnie/workspace.
- `lib/env.ts` : detection env Supabase.
- `types/database.types.ts` : types Supabase.
- `types/index.ts` : types applicatifs.
- `sql/*.sql` : schema/migrations.

## 6 bis. Deploiement Vercel

- Projet Vercel : `titouans-projects-0a1ec293/tadiff`, lie au dossier local via `.vercel/` (ne pas commit).
- URL de production : https://tadiff.vercel.app (deploiement initial le 2026-07-05 via `vercel deploy`).
- Le repo GitHub (Antoine-DevTD/TaDiff-App) n'est PAS connecte au projet Vercel (acces refuse lors du link) : les deploiements se font depuis le poste avec `vercel deploy --prod --yes`. Connecter le repo plus tard pour des deploiements automatiques.
- Variables d'environnement production posees : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL=https://tadiff.vercel.app.
- IMPORTANT cote Supabase Auth : ajouter https://tadiff.vercel.app dans Site URL / Redirect URLs (Authentication > URL Configuration), sinon les emails de confirmation et de reset renvoient vers localhost.
- PIEGE env vars (vecu le 2026-07-05) : sur ce poste, un pipe stdin PowerShell vers `vercel env add` injecte un BOM UTF-8 en tete de valeur (login casse avec "non ISO-8859-1 code point"). Toujours passer les valeurs par fichier + `cmd /c "vercel env add NAME production < fichier"` (fichier ecrit en UTF-8 sans BOM), puis `vercel deploy --force` (le cache de build peut re-servir l'ancienne valeur) et verifier la valeur inlinee dans le bundle deploye.

## 7. Supabase et migrations

Les migrations SQL existantes sont dans `sql/`.

Ordre connu :

1. `001_initial_schema.sql`
2. `002_fix_company_signup_rls.sql`
3. `003_workspace_rpc.sql`
4. `004_pipeline_relances_v1.sql`
5. `005_finance_growth_modules.sql`
6. `006_beta_show_documents.sql`
7. `007_grant_requirements.sql`
8. `008_fixed_costs_finance.sql`
9. `009_billing_status_roles.sql` (billing_status/plan_code/comped sur companies, roles verrouilles, helpers d'acces ; procedure comped : `sql/README_comped.md`)
10. `010_treasury_snapshots.sql` (saisie du solde de tresorerie avec historique ; le cockpit et les finances lisent le dernier solde saisi, plus de valeur codee en dur)
11. `011_documents_storage.sql` (bucket prive "documents" 20 Mo, isolation par compagnie via le chemin, colonne show_documents.storage_path ; upload reel + suppression + URLs signees branches dans l'app)
12. `012_activity_logs.sql` (journal d'activite par compagnie : table activity_logs en lecture seule cote client + fonction log_activity security definer ; toutes les Server Actions de mutation journalisent ; affichage dans /settings)
13. `013_super_admin.sql` (console admin Phase A : flag profiles.is_super_admin modifiable uniquement en SQL, RPC security definer admin_list_companies / admin_set_company_billing / admin_list_beta_signups ; page /admin cachee, notFound pour les non-admins ; pour donner l'acces : `update public.profiles set is_super_admin = true where id = '<user_id>';`. Un super admin n'a PAS de cockpit compagnie : sidebar admin dediee (variant "admin"), /dashboard redirige vers /admin, visite guidee desactivee)
14. `014_show_posters.sql` (upload d'affiche de spectacle - lot session parallele)
15. `015_company_profile.sql` (profil compagnie editable dans /settings - lot session parallele)
16. `016_company_team.sql` (equipe et acces : membres, roles, invitation par code - lot session parallele)
17. `017_calendar_events.sql` (evenements d'agenda perso via clic droit sur un jour - lot session parallele)
18. `018_feedback.sql` (retours/signalements = console admin Phase B : table feedback + RPC submit_feedback (security definer, cote compagnie) + admin_list_feedback / admin_set_feedback_status (super admin) ; bouton "Donner un retour" dans la topbar compagnie, section de tri dans /admin avec statut nouveau/en_cours/traite et reponse visible par la compagnie)

En cas de doute sur l'etat du schema en production (erreur "Could not find column ... in the schema cache"),
executer `sql/diagnostic_schema.sql` dans le SQL editor : il liste les colonnes/fonctions/bucket
manquants avec la migration a rejouer. Toutes les migrations sont idempotentes : les rejouer ne casse rien.
Apres reparation, executer `notify pgrst, 'reload schema';` pour rafraichir le cache PostgREST.

Quand une nouvelle migration est ajoutee :

- nommer `009_...sql`, `010_...sql`, etc. ;
- garder RLS ;
- ajouter indexes utiles ;
- mettre a jour `types/database.types.ts` si necessaire ;
- documenter l'ordre d'application ;
- ne jamais supposer que la migration est deja appliquee en production.

## 8. Roles, admin et paiement

Etat actuel :

- `profiles.role` existe ;
- `ensure_workspace` cree un profil avec `role = 'admin'` ;
- ce role n'est pas encore suffisamment utilise pour les permissions fines ;
- Stripe n'est pas bloquant ;
- aucune compagnie ne paie vraiment tant que Stripe n'est pas branche.

Besoin a implementer :

- roles propres : owner, admin, member, readonly ;
- super admin interne pour Titouan/Tony si necessaire ;
- statut billing sur `companies` :
  - trial ;
  - active ;
  - comped ;
  - past_due ;
  - cancelled.
- `plan_code` ;
- `comped_until` ;
- `billing_notes` ;
- helper serveur pour savoir si une compagnie a acces.

Important : ne pas faire confiance a un role modifiable par l'utilisateur lui-meme.
Verrouiller via RLS et/ou Server Actions.

## 9. UX / design

Direction :

- theatre ;
- premium ;
- simple ;
- culturel ;
- pas trop "startup nation" ;
- pas de jargon ;
- chaque ecran doit etre utilisable sans explication.

Ne pas construire de landing marketing si la demande concerne l'app.
Le cockpit est l'ecran principal.

Regles :

- pas de cartes imbriquees inutiles ;
- pas de decor orbs/bokeh ;
- ne pas surcharger en couleurs ;
- texte lisible mobile/desktop ;
- icones vectorielles coherentes ;
- garder des dimensions stables pour elements fixes ;
- prioriser actions et alertes plutot que tableaux complexes.

Themes actuels :

- Velours ;
- Plateau noir ;
- Papier affiche ;
- Loge ;
- Regie.

Fichiers :

- `lib/theatre-themes.ts`
- `components/theme/theatre-theme-switcher.tsx`
- `app/globals.css`
- `components/ui/dashboard-nav-icon.tsx`
- `components/ui/page-title.tsx`

## 10. Verification avant de terminer une tache

Toujours lancer au minimum :

```bash
npm run lint
npm run build
```

Si l'UX est modifiee :

- lancer un serveur local ;
- verifier visuellement au moins `/` et `/dashboard` ;
- attention : avec `.env.local` Supabase active, `/dashboard` peut rediriger vers `/login` si non connecte ;
- pour test mock, retirer temporairement l'env uniquement si c'est fait proprement et restaure immediatement.

Ne pas laisser de serveur local ouvert.
Ne pas laisser de fichiers temporaires.
Verifier :

```bash
git status -sb
```

## 11. Regles Git et fichiers a ne pas toucher

Le repo peut etre sale. Ne jamais revert des changements non compris.

Actuellement, il peut y avoir des changements non commites lies a :

- UX theatre ;
- icones ;
- docs contrat ;
- notes Tony ;
- `.codex/` ;
- `TaDiff.code-workspace`.

Ne pas supprimer `.codex/`.
Ne pas stage `TaDiff.code-workspace` sauf demande explicite.
Ne pas stage `.codex/` sauf demande explicite.

Avant commit :

- inspecter `git status -sb` ;
- staged uniquement les fichiers pertinents ;
- ne pas embarquer des fichiers temporaires ;
- ne pas commit `.env.local`.

## 12. Contraintes juridiques / business

Ne pas traiter le contrat comme un detail technique.

Points sensibles :

- propriete intellectuelle du code ;
- cession conditionnelle a l'emission effective des parts ;
- maintenance bornee ;
- remuneration progressive ;
- frais techniques rembourses ;
- droits de minoritaire ;
- dilution ;
- comptes offerts / beta / partenaires ;
- decision sur qui paie Vercel, Supabase, Resend, Stripe, IA, stockage.

Fichiers utiles :

- `Contrat/Contre_proposition_TADIFF_Titouan.md`
- `Contrat/Message_reponse_Tony.md`
- `Contrat/Checklist_avocat_TADIFF.md`

Ne pas donner de conseil juridique definitif. Dire quand un avocat doit valider.

## 13. Reponse attendue d'un agent

Quand une nouvelle tache arrive :

1. Lire les fichiers pertinents.
2. Verifier l'etat actuel du code.
3. Identifier ce qui existe deja.
4. Eviter de refaire un module qui existe.
5. Implementer dans les patterns actuels.
6. Ajouter migration si le schema change.
7. Mettre a jour types/docs si necessaire.
8. Lancer lint/build.
9. Resumer ce qui a change, ce qui reste a faire, et les tests effectues.

Ne pas repondre seulement par une idee si la demande implique clairement une implementation.

## 14. Prochaine tache recommandee

Fait au 2026-07-05 : billing_status/comped/roles verrouilles (009), procedure comped
(`sql/README_comped.md`), etats "Fonction prevue - non branchee", tresorerie saisie (010),
upload documents Supabase Storage (011), CRUD spectacles/contacts/devis/frais fixes/relances,
radar subventions branche + import de 10 dispositifs de reference.

Si aucune tache plus precise n'est donnee, travailler sur :

1. Stripe mode test : code checkout/webhook fait ; appliquer migration 020, creer le prix beta 19,99 EUR, poser les cles env, tester un paiement complet -> `companies.billing_status` ;
2. emails Resend : envoi depuis fiche contact, templates, historique, brouillons si non branche (attend la cle Resend) ;
3. page beta : verifier compteur 10 places + liste d'attente 30 en conditions reelles ;
4. editeur de budget avance + contrats de corealisation (minimum garanti lieu/compagnie puis partage des recettes, simulation de remplissage jauge x prix x taux) : cadre dans developpement.md section Devis, backlog apres le 23 juillet ;
5. console super admin : Phase A (supervision + billing) et Phase B (retours/bugs) FAITES ; reste Phase C catalogues globaux subventions/mecenat (voir developpement.md "Console super admin") ;
6. association documents <-> contact/devis/contrat + upload direct depuis la page Documents ;
7. vue mois/semaine du calendrier.
