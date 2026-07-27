# Checklist de sortie bêta - 6 août 2026

Dernier audit : 27 juillet 2026.

## Décision de périmètre

- Cohorte actuelle : 15 compagnies.
- Tarif annoncé : 19,99 EUR par mois.
- Création publique de compte fermée. Les comptes bêta sont activés manuellement.
- Powens et la connexion bancaire sont reportés après la bêta.
- Pour la bêta, la trésorerie repose sur la saisie du solde, les frais fixes, les devis, les dates et les projections déjà disponibles.
- Les captations restent hébergées sur YouTube ou Vimeo ; TaDiff conserve seulement leur lien.

## État vérifié le 27 juillet

- [x] `npm run lint`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `npm run test:budget` : 2 tests passés
- [x] `npm run test:e2e` : 26 parcours passés
- [ ] Les changements locaux en cours sont relus, regroupés et livrés sur `main`.
- [ ] Le déploiement Vercel correspondant est vérifié sur `https://tadiff.com`.
- [x] Les migrations `052` à `059` sont confirmées dans la base de production par diagnostic, pas seulement par leur présence dans Git.
- [ ] Les variables de production Vercel sont comparées à `.env.example`.

Le worktree contient encore un lot conséquent de modifications et d'artefacts non commités. La première priorité est de stabiliser et livrer cet état avant d'ajouter une nouvelle grosse fonctionnalité.

## P0 - Obligatoire avant le 6 août

### 1. Stabiliser la version candidate

- [ ] Faire une revue fonctionnelle des changements locaux : calendrier, trésorerie, William, contacts, diffusion, documents, subventions et mécénat.
- [ ] Séparer les fichiers produit des fichiers de présentation et des fichiers de skills afin d'éviter un commit accidentel.
- [ ] Faire un point de sauvegarde Git avant les derniers correctifs.
- [ ] Corriger les régressions observées sur un vrai compte Supabase, pas seulement sur les données de démonstration.
- [ ] Refaire une passe complète sur les accents, libellés, messages d'erreur et états vides.
- [ ] Vérifier desktop et mobile à 390 px, 768 px, 1440 px et grand écran.
- [ ] Relancer lint, TypeScript, build et Playwright après le dernier correctif.
- [ ] Déployer sur `main`, puis effectuer un smoke test sur `tadiff.com`.

### 2. Base Supabase et sécurité

- [ ] Exécuter `sql/diagnostic_schema.sql` sur la production et conserver le résultat.
- [ ] Confirmer les migrations `001` à `059`, en particulier `052` à `059`.
- [ ] Vérifier les URL Supabase Auth :
  - `Site URL` : `https://tadiff.com`
  - redirection : `https://tadiff.com/auth/callback`
  - redirection locale : `http://localhost:3000/auth/callback`
- [ ] Vérifier la récupération de mot de passe depuis une vraie adresse email.
- [ ] Tester l'isolation entre deux compagnies réelles : spectacles, contacts, documents, actions, finances et William.
- [ ] Ajouter des tests dédiés aux autorisations/RLS pour les parcours sensibles. Les tests actuels couvrent bien l'UX, mais pas encore systématiquement les cas non connecté, autre compagnie, bon membre et rôle insuffisant.
- [ ] Vérifier que `SUPABASE_SERVICE_ROLE_KEY` existe uniquement côté serveur dans Vercel.
- [ ] Vérifier le dernier succès du heartbeat GitHub et la présence des secrets `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
- [ ] Activer la purge quotidienne des journaux de plus de 90 jours.
- [ ] Définir la procédure de sauvegarde et de restauration Supabase avant d'accueillir les pilotes.

### 3. Entrée des 15 compagnies

- [ ] Valider avec Tony la liste nominative des 15 compagnies retenues.
- [ ] Définir une procédure unique d'activation :
  1. créer ou inviter l'utilisateur ;
  2. créer son espace compagnie ;
  3. attribuer son rôle ;
  4. attribuer le statut de facturation ;
  5. vérifier sa première connexion ;
  6. envoyer le lien de récupération de mot de passe si nécessaire.
- [ ] Tester le parcours avec un compte neuf et une compagnie vide.
- [ ] Tester le welcome complet : nom, compagnie, logo, premier spectacle et arrivée dans le cockpit.
- [ ] Vérifier que les 10 subventions de référence sont ajoutées automatiquement sans doublon.
- [ ] Préparer un compte pilote offert et un compte pilote payant.
- [ ] Conserver le compte `demo_webinaire` séparé des comptes réels.
- [ ] Vérifier que le replay démo remet bien toutes les données métier à zéro sans toucher aux rôles, crédits IA et journaux de sécurité.

### 4. Décider le mode de facturation

Décision bloquante : les compagnies paient-elles réellement 19,99 EUR dès le 6 août ?

#### Si la bêta est payante dans Stripe

- [ ] Faire vérifier le compte Stripe de l'exploitant.
- [ ] Créer le produit et le prix mensuel bêta à 19,99 EUR dans le bon régime HT/TTC.
- [ ] Configurer dans Vercel :
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_BETA_MONTHLY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Déclarer `https://tadiff.com/api/stripe/webhook` dans Stripe.
- [ ] Tester : paiement réussi, paiement refusé, renouvellement, impayé et résiliation.
- [ ] Vérifier les factures, mentions légales, TVA et emails Stripe.
- [ ] Ajouter un accès simple à la résiliation ou formaliser le traitement par email avant de promettre une résiliation autonome.
- [ ] Passer des clés de test aux clés de production seulement après validation complète.

