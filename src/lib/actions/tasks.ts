"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function createTask(data: {
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  remindAt: string | null;
  memo: string;
}) {
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: data.title,
    status: data.status,
    due_date: data.dueDate || null,
    remind_at: data.remindAt || null,
    memo: data.memo,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function updateTask(id: string, data: {
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  remindAt: string | null;
  memo: string;
}) {
  const { supabase, user } = await getUser();
  // リマインド日時が変わったら未送信状態（reminded_at = null）に戻し、再送信できるようにする
  const { error } = await supabase
    .from("tasks")
    .update({
      title: data.title,
      status: data.status,
      due_date: data.dueDate || null,
      remind_at: data.remindAt || null,
      reminded_at: null,
      memo: data.memo,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function deleteTask(id: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}

export async function getTasks() {
  const { supabase, user } = await getUser();
  const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_links")
      .select("task_id, related_task_id")
      .eq("user_id", user.id),
  ]);
  if (error) throw new Error(error.message);
  // task_links が無い/失敗してもアプリは動かす（関連は空扱い）。ただし運用のため警告は残す。
  if (linksError) console.warn("[getTasks] task_links 取得に失敗（関連を空扱い）:", linksError.message);

  // task_id -> [related_task_id...] のMapを一度だけ構築（N+1を避ける）
  const relatedMap = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = relatedMap.get(l.task_id) ?? [];
    arr.push(l.related_task_id);
    relatedMap.set(l.task_id, arr);
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as TaskStatus,
    dueDate: t.due_date,
    remindAt: t.remind_at,
    memo: t.memo ?? "",
    relatedIds: relatedMap.get(t.id) ?? [],
    createdAt: t.created_at,
  }));
}
