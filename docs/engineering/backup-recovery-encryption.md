# Sauvegardes, restauration et chiffrement TaDiff

Statut : architecture cible, non encore branchée en production.

## Objectif

TaDiff doit pouvoir reconstruire les données d'une compagnie après une suppression, un bug majeur ou une compromission, sans dépendre d'une seule plateforme. Une sauvegarde n'est considérée comme fiable que si sa restauration a été testée.

## Architecture 3-2-1

1. Données actives dans Supabase Postgres et documents privés dans Supabase Storage ou Cloudflare R2.
2. Sauvegardes et mécanismes de rétention des fournisseurs.
3. Archive indépendante, chiffrée avant transfert, dans un Google Drive partagé appartenant à TaDiff.

L'archive hors site contient :

- un export logique des tables applicatives et la version du schéma ;
- le manifeste des migrations ;
- une copie des objets Supabase Storage et R2 ;
- un manifeste des fichiers, tailles et empreintes SHA-256 ;
- les identifiants nécessaires pour reconstruire les appartenances aux compagnies, jamais les mots de passe.

## Console administrateur

La console affichera la date, le statut, la taille, le nombre d'objets, l'empreinte et la destination de chaque sauvegarde. Elle permettra un déclenchement manuel et signalera toute exécution manquante ou en échec.

Le traitement s'exécute côté serveur avec un compte technique limité à un dossier de Drive partagé. Le navigateur ne reçoit aucune clé ni donnée d'archive.

Rétention cible initiale : 7 sauvegardes quotidiennes, 4 hebdomadaires et 6 mensuelles. La durée doit rester cohérente avec les engagements RGPD et la suppression des comptes.

## Chiffrement des sauvegardes

Chaque archive est chiffrée avant de quitter le processus de sauvegarde. Le processus courant ne possède que la clé publique de chiffrement. La clé privée de récupération est conservée séparément de Vercel, Supabase, Cloudflare et Google Drive, dans un coffre-fort professionnel avec une copie d'urgence hors ligne.

Les algorithmes retenus doivent être standards et authentifiés : `age` avec Curve25519 ou AES-256-GCM via une bibliothèque maintenue. Aucun algorithme maison et aucune clé dans le dépôt.

## Restauration

Une restauration complète ne remplace jamais directement la production :

1. vérifier la signature et les empreintes de l'archive ;
2. déchiffrer avec la clé de récupération ;
3. restaurer dans un nouveau projet isolé ;
4. contrôler schéma, volumes, relations et fichiers ;
5. effectuer les tests multi-compagnie ;
6. révoquer les anciennes sessions et secrets compromis ;
7. faire confirmer le basculement par deux validations administratives ;
8. conserver le journal d'incident et de restauration.

Une restauration ciblée par compagnie devra passer par un environnement temporaire afin de reconstruire proprement les relations sans écraser les données récentes des autres compagnies.

## Chiffrement des documents actifs

Le chiffrement fournisseur protège les supports physiques, mais pas un attaquant qui disposerait d'identifiants applicatifs valides. La cible renforcée utilise une clé aléatoire par document :

- une DEK chiffre le fichier avec AES-256-GCM avant son stockage ;
- une KEK conservée dans un gestionnaire de clés chiffre la DEK ;
- le stockage reçoit le fichier chiffré, la DEK chiffrée, la version de clé et le nonce ;
- TaDiff ne demande le déchiffrement qu'après contrôle de l'utilisateur et de la compagnie.

Cette évolution impose que les aperçus et téléchargements passent par TaDiff. Elle nécessite une stratégie de rotation, de récupération et de migration progressive des documents existants.

## Limites

Le chiffrement protège le contenu si le fichier chiffré fuit sans sa clé. Il ne protège pas une session autorisée compromise, un document déjà ouvert, une pièce jointe envoyée par email ou les métadonnées laissées en clair. Toute violation doit donc rester documentée et évaluée selon le RGPD.

## Ordre de livraison

1. sauvegarde chiffrée de la base et des objets vers Drive ;
2. supervision et alertes administrateur ;
3. exercice de restauration complet ;
4. rétention protégée des objets ;
5. chiffrement applicatif des nouveaux documents ;
6. migration des documents existants ;
7. chiffrement ciblé des champs de base réellement sensibles après étude des contraintes de recherche et de tri.
