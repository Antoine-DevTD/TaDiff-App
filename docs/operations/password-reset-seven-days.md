# Liens de mot de passe valables sept jours

Le parcours « Mot de passe oublié » émet désormais des liens TaDiff consultables plusieurs fois pendant sept jours. La lecture affiche le formulaire sans ouvrir de session Supabase ni consommer le lien. Seul un changement effectif du mot de passe désactive les liens encore ouverts du compte.

## Installation

Appliquer uniquement `sql/090_reusable_password_reset.sql`, ou son miroir `supabase/migrations/20261021122846_reusable_password_reset.sql`, puis publier le code associé. Les deux fichiers sont identiques et la migration est rejouable. Ne pas exécuter les autres migrations locales par lot.

Variables existantes : `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` et, si configuré, `NEXT_PUBLIC_APP_URL` (origine HTTPS publique). Aucune nouvelle variable obligatoire. Le domaine public de repli est `https://tadiff.com` ; le domaine du mail n’est jamais dérivé d’un en-tête Host fourni par le visiteur.

La durée est fixée côté base à sept jours pour chaque nouveau lien. Aucun changement du réglage global Supabase `mailer_otp_exp` : les anciens liens Auth restent soumis à leur fonctionnement antérieur.

## Fonctionnement et accès

- Secret aléatoire de 256 bits, uniquement dans le fragment du lien ; seule son empreinte SHA-256 avec contexte est conservée en base.
- Table `password_reset_links` protégée par RLS sans accès pour `anon` ou `authenticated`. RPC réservées à `service_role` ; les fonctions privées ne sont pas exposées aux visiteurs.
- Le formulaire envoie le secret dans le corps d’un POST de même origine. Aucun secret dans les requêtes GET, les sorties de l’outil d’administration ou les réponses publiques de demande de lien.
- L’API Auth applique les règles de mot de passe. La garde SQL reconnaît ses deux instructions dans la même transaction : modification du mot de passe, puis métadonnées. Une réservation expirée, rejouée ou remplacée fait échouer et annuler cette transaction. Le reçu n’est inscrit que dans cette transaction ; la réservation est retirée des métadonnées Auth avant stockage.
- Une panne de validation ne consomme pas le lien. En cas d’issue réseau inconnue, le reçu permet de reconnaître un changement déjà validé ; sinon la réservation de deux minutes expire et la même adresse peut être réutilisée.
- Toute modification habituelle du mot de passe désactive également les liens en attente. Un compte non confirmé, suspendu ou dont l’email a changé ne peut pas être réinitialisé par ce parcours.
- Les demandes sont limitées à une par minute et cinq par heure par compte. La réponse publique ne révèle pas si le compte existe.

## Préparer un lien sans envoyer d’email

Depuis le dépôt, avec les variables serveur déjà chargées :

```powershell
node --env-file=.env.local scripts/create-password-reset-link.mjs "destinataire@example.com" "C:/chemin-prive-hors-depot/nouveau-lien.txt" "https://tadiff.com"
```

Le dossier de sortie doit être privé, accessible au titulaire Windows et à SYSTEM. Le fichier ne doit jamais être versionné. L’outil refuse un fichier existant, affiche seulement son chemin et l’échéance, et n’envoie aucun email. L’expiration relue vient de la base, pas de l’horloge locale.

## Vérification

- `node --test tests/unit/password-reset.test.mjs tests/unit/password-reset-sql.test.mjs tests/unit/password-reset-browser.test.mjs` : vrais calculs de jetons, transactions PostgreSQL embarquées, droits, concurrence, lectures répétées, erreurs et clavier à 390/1280 pixels.
- Contrôle explicite avec un compte QA temporaire, créé puis supprimé par le script, sans email ni changement d’un compte réel :

```powershell
node --env-file=.env.local tests/operations/password-reset-live.mjs "https://tadiff.com" --allow-qa-user
```

Ce contrôle vérifie l’API Auth réelle, le formulaire, le refus de l’ancien mot de passe, la consommation atomique, le refus du rejeu et la confidentialité de la table. Ne pas l’exécuter sans autorisation sur une autre base. Aucun Docker nécessaire.
