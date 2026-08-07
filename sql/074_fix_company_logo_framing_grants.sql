-- 074 - Autoriser l'enregistrement du cadrage du logo compagnie
--
-- La migration 061 a ajoute ces colonnes apres que la migration 009 a
-- remplace le droit UPDATE global par des droits colonne par colonne.
-- Sans ce grant explicite, l'enregistrement du profil echoue avec 42501.

grant update (
  logo_scale,
  logo_position_x,
  logo_position_y
) on table public.companies to authenticated;
