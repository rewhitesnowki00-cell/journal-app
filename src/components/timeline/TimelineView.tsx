"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Task, Conversation } from "@/lib/types";
import DayDetail from "./DayDetail";
import ConversationForm from "@/components/forms/ConversationForm";
import TaskForm from "@/components/forms/TaskForm";
import { Plus, MessageSquarePlus, ListPlus } from "lucide-react";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getDateRange(days: number): string[] {
  const dates: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() - Math.floor(days / 2));
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

interface Props {
  tasks: Task[];
  conversations: Conversation[];
  personNames: string[];
}

export default function TimelineView({ tasks, conversations, personNames }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [dates] = useState(() => getDateRange(60));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<"detail" | "add-task" | "add-conv" | "fab">("detail");
  const [sheetOpen, setSheetOpen] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  function openDetail(date: string) { setSelectedDate(date); setSheetMode("detail"); setSheetOpen(true); }
  function openFab() { setSelectedDate(today); setSheetMode("fab"); setSheetOpen(true); }

  const dayTasks = (date: string) => tasks.filter((t) => t.dueDate === date);
  const dayConvs = (date: string) => conversations.filter((c) => c.date === date);
  const activeTasks = tasks.filter((t) => t.status !== "完了");

  function afterSave() { setSheetOpen(false); router.refresh(); }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-[#FAFAF9] px-4 py-3">
        <h1 className="text-base font-semibold">📅 タイムライン</h1>
        <button onClick={openFab}
          className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-transform">
          <Plus size={16} />追加
        </button>
      </div>

      <div className="divide-y">
        {dates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const dayTasks_ = dayTasks(date);
          const dayConvs_ = dayConvs(date);
          const hasContent = dayTasks_.length > 0 || dayConvs_.length > 0;
          const isToday = date === today;
          const isPast = date < today;
          if (!hasContent && !isToday) return null;

          return (
            <div key={date} ref={isToday ? todayRef : undefined}
              onClick={() => openDetail(date)}
              className={`flex cursor-pointer gap-4 px-4 py-3 transition-colors hover:bg-white ${isToday ? "bg-indigo-50/70" : ""}`}>
              <div className="w-12 shrink-0 text-center">
                <div className={`text-xs ${isPast && !isToday ? "text-muted-foreground" : ""} ${isToday ? "text-indigo-600" : ""}`}>
                  {d.getMonth() + 1}/{d.getDate()}
                </div>
                <div className={`text-xs font-medium ${d.getDay() === 0 ? "text-red-500" : d.getDay() === 6 ? "text-blue-500" : ""} ${isToday ? "text-indigo-600" : "text-muted-foreground"}`}>
                  {DAY_LABELS[d.getDay()]}
                </div>
                {isToday && <div className="mt-0.5 text-[10px] font-bold text-indigo-600">TODAY</div>}
              </div>
              <div className="flex-1 min-w-0">
                {dayTasks_.length > 0 && (
                  <div className="mb-1.5 flex flex-col gap-1">
                    {dayTasks_.map((t) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                          t.status === "未着手" ? "bg-red-50 text-red-600 border-red-200" :
                          t.status === "進行中" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                          "bg-green-50 text-green-600 border-green-200"}`}>{t.status}</span>
                        <span className={`truncate text-sm ${t.status === "完了" ? "line-through text-muted-foreground" : "font-medium"}`}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {dayConvs_.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {dayConvs_.map((c) => (
                      <div key={c.id} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                        <span className="shrink-0 text-xs">💬</span>
                        <span className="truncate">
                          <span className="font-medium text-foreground">{c.person}</span>{" · "}
                          <span className="line-clamp-1">{c.content}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {isToday && !hasContent && <p className="text-sm text-muted-foreground">今日の記録はまだありません</p>}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-4 pt-2 pb-0">
            <SheetTitle className="text-left text-base">
              {sheetMode === "fab" && "何を追加しますか？"}
              {sheetMode === "add-task" && "タスクを追加"}
              {sheetMode === "add-conv" && "会話を記録"}
              {sheetMode === "detail" && selectedDate && (() => {
                const d = new Date(selectedDate + "T00:00:00");
                return d.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" });
              })()}
            </SheetTitle>
          </SheetHeader>

          {sheetMode === "fab" && (
            <div className="flex flex-col gap-3 p-4">
              <button onClick={() => setSheetMode("add-task")}
                className="flex items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted transition-colors">
                <ListPlus size={20} className="text-indigo-600" />
                <div><p className="font-medium">タスクを追加</p><p className="text-xs text-muted-foreground">締め切りとステータスを管理</p></div>
              </button>
              <button onClick={() => setSheetMode("add-conv")}
                className="flex items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted transition-colors">
                <MessageSquarePlus size={20} className="text-indigo-600" />
                <div><p className="font-medium">会話を記録</p><p className="text-xs text-muted-foreground">誰と何を話したか残す</p></div>
              </button>
            </div>
          )}

          {sheetMode === "detail" && selectedDate && (
            <DayDetail
              date={selectedDate}
              tasks={dayTasks(selectedDate)}
              conversations={dayConvs(selectedDate)}
              onAddTask={() => setSheetMode("add-task")}
              onAddConversation={() => setSheetMode("add-conv")}
            />
          )}

          {sheetMode === "add-task" && (
            <TaskForm
              defaultDueDate={selectedDate ?? today}
              onSaved={afterSave}
              onCancel={() => setSheetMode(selectedDate ? "detail" : "fab")}
            />
          )}

          {sheetMode === "add-conv" && (
            <ConversationForm
              defaultDate={selectedDate ?? today}
              personNames={personNames}
              tasks={activeTasks}
              onSaved={afterSave}
              onCancel={() => setSheetMode(selectedDate ? "detail" : "fab")}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