#### Si la bêta est offerte ou facturée manuellement

- [ ] Marquer chaque compagnie `comped` ou `trial` depuis le super-admin.
- [ ] Fixer une date de fin explicite.
- [ ] Retirer toute ambiguïté dans les emails d'invitation et les CGV.
- [ ] Ne pas afficher Stripe comme opérationnel.

### 5. Emails

Le composeur actuel prépare des emails et ouvre Gmail, Outlook ou la messagerie du poste. Il ne réalise pas encore un envoi serveur complet avec suivi.

- [ ] Choisir le périmètre bêta :
  - option rapide recommandée : téléchargement des pièces puis ouverture de la messagerie ;
  - option avancée : envoi réel par Resend avec historique et webhooks.
- [ ] Si Resend est activé :
  - vérifier le domaine `tadiff.com` ;
  - configurer SPF, DKIM et DMARC dans Netlify DNS ;
  - ajouter `RESEND_API_KEY` dans Vercel ;
  - définir les expéditeurs `contact@`, `noreply@` et `support@` ;
  - ajouter désinscription, limites d'envoi et gestion des rebonds ;
  - vérifier que les pièces jointes et les données restent isolées par compagnie.
- [ ] Configurer un SMTP personnalisé pour les emails Supabase Auth afin de fiabiliser invitation et mot de passe oublié.
- [ ] Tester une invitation et un brouillon vers Gmail, Outlook et une adresse professionnelle.
- [ ] Ne jamais afficher "email lu" comme une certitude : une ouverture reste une estimation.

### 6. Juridique et RGPD

- [ ] Récupérer auprès de Tony les informations encore marquées `A COMPLETER` dans `docs/legal/information-to-complete.md`.
- [ ] Renseigner l'identité d'ARKENCIEL dans l'onglet `Informations` du super-admin.
- [ ] Trancher : prix HT ou TTC, TVA, durée du tarif bêta, résiliation et limites incluses.
- [ ] Faire relire `/cgu`, `/cgv`, `/annexe-rgpd`, `/confidentialite`, `/cookies` et `/mentions-legales`.
- [ ] Versionner et archiver les documents publiés.
- [ ] Enregistrer la preuve d'acceptation de la version des CGU/CGV avant le premier paiement réel.
- [ ] Accepter ou signer les DPA de Supabase, Vercel, Stripe, Mistral et Resend si activé.
- [ ] Documenter le fournisseur IA, les données transmises, la conservation et le pays de traitement.
- [ ] Définir qui traite les demandes RGPD et les incidents.
- [ ] Préparer une procédure d'export et de suppression. L'export JSON existe ; la suppression complète peut rester manuelle pendant la bêta si elle est documentée.

### 7. Support et retours bêta

- [ ] Désigner le responsable support principal et son remplaçant.
- [ ] Confirmer `support@tadiff.com` ou l'adresse retenue.
- [ ] Définir un délai de réponse réaliste, par exemple un jour ouvré.
- [ ] Tester le bouton `Donner un retour` et l'onglet `Retours` du super-admin.
- [ ] Ajouter un statut, une priorité et un responsable à chaque retour important.
- [ ] Préparer trois questionnaires :
  - après la première prise en main ;
  - au milieu de la bêta ;
  - à la fin de la bêta.
- [ ] Mesurer : activation, premier spectacle, premier contact, première diffusion, première action terminée, premier document et retour à J+7.
- [ ] Préparer un canal d'urgence pour perte de données ou impossibilité de se connecter.

