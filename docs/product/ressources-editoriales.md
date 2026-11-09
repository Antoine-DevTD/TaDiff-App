# Ressources éditoriales de TaDiff

Implémentation du 21 octobre 2026, mise en production le 9 novembre après validation des visuels et ajout du droit éditorial indépendant demandé par l’utilisateur. L’installation utilise les migrations 091 à 094.

## Pour Tony

Depuis son espace compagnie, Tony ouvre **Gérer les pages**, ou **Ressources → Gérer les ressources**, puis **Créer une page**. L’éditeur a son propre espace dans `/resources/manage`, avec un retour direct à sa compagnie. Les anciennes adresses `/admin/resources` redirigent vers ce nouvel espace.

Le superadministrateur choisit les personnes autorisées dans **Administration → Ressources** (`/admin?tab=ressources`) : recherche par nom, email ou compagnie, puis **Autoriser l’édition**. Ce rôle donne le droit de créer, modifier, publier, retirer et archiver toutes les pages de la bibliothèque commune. Il ne change ni le compte, ni le rôle dans la compagnie, ni l’abonnement, ni les droits d’administration. **Retirer le droit** ferme l’édition sans supprimer le compte ou les pages. Les superadministrateurs gardent un accès permanent. Le droit de gestion des catalogues ne donne plus implicitement le droit d’édition.

1. Renseigner le titre, l’adresse, le résumé, la catégorie et éventuellement une image de couverture.
2. Ajouter des blocs : titre, texte, image, galerie, lien/bouton, document, vidéo YouTube/Vimeo ou deux colonnes. Les déplacer par la poignée ou les boutons monter/descendre ; le déplacement au clavier fonctionne aussi. Les colonnes peuvent avoir des largeurs égales ou une colonne plus large.
3. Sélectionner un bloc pour modifier son contenu et son fond. Les couleurs, la typographie et les espacements suivent la charte TaDiff ; aucun code à saisir.
4. Choisir **Tout le monde** ou **Membres TaDiff**, page par page. Membres signifie les personnes rattachées à une compagnie avec un accès actif, y compris les profils lecteurs. Les compagnies partagent cette bibliothèque.
5. **Enregistrer** (ou **Ctrl/⌘ + S**) conserve un brouillon privé. **Aperçu** montre le rendu ordinateur ou téléphone. **Publier** rend la page disponible pour le public choisi ; ce choix est confirmé avant publication. La barre d’actions reste accessible au défilement, avec des raccourcis vers la page, les blocs et les réglages sur petit écran.

Modifier une page publiée, y compris son accès, ne change pas la version visible avant **Publier les modifications**. **Retirer la page publiée** ferme la lecture de la page et de ses fichiers tout en gardant le brouillon. L’historique permet de restaurer un ancien brouillon sans remplacer immédiatement la publication.

Dans la liste des pages, **Archiver** retire la page et ses fichiers de la consultation, puis range le brouillon dans **Archives**. **Restaurer la page** permet de la reprendre ; elle reste en brouillon jusqu’à une nouvelle publication. L’historique et les fichiers sont conservés, sans suppression définitive.

La bibliothèque des compagnies reste dans `/resources`. Le catalogue public est dans `/ressources`, avec uniquement les pages publiques. Chaque page a une adresse `/ressources/son-adresse` ; les pages membres demandent une session autorisée. Les liens utiles du catalogue historique restent disponibles dans le cockpit.

## Fichiers et limites

- Imports : JPEG, PNG, WebP, GIF, PDF, DOCX, XLSX, CSV et TXT ; **4 Mo maximum par fichier**. Les vidéos sont intégrées depuis YouTube ou Vimeo, sans import vidéo.
- Chaque fichier appartient à sa page. Pour l’utiliser dans une autre page, l’importer à nouveau. Une description d’accessibilité est demandée pour les images des blocs.
- Les fichiers suivent la publication et son accès. Un fichier présent uniquement dans un brouillon ou une ancienne version reste réservé aux éditeurs. La médiathèque conserve ces fichiers pour permettre une restauration.
- Les pages utilisent au maximum 80 blocs et deux niveaux de colonnes. La saisie de texte est simple ; HTML, scripts et styles libres ne sont pas acceptés.
- L’enregistrement est manuel. Une sortie par un lien ou un rechargement signale les changements non enregistrés. Une fermeture forcée peut les perdre. Les conflits entre éditeurs conservent la saisie et demandent de copier les changements avant de recharger.
- Le droit éditorial ne donne accès à aucune donnée d’une autre compagnie. Il permet uniquement de gérer la bibliothèque commune. Il peut être attribué à un compte sans compagnie ; cela n’active pas son accès au cockpit.
- Une page précédemment publique peut avoir été copiée ou téléchargée par ses lecteurs. Le passage en membres protège les prochaines requêtes ; il ne retire pas les copies déjà obtenues.

Mise en service et limites de vérification : [procédure d’exploitation](../operations/ressources-editoriales-2026-10-21.md).

## Évolution du composeur — préparée localement le 9 novembre 2026

Cette évolution n’est pas encore publiée. Depuis la palette, glisser un titre, un texte, une image ou un bouton à l’emplacement voulu ; une ligne bleue indique la destination. La poignée permet aussi de passer un bloc d’une colonne à une autre. Sur écran tactile, maintenir avant de déplacer ; cliquer pour ajouter reste possible.

Les réglages du bloc proposent l’alignement, la largeur, la taille du texte, l’espacement et l’apparence des boutons, dans la palette TaDiff. Les colonnes se réorganisent sur téléphone. Au clavier, les commandes monter/descendre et **Déplacer le bloc vers** permettent de composer la page sans souris. Les droits, brouillons, publications et anciennes révisions conservent leur fonctionnement.
