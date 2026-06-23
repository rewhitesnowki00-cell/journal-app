"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskStatus } from "@/lib/types";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import TaskForm from "@/components/forms/TaskForm";
import { Plus, Trash2, Pencil } from "lucide-react";

const TABS: (TaskStatus | "全て")[] = ["全て", "未着手", "進行中", "完了"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  未着手: "bg-red-50 text-red-600 border-red-200",
  進行中: "bg-yellow-50 text-yellow-600 border-yellow-200",
  完了: "bg-green-50 text-green-600 border-green-200",
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  未着手: "進行中", 進行中: "完了", 完了: "未着手",
};

export default function TasksList({ initialTasks }: { initialTasks: Task[] }) {
  const [tab, setTab] = useState<TaskStatus | "全て">("全て");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const filtered = tab === "全て" ? initialTasks : initialTasks.filter((t) => t.status === tab);
  const sorted = [...filtered].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  function cycleStatus(task: Task) {
    startTransition(async () => {
      await updateTaskStatus(task.id, STATUS_CYCLE[task.status]);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("このタスクを削除しますか？")) return;
    startTransition(async () => { await deleteTask(id); router.refresh(); });
  }

  return (
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      <div className="sticky top-0 z-10 border-b bg-[#FAFAF9] px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">✅ タスク一覧</h1>
          <button onClick={() => { setEditingTask(null); setSheetOpen(true); }}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
            <Plus size={16} />追加
          </button>
        </div>
        <div className="mt-3 flex gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tab === t ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="divide-y px-4">
        {sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <p>タスクはありません</p>
            <button onClick={() => setSheetOpen(true)} className="mt-2 text-indigo-600 underline">追加する</button>
          </div>
        ) : (
          sorted.map((task) => {
            const overdue = task.dueDate && task.dueDate < today && task.status !== "完了";
            return (
              <div key={task.id} className="flex items-start gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "完了" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                  {task.dueDate && (
                    <p className={`mt-0.5 text-xs ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      締切：{task.dueDate.replace(/-/g, "/")} {overdue && "（期限超過）"}
                    </p>
                  )}
                  {task.memo && <p className="mt-0.5 text-xs text-muted-foreground">{task.memo}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => cycleStatus(task)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${STATUS_STYLES[task.status]}`}>
                    {task.status}
                  </button>
                  <button onClick={() => { setEditingTask(task); setSheetOpen(true); }} className="text-muted-foreground hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-2 pb-0">
            <SheetTitle className="text-left text-base">{editingTask ? "タスクを編集" : "タスクを追加"}</SheetTitle>
          </SheetHeader>
          <TaskForm
            editTask={editingTask ?? undefined}
            onSaved={() => { setSheetOpen(false); setEditingTask(null); router.refresh(); }}
            onCancel={() => { setSheetOpen(false); setEditingTask(null); }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
