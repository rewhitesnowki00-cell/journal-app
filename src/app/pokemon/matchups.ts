import { PokemonBattle } from "@/lib/types";

// (自分のポケモン, 相手のポケモン) ごとの集計
export interface Matchup {
  enemy: string;
  wins: number;
  losses: number;
  oneShotLoss: boolean; // 一撃で落とされた負けが1回でもあるか
}

// 全記録を myPokemon -> (enemy -> Matchup) に集計する
export function buildMatchups(battles: PokemonBattle[]): Map<string, Map<string, Matchup>> {
  const map = new Map<string, Map<string, Matchup>>();
  for (const b of battles) {
    if (!map.has(b.myPokemon)) map.set(b.myPokemon, new Map());
    const inner = map.get(b.myPokemon)!;
    const cur = inner.get(b.enemyPokemon) ?? { enemy: b.enemyPokemon, wins: 0, losses: 0, oneShotLoss: false };
    if (b.result === "win") cur.wins += 1;
    else { cur.losses += 1; if (b.oneShot) cur.oneShotLoss = true; }
    inner.set(b.enemyPokemon, cur);
  }
  return map;
}

// 危険度ランク（小さいほど危険＝上に並べる）：一撃負けあり > 負けあり > 有利 > 記録なし
export function matchupRank(m: Matchup): number {
  if (m.oneShotLoss) return 0;
  if (m.losses > 0) return 1;
  if (m.wins > 0) return 2;
  return 3;
}

// 負けが1回でもあれば「危険」（危険サマリのカウント用）
export function isDangerous(m: Matchup): boolean {
  return m.losses > 0;
}

// マッチアップ・ピルの色（設計どおり：一撃負けは n=1 でも塗り赤、必ず ◯勝◯敗 を併記）。ライト/ダーク両対応。
export function matchupStyle(m: Matchup): string {
  if (m.oneShotLoss) return "bg-red-600 text-white border-red-600 dark:bg-red-500 dark:border-red-500"; // 一撃で落とされた → 最警戒（塗り赤）
  if (m.losses > 0) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"; // 負けあり → 要注意
  if (m.wins > 0) return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"; // 勝ちのみ → 有利
  return "bg-muted text-muted-foreground border-border";
}
