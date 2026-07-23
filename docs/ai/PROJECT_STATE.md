# Etat court du projet

Derniere verification : 23 juillet 2026.

## Socle

- Next.js App Router, React, TypeScript et Tailwind CSS.
- Supabase pour Auth, Postgres, Storage et RLS, avec donnees de demonstration lorsque prevu par le code.
- Deploiement Vercel et domaine `tadiff.com`.
- Application multi-compagnie avec roles et controles d'ecriture.

## Parcours deja presents

- Landing, reservation beta, authentification et recuperation de mot de passe.
- Le compte du webinaire dispose d'une inscription simulée protégée sur `/demo-signup`, suivie de la préparation animée de l'espace puis du replay de l'accueil William. Elle ne crée aucun utilisateur et ne rouvre pas les inscriptions publiques.
- Le parcours simulé du webinaire repart avec un formulaire vierge, ne réaffiche pas les informations déjà enregistrées et supprime les spectacles du compte webinaire avant l'accueil William.
- Welcome accepte le logo de la compagnie par sélection ou glisser-déposer JPG, PNG et WebP, le redimensionne côté navigateur, puis l'affiche dans le menu de compte en haut à droite du cockpit.
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
- Le budget spectacle detaille couvre equipe et repetitions chargees, depenses de creation ou par representation, financements, cession, partage de billetterie, location, droits, prix de cession conseille, public minimum et courbe de rentabilite.
- Le carnet de lieux propose une vue carte avec points colores par avancement, fiche rapide et creation d'action. La recherche d'adresse via la Base Adresse Nationale remplit la ville, le code postal et les coordonnees sans exposer latitude/longitude. Les imports Personnes et Lieux sont contextualises dans chaque onglet.
- L'import de lieux reconnait les variantes de colonnes comme `Nom du lieu`, explique les lignes rejetees et geocode automatiquement les adresses avant enregistrement. Les coordonnees presentes dans un fichier restent acceptees sans etre demandees dans l'interface.
- Les quatre indicateurs de la vue d'ensemble du cockpit ouvrent directement leur rubrique : tresorerie, diffusion, dossiers et actions urgentes.
- L'agenda propose une grille plus lisible et un panneau de detail persistant. Une subvention selectionnee ouvre son dossier en surbrillance.
- Les subventions utilisent le même langage visuel que les actions : vues par urgence et avancement, liste groupée par spectacle, dossier actif et pièces attendues directement manipulables.
- Les 10 dispositifs de subvention de référence sont ajoutés automatiquement et sans doublon lors de l'initialisation d'un espace compagnie.
- Le mécénat reprend ce langage visuel avec des vues par avancement, une liste de partenaires et une fiche active. L'entrée Documents est temporairement masquée du sous-menu Dossiers, sans supprimer les fichiers ni la route.
- Une exploitation accepte une sélection explicite des jours joués dans une période. La billetterie s'enregistre automatiquement et une représentation peut être annulée puis rétablie sans perdre son historique.
- La modification d'une diffusion s'ouvre dans une fenêtre dédiée au lieu d'allonger la fiche active. Les montants, dont le minimum garanti, acceptent les centimes et les valeurs non arrondies.
- La prochaine représentation d'un spectacle est dérivée des diffusions confirmées lorsqu'une date de jeu est renseignée. Les montants de diffusion, dont le minimum garanti, acceptent les valeurs non arrondies à la centaine.

## Etat technique a confirmer avant livraison

- Les migrations sont versionnees dans `sql/`; leur presence dans le depot ne prouve pas leur application dans Supabase.
- `036_opportunity_exploitation_models.sql` couvre les modeles economiques de diffusion.
- `037_email_templates.sql` couvre les templates email persistants.
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

## Qualite

- Dernier passage connu le 23 juillet 2026 : lint, TypeScript, build et 26 parcours Playwright passés, dont la sélection des jours d'exploitation, le maintien de suppression stable, le nouveau mécénat, le replay webinaire et le géocodage des lieux importés.
- Relancer les controles apres toute modification ; ce statut n'est pas une garantie sur un worktree plus recent.

Pour la vision, le planning et le backlog complet, consulter `docs/product/product-plan.md`. Pour les contraintes d'implementation, consulter `docs/engineering/implementation-reference.md`.
