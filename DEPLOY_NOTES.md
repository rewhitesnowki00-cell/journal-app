# デプロイ手順（プッシュ通知・カレンダー連携）

新機能を本番で動かすには、コードのデプロイに加えて **手動の設定が3つ** 必要です。

## 1. Supabase にマイグレーションを適用

Supabase ダッシュボード → SQL Editor を開き、
`supabase/migrations/001_notifications_calendar.sql` の中身を貼り付けて実行する。

これで `tasks.remind_at` / `reminded_at`、`profiles.calendar_token`、
`push_subscriptions` テーブルと RLS が作成されます。

## 2. Service Role キーを取得して環境変数に設定

Supabase ダッシュボード → Project Settings → API → `service_role` secret をコピー。

- ローカル: `.env.local` の `SUPABASE_SERVICE_ROLE_KEY=` に貼る
- 本番: Vercel → Project → Settings → Environment Variables に追加

## 3. Vercel に環境変数を登録

`.env.local` にある以下を Vercel の Environment Variables にも登録する：

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ブラウザの購読（公開鍵） |
| `VAPID_PUBLIC_KEY` | 送信時の公開鍵 |
| `VAPID_PRIVATE_KEY` | 送信時の秘密鍵（非公開） |
| `VAPID_SUBJECT` | 連絡先 mailto: |
| `CRON_SECRET` | cron 認可シークレット（本番用に長いランダム値へ変更推奨） |
| `SUPABASE_SERVICE_ROLE_KEY` | RLSバイパス（非公開） |

> `CRON_SECRET` を Vercel に登録すると、Vercel Cron が自動で
> `Authorization: Bearer <CRON_SECRET>` を付けて `/api/cron/reminders` を叩きます。

## 4. デプロイ

`git push`（Vercel 自動デプロイ）。`vercel.json` の cron 設定で15分ごとに
リマインダー送信が走ります。

> ⚠️ Vercel Cron の実行頻度は **Hobby プランだと1日1回** に制限されます。
> 15分間隔で動かすには Pro プランが必要です。Hobby のままなら、
> リマインドは「1日1回の決まった時刻にまとめて送る」運用に切り替えるのが現実的です。

## 動作確認

- **カレンダー**: 設定画面の購読URLをブラウザで開き、`BEGIN:VCALENDAR` が返るか確認。
  Google「URLで追加」/ Apple「カレンダー購読」に貼って反映を確認。
- **通知**: 設定画面で「通知をオンにする」→ タスクにリマインド日時（数分後）を設定 →
  cron 実行（または手動で `curl -H "Authorization: Bearer <CRON_SECRET>" .../api/cron/reminders`）で通知が届くか確認。
- **iPhone**: Safari で「ホーム画面に追加」→ 追加したアイコンから開いて通知をオンにする
  （iOS は PWA 化しないと Web Push が使えません）。
