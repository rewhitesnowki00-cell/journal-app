import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs } from "@/lib/ics";
import { Task, TaskStatus } from "@/lib/types";

// カレンダーアプリは Cookie 認証できないため、URL の秘密トークンで本人を特定する。
// Service Role キーで RLS をバイパスして該当ユーザーのタスクを取得する。
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/calendar/[token]">
) {
  const { token } = await ctx.params;

  // UUID 形式でなければ即 404（不要なDBアクセスを避ける）
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(token)) {
    return new Response("Not found", { status: 404 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("calendar_token", token)
    .single();

  if (!profile) {
    return new Response("Not found", { status: 404 });
  }

  const { data: rows, error } = await admin
    .from("tasks")
    .select("id, title, status, due_date, remind_at, memo, created_at")
    .eq("user_id", profile.id)
    .not("due_date", "is", null);

  if (error) {
    return new Response("Internal error", { status: 500 });
  }

  const tasks: Task[] = (rows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as TaskStatus,
    dueDate: t.due_date,
    remindAt: t.remind_at,
    memo: t.memo ?? "",
    createdAt: t.created_at,
  }));

  const ics = buildIcs(tasks);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="journal-tasks.ics"',
      // 秘密トークン付きの個人データなので共有キャッシュ(public)は避ける
      "Cache-Control": "private, max-age=3600",
    },
  });
}
