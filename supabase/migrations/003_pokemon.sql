-- =====================================================================
-- 003_pokemon.sql
-- ポケモン対戦の「やられ記録／勝敗記録」と「自分の手持ち」を保存する。
-- 目的：選出（6→3）のときに「このポケモンは相手のこいつに何勝何敗か」を見て、
--       同じ負けを繰り返さないための判断材料にする。
-- 既存の流儀に合わせる： user_id 列 ＋ RLS 4ポリシー ＋ moddatetime トリガー。
-- Supabase の SQL Editor にこのファイルの中身を貼って実行すること。
-- =====================================================================

-- 1. pokemon_team … 自分の手持ち（基本は固定の6体。入れ替えたら足す/消す）
CREATE TABLE pokemon_team (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,                       -- ポケモン名（例：リザードン）
  active     boolean NOT NULL DEFAULT true,        -- false = 今は使ってない（記録は名前で残るので消さずに退避できる）
  sort_order integer NOT NULL DEFAULT 0,           -- 表示順
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. pokemon_battles … 1試合の結果を1行。勝率は (my_pokemon, enemy_pokemon) で集計する
CREATE TABLE pokemon_battles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  my_pokemon    text NOT NULL,                     -- 自分のポケモン名
  enemy_pokemon text NOT NULL,                     -- 相手のポケモン名
  result        text NOT NULL CHECK (result IN ('win', 'lose')),  -- 勝ち / 負け
  one_shot      boolean NOT NULL DEFAULT false,    -- 負けのとき true=一撃で落とされた / false=一発は耐えた（勝ちのときは無視）
  enemy_action  text NOT NULL DEFAULT '',          -- 相手の行動メモ（例：つるぎのまいを積んできた）
  memo          text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. インデックス
CREATE INDEX pokemon_team_user     ON pokemon_team (user_id, sort_order);
CREATE INDEX pokemon_battles_user  ON pokemon_battles (user_id, my_pokemon, enemy_pokemon);

-- 4. updated_at 自動更新（team のみ。battles は追記専用なので不要）
CREATE TRIGGER handle_updated_at_pokemon_team
  BEFORE UPDATE ON pokemon_team
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- 5. Row Level Security（自分の行だけ読み書きできる）
ALTER TABLE pokemon_team    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pk_team: select own" ON pokemon_team FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pk_team: insert own" ON pokemon_team FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pk_team: update own" ON pokemon_team FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pk_team: delete own" ON pokemon_team FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "pk_battles: select own" ON pokemon_battles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pk_battles: insert own" ON pokemon_battles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pk_battles: update own" ON pokemon_battles FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pk_battles: delete own" ON pokemon_battles FOR DELETE USING (user_id = auth.uid());