### 8. Exploitation et surveillance

- [ ] Vérifier les logs Vercel et Supabase chaque jour pendant la première semaine.
- [ ] Tester le mode maintenance et son accès de secours avant le lancement.
- [ ] Préparer un message d'incident et un message de rétablissement.
- [ ] Vérifier que les erreurs serveur ne révèlent ni secret ni donnée d'une autre compagnie.
- [ ] Contrôler les quotas Mistral et activer William uniquement pour les comptes retenus.
- [ ] Définir un plafond de tokens par compagnie et une alerte interne de consommation.
- [ ] Vérifier les limites Supabase Storage et le poids maximal des documents.
- [ ] Conserver Supabase Storage pour la bêta ; R2 reste optionnel tant que le volume réel est faible.

## P1 - Important pendant la bêta

- [ ] Améliorer l'envoi réel et le suivi des emails après observation des usages.
- [ ] Renforcer l'import massif de personnes et de lieux avec rapport d'erreurs téléchargeable.
- [ ] Ajouter des métriques de performance réelles sur les principales routes du cockpit.
- [ ] Ajouter un tableau d'activation des compagnies dans le super-admin.
- [ ] Afficher clairement les quotas de spectacles et de William.
- [ ] Ajouter un parcours de résiliation et de récupération des données.
- [ ] Ajouter une procédure de suppression complète d'un espace compagnie.
- [ ] Étendre les tests RLS et API à chaque nouvel endpoint ou Server Action.
- [ ] Consolider les retours William les plus fréquents sans conserver plus de contenu que nécessaire.
- [ ] Vérifier et ajuster les minimums syndicaux du budget avec une source et une date de validité.
- [ ] Corriger les frictions observées dans Diffuser, Agenda, Dossiers et Trésorerie à partir des sessions pilotes.

## P2 - Après stabilisation de la bêta

- [ ] Powens : connexion bancaire, comptes, transactions et consentement.
- [ ] Détection des dépenses récurrentes avec validation avant création d'un frais fixe.
- [ ] Rapprochement entre transactions, devis, factures, subventions et frais fixes.
- [ ] Envoi automatisé et suivi des campagnes à plus grand volume.
- [ ] Export comptable/FEC réellement téléchargeable.
- [ ] Connexion Gmail/Outlook par OAuth si le brouillon `mailto:` devient insuffisant.
- [ ] Synchronisation Google Calendar/Outlook si les pilotes la demandent réellement.
- [ ] Passage éventuel des documents vers Cloudflare R2 selon le volume et le coût observés.

## Planning recommandé

### 27 au 29 juillet

- livrer et déployer le worktree actuel ;
- exécuter le diagnostic des migrations ;
- terminer l'identité juridique ;
- décider Stripe payant ou comptes offerts ;
- préparer les 15 compagnies.

### 30 juillet au 1er août

- configurer Stripe ou la procédure d'exemption ;
- configurer les emails d'authentification ;
- tester les comptes neufs ;
- effectuer les tests RLS et les corrections P0.

### 2 au 4 août

- faire tester trois compagnies pilotes ;
- corriger uniquement les blocages et incompréhensions majeurs ;
- vérifier mobile, documents, imports, diffusion et William ;
- préparer support et questionnaires.

### 5 août

- gel fonctionnel ;
- dernier déploiement ;
- smoke test complet sur `tadiff.com` ;
- sauvegarde et procédure de retour arrière ;
- aucune nouvelle fonctionnalité.

### 6 août

- activer les comptes par petits groupes ;
- surveiller erreurs, emails, paiements et quotas ;
- contacter les compagnies qui n'ont pas terminé leur première connexion ;
- consigner chaque incident et sa résolution.

## Critères go / no-go

La bêta peut ouvrir si :

- un compte neuf peut être activé, se connecter et récupérer son mot de passe ;
- deux compagnies ne peuvent pas lire ou modifier les données l'une de l'autre ;
- spectacles, contacts, actions, documents et trésorerie persistent ;
- le mode de paiement annoncé fonctionne réellement ou est explicitement remplacé par une exemption ;
- les informations juridiques de l'exploitant ne contiennent plus de champ provisoire ;
- le support, les sauvegardes et le retour arrière ont un responsable ;
- les tests de la version déployée passent.

La bêta doit être reportée si l'isolation des données, l'authentification, la persistance, le paiement annoncé ou la restauration ne sont pas fiables.
