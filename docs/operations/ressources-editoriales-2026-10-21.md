# Mise en service des ressources éditoriales — 21 octobre 2026

## État

Lot préparé pour livraison Git le 8 novembre 2026 sur `codex/resource-editor`, à partir de `main` (`cf7025b`). Le push ne met pas en service les ressources : les migrations et le déploiement restent nécessaires. Aucun changement de données distantes ni droit réel attribué à Tony dans ce lot. Aucune nouvelle variable d’environnement ; les variables Supabase existantes sont nécessaires.

Le mode d’emploi est dans [ressources-editoriales.md](../product/ressources-editoriales.md).

## Préparation et installation

1. Vérifier le projet Supabase cible et disposer d’une sauvegarde selon la procédure d’exploitation existante. Ne pas appliquer en bloc toutes les migrations du répertoire : d’autres chantiers y figurent. La migration 090 concerne les liens de mot de passe ; les ressources utilisent 091 puis 092. La branche de livraison conserve le parcours de mot de passe de `main`. À la connexion vers `/resources/manage`, elle vérifie le droit éditorial et évite de créer une compagnie pour un éditeur qui n’en a pas ; les connexions habituelles restent inchangées.
2. Confirmer la présence de la gestion des droits plateforme (SQL 044), de `company_has_access`, et du service Storage avec sa migration interne `0058-operation-ergonomics.sql` ou ultérieure. La fonction `storage.allow_only_operation(text)` doit exister. La version du serveur hébergé n’a pas été vérifiée dans ce lot.
3. Appliquer **091 puis 092**, une seule copie de chacune : `sql/091_resource_pages.sql` et `sql/092_resource_editors_and_archive.sql`, ou leurs miroirs Supabase `20261021125118_resource_pages.sql` et `20261021142515_resource_editors_and_archive.sql`. La première crée les pages, les droits/RLS, les fonctions et le compartiment privé `resource-media`. La seconde ajoute le droit éditorial indépendant et l’archivage réversible. Ne pas déployer ce lot avec seulement 091 : l’éditeur exige maintenant 092.
4. Déployer l’application avec les routes ressources et leur configuration d’en-têtes. Conserver `TADIFF_E2E_MODE` absent en production ; il sert uniquement à la vérification locale isolée.
5. Dans **Administration → Ressources**, attribuer explicitement à Tony le droit **Éditeur de ressources**. L’éditeur est dans `/resources/manage`. Les superadministrateurs conservent leur accès permanent ; aucune autre personne n’est automatiquement ajoutée par la migration. `manage_catalogs` ne suffit plus et aucun droit plateforme n’est nécessaire.

Contrôle préalable en lecture seule :

```sql
select
  to_regprocedure('public.has_platform_permission(text)') as droits_plateforme,
  to_regprocedure('public.company_has_access(uuid)') as acces_compagnie,
  to_regprocedure('storage.allow_only_operation(text)') as operations_storage;
```

