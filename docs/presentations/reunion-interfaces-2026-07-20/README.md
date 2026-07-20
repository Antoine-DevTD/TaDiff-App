# Présentation TaDiff - revue des interfaces

Ouvrir `index.html` dans Chrome ou Edge.

Commandes :

- flèches gauche/droite ou espace : naviguer ;
- `F` : plein écran ;
- `N` : afficher les notes orales ;
- `Home` / `End` : début / fin.

Pour actualiser les captures après un changement de l'application :

1. démarrer TaDiff en mode démonstration sur le port 3100 ;
2. exécuter `node docs/presentations/reunion-interfaces-2026-07-20/capture-screens.mjs`.

Le support utilise les données locales de démonstration. La console superadmin n'est volontairement pas capturée : elle exige un vrai compte autorisé et ne doit pas être simulée dans une présentation produit.

Pour régénérer le PDF et les aperçus de contrôle :

`node docs/presentations/reunion-interfaces-2026-07-20/render-presentation.mjs`
