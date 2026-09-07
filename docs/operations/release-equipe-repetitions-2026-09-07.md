# Publication équipe, répétitions et matériel — 7 septembre 2026

Périmètre autorisé : équipe des spectacles, sondages de répétitions, réponse publique, confirmation dans l’agenda, matériel et recherche de contact dans le formulaire d’exploitation.

La recherche filtre nom, structure et email sans tenir compte des accents ni de la casse. Elle conserve la sélection lors d’un filtrage et évite de répéter une structure identique au nom du contact. Les caractères déjà corrompus dans les données importées ne sont pas réparés par ce changement.

Migrations 080, 081 et 082 déclarées appliquées en production par l’utilisateur. Existence des six tables principales vérifiée via une lecture sans données. Aucune migration exécutée pendant cette publication.

Vérifications sur une copie isolée du contenu préparé pour le commit : TypeScript, lint, copie française, build, six tests unitaires ciblés et test Chrome du filtre (recherche, aucun résultat, sélection conservée, clavier, largeur mobile).

Les tests précédents de matériel avec Supabase local ne sont pas rejoués contre la production. Aucun email de rappel envoyé pendant les contrôles. La route des rappels est incluse, mais aucune nouvelle planification automatique n’est activée dans ce lot ; elle nécessite un ordonnanceur et `CRON_SECRET`. L’envoi manuel distant utilise `RESEND_API_KEY` et, facultativement, `MATERIAL_REMINDER_FROM`.

Exclus : Google/Gmail, données et scripts de prospection, imports de contacts, restauration des sauvegardes et autres changements locaux hors périmètre. Les fichiers de travail non commités sont conservés.
