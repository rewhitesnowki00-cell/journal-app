# Supabase 利用ガイド（引き継ぎ用）

このドキュメントは、`journal-app` が使っている Supabase（クラウドDB＋認証）を
**別のアプリや別のチャットセッションでも再利用できるように**まとめたものです。
新しいトークルームにこのファイルの内容を貼れば、そのまま引き継げます。

---

## 0. 全体像（どこに何があるか）

| もの | 場所 | 役割 |
|---|---|---|
| ユーザーのデータ（タスク・日誌・通知登録など） | **Supabase** | クラウドDB（PostgreSQL）＋認証。データの本体 |
| アプリのコード | **GitHub** + ローカルPC | `github.com/rewhitesnowki00-cell/journal-app` |
| 動いているアプリ | **Vercel** | 公開URLを配信 |

「データを別アプリでも使いたい」＝ **同じ Supabase プロジェクトに新しいアプリから接続する**、という意味になります。

---

## 1. プロジェクト接続情報

| 項目 | 値 |
|---|---|
| Project URL | `https://hekyvxoyrxaaocqivdpp.supabase.co` |
| ダッシュボード | https://supabase.com/dashboard/project/hekyvxoyrxaaocqivdpp |
| anon key（公開用） | `NEXT_PUBLIC_SUPABASE_ANON_KEY`（クライアントに埋め込んでOKな公開キー。RLSで守られる） |
| service_role key（**極秘**） | ダッシュボード → Project Settings → API → `service_role`。**絶対にチャットやフロントに貼らない** |

> 🔑 **キーの使い分け**
> - `anon key`：ブラウザ／クライアント側で使う。RLS（後述）が効くので安全。公開されても各ユーザーは自分のデータしか触れない。
> - `service_role key`：サーバー側だけで使う。RLSを**無視**して全データにアクセスできる。cron送信やICS配信のような「全ユーザー横断／Cookie認証不可」の処理でのみ使用。

---

## 2. 認証（Auth）の仕組み

- **メール＋パスワード**認証（Supabase Auth）。ユーザーは `auth.users` テーブルで管理される（Supabaseが自動管理）。
- 各データテーブルは `user_id`（= `auth.users.id`）で所有者を持つ。
- **新規登録時**、トリガー `on_auth_user_created` が自動で `profiles` に1行作る。
- 同じ Supabase プロジェクトを使う別アプリは、**同じユーザー・同じデータを共有**する（同一の `auth.users`）。

---

## 3. データベース構造（テーブル一覧）

すべて `user_id` で所有者を持ち、RLS（行レベルセキュリティ）で「自分の行だけ」アクセス可能。

### `tasks`（タスク）
| 列 | 型 | 説明 |
|---|---|---|
| id | uuid | 主キー |
| user_id | uuid | 所有者（auth.users） |
| title | text | タスク名 |
| status | enum | `未着手` / `進行中` / `完了` |
| due_date | date | 締め切り（日付のみ） |
| remind_at | timestamptz | リマインド通知の予定日時（null=通知なし） |
| reminded_at | timestamptz | 送信済み日時（二重送信防止） |
| memo | text | メモ |
| created_at / updated_at | timestamptz | 自動 |

### `conversations`（会話ログ＝日誌）
person / date / content / next_action / related_task_id（tasksへのFK）

### `profiles`（ユーザー設定）
| 列 | 説明 |
|---|---|
| id | = auth.users.id |
| calendar_token | uuid。カレンダー(ICS)購読用の秘密トークン |
| localstorage_migrated | 旧データ移行フラグ |

### `push_subscriptions`（Web Push 通知の購読）
endpoint(unique) / p256dh / auth … ブラウザの通知登録情報

### `task_links`（タスク同士の関連付け・自己多対多）
task_id / related_task_id（対称に両方向の行を保存）

### 補足
- ENUM型 `task_status`（`未着手`/`進行中`/`完了`）
- 全文検索は `pg_trgm` 拡張＋GINインデックス（日本語ILIKE検索用）
- `updated_at` は `moddatetime` トリガーで自動更新
- **完全なスキーマ定義は `supabase/schema.sql`**、差分は `supabase/migrations/*.sql` にある

---

## 4. RLS（行レベルセキュリティ）の方針

全テーブルで RLS 有効。ポリシーは一貫してこの形：

```sql
-- 自分の行だけ SELECT / INSERT / UPDATE / DELETE できる
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid())
```

→ **anon key でどれだけアクセスしても、ログイン中ユーザー自身のデータしか読み書きできない**。
新しいテーブルを足すときも、必ず `user_id` 列＋この4ポリシー＋`ENABLE ROW LEVEL SECURITY` をセットにする。

---

## 5. アプリからの接続方法（コード）

パッケージ：`@supabase/supabase-js` と `@supabase/ssr`（Next.js/SSRの場合）。

### ブラウザ側クライアント
```ts
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### サーバー側クライアント（Cookieでセッション維持）
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// cookies を渡して createServerClient(...) を作る（詳細は src/lib/supabase/server.ts 参照）
```

### 管理者クライアント（service_role・サーバー専用・RLSバイパス）
```ts
import { createClient } from "@supabase/supabase-js";
createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
// "server-only" を付けてクライアントに漏らさない（src/lib/supabase/admin.ts 参照）
```

### データ操作の例（RLSが効くのでuser_id指定は自動で守られる）
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// 取得
await supabase.from("tasks").select("*").eq("user_id", user.id);
// 追加
await supabase.from("tasks").insert({ user_id: user.id, title: "…", status: "未着手" });
```

---

## 6. 必要な環境変数（.env）

| 変数 | 公開可否 | 用途 |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 公開OK | プロジェクトURL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 公開OK | クライアント用キー |
| SUPABASE_SERVICE_ROLE_KEY | **極秘** | サーバー専用・RLSバイパス |

（このアプリ固有：VAPID鍵・CRON_SECRET などは通知/カレンダー用。別アプリで通知を使わないなら不要）

---

## 7. 別アプリでこのDBを再利用する手順（まとめ）

1. 新アプリで `@supabase/supabase-js`（＋SSRなら`@supabase/ssr`）を入れる
2. `.env` に `URL` と `anon key` を設定（service_roleはサーバー処理が必要な時だけ）
3. 上記の接続コードでクライアントを作る
4. メール＋パスワードでログイン（`supabase.auth.signInWithPassword`）
5. `supabase.from("tasks")...` などでデータ操作（RLSが自動で守る）
6. **新しい種類のデータ**が要るなら、Supabaseの SQL Editor で新テーブルを作り、
   `user_id` 列＋RLS 4ポリシーを必ずセットで付ける（§4の形をコピペ）

> ⚠️ 同じプロジェクトを使うと**ユーザーもデータも共有**される。
> 全く別物にしたい場合は、Supabaseで**新しいプロジェクト**を作るのが安全。

---

## 8. 触ってはいけない / 注意

- `service_role key` を絶対に公開しない（漏れたら全データにアクセスされる → その場合ダッシュボードでキーをローテーション）
- RLSを無効化しない（全ユーザーのデータが丸見えになる）
- ログイン情報（メール/パスワード）もチャット等に貼らない
