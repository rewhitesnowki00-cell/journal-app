"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function createConversation(data: {
  person: string;
  date: string;
  content: string;
  nextAction: string;
  relatedTaskId: string | null;
}) {
  const { supabase, user } = await getUser();

  // related_task_id が自分のタスクかを検証
  if (data.relatedTaskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", data.relatedTaskId)
      .eq("user_id", user.id)
      .single();
    if (!task) throw new Error("Invalid task reference");
  }

  const { error } = await supabase.from("conversations").insert({
    user_id: user.id,
    person: data.person,
    date: data.date,
    content: data.content,
    next_action: data.nextAction,
    related_task_id: data.relatedTaskId || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/search");
}

export async function deleteConversation(id: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/search");
}

export async function getConversations() {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    person: c.person,
    date: c.date,
    content: c.content,
    nextAction: c.next_action ?? "",
    relatedTaskId: c.related_task_id ?? null,
    createdAt: c.created_at,
  }));
}

export async function getPersonNames(): Promise<string[]> {
  const { supabase, user } = await getUser();
  const { data } = await supabase
    .from("conversations")
    .select("person")
    .eq("user_id", user.id);
  const names = (data ?? []).map((c) => c.person).filter(Boolean);
  return [...new Set(names)];
}

export async function searchAll(query: string, person?: string) {
  const { supabase, user } = await getUser();

  const q = `%${query}%`;

  let convQuery = supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user.id)
    .or(`content.ilike.${q},next_action.ilike.${q},person.ilike.${q}`);
  if (person) convQuery = convQuery.eq("person", person);

  const taskQuery = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .or(`title.ilike.${q},memo.ilike.${q}`);

  const [{ data: convs }, { data: tasks }] = await Promise.all([convQuery, taskQuery]);

  return {
    conversations: (convs ?? []).map((c) => ({
      id: c.id, person: c.person, date: c.date,
      content: c.content, nextAction: c.next_action ?? "",
      relatedTaskId: c.related_task_id ?? null, createdAt: c.created_at,
    })),
    tasks: (tasks ?? []).map((t) => ({
      id: t.id, title: t.title, status: t.status,
      dueDate: t.due_date, memo: t.memo ?? "", createdAt: t.created_at,
    })),
  };
}
