# Etat court du projet

## Corrections dates, minimum garanti et contacts — 7 septembre 2026

- Dates : représentations des exploitations et événements de l’agenda rattachés au spectacle, en plus des propositions de diffusion. Les créneaux non confirmés restent dans Répétitions.
- Minimum garanti au théâtre dans les calculs des propositions, exploitations et budgets ; recette compagnie négative possible.
- Contacts d’équipe sans structure ni email obligatoires ; création directe depuis le spectacle avec métier, personnage et alternance distincts. Aucun compte utilisateur créé.
- Publication demandée par l’utilisateur sur main. Aucune migration ni nouvelle variable nécessaire. Google, prospection et autres chantiers locaux exclus.
- Vérifications locales : lint, types, build, copie française, tests de calcul et parcours connecté dates/contacts, clavier et mobile.

## Reprise des retours 2 à 8 — 5 août 2026

- William est filtrable et triable par compagnie, réponse, recherche et date dans la console plateforme.
- Les erreurs Next.js, interface et Supabase significatives alimentent un centre de notifications groupées. Resend alerte l'adresse interne et prévient les utilisateurs identifiés lorsqu'une erreur est marquée corrigée.
- Les modèles d'emails peuvent être proposés ou masqués et définis par défaut pour chaque usage. Une duplication apparaît immédiatement dans la liste et le composeur filtre les modèles par usage.
- Trésorerie tient un journal d'encaissements et de décaissements, projette 13 semaines selon trois scénarios et fait remonter les risques et actions utiles. Le même ajout prend en charge un mouvement ponctuel ou un frais récurrent ; la connexion bancaire reste désactivée sans `BANK_CONNECTION_URL`.
- `npm run check:copy` contrôle les erreurs d'accents les plus courantes et fait partie de la définition de terminé.
- La migration `071_treasury_movements.sql` doit être appliquée avant promotion du nouveau journal de trésorerie en production.

Derniere verification : 6 août 2026.

## Socle

- Next.js App Router, React, TypeScript et Tailwind CSS.
- Supabase pour Auth, Postgres, Storage et RLS, avec donnees de demonstration lorsque prevu par le code.
- Deploiement Vercel et domaine `tadiff.com`.
- Application multi-compagnie avec roles et controles d'ecriture.

## Parcours deja presents

