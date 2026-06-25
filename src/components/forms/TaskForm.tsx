"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { linkTasks, unlinkTasks } from "@/lib/actions/task-links";
import { TaskStatus, Task } from "@/lib/types";
import { Link2, X, Plus } from "lucide-react";

interface Props {
  defaultDueDate?: string;
  editTask?: Task;
  allTasks?: Task[];
  onSaved: () => void;
  onCancel: () => void;
}

// ISO日時(UTC) → datetime-local 入力値（端末ローカル時刻の "YYYY-MM-DDTHH:mm"）
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// datetime-local 入力値（ローカル時刻）→ ISO日時(UTC)
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function TaskForm({ defaultDueDate, editTask, allTasks = [], onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(editTask?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "未着手");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? defaultDueDate ?? "");
  const [remindAt, setRemindAt] = useState(isoToLocalInput(editTask?.remindAt));
  const [memo, setMemo] = useState(editTask?.memo ?? "");
  const [isPending, startTransition] = useTransition();

  // 関連タスク（編集モードのみ）。即時に link/unlink して画面を更新する。
  const [relatedIds, setRelatedIds] = useState<string[]>(editTask?.relatedIds ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const router = useRouter();

  const tasksById = new Map(allTasks.map((t) => [t.id, t]));
  const candidates = allTasks.filter(
    (t) => t.id !== editTask?.id && !relatedIds.includes(t.id) &&
      t.title.toLowerCase().includes(pickerQuery.trim().toLowerCase())
  );

  const [linkError, setLinkError] = useState<string | null>(null);

  function addLink(relatedId: string) {
    if (!editTask) return;
    setLinkError(null);
    setRelatedIds((prev) => [...prev, relatedId]); // 楽観的更新
    setPickerOpen(false);
    setPickerQuery("");
    startTransition(async () => {
      try {
        await linkTasks(editTask.id, relatedId);
        router.refresh();
      } catch {
        setRelatedIds((prev) => prev.filter((id) => id !== relatedId)); // 失敗したら戻す
        setLinkError("関連付けに失敗しました");
      }
    });
  }

  function removeLink(relatedId: string) {
    if (!editTask) return;
    setLinkError(null);
    setRelatedIds((prev) => prev.filter((id) => id !== relatedId)); // 楽観的更新
    startTransition(async () => {
      try {
        await unlinkTasks(editTask.id, relatedId);
        router.refresh();
      } catch {
        setRelatedIds((prev) => (prev.includes(relatedId) ? prev : [...prev, relatedId])); // 失敗したら戻す
        setLinkError("解除に失敗しました");
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const remindIso = localInputToIso(remindAt);
    startTransition(async () => {
      if (editTask) {
        await updateTask(editTask.id, { title: title.trim(), status, dueDate: dueDate || null, remindAt: remindIso, memo: memo.trim() });
      } else {
        await createTask({ title: title.trim(), status, dueDate: dueDate || null, remindAt: remindIso, memo: memo.trim() });
      }
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">タスク名 *</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：企画書を提出する" autoFocus />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">ステータス</label>
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option>未着手</option>
          <option>進行中</option>
          <option>完了</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">締め切り（任意）</label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">🔔 リマインド通知（任意）</label>
        <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">
          設定した日時にプッシュ通知が届きます（設定画面で通知をオンにしてください）。
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">メモ（任意）</label>
        <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="補足があれば" rows={3} className="resize-none" />
      </div>

      {/* 関連タスク（編集モードのみ） */}
      <div>
        <label className="mb-1 flex items-center gap-1 text-sm font-medium">
          <Link2 size={14} className="text-indigo-600" /> 関連タスク（任意）
        </label>
        {!editTask ? (
          <p className="text-xs text-muted-foreground">保存後に編集画面から関連付けできます。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {relatedIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {relatedIds.map((id) => {
                  const t = tasksById.get(id);
                  return (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-xs text-indigo-700">
                      <span className="max-w-[160px] truncate">{t?.title ?? "（不明なタスク）"}</span>
                      <button type="button" onClick={() => removeLink(id)} aria-label="関連を解除"
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-indigo-100">
                        <X size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {pickerOpen ? (
              <div className="rounded-xl border border-input p-2">
                <Input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="タスク名で検索…" autoFocus />
                <div className="mt-2 max-h-44 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <p className="px-1 py-3 text-center text-xs text-muted-foreground">候補がありません</p>
                  ) : (
                    candidates.map((t) => (
                      <button key={t.id} type="button" onClick={() => addLink(t.id)}
                        className="flex min-h-[44px] w-full items-center rounded-lg px-2 text-left text-sm hover:bg-muted">
                        {t.title}
                      </button>
                    ))
                  )}
                </div>
                <button type="button" onClick={() => { setPickerOpen(false); setPickerQuery(""); }}
                  className="mt-1 w-full rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted">閉じる</button>
              </div>
            ) : (
              <button type="button" onClick={() => setPickerOpen(true)}
                className="flex min-h-[44px] items-center gap-1.5 self-start rounded-full border border-dashed border-input px-3 text-sm text-muted-foreground hover:bg-muted">
                <Plus size={14} /> 関連付け
              </button>
            )}
            {linkError && <p className="text-xs text-red-500">{linkError}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">キャンセル</Button>
        <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          {isPending ? "保存中…" : editTask ? "更新する" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
