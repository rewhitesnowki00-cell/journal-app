"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * ログイン中ユーザーのカレンダー購読トークンを取得する。
 * 設定画面で購読URLを組み立てるために使う。
 */
export async function getCalendarToken(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .select("calendar_token")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  return data.calendar_token as string;
}

/**
 * カレンダー購読トークンを再発行する。
 * URLが漏洩した場合に古いURLを無効化するために使う（古い購読はリンク切れになる）。
 */
export async function regenerateCalendarToken(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .update({ calendar_token: crypto.randomUUID() })
    .eq("id", user.id)
    .select("calendar_token")
    .single();
  if (error) throw new Error(error.message);
  return data.calendar_token as string;
}