Les trois résultats doivent être non nuls. Si le helper Storage manque, mettre à jour le service par la procédure supportée ; ne pas supprimer ce contrôle des policies. Référence de son comportement : [migration officielle Supabase Storage 0058](https://github.com/supabase/storage/blob/a69b0e6633b9a629e0d20d58b830d7ea0627cc83/migrations/tenant/0058-operation-ergonomics.sql).

## Recette après installation

- Avec l’éditeur autorisé : créer un brouillon, importer une image et un PDF, sauvegarder, recharger, vérifier l’aperçu téléphone, publier puis restaurer un historique en brouillon.
- Attribuer puis retirer le droit à un membre ordinaire : vérifier qu’il conserve l’accès normal à sa compagnie, ses spectacles et son rôle. Aucun droit d’administration ne doit apparaître. Après révocation, nouvelle sauvegarde, publication, import et lecture de brouillon doivent être refusés. Les pages déjà publiées restent en ligne.
- Archiver une page publiée : le lien et ses pièces jointes doivent disparaître pour ses lecteurs. Restaurer l’archive : le brouillon, ses fichiers et l’historique reviennent dans l’éditeur, sans republication automatique. Une sauvegarde depuis un onglet ouvert avant l’archivage doit échouer.
- Sans connexion : retrouver une publication publique et ses fichiers ; aucune page membre ni aucun brouillon ne doit être lisible, y compris par une adresse directe de fichier.
- Avec un membre actif : lire la page membre et télécharger son document. Vérifier aussi un lecteur d’une autre compagnie active, car la bibliothèque est commune.
- Avec un compte sans compagnie, en attente de paiement, suspendu ou expiré sans droit éditorial : refuser les contenus membres et l’édition. Un compte explicitement autorisé peut gérer la bibliothèque commune sans activer son accès au cockpit ; vérifier cette séparation via une adresse `/resources/manage` après connexion.
- Modifier la publication de public vers membres, puis la retirer : contrôler les URL HTML et fichiers connues depuis une session anonyme. Le changement de sélection seul, sans republication, conserve l’ancienne publication.
- Dans deux onglets d’édition : enregistrer le premier puis tenter d’enregistrer le second ; le deuxième doit recevoir un conflit sans écraser le premier.
- Sur le service Storage réel : vérifier que le téléchargement authentifié fonctionne pour chaque public autorisé, que les appels de création d’URL signée échouent et que les anciennes pièces jointes restent privées. Ne pas rendre le compartiment public.

## Architecture et qualification locale

`resource_pages` conserve les brouillons, `resource_publications` la version actuellement lisible, `resource_revisions` l’historique et `resource_assets` les fichiers. L’écriture de page passe par une fonction transactionnelle qui vérifie les droits, la révision attendue, les adresses uniques et l’appartenance des fichiers. Les tables de brouillons ne sont pas ouvertes aux membres ordinaires.

`resource_editors` contient uniquement les attributions éditoriales ; aucun accès direct REST n’est accordé sur cette table. Les RPC de liste exhaustive et d’attribution sont réservées au superadministrateur. Ni `profiles`, ni `companies`, ni `platform_admins` ne sont modifiés. Les autorisations sont dédupliquées avec `React.cache` uniquement pendant une requête ; les mutations SQL revérifient le droit. L’archivage retire la publication et conserve fichiers/historique. La reprise est volontairement un brouillon.

Les fichiers sont immuables et servis par `/api/resources/assets/[id]` avec vérification de session/RLS, relecture de l’autorisation après récupération, `no-store` et `nosniff`. L’application ne délivre pas d’URL signée réutilisable. Les policies Storage limitent aussi les opérations directes. La limite de 4 Mo tient compte de l’enveloppe des [requêtes et réponses Vercel Functions](https://vercel.com/docs/functions/limitations).

Les requêtes de ressources publiques renouvellent la session quand elle existe tout en restant ouvertes aux visiteurs anonymes. Les pages et fichiers ressources ne sont pas mis en cache, et les pages ne sont pas indexées afin de limiter l’exposition d’une page dont l’accès pourrait ensuite changer.

La validation locale comprend les modèles, actions serveur et imports, les policies réellement exécutées dans PostgreSQL embarqué, les composants React dans un navigateur, les parcours clavier/mobile et la compilation complète. Les services Auth/Storage sont simulés dans les tests ; aucune session de production ni concurrence PostgreSQL multi-connexion n’a été qualifiée. Le contrôle local de navigation compilée utilise uniquement des variables synthétiques, sans connexion aux services externes.

Tests ciblés : `npm run test:resources`, après `npm ci`. PostgreSQL embarqué utilise la dépendance de développement versionnée `@electric-sql/pglite` ; aucun dossier temporaire d’une autre copie n’est requis. Les tests navigateur utilisent Chrome installé (ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pour désigner Chromium). Contrôles généraux requis : lint, TypeScript, build et `check:copy`. La livraison est vérifiée dans son propre worktree, sans secrets ; la compilation utilise `TADIFF_E2E_MODE=playwright-local` et des variables Supabase synthétiques.
