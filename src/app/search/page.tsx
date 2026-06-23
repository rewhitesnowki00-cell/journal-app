"use client";

import { useState, useTransition } from "react";
import { Task, Conversation } from "@/lib/types";
import { searchAll } from "@/lib/actions/conversations";
import { getPersonNames } from "@/lib/actions/conversations";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect } from "react";

type Result =
  | { type: "task"; item: Task }
  | { type: "conversation"; item: Conversation };

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 text-foreground rounded-sm px-0.5">{part}</mark>
    ) : part
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [personNames, setPersonNames] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // 人名リストを初回ロード
  useEffect(() => {
    getPersonNames().then(setPersonNames);
  }, []);

  // クエリ or 人名が変わるたびに検索（300ms debounce）
  useEffect(() => {
    if (!query.trim() && !person) { setResults([]); return; }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const { tasks, conversations } = await searchAll(query, person || undefined);
        const r: Result[] = [
          ...tasks.map((t) => ({ type: "task" as const, item: t })),
          ...conversations.map((c) => ({ type: "conversation" as const, item: c })),
        ];
        setResults(r);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, person]);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b bg-[#FAFAF9] px-4 py-3">
        <h1 className="mb-3 text-base font-semibold">🔍 検索</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="キーワードで検索..." className="pl-9" autoFocus />
        </div>
        {personNames.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button onClick={() => setPerson("")}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                !person ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
              }`}>全員</button>
            {personNames.map((name) => (
              <button key={name} onClick={() => setPerson(person === name ? "" : name)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  person === name ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                }`}>{name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2">
        {!query.trim() && !person ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            キーワードを入力するか、人名で絞り込んでください
          </p>
        ) : isPending ? (
          <p className="py-16 text-center text-sm text-muted-foreground">検索中…</p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            「{query || person}」に一致する記録はありません
          </p>
        ) : (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">{results.length}件</p>
            <div className="flex flex-col gap-2">
              {results.map((r, i) => {
                if (r.type === "task") {
                  const t = r.item;
                  return (
                    <div key={i} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">✅</span>
                        <div>
                          <p className="text-sm font-medium">{highlight(t.title, query)}</p>
                          {t.dueDate && <p className="text-xs text-muted-foreground">締切：{t.dueDate.replace(/-/g, "/")}</p>}
                          {t.memo && <p className="mt-1 text-xs text-muted-foreground">{highlight(t.memo, query)}</p>}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const c = r.item;
                  return (
                    <div key={i} className="rounded-lg border bg-white p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 text-xs">💬</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{highlight(c.person, query)}</span>
                            <span className="text-xs text-muted-foreground">{c.date.replace(/-/g, "/")}</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{highlight(c.content, query)}</p>
                          {c.nextAction && (
                            <p className="mt-1 text-xs text-indigo-600">→ {highlight(c.nextAction, query)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
