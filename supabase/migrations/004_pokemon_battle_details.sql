-- =====================================================================
-- 004_pokemon_battle_details.sql
-- 対戦記録に「とどめの技」「相手の持ち物」を追加する。
-- 003_pokemon.sql 実行済みのDBに対して、Supabase の SQL Editor で実行すること。
-- =====================================================================

ALTER TABLE pokemon_battles
  ADD COLUMN enemy_move text NOT NULL DEFAULT '',  -- 何の技でやられたか（負けのときのみ意味を持つ）
  ADD COLUMN enemy_item text NOT NULL DEFAULT '';  -- 相手の持ち物（わかったときだけ入力）
