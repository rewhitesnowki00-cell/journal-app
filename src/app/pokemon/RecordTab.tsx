"use client";

import { useMemo, useState } from "react";
import { PokemonMon, PokemonBattle, BattleResult } from "@/lib/types";
import { addBattle, deleteBattle } from "@/lib/actions/pokemon";
import type { Run } from "./PokemonApp";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

export default function RecordTab({
  team, battles, run,
}: {
  team: PokemonMon[];
  battles: PokemonBattle[];
  run: Run;
}) {
  const activeNames = team.filter((m) => m.active).map((m) => m.name);
  const [myPokemon, setMyPokemon] = useState(activeNames[0] ?? "");
  const [enemy, setEnemy] = useState("");
  const [result, setResult] = useState<BattleResult>("lose");
  const [oneShot, setOneShot] = useState(false);
  const [movedFirst, setMovedFirst] = useState<boolean | null>(null); // true=先手 / false=後攻 / null=未記録
  const [enemyMove, setEnemyMove] = useState("");
  const [enemyItem, setEnemyItem] = useState("");
  const [enemyAction, setEnemyAction] = useState("");
  const [memo, setMemo] = useState("");

  // 選択値が候補外（手持ち入れ替え直後など）なら先頭にフォールバックして表示ズレを防ぐ
  const selectedMy = activeNames.includes(myPokemon) ? myPokemon : (activeNames[0] ?? "");

  const enemyNames = useMemo(
    () => Array.from(new Set(battles.map((b) => b.enemyPokemon))).sort(),
    [battles],
  );
  // 過去に入力した技・持ち物を候補として出す（入力の手間を減らす）
  const moveNames = useMemo(
    () => Array.from(new Set(battles.map((b) => b.enemyMove).filter(Boolean))).sort(),
    [battles],
  );
  const itemNames = useMemo(
    () => Array.from(new Set(battles.map((b) => b.enemyItem).filter(Boolean))).sort(),
    [battles],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const my = activeNames.length > 0 ? selectedMy : myPokemon.trim();
    if (!my || !enemy.trim()) return;
    const payload = {
      myPokemon: my, enemyPokemon: enemy.trim(), result, oneShot, movedFirst,
      enemyMove: enemyMove.trim(), enemyItem: enemyItem.trim(),
      enemyAction: enemyAction.trim(), memo: memo.trim(),
    };
    run(() => addBattle(payload), { success: "記録しました" }).then((ok) => {
      // 保存に成功したときだけ入力をクリア（失敗時は入力を残す）
      if (ok) { setEnemy(""); setEnemyMove(""); setEnemyItem(""); setEnemyAction(""); setMemo(""); setOneShot(false); setMovedFirst(null); }
    });
  }

  return (
    <div className="px-4 py-3">
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border bg-card p-4 ring-1 ring-foreground/5">
        <div>
          <label className="mb-1 block text-sm font-medium">自分のポケモン *</label>
          {activeNames.length > 0 ? (
            <select value={selectedMy} onChange={(e) => setMyPokemon(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {activeNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <Input value={myPokemon} onChange={(e) => setMyPokemon(e.target.value)} placeholder="ポケモン名（選出タブで手持ち登録を推奨）" />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">相手のポケモン *</label>
          <Input value={enemy} onChange={(e) => setEnemy(e.target.value)} placeholder="例：カイリュー" list="enemy-names" />
          <datalist id="enemy-names">
            {enemyNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">結果 *</label>
          <div className="flex gap-2">
            {(["lose", "win"] as BattleResult[]).map((r) => (
              <button key={r} type="button" onClick={() => setResult(r)} aria-pressed={result === r}
                className={`flex-1 rounded-full border py-2 text-sm font-semibold transition-colors ${
                  result === r
                    ? r === "lose" ? "border-red-600 bg-red-600 text-white" : "border-emerald-600 bg-emerald-600 text-white"
                    : "border-border bg-background text-muted-foreground"
                }`}>
                {r === "lose" ? "やられた" : "勝った"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">行動順（任意）</label>
          <div className="flex gap-2">
            <button type="button" aria-pressed={movedFirst === true}
              onClick={() => setMovedFirst(movedFirst === true ? null : true)}
              className={`flex-1 rounded-full border py-2 text-sm font-semibold transition-colors ${
                movedFirst === true
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-border bg-background text-muted-foreground"
              }`}>
              先手だった
            </button>
            <button type="button" aria-pressed={movedFirst === false}
              onClick={() => setMovedFirst(movedFirst === false ? null : false)}
              className={`flex-1 rounded-full border py-2 text-sm font-semibold transition-colors ${
                movedFirst === false
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-border bg-background text-muted-foreground"
              }`}>
              後攻だった
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">もう一度タップで選択解除。「後攻のまま一撃負け」は最警戒の証拠になります。</p>
        </div>

        {result === "lose" && (
          <div className="animate-in fade-in">
            <label className="mb-1 block text-sm font-medium">やられ方</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOneShot(true)} aria-pressed={oneShot}
                className={`flex-1 rounded-full border py-2 text-sm font-semibold ${oneShot ? "border-red-500 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" : "border-border bg-background text-muted-foreground"}`}>
                一撃で落とされた
              </button>
              <button type="button" onClick={() => setOneShot(false)} aria-pressed={!oneShot}
                className={`flex-1 rounded-full border py-2 text-sm font-semibold ${!oneShot ? "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "border-border bg-background text-muted-foreground"}`}>
                一発は耐えた
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">「一撃で落とされた」は事故が少ないので、1回でも警戒色にします。</p>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium">とどめの技（任意）</label>
              <Input value={enemyMove} onChange={(e) => setEnemyMove(e.target.value)} placeholder="例：しんそく" list="move-names" />
              <datalist id="move-names">
                {moveNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">相手の持ち物（わかったら・任意）</label>
          <Input value={enemyItem} onChange={(e) => setEnemyItem(e.target.value)} placeholder="例：こだわりハチマキ" list="item-names" />
          <datalist id="item-names">
            {itemNames.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">相手の行動（任意）</label>
          <Input value={enemyAction} onChange={(e) => setEnemyAction(e.target.value)} placeholder="例：つるぎのまいを積んできた" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">メモ（任意）</label>
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="補足" />
        </div>

        <button type="submit" className="rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-transform hover:bg-indigo-700 active:scale-[0.98]">
          記録する
        </button>
      </form>

      {/* 最近の記録 */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">最近の記録（{battles.length}件）</p>
        {battles.length === 0 ? (
          <p className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">まだ記録がありません。</p>
        ) : (
          <div className="divide-y divide-border">
            {battles.slice(0, 40).map((b) => (
              <div key={b.id} className="flex items-start gap-2 py-2.5">
                <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  b.result === "win"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
                }`}>
                  {b.result === "win" ? "勝ち" : b.oneShot ? "負け⚠一撃" : "負け"}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p><span className="font-medium">{b.myPokemon}</span> <span className="text-muted-foreground">vs</span> {b.enemyPokemon}</p>
                  {(b.movedFirst !== null || b.enemyMove || b.enemyItem || b.enemyAction || b.memo) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        b.movedFirst === true ? "先手" : b.movedFirst === false ? "後攻" : "",
                        b.enemyMove && `技：${b.enemyMove}`,
                        b.enemyItem && `持ち物：${b.enemyItem}`,
                        b.enemyAction,
                        b.memo,
                      ].filter(Boolean).join(" / ")}
                    </p>
                  )}
                </div>
                <button onClick={() => { if (confirm("この記録を削除しますか？")) run(() => deleteBattle(b.id), { success: "削除しました" }); }}
                  aria-label="記録を削除" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
