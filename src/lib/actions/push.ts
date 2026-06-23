"use server";

import { createClient } from "@/lib/supabase/server";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * ブラウザの PushSubscription を保存する。
 * 同じ endpoint が既にあれば鍵を更新（upsert）。
 */
export async function saveSubscription(sub: PushSubscriptionJSON) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" }
    );
  if (error) throw new Error(error.message);
}

/** 購読解除時に該当 endpoint を削除する。 */
export async function deleteSubscription(endpoint: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
