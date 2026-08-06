# Observation des parcours compagnie

## Finalité

La console plateforme doit aider TaDiff à comprendre l'adoption du produit et les étapes où les compagnies s'arrêtent, afin d'améliorer l'accompagnement. Elle ne doit pas devenir un moyen de consulter leur travail.

## Données visibles

- volumes agrégés : spectacles, contacts, lieux, dates, actions, documents, dossiers, frais et mouvements ;
- nombre de membres et niveau de complétion du profil ;
- espaces consultés au cours des 30 derniers jours ;
- jours actifs, pages vues et dates de dernière activité ;
- nombre de demandes William, sans question ni réponse.

## Données exclues

- noms et coordonnées des contacts ;
- montants, budgets, tarifs et soldes ;
- titres ou contenu des documents ;
- texte des emails, notes, actions et questions William ;
- détails de navigation, IP et appareil dans la vue de parcours.

Les journaux techniques éventuellement accessibles ailleurs conservent leur finalité de sécurité et ne doivent pas être mélangés à l'analyse produit.

## Accès et conservation

La lecture globale passe exclusivement par une RPC protégée par le droit `view_companies`. Les données restent calculées à la demande ; aucune copie du contenu métier n'est créée. Les événements d'accès doivent conserver une durée limitée et être mentionnés dans l'information RGPD.
