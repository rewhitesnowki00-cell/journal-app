"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/lib/actions/tasks";
import { TaskStatus } from "@/lib/types";

interface Props {
  defaultDueDate?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function TaskForm({ defaultDueDate, onSaved, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("未着手");
  const [dueDate, setDueDate] = useState(defaultDueDate ?? "");
  const [memo, setMemo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await createTask({ title: title.trim(), status, dueDate: dueDate || null, memo: memo.trim() });
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
        <label className="mb-1 block text-sm font-medium">メモ（任意）</label>
        <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="補足があれば" rows={3} className="resize-none" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">キャンセル</Button>
        <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
