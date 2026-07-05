# Gestion billing des compagnies (migration 009)

Depuis `009_billing_status_roles.sql`, chaque compagnie porte :

- `billing_status` : `trial` (defaut), `active`, `comped`, `past_due`, `cancelled` ;
- `plan_code` : code du plan (`beta` par defaut, prix beta valide : 19,99 EUR) ;
- `comped_until` : date de fin du compte offert (null = sans limite) ;
- `billing_notes` : note libre interne (pourquoi ce statut, qui a decide).

Ces colonnes ne sont **pas modifiables depuis le client** (privileges colonne revoques).
Elles se changent uniquement via le SQL editor Supabase (service role), ou plus tard
via le webhook Stripe.

L'acces produit se calcule avec `public.company_has_access(company_id)` :
`trial` et `active` ont acces ; `comped` a acces tant que `comped_until` est null ou future ;
`past_due` et `cancelled` n'ont pas acces.

## Trouver l'id d'une compagnie

```sql
select c.id, c.name, c.billing_status, c.plan_code, c.comped_until, p.full_name
from public.companies c
left join public.profiles p on p.company_id = c.id
order by c.created_at desc;
```

## Marquer une compagnie offerte (beta / partenaire)

```sql
-- Offert sans limite (ex : compagnie de Tony)
update public.companies
set billing_status = 'comped',
    comped_until = null,
    billing_notes = 'Compte partenaire - offert par decision Titouan/Tony le 2026-07-05'
where id = '<company_id>';

-- Offert jusqu'a une date (ex : fin de beta)
update public.companies
set billing_status = 'comped',
    comped_until = '2026-09-06',
    billing_notes = 'Beta gratuite jusqu au lancement officiel'
where id = '<company_id>';
```

## Activer un abonnement payant (manuel, avant Stripe)

```sql
update public.companies
set billing_status = 'active',
    plan_code = 'beta',
    billing_notes = 'Beta 19,99 EUR - paiement suivi manuellement'
where id = '<company_id>';
```

## Suspendre ou resilier

```sql
update public.companies
set billing_status = 'past_due',
    billing_notes = 'Paiement en retard depuis le <date>'
where id = '<company_id>';

update public.companies
set billing_status = 'cancelled',
    billing_notes = 'Resiliation demandee le <date>'
where id = '<company_id>';
```

## Changer le role d'un utilisateur

Les roles valides : `owner`, `admin`, `member`, `readonly`.
Un utilisateur ne peut pas changer son propre role depuis l'application.

```sql
update public.profiles
set role = 'readonly'
where id = '<user_id>';
```

## Verifier l'acces d'une compagnie

```sql
select public.company_has_access('<company_id>');
```
