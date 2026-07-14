"use client";

import { useState } from "react";
import { PokemonMon } from "@/lib/types";
import { addTeamMon, deleteTeamMon, setTeamMonActive } from "@/lib/actions/pokemon";
import { Matchup, matchupRank, matchupStyle, isDangerous } from "./matchups";
import type { Run } from "./PokemonApp";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, X, Search } from "lucide-react";

// そのポケモンの一番悪いマッチアップ（0=一撃負け,1=負け,2=有利,3=記録なし）
function worstRank(list: Matchup[]): number {
  return list.reduce((w, m) => Math.min(w, matchupRank(m)), 3);
}

// 左アクセント色（ひと目で危険度が分かる）
function accentClass(worst: number): string {
  if (worst === 0) return "border-l-red-500";
  if (worst === 1) return "border-l-amber-400";
  if (worst === 2) return "border-l-emerald-400";
  return "border-l-border";
}

// 危険サマリのバッジ
function DangerBadge({ list }: { list: Matchup[] }) {
  const oneShot = list.filter((m) => m.oneShotLoss).length;
  const losing = list.filter((m) => isDangerous(m)).length;
  if (oneShot > 0)
    return <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">⚠ 危険 {oneShot}体</span>;
  if (losing > 0)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">要注意 {losing}体</span>;
  if (list.length > 0)
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">有利</span>;
  return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">記録なし</span>;
}

export default function SelectionTab({
  team, matchupsByMon, run,
}: {
  team: PokemonMon[];
  matchupsByMon: Map<string, Map<string, Matchup>>;
  run: Run;
}) {
  const [filter, setFilter] = useState("");
  const [showManage, setShowManage] = useState(false);
  const [newMon, setNewMon] = useState("");
  const [manageError, setManageError] = useState<string | null>(null);

  const active = team.filter((m) => m.active);
  const q = filter.trim();

  // 各ポケモンのマッチアップ＋危険度を準備し、並べ替える（絞り込みヒット→危険→元順）
  const cards = active.map((mon) => {
    const inner = matchupsByMon.get(mon.name);
    const all = inner ? Array.from(inner.values()) : [];
    const hit = q ? all.some((m) => m.enemy.includes(q)) : false;
    return { mon, all, hit, worst: worstRank(all) };
  });
  cards.sort((a, b) => {
    if (q && a.hit !== b.hit) return a.hit ? -1 : 1; // 絞り込み時はヒットを前へ
    return a.worst - b.worst; // 危険な子を上へ
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newMon.trim();
    if (!name) return;
    // 重複ガード（前後空白・大文字小文字を無視）
    const exists = team.some((m) => m.name.trim().toLowerCase() === name.toLowerCase());
    if (exists) { setManageError(`「${name}」はすでに手持ちにあります`); return; }
    setManageError(null);
    run(() => addTeamMon(name), { success: `${name} を追加しました` }).then((ok) => { if (ok) setNewMon(""); });
  }

  return (
    <div className="px-4 py-3">
      {/* 相手ポケモンで絞り込み */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="相手のポケモン名で絞り込み（任意）" className="pl-9" aria-label="相手のポケモン名で絞り込み" />
        {filter && (
          <button onClick={() => setFilter("")} aria-label="絞り込みをクリア"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
            <X size={14} />
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <p>手持ちがまだありません。</p>
          <button onClick={() => setShowManage(true)} className="mt-2 font-medium text-indigo-600 underline dark:text-indigo-400">手持ちを登録する</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cards.map(({ mon, all, hit }) => {
            let list = all;
            if (q) list = list.filter((m) => m.enemy.includes(q));
            list = [...list].sort((a, b) => matchupRank(a) - matchupRank(b) || b.losses - a.losses);
            const dimmed = q && !hit;
            return (
              <div key={mon.id}
                className={`rounded-2xl border border-l-4 bg-card p-3 ring-1 ring-foreground/5 transition-opacity ${accentClass(worstRank(all))} ${dimmed ? "opacity-40" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{mon.name}</p>
                  <DangerBadge list={all} />
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{q ? "この相手への記録なし" : "まだ記録なし"}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((m) => (
                      <span key={m.enemy}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${matchupStyle(m)}`}
                        title={m.oneShotLoss ? "一撃で落とされた実績あり" : undefined}>
                        {m.oneShotLoss && <span aria-hidden>⚠</span>}
                        {m.enemy}
                        <span className="tabular-nums opacity-80">{m.wins}勝{m.losses}敗</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 手持ちの管理 */}
      <div className="mt-5">
        <button onClick={() => setShowManage((v) => !v)}
          className="text-xs font-medium text-muted-foreground underline">
          {showManage ? "手持ちの編集を閉じる" : "手持ちを編集する"}
        </button>
        {showManage && (
          <div className="mt-2 rounded-2xl border bg-card p-3">
            <div className="flex flex-col gap-1.5">
              {team.length === 0 && <p className="text-xs text-muted-foreground">まだ登録がありません。下から追加してください。</p>}
              {team.map((mon) => (
                <div key={mon.id} className="flex items-center gap-2">
                  <button onClick={() => run(() => setTeamMonActive(mon.id, !mon.active))}
                    aria-label={mon.active ? "退避する" : "使用中に戻す"}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      mon.active
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}>
                    {mon.active ? "使用中" : "退避"}
                  </button>
                  <span className={`flex-1 text-sm ${mon.active ? "" : "text-muted-foreground line-through"}`}>{mon.name}</span>
                  <button onClick={() => { if (confirm(`「${mon.name}」を手持ちから削除しますか？（対戦記録は残ります）`)) run(() => deleteTeamMon(mon.id), { success: "削除しました" }); }}
                    aria-label={`${mon.name} を削除`} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={handleAdd} className="mt-3 flex gap-2">
              <Input value={newMon} onChange={(e) => { setNewMon(e.target.value); setManageError(null); }} placeholder="ポケモン名を追加" aria-label="追加するポケモン名" />
              <button type="submit" className="flex shrink-0 items-center gap-1 rounded-full bg-indigo-600 px-3 text-sm font-medium text-white transition-transform hover:bg-indigo-700 active:scale-95">
                <Plus size={15} />追加
              </button>
            </form>
            {manageError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{manageError}</p>}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
        ⚠＝一撃で落とされた実績あり。数字は「◯勝◯敗」。<br />母数が少ない勝敗は過信しないこと。
      </p>
    </div>
  );
}