- Landing, reservation beta, authentification et recuperation de mot de passe.
- Le compte du webinaire dispose d'une inscription simulée protégée sur `/demo-signup`, suivie de la préparation animée de l'espace puis du replay de l'accueil William. Elle ne crée aucun utilisateur et ne rouvre pas les inscriptions publiques.
- Le parcours simulé du webinaire repart avec un formulaire vierge et remet à zéro les données métier du compte webinaire avant l'accueil William : spectacles, contacts, diffusion, actions, agenda, trésorerie, documents, mécénat, emails et historiques. L'abonnement, le rôle, les crédits William et les journaux de sécurité restent conservés.
- Welcome s'adresse à la personne par son prénom, reprend le nom de sa compagnie depuis l'invitation et lui permet de corriger ces informations. Le besoin indiqué à l'inscription pré-sélectionne une première action réelle : spectacle, contacts, agenda, trésorerie, documents ou visite du cockpit.
- Welcome accepte aussi le logo de la compagnie, de manière facultative, par sélection ou glisser-déposer JPG, PNG et WebP, le redimensionne côté navigateur, puis l'affiche dans le menu de compte en haut à droite du cockpit.
- Le logo de compagnie remplit le rond du menu de compte. Les administrateurs peuvent ajuster son zoom et son point de cadrage dans les paramètres de compagnie. La navigation propose aussi un rendez-vous d'accompagnement TaDiff, sur ordinateur comme sur mobile.
- Cockpit, spectacles, documents, contacts, diffusion, agenda, finances, dossiers et administration.
- Import de contacts, donnees de demonstration, visite guidee et premiers flux William.
- Analytics publics limites et journal d'acces superadmin.
- Administration plateforme delegable avec permissions choisies par le superadmin, sans delegation des exemptions de paiement.
- Stockage documentaire interchangeable entre Supabase Storage et Cloudflare R2.
- Documents de travail versionnes par spectacle, lien de captation et limites de spectacles actifs par formule.
- La diffusion utilise un espace de travail focalisé par dossier : file par étape, spectacle et contact visibles, puis commandes directes pour écrire, inviter, créer une action, préparer un devis ou confirmer. Les exploitations confirmées couvrent séries, billetterie, résultat et préparation SACD avec le même choix visuel des modèles économiques.
- Composeur email complet partage entre Emails et Contacts, avec pieces jointes et demandes guidees a William. William dispose d'une interface conversationnelle, d'un affichage progressif et des raccourcis Entree / Maj + Entree.
- Carnet separe entre personnes et lieux. Une direction renseignee sur un lieu cree un contact personne rattache, et plusieurs personnes peuvent etre selectionnees pour preparer un email groupe en copie cachee.
- Les contacts disposent d'actions groupees pour preparer un email, creer une action par contact et supprimer une selection. Les suppressions sensibles de contacts, spectacles et documents utilisent une confirmation reutilisable par maintien de trois secondes.
- Les actions terminees restent consultables, acceptent un resultat facultatif et peuvent etre rouvertes. Les reports et clotures alimentent un historique borne exploitable par le contexte operationnel de William.
- L'onglet Presentation propose un atelier William persistant par spectacle pour travailler logline, synopsis, note d'intention et presentation de diffusion. Il peut mener un entretien ou lire uniquement les extraits PDF explicitement autorises, puis proposer un brouillon que l'utilisateur choisit d'appliquer.
- La bulle William conserve une conversation distincte par utilisateur et par compagnie. Seuls les 12 derniers messages dans une limite de 18 000 caracteres sont renvoyes au modele. Les questions de suivi proposées par William sont affichées comme commandes cliquables, et l'utilisateur peut démarrer une nouvelle conversation.
- Le budget spectacle detaille couvre equipe et repetitions chargees, depenses de creation ou par representation, financements, cession, partage de billetterie, location, droits, prix de cession conseille, public minimum et courbe de rentabilite.
- Le carnet de lieux propose une vue carte avec points colores par avancement, fiche rapide et creation d'action. La recherche d'adresse via la Base Adresse Nationale remplit la ville, le code postal et les coordonnees sans exposer latitude/longitude. Les imports Personnes et Lieux sont contextualises dans chaque onglet.
- L'import de lieux reconnait les variantes de colonnes comme `Nom du lieu`, explique les lignes rejetees et geocode automatiquement les adresses avant enregistrement. Les coordonnees presentes dans un fichier restent acceptees sans etre demandees dans l'interface.
- Les quatre indicateurs de la vue d'ensemble du cockpit ouvrent directement leur rubrique : tresorerie, diffusion, dossiers et actions urgentes.
- La première ouverture de Trésorerie guide la saisie du solde, la sélection des frais fixes puis leurs montants, fréquences et échéances avant d'afficher une projection réelle.
- Le catalogue global de subventions est administrable depuis la console plateforme. Les pièces demandées se sélectionnent dans une liste structurée et les nouveaux espaces sont alimentés depuis ce catalogue, sans écraser les dossiers déjà suivis.
- Les modèles d'emails proposés sont administrables, y compris leur variation avec pièces jointes. Les variables utilisent la syntaxe `@variable` et l'éditeur propose les tags dès la saisie de `@`.
- L'agenda propose une grille plus lisible et un panneau de détail persistant. Selon l'élément sélectionné, il regroupe spectacle, lieu, contacts, documents, prochaine action et repère financier. Une subvention sélectionnée ouvre son dossier en surbrillance.
- Les subventions utilisent le même langage visuel que les actions : vues par urgence et avancement, liste groupée par spectacle, dossier actif et pièces attendues directement manipulables.
- Les 10 dispositifs de subvention de référence sont ajoutés automatiquement et sans doublon lors de l'initialisation d'un espace compagnie.
- Le mécénat reprend ce langage visuel avec des vues par avancement, une liste de partenaires et une fiche active. L'entrée Documents est temporairement masquée du sous-menu Dossiers, sans supprimer les fichiers ni la route.
- Une exploitation accepte une sélection explicite des jours joués dans une période. La billetterie s'enregistre automatiquement et une représentation peut être annulée puis rétablie sans perdre son historique.
- La modification d'une diffusion s'ouvre dans une fenêtre dédiée au lieu d'allonger la fiche active. Les montants, dont le minimum garanti, acceptent les centimes et les valeurs non arrondies.
- La prochaine représentation d'un spectacle est dérivée des diffusions confirmées lorsqu'une date de jeu est renseignée. Les montants de diffusion, dont le minimum garanti, acceptent les valeurs non arrondies à la centaine.
- Une diffusion accepte plusieurs dates dans une saisie continue, distingue le minimum garanti par représentation du minimum global et propose explicitement « Je ne sais pas encore » pour le mode d'exploitation.
- Une exploitation peut reprendre une diffusion confirmée avec son spectacle, son contact, ses dates et ses conditions économiques. Sa saisie de dates n'utilise plus la double notion période/jours joués.
- La console bêta peut activer William et créditer une seule fois 200 000 tokens à chaque compte sélectionné. L'utilisateur reçoit ensuite une présentation ponctuelle des usages et du consentement documentaire.
- Le budget détaillé commence par une sélection guidée des métiers et dépenses, sépare clairement création, plateau et technique, utilise des incréments entiers et explique que les taux de charges sont des hypothèses à vérifier.

