-- =====================================================================
-- 005_pokemon_moved_first.sql
-- 対戦記録に「先手だったか後攻だったか」を追加する。
-- true = 先手（自分が先に動けた） / false = 後攻 / NULL = 未記録
-- Supabase の SQL Editor で実行すること。
-- =====================================================================

ALTER TABLE pokemon_battles
  ADD COLUMN moved_first boolean;
