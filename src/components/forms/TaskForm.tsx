"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { TaskStatus, Task } from "@/lib/types";

interface Props {
  defaultDueDate?: string;
  editTask?: Task;
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

export default function TaskForm({ defaultDueDate, editTask, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState(editTask?.title ?? "");
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? "未着手");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ?? defaultDueDate ?? "");
  const [remindAt, setRemindAt] = useState(isoToLocalInput(editTask?.remindAt));
  const [memo, setMemo] = useState(editTask?.memo ?? "");
  const [isPending, startTransition] = useTransition();

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
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">キャンセル</Button>
        <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          {isPending ? "保存中…" : editTask ? "更新する" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
