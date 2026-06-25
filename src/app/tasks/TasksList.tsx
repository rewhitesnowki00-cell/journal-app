"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Task, TaskStatus } from "@/lib/types";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import TaskForm from "@/components/forms/TaskForm";
import { useLongPress } from "@/hooks/useLongPress";
import { Plus, Trash2, Pencil, Bell, Link2, MoreVertical, ArrowRight } from "lucide-react";

const TABS: (TaskStatus | "全て")[] = ["全て", "未着手", "進行中", "完了"];

const STATUS_STYLES: Record<TaskStatus, string> = {
  未着手: "bg-red-50 text-red-600 border-red-200",
  進行中: "bg-yellow-50 text-yellow-700 border-yellow-200",
  完了: "bg-green-50 text-green-600 border-green-200",
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  未着手: "進行中", 進行中: "完了", 完了: "未着手",
};

function TaskRow({
  task, today, onEdit, onActions, onCycle,
}: {
  task: Task;
  today: string;
  onEdit: (t: Task) => void;
  onActions: (t: Task) => void;
  onCycle: (t: Task) => void;
}) {
  // 行タップ＝編集、長押し＝アクションシート
  const press = useLongPress({ onTap: () => onEdit(task), onLongPress: () => onActions(task) });
  const overdue = task.dueDate && task.dueDate < today && task.status !== "完了";
  const stopDown = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      {...press}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}（タップで編集）`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(task); }
      }}
      className="-mx-4 flex cursor-pointer select-none items-start gap-3 px-4 py-3 outline-none [touch-action:manipulation] focus-visible:bg-muted/40 active:bg-muted/40"
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.status === "完了" ? "text-muted-foreground line-through" : ""}`}>{task.title}</p>
        {task.dueDate && (
          <p className={`mt-0.5 text-xs ${overdue ? "font-medium text-red-500" : "text-muted-foreground"}`}>
            締切：{task.dueDate.replace(/-/g, "/")} {overdue && "（期限超過）"}
          </p>
        )}
        {task.remindAt && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-indigo-600">
            <Bell size={11} />
            {new Date(task.remindAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {task.relatedIds.length > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Link2 size={11} /> 関連 {task.relatedIds.length} 件
          </p>
        )}
        {task.memo && <p className="mt-0.5 text-xs text-muted-foreground">{task.memo}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onPointerDown={stopDown}
          onClick={(e) => { e.stopPropagation(); onCycle(task); }}
          className={`flex min-h-[44px] items-center rounded-full border px-3 text-xs font-medium transition-colors ${STATUS_STYLES[task.status]}`}
        >
          {task.status}
        </button>
        <button
          onPointerDown={stopDown}
          onClick={(e) => { e.stopPropagation(); onActions(task); }}
          aria-label="操作メニュー"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}

export default function TasksList({ initialTasks }: { initialTasks: Task[] }) {
  const [tab, setTab] = useState<TaskStatus | "全て">("全て");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [actionTask, setActionTask] = useState<Task | null>(null);
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

  function openEdit(task: Task) {
    setEditingTask(task);
    setSheetOpen(true);
  }

  return (
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-[#FAFAF9]/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">✅ タスク一覧</h1>
          <button onClick={() => { setEditingTask(null); setSheetOpen(true); }}
            className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-transform hover:bg-indigo-700 active:scale-95">
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
          sorted.map((task) => (
            <TaskRow key={task.id} task={task} today={today} onEdit={openEdit} onActions={setActionTask} onCycle={cycleStatus} />
          ))
        )}
      </div>
      {sorted.length > 0 && (
        <p className="px-4 pt-3 text-center text-[11px] text-muted-foreground">
          タップで編集／長押しでメニュー
        </p>
      )}

      {/* 追加・編集シート */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pb-0 pt-2">
            <SheetTitle className="text-left text-base">{editingTask ? "タスクを編集" : "タスクを追加"}</SheetTitle>
          </SheetHeader>
          <TaskForm
            editTask={editingTask ?? undefined}
            allTasks={initialTasks}
            onSaved={() => { setSheetOpen(false); setEditingTask(null); router.refresh(); }}
            onCancel={() => { setSheetOpen(false); setEditingTask(null); }}
          />
        </SheetContent>
      </Sheet>

      {/* 長押し／⋯ のアクションシート */}
      <Sheet open={actionTask !== null} onOpenChange={(open) => { if (!open) setActionTask(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="px-4 pb-0 pt-2">
            <SheetTitle className="truncate text-left text-base">{actionTask?.title}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 p-4">
            <button
              onClick={() => { const t = actionTask!; setActionTask(null); openEdit(t); }}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border p-4 text-left transition active:scale-[0.98] hover:bg-muted">
              <Pencil size={18} className="text-indigo-600" /> 編集
            </button>
            <button
              onClick={() => { const t = actionTask!; setActionTask(null); cycleStatus(t); }}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border p-4 text-left transition active:scale-[0.98] hover:bg-muted">
              <ArrowRight size={18} className="text-indigo-600" />
              ステータスを進める（{actionTask ? `${actionTask.status} → ${STATUS_CYCLE[actionTask.status]}` : ""}）
            </button>
            <button
              onClick={() => { const t = actionTask!; setActionTask(null); handleDelete(t.id); }}
              className="flex min-h-[56px] items-center gap-3 rounded-xl border border-destructive/20 p-4 text-left text-destructive transition active:scale-[0.98] hover:bg-destructive/10">
              <Trash2 size={18} /> 削除
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
