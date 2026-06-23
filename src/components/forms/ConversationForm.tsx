"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createConversation } from "@/lib/actions/conversations";
import { Mic } from "lucide-react";

interface Props {
  defaultDate?: string;
  personNames: string[];
  tasks: { id: string; title: string }[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function ConversationForm({ defaultDate, personNames, tasks, onSaved, onCancel }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [person, setPerson] = useState("");
  const [date, setDate] = useState(defaultDate ?? today);
  const [content, setContent] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [relatedTaskId, setRelatedTaskId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = personNames.filter((n) => n.toLowerCase().includes(person.toLowerCase()) && n !== person);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!person.trim() || !content.trim()) return;
    startTransition(async () => {
      await createConversation({
        person: person.trim(), date, content: content.trim(),
        nextAction: nextAction.trim(), relatedTaskId: relatedTaskId || null,
      });
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <div className="relative">
        <label className="mb-1 block text-sm font-medium">相手の名前 *</label>
        <Input value={person} onChange={(e) => { setPerson(e.target.value); setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="田中さん" autoComplete="off" />
        {showSuggestions && filtered.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md">
            {filtered.map((name) => (
              <li key={name} className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
                onMouseDown={() => { setPerson(name); setShowSuggestions(false); }}>{name}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">日付</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">話した内容 *</label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="どんな内容を話しましたか？" rows={4} className="resize-none" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">次のアクション（自分がやること）</label>
        <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="例：資料を金曜までに送る" />
      </div>
      {tasks.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">関連タスク（任意）</label>
          <select value={relatedTaskId} onChange={(e) => setRelatedTaskId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">選択しない</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      )}
      <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground"
        onClick={() => alert("音声入力機能は近日追加予定です")}>
        <Mic size={16} /> 音声から入力（準備中）
      </button>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">キャンセル</Button>
        <Button type="submit" disabled={isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
