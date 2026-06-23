import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service Role キーを使う管理用クライアント。
 * RLS をバイパスして全ユーザーのデータにアクセスできる。
 *
 * ⚠️ サーバー専用。"server-only" により、誤ってクライアントバンドルに
 * 取り込まれるとビルドエラーになる。cron送信 / ICS配信 など、
 * 「Cookie認証できない or 全ユーザー横断」処理でのみ使用すること。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercel / .env.local に設定してください。"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
