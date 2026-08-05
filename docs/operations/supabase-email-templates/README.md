# Templates email Supabase Auth — TaDiff

Ces fichiers sont prêts à copier dans `Supabase > Authentication > Email Templates`.

Le bandeau utilise l'image publique :

```text
https://tadiff.com/email/tadiff-logo-email.png
```

Les deux assets disponibles après déploiement sont :

```text
https://tadiff.com/email/tadiff-logo-email.png
https://tadiff.com/email/tadiff-logo-sans-fond.png
```

## Modèles d'authentification

| Écran Supabase | Objet | Fichier |
|---|---|---|
| Confirm signup | Confirmez votre adresse email TaDiff | `confirm-signup.html` |
| Invite user | Votre accès TaDiff est prêt | `invite-user.html` |
| Magic link | Votre lien de connexion TaDiff | `magic-link.html` |
| Change email address | Confirmez votre nouvelle adresse email TaDiff | `change-email.html` |
| Reset password | Choisissez un nouveau mot de passe TaDiff | `reset-password.html` |
| Reauthentication | `{{ .Token }} est votre code de vérification TaDiff` | `reauthentication.html` |

## Notifications de sécurité

Utiliser `security-notification.html` comme base pour les notifications activées. Adapter uniquement le titre et l'objet :

- Mot de passe modifié : `Votre mot de passe TaDiff a été modifié`
- Adresse email modifiée : `L'adresse email de votre compte TaDiff a été modifiée`
- Mode de connexion ajouté : `Un mode de connexion a été ajouté à votre compte TaDiff`
- Mode de connexion retiré : `Un mode de connexion a été retiré de votre compte TaDiff`
- Méthode de vérification ajoutée : `Une méthode de vérification a été ajoutée à votre compte TaDiff`
- Méthode de vérification retirée : `Une méthode de vérification a été retirée de votre compte TaDiff`

## Contrôles

- `Site URL` : `https://tadiff.com`
- URL autorisées : `/auth/confirm`, `/auth/callback`, `/reset-password` et `/welcome` sur `https://tadiff.com`
- Expéditeur : `TaDiff <support@tadiff.com>`
- Désactiver le suivi et la réécriture des liens d'authentification.
- Tester chaque lien avec une adresse interne avant une invitation réelle.
