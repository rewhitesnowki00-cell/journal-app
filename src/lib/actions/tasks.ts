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
  memo: string;
}) {
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: data.title,
    status: data.status,
    due_date: data.dueDate || null,
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
  memo: string;
}) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("tasks")
    .update({ title: data.title, status: data.status, due_date: data.dueDate || null, memo: data.memo })
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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as TaskStatus,
    dueDate: t.due_date,
    memo: t.memo ?? "",
    createdAt: t.created_at,
  }));
}
