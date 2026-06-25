-- ============================================================
-- マイグレーション 002: タスク同士の関連付け
-- 既存DBに後から適用するための差分SQL。Supabase の SQL Editor で実行してください。
-- 冪等（IF NOT EXISTS / DROP POLICY IF EXISTS）なので再実行しても安全。
-- ============================================================

-- 自己多対多の関連テーブル
CREATE TABLE IF NOT EXISTS task_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  related_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, related_task_id),   -- 同じ組み合わせの重複防止
  CHECK (task_id <> related_task_id)    -- 自分自身へのリンク防止
);

CREATE INDEX IF NOT EXISTS task_links_task_id ON task_links (task_id);
CREATE INDEX IF NOT EXISTS task_links_user_id ON task_links (user_id);

-- RLS（自分のリンクのみ操作可能。既存テーブルと同じ方針）
ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_links: select own" ON task_links;
DROP POLICY IF EXISTS "task_links: insert own" ON task_links;
DROP POLICY IF EXISTS "task_links: delete own" ON task_links;

CREATE POLICY "task_links: select own" ON task_links FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "task_links: insert own" ON task_links FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "task_links: delete own" ON task_links FOR DELETE USING (user_id = auth.uid());

-- 注意:
--   対称的な関連にするため、アプリ側では1つの関連付けにつき
--   (A→B) と (B→A) の2行を挿入し、解除時は両方削除する。
--   これにより読み取りは `where task_id = X` だけで関連タスクを引ける。
