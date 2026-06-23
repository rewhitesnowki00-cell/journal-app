-- 1. 拡張機能
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. ENUM型
CREATE TYPE task_status AS ENUM ('未着手', '進行中', '完了');

-- 3. tasks テーブル
CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  status      task_status NOT NULL DEFAULT '未着手',
  due_date    date,
  remind_at   timestamptz,           -- リマインド送信予定日時（null = 通知なし）
  reminded_at timestamptz,           -- 送信済み日時（二重送信防止）
  memo        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 4. conversations テーブル
CREATE TABLE conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person          text NOT NULL,
  date            date NOT NULL,
  content         text NOT NULL,
  next_action     text NOT NULL DEFAULT '',
  related_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. profiles テーブル（移行フラグ ＆ カレンダー購読トークン）
CREATE TABLE profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  localstorage_migrated boolean NOT NULL DEFAULT false,
  calendar_token        uuid NOT NULL DEFAULT gen_random_uuid()  -- ICS購読用の秘密トークン
);

-- 5b. push_subscriptions テーブル（Web Push 購読情報）
CREATE TABLE push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. インデックス
CREATE INDEX tasks_user_id_due_date    ON tasks (user_id, due_date);
CREATE INDEX tasks_remind_at           ON tasks (remind_at) WHERE remind_at IS NOT NULL AND reminded_at IS NULL;
CREATE INDEX conversations_user_id_date ON conversations (user_id, date);
CREATE INDEX conversations_person       ON conversations (user_id, person);
CREATE UNIQUE INDEX profiles_calendar_token ON profiles (calendar_token);
CREATE INDEX push_subscriptions_user_id ON push_subscriptions (user_id);

-- 全文検索（pg_trgm、日本語ILIKE用）
CREATE INDEX conversations_content_trgm ON conversations
  USING gin((
    COALESCE(content, '') || ' ' ||
    COALESCE(next_action, '') || ' ' ||
    COALESCE(person, '')
  ) gin_trgm_ops);

CREATE INDEX tasks_title_trgm ON tasks
  USING gin((COALESCE(title, '') || ' ' || COALESCE(memo, '')) gin_trgm_ops);

-- 7. updated_at 自動更新トリガー
CREATE TRIGGER handle_updated_at_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_conversations
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- 8. Row Level Security
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- tasks ポリシー
CREATE POLICY "tasks: select own"  ON tasks FOR SELECT  USING (user_id = auth.uid());
CREATE POLICY "tasks: insert own"  ON tasks FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks: update own"  ON tasks FOR UPDATE  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks: delete own"  ON tasks FOR DELETE  USING (user_id = auth.uid());

-- conversations ポリシー
CREATE POLICY "convs: select own"  ON conversations FOR SELECT  USING (user_id = auth.uid());
CREATE POLICY "convs: insert own"  ON conversations FOR INSERT  WITH CHECK (user_id = auth.uid());
CREATE POLICY "convs: update own"  ON conversations FOR UPDATE  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "convs: delete own"  ON conversations FOR DELETE  USING (user_id = auth.uid());

-- profiles ポリシー
CREATE POLICY "profiles: select own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: insert own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: update own" ON profiles FOR UPDATE USING (id = auth.uid());

-- push_subscriptions ポリシー
CREATE POLICY "push: select own" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push: insert own" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push: update own" ON push_subscriptions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push: delete own" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- 9. 新規ユーザー登録時に profiles を自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
