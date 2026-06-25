"use client";

import { useTransition } from "react";
import { Task, Conversation } from "@/lib/types";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { deleteConversation } from "@/lib/actions/conversations";
import { Trash2, ChevronRight, Link2 } from "lucide-react";
import { TaskStatus } from "@/lib/types";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<TaskStatus, string> = {
  未着手: "bg-red-50 text-red-600 border-red-200",
  進行中: "bg-yellow-50 text-yellow-700 border-yellow-200",
  完了: "bg-green-50 text-green-600 border-green-200",
};
const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  未着手: "進行中", 進行中: "完了", 完了: "未着手",
};

interface Props {
  date: string;
  tasks: Task[];
  conversations: Conversation[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onAddConversation: () => void;
}

export default function DayDetail({ date, tasks, conversations, onAddTask, onEditTask, onAddConversation }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });

  function cycleStatus(task: Task) {
    startTransition(async () => {
      await updateTaskStatus(task.id, STATUS_CYCLE[task.status]);
      router.refresh();
    });
  }

  function handleDeleteTask(id: string) {
    if (!confirm("このタスクを削除しますか？")) return;
    startTransition(async () => { await deleteTask(id); router.refresh(); });
  }

  function handleDeleteConv(id: string) {
    if (!confirm("この会話ログを削除しますか？")) return;
    startTransition(async () => { await deleteConversation(id); router.refresh(); });
  }

  return (
    <div className="flex flex-col gap-5 opacity-100 transition-opacity" style={{ opacity: isPending ? 0.6 : 1 }}>
      <h2 className="text-lg font-semibold">{label}</h2>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">📌 タスク</h3>
          <button onClick={onAddTask} className="text-xs text-indigo-600 hover:underline">+ 追加</button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">この日に締め切りのタスクはありません</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-2 rounded-lg border bg-white p-3">
                <button onClick={() => onEditTask(task)} className="min-w-0 flex-1 text-left">
                  <p className={`text-sm font-medium ${task.status === "完了" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  {task.memo && <p className="mt-1 text-xs text-muted-foreground">{task.memo}</p>}
                  {task.relatedIds.length > 0 && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Link2 size={11} /> 関連 {task.relatedIds.length} 件
                    </span>
                  )}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => cycleStatus(task)}
                    className={`flex min-h-[44px] items-center rounded-full border px-3 text-xs font-medium transition-colors ${STATUS_COLORS[task.status]}`}>
                    {task.status}
                  </button>
                  <button onClick={() => handleDeleteTask(task.id)} aria-label="削除"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">💬 会話ログ</h3>
          <button onClick={onAddConversation} className="text-xs text-indigo-600 hover:underline">+ 記録</button>
        </div>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">この日の会話記録はありません</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversations.map((conv) => (
              <li key={conv.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{conv.person}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{conv.content}</p>
                    {conv.nextAction && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600">
                        <ChevronRight size={12} /><span>{conv.nextAction}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDeleteConv(conv.id)} aria-label="削除"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
