# TaDiff - support visuel du webinaire

Livrables :

- `index.html` : presentation plein ecran de 20 diapositives, pilotable au clavier ;
- `TaDiff-fonctionnalites-webinaire-23-juillet-2026.pdf` : version a envoyer ;
- `assets/` : captures representatives des interfaces ;
- `previews/` : apercus de controle de chaque diapositive ;
- `parcours-webinaire.md` : conducteur detaille de la demonstration.

Commandes de la presentation :

- fleches gauche/droite ou espace : naviguer ;
- `F` : plein ecran ;
- `Home` / `End` : premiere ou derniere diapositive.

Actualiser les captures :

1. Demarrer l'application sur `http://127.0.0.1:3100` en mode demonstration.
2. Executer `node docs/presentations/webinaire-features-2026-07-23/capture-screens.mjs`.
3. Executer `node docs/presentations/webinaire-features-2026-07-23/render-presentation.mjs`.

Le script de rendu regenere les 20 apercus et le PDF. Les cadres sont positionnes
sur les captures completes, sans recadrage par `object-fit: cover`.
