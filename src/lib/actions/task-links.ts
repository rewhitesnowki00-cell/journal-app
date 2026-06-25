"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

/**
 * 2つのタスクを関連付ける（対称）。
 * (A→B) と (B→A) の2行を入れて、どちら側からでも関連タスクを引けるようにする。
 */
export async function linkTasks(taskId: string, relatedTaskId: string) {
  if (taskId === relatedTaskId) return;
  const { supabase, user } = await getUser();

  // 両タスクが自分のものであることを検証（RLSはuser_idしか見ないため整合性をここで担保）
  const { data: owned, error: ownErr } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [taskId, relatedTaskId]);
  if (ownErr) throw new Error(ownErr.message);
  if ((owned?.length ?? 0) !== 2) throw new Error("関連付けできるのは自分のタスクのみです");

  const { error } = await supabase.from("task_links").upsert(
    [
      { user_id: user.id, task_id: taskId, related_task_id: relatedTaskId },
      { user_id: user.id, task_id: relatedTaskId, related_task_id: taskId },
    ],
    { onConflict: "task_id,related_task_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}

/** 2つのタスクの関連付けを解除する（両方向とも削除）。 */
export async function unlinkTasks(taskId: string, relatedTaskId: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("task_links")
    .delete()
    .eq("user_id", user.id)
    .or(
      `and(task_id.eq.${taskId},related_task_id.eq.${relatedTaskId}),and(task_id.eq.${relatedTaskId},related_task_id.eq.${taskId})`
    );
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/tasks");
}
