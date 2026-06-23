-- ============================================================
-- マイグレーション 001: プッシュ通知 ＆ カレンダー連携
-- 既存DBに後から適用するための差分SQL。
-- Supabase の SQL Editor で実行してください。
-- ============================================================

-- 1. tasks にリマインド用カラムを追加
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remind_at   timestamptz,          -- リマインド送信予定日時（null = 通知なし）
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;          -- 実際に送信済みになった日時（二重送信防止）

-- remind_at の検索を高速化（cronで「未送信かつ期限到来」を引くため）
CREATE INDEX IF NOT EXISTS tasks_remind_at
  ON tasks (remind_at)
  WHERE remind_at IS NOT NULL AND reminded_at IS NULL;

-- 2. profiles にカレンダー購読用の秘密トークンを追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_token uuid NOT NULL DEFAULT gen_random_uuid();

-- 既存ユーザー（DEFAULT が無かった時代のレコード）にも確実にトークンを付与
UPDATE profiles SET calendar_token = gen_random_uuid() WHERE calendar_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_calendar_token ON profiles (calendar_token);

-- 3. push_subscriptions テーブル（Web Push の購読情報）
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,   -- ブラウザごとに一意な購読エンドポイント
  p256dh     text NOT NULL,          -- 暗号化用公開鍵
  auth       text NOT NULL,          -- 認証シークレット
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id ON push_subscriptions (user_id);

-- 4. RLS（自分の購読のみ操作可能。既存テーブルと同じ方針）
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push: select own" ON push_subscriptions;
DROP POLICY IF EXISTS "push: insert own" ON push_subscriptions;
DROP POLICY IF EXISTS "push: update own" ON push_subscriptions;
DROP POLICY IF EXISTS "push: delete own" ON push_subscriptions;

CREATE POLICY "push: select own" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push: insert own" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
-- upsert（同一endpointの再購読）で UPDATE 経路に入るため UPDATE ポリシーも必要
CREATE POLICY "push: update own" ON push_subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push: delete own" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- 注意:
--   cron送信処理（/api/cron/reminders）と ICS配信（/api/calendar/[token]）は
--   Service Role キーで動作するため RLS をバイパスします。
--   Service Role キーはサーバー専用環境変数 SUPABASE_SERVICE_ROLE_KEY に設定し、
--   クライアントには絶対に渡さないこと。