## Reprise produit du 5 aout 2026

- Le premier parametrage du budget est persistant par spectacle. Les profils artiste, technicien et autre restent modifiables, avec une source et une date visibles pour les estimations de charges.
- Les Personnes et Lieux acceptent des champs personnalises texte, nombre, date, lien ou liste courte. Leurs valeurs sont isolees par compagnie ; l'ordre et la visibilite des colonnes sont propres a chaque utilisateur et les champs masques restent disponibles a l'import.
- La carte des lieux utilise la couleur pour l'avancement commercial et conserve le type de lieu comme information secondaire. Un selecteur natif rend chaque lieu accessible au clavier et sur mobile.
- L'exploitation calcule le resultat de chaque representation, le cumul, la projection de fin de serie et la date estimee d'equilibre. Les tarifs facultatifs alimentent les billets payants et la recette brute ; le recapitulatif SACD mensuel est copiable ou telechargeable sans teledeclaration.

## Etat technique a confirmer avant livraison

- Les migrations sont versionnees dans `sql/`; leur presence dans le depot ne prouve pas leur application dans Supabase.
- `036_opportunity_exploitation_models.sql` couvre les modeles economiques de diffusion.
- `037_email_templates.sql` couvre les templates email persistants.
- `064_unify_grant_catalog_and_email_variants.sql` importe les anciennes références dans le catalogue global, branche l'ensemencement des nouveaux comptes dessus et ajoute la variation avec pièces jointes aux modèles plateforme.
- `065_guided_diffusion_exploitation_and_beta_william.sql` ajoute les dates multiples, la base du minimum garanti et l'activation idempotente de William pour les comptes bêta. Elle doit être appliquée avant de tester ces parcours.
- `066_persistent_guided_show_budget.sql` persiste la fin du parametrage guide du budget.
- `067_contact_custom_fields_and_views.sql` ajoute les champs personnalises, leurs valeurs, les preferences de colonnes et les statuts commerciaux avec RLS multi-compagnie.
- `068_exploitation_ticket_categories.sql` ajoute les tarifs par representation et distingue les chiffres reellement saisis des projections.
- Stripe reste a valider de bout en bout avec les variables et webhooks de l'environnement cible.
- `038_platform_admin_and_ai_foundation.sql` ajoute les informations legales dynamiques, les catalogues globaux, les templates plateforme et la fondation RAG de William. Application Supabase confirmee par l'utilisateur le 20 juillet 2026.
- `039_ai_access_quotas_and_credits.sql` ajoute l'acces progressif par compte, les quotas mensuels, le journal d'usage et les credits Stripe.
- `042_william_operational_context.sql` met a jour le prompt par defaut. William combine desormais l'etat frais et autorise de la compagnie avec le RAG documentaire, au lieu de refuser une question de pilotage lorsqu'aucune source textuelle n'est retrouvee.
- Les migrations `043` a `048` ont ete appliquees dans Supabase le 21 juillet 2026, selon confirmation utilisateur.
- Les migrations `049` a `051` ont ete appliquees dans Supabase le 22 juillet 2026, selon confirmation utilisateur. Elles couvrent personnes/lieux, historique des actions et ateliers de redaction William.
- La migration `054_theatre_budget_model.sql` ajoute les hypotheses du budget theatre et doit etre appliquee avant de persister ce nouvel editeur.
- La migration `055_venue_map_coordinates.sql` ajoute les adresses, jauges et coordonnees necessaires a la carte des lieux. Elle doit etre appliquee avant d'enregistrer ces champs dans Supabase.
- La migration `056_exploitation_performance_status.sql` ajoute le statut individuel programmee/annulee des representations. Elle doit etre appliquee avant d'utiliser l'annulation depuis Diffuser.
- La migration `057_default_reference_grants.sql` initialise automatiquement les 10 dispositifs de référence à la création ou à la prochaine initialisation d'un espace. Elle doit être appliquée avant de retirer définitivement l'import manuel.
- La migration `058_reset_webinar_demo_workspace.sql` ajoute la remise à zéro transactionnelle réservée au compte `demo_webinaire`. Elle dépend de la migration `057`.
- La migration `059_repair_webinar_demo_reset.sql` rend cette remise à zéro compatible avec une base où certains modules optionnels, comme `calendar_events`, ne sont pas présents.
- La migration `060_fix_beta_signup_registration.sql` corrige l'ambiguïté de la colonne `position` dans l'inscription bêta et distingue une nouvelle demande d'une tentative répétée. Elle doit être appliquée avant de retester le formulaire public.
- La migration `061_company_logo_framing.sql` ajoute le zoom et la position du logo de chaque compagnie. Elle doit être appliquée avant de déployer le cadrage personnalisable.
- La migration `062_william_chat_memory.sql` ajoute les sessions et messages de la bulle William avec isolation RLS par utilisateur et compagnie. Elle les inclut aussi dans la remise à zéro du compte webinaire et doit être appliquée avant d'activer la mémoire conversationnelle.
- La migration `071_treasury_movements.sql` ajoute le journal de trésorerie par compagnie, ses rattachements spectacle/frais fixe et ses politiques RLS. Elle doit être appliquée avant le déploiement du chantier Trésorerie.
- La migration `072_repair_calendar_events_data_api.sql` répare les bases où l'agenda persistant manque ou n'est pas exposé à PostgREST. Elle ajoute les droits Data API explicites et sépare la lecture des droits d'écriture en RLS.
- Les nouvelles places bêta réservées déclenchent via Resend une alerte interne et un email de bienvenue au candidat avec rendez-vous le 6 août 2026 à 10 h. L'email propose un fichier agenda universel `.ics`. La production doit définir `RESEND_API_KEY`; `BETA_SIGNUP_NOTIFICATION_EMAIL` permet de remplacer l'adresse support et `BETA_SIGNUP_NOTIFICATION_FROM` l'expéditeur par défaut.
- La console interne dispose d'une route `/admin/beta` distincte de la supervision. Elle suit le mail de paiement, la verification manuelle Stripe, l'invitation Supabase et la creation du compte. Les actions sont reservees au super-admin ; `view_beta` reste un droit de lecture. La migration `063_beta_access_workflow.sql` est confirmee appliquee en production ; `BETA_PAYMENT_LINK_URL` reste requis avant activation.
- La carte des lieux distingue theatre, festival, salle/espace et lieu culturel a partir du nom et des tags. Un lieu non categorise est traite comme un theatre.

## Qualite

- Dernier passage connu le 6 août 2026 : lint, TypeScript, copie française et build passent ; les 29 parcours Playwright passent, dont Agenda et Trésorerie sur mobile.
- Relancer les controles apres toute modification ; ce statut n'est pas une garantie sur un worktree plus recent.

Pour la vision, le planning et le backlog complet, consulter `docs/product/product-plan.md`. Pour les contraintes d'implementation, consulter `docs/engineering/implementation-reference.md`.
