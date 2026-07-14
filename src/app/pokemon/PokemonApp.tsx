"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PokemonMon, PokemonBattle } from "@/lib/types";
import { buildMatchups } from "./matchups";
import SelectionTab from "./SelectionTab";
import RecordTab from "./RecordTab";
import TypeTab from "./TypeTab";
import { Swords, Plus, Target, CircleCheck, TriangleAlert } from "lucide-react";

type Tab = "選出" | "記録" | "相性";

export interface RunOptions { success?: string; error?: string }
export type Run = (fn: () => Promise<void>, opts?: RunOptions) => Promise<boolean>;

const TABS: { key: Tab; icon: typeof Swords }[] = [
  { key: "選出", icon: Swords },
  { key: "記録", icon: Plus },
  { key: "相性", icon: Target },
];

export default function PokemonApp({
  initialTeam, initialBattles,
}: {
  initialTeam: PokemonMon[];
  initialBattles: PokemonBattle[];
}) {
  const [tab, setTab] = useState<Tab>("選出");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function showToast(kind: "success" | "error", text: string) {
    setToast({ kind, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  // 成功で true / 失敗で false を返す。呼び出し側は成功時だけ入力欄をクリアできる。
  const run: Run = (fn, opts) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        try {
          await fn();
          router.refresh();
          if (opts?.success) showToast("success", opts.success);
          resolve(true);
        } catch {
          showToast("error", opts?.error ?? "保存に失敗しました。通信状況を確かめて、もう一度試してください。");
          resolve(false);
        }
      });
    });

  const matchupsByMon = useMemo(() => buildMatchups(initialBattles), [initialBattles]);

  return (
    <div className="relative">
      {/* ヘッダ ＋ セグメンテッドタブ */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-4 pb-2.5 pt-3 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">⚔ ポケモン選出</span>
          </h1>
          <span className="text-[11px] text-muted-foreground">相手6体に、誰を当てるか</span>
        </div>
        <nav className="mt-2.5 flex gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="表示切替">
          {TABS.map(({ key, icon: Icon }) => {
            const active = tab === key;
            return (
              <button key={key} role="tab" aria-selected={active} onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-semibold transition-all active:scale-95 ${
                  active ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon size={15} strokeWidth={active ? 2.6 : 2} />
                {key}
              </button>
            );
          })}
        </nav>
      </header>

      <div style={{ opacity: isPending ? 0.6 : 1 }} className="transition-opacity">
        {tab === "選出" && <SelectionTab team={initialTeam} matchupsByMon={matchupsByMon} run={run} />}
        {tab === "記録" && <RecordTab team={initialTeam} battles={initialBattles} run={run} />}
        {tab === "相性" && <TypeTab />}
      </div>

      {/* 保存フィードバック（トースト） */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            toast.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
          }`}>
            {toast.kind === "success" ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
