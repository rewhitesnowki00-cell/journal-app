import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/web-push";

// Vercel Cron から定期実行される。リマインド期限が来た未送信タスクを通知する。
export const dynamic = "force-dynamic";

// 古すぎるリマインドは送らず握りつぶす猶予。
// Hobbyプランのcronは1日1回(0 23 * * *)なので、24時間の隙間で取りこぼさないよう
// 余裕を持たせて26時間にする（cron停止や通知後付け有効化による一斉送信は依然防ぐ）。
const GRACE_MS = 26 * 60 * 60 * 1000;

/** 定数時間で Bearer トークンを比較する（タイミング攻撃対策）。 */
function isAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  // 認可: Vercel Cron は Authorization: Bearer <CRON_SECRET> を付与する。
  if (!isAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const staleThresholdIso = new Date(now - GRACE_MS).toISOString();

  // 送信予定が到来済み(remind_at <= now) かつ 未送信 かつ 未完了 のタスク
  const { data: dueTasks, error } = await admin
    .from("tasks")
    .select("id, user_id, title, remind_at")
    .lte("remind_at", nowIso)
    .is("reminded_at", null)
    .neq("status", "完了");

  if (error) {
    // 内部スキーマを漏らさないよう汎用メッセージ
    return Response.json({ error: "internal error" }, { status: 500 });
  }
  if (!dueTasks || dueTasks.length === 0) {
    return Response.json({ sent: 0, tasks: 0 });
  }

  // 対象ユーザーの購読をまとめて取得
  const userIds = [...new Set(dueTasks.map((t) => t.user_id))];
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const subsByUser = new Map<string, NonNullable<typeof subs>>();
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  let sent = 0;
  let suppressed = 0;
  const expiredSubIds: string[] = [];
  const completedTaskIds: string[] = [];

  for (const task of dueTasks) {
    const targets = subsByUser.get(task.user_id) ?? [];
    const isStale = task.remind_at != null && new Date(task.remind_at).getTime() < now - GRACE_MS;

    // 購読が無い場合: 古ければ握りつぶす、新しければ未送信のまま残し
    // （後で通知をオンにしたときに猶予内なら受け取れるようにする）
    if (targets.length === 0) {
      if (isStale) { completedTaskIds.push(task.id); suppressed++; }
      continue;
    }

    let anyOk = false;
    for (const sub of targets) {
      const result = await sendPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: "🔔 タスクのリマインド",
          body: task.title,
          url: "/tasks",
          tag: `task-${task.id}`,
        }
      );
      if (result.ok) { sent++; anyOk = true; }
      if (result.expired) expiredSubIds.push(sub.id);
    }

    // 1件でも成功 or 古すぎる場合は送信済みフラグを立てる。
    // 全滅（一時エラー）かつ新しい場合はフラグを立てず、次スロットで再送する。
    if (anyOk || isStale) completedTaskIds.push(task.id);
  }

  if (completedTaskIds.length > 0) {
    await admin.from("tasks").update({ reminded_at: nowIso }).in("id", completedTaskIds);
  }

  // 失効した購読を掃除
  if (expiredSubIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredSubIds);
  }

  return Response.json({
    sent,
    suppressed,
    tasks: dueTasks.length,
    marked: completedTaskIds.length,
    expiredRemoved: expiredSubIds.length,
    staleBefore: staleThresholdIso,
  });
}
