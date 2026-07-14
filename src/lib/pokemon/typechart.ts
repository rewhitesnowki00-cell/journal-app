// ポケモンのタイプ相性表（攻撃タイプ → 防御タイプ の倍率）。
// 選出のとき「相手のポケモンのタイプ」を入れると、どの攻撃タイプが刺さるかを出す（方式B）。
// gamewith のページが見にくいという理由で、自分用に見やすく持つためのデータ。

export const TYPES = [
  "ノーマル", "ほのお", "みず", "でんき", "くさ", "こおり",
  "かくとう", "どく", "じめん", "ひこう", "エスパー", "むし",
  "いわ", "ゴースト", "ドラゴン", "あく", "はがね", "フェアリー",
] as const;

export type PokemonType = (typeof TYPES)[number];

// 各攻撃タイプについて「効果ばつぐん(2倍)」「いまひとつ(0.5倍)」「効かない(0倍)」の相手を列挙。
// ここに無い組み合わせは等倍(1倍)。標準のタイプ相性表（第6世代以降）。
const SUPER: Record<PokemonType, PokemonType[]> = {
  ノーマル: [],
  ほのお: ["くさ", "こおり", "むし", "はがね"],
  みず: ["ほのお", "じめん", "いわ"],
  でんき: ["みず", "ひこう"],
  くさ: ["みず", "じめん", "いわ"],
  こおり: ["くさ", "じめん", "ひこう", "ドラゴン"],
  かくとう: ["ノーマル", "こおり", "いわ", "あく", "はがね"],
  どく: ["くさ", "フェアリー"],
  じめん: ["ほのお", "でんき", "どく", "いわ", "はがね"],
  ひこう: ["くさ", "かくとう", "むし"],
  エスパー: ["かくとう", "どく"],
  むし: ["くさ", "エスパー", "あく"],
  いわ: ["ほのお", "こおり", "ひこう", "むし"],
  ゴースト: ["エスパー", "ゴースト"],
  ドラゴン: ["ドラゴン"],
  あく: ["エスパー", "ゴースト"],
  はがね: ["こおり", "いわ", "フェアリー"],
  フェアリー: ["かくとう", "ドラゴン", "あく"],
};

const NOT_VERY: Record<PokemonType, PokemonType[]> = {
  ノーマル: ["いわ", "はがね"],
  ほのお: ["ほのお", "みず", "いわ", "ドラゴン"],
  みず: ["みず", "くさ", "ドラゴン"],
  でんき: ["でんき", "くさ", "ドラゴン"],
  くさ: ["ほのお", "くさ", "どく", "ひこう", "むし", "ドラゴン", "はがね"],
  こおり: ["ほのお", "みず", "こおり", "はがね"],
  かくとう: ["どく", "ひこう", "エスパー", "むし", "フェアリー"],
  どく: ["どく", "じめん", "いわ", "ゴースト"],
  じめん: ["くさ", "むし"],
  ひこう: ["でんき", "いわ", "はがね"],
  エスパー: ["エスパー", "はがね"],
  むし: ["ほのお", "かくとう", "どく", "ひこう", "ゴースト", "はがね", "フェアリー"],
  いわ: ["かくとう", "じめん", "はがね"],
  ゴースト: ["あく"],
  ドラゴン: ["はがね"],
  あく: ["かくとう", "あく", "フェアリー"],
  はがね: ["ほのお", "みず", "でんき", "はがね"],
  フェアリー: ["ほのお", "どく", "はがね"],
};

const NO_EFFECT: Record<PokemonType, PokemonType[]> = {
  ノーマル: ["ゴースト"],
  ほのお: [],
  みず: [],
  でんき: ["じめん"],
  くさ: [],
  こおり: [],
  かくとう: ["ゴースト"],
  どく: ["はがね"],
  じめん: ["ひこう"],
  ひこう: [],
  エスパー: ["あく"],
  むし: [],
  いわ: [],
  ゴースト: ["ノーマル"],
  ドラゴン: ["フェアリー"],
  あく: [],
  はがね: [],
  フェアリー: [],
};

// 単発の倍率（攻撃タイプ → 防御タイプ1つ）
function singleMultiplier(attacker: PokemonType, defender: PokemonType): number {
  if (NO_EFFECT[attacker].includes(defender)) return 0;
  if (SUPER[attacker].includes(defender)) return 2;
  if (NOT_VERY[attacker].includes(defender)) return 0.5;
  return 1;
}

// 相手のタイプ（1つ or 2つ）に対する、ある攻撃タイプの最終倍率。
// 2タイプ持ちは掛け算：ばつぐん×ばつぐん=4倍、いまひとつ同士=0.25倍、で相殺もされる。
export function effectivenessAgainst(
  attacker: PokemonType,
  defenderTypes: PokemonType[],
): number {
  return defenderTypes.reduce((acc, d) => acc * singleMultiplier(attacker, d), 1);
}

// 相手のタイプに対して、全18タイプの攻撃倍率を計算して返す（相性タブ用）。
export function allEffectiveness(
  defenderTypes: PokemonType[],
): { type: PokemonType; multiplier: number }[] {
  return TYPES.map((t) => ({ type: t, multiplier: effectivenessAgainst(t, defenderTypes) }));
}

// 倍率 → 表示ラベル
export function multiplierLabel(m: number): string {
  switch (m) {
    case 0: return "こうかなし (×0)";
    case 0.25: return "かなりいまひとつ (×0.25)";
    case 0.5: return "いまひとつ (×0.5)";
    case 1: return "とうばい (×1)";
    case 2: return "ばつぐん (×2)";
    case 4: return "超ばつぐん (×4)";
    default: return `×${m}`;
  }
}

// 倍率 → 色（Tailwindクラス）。ばつぐんほど赤、いまひとつほど青。ライト/ダーク両対応。
export function multiplierColor(m: number): string {
  if (m === 0) return "bg-zinc-200 text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
  if (m === 4) return "bg-red-600 text-white border-red-700 dark:bg-red-500 dark:border-red-400";
  if (m === 2) return "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800";
  if (m === 0.5) return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
  if (m === 0.25) return "bg-blue-600 text-white border-blue-700 dark:bg-blue-500 dark:border-blue-400";
  return "bg-muted text-muted-foreground border-border"; // ×1（トークンなのでテーマ追従）
}

// 相性タブのセクション見出し用。倍率ごとにラベルをまとめる。
export interface EffectivenessBucket {
  multiplier: number;
  heading: string;
  types: PokemonType[];
}

// 相手のタイプに対する全18タイプを、倍率ごとのセクションに束ねて返す（強い順）。
// 空のセクションは除外する。
export function effectivenessBuckets(defenderTypes: PokemonType[]): EffectivenessBucket[] {
  const order: { multiplier: number; heading: string }[] = [
    { multiplier: 4, heading: "超ばつぐん ×4" },
    { multiplier: 2, heading: "ばつぐん ×2" },
    { multiplier: 1, heading: "とうばい ×1" },
    { multiplier: 0.5, heading: "いまひとつ ×0.5" },
    { multiplier: 0.25, heading: "かなりいまひとつ ×0.25" },
    { multiplier: 0, heading: "こうかなし ×0" },
  ];
  const all = allEffectiveness(defenderTypes);
  return order
    .map(({ multiplier, heading }) => ({
      multiplier,
      heading,
      types: all.filter((e) => e.multiplier === multiplier).map((e) => e.type),
    }))
    .filter((b) => b.types.length > 0);
}

// 各タイプの色（チップ表示用）。おおよそ公式のイメージに寄せた配色。
export const TYPE_COLOR: Record<PokemonType, string> = {
  ノーマル: "bg-neutral-400 text-white",
  ほのお: "bg-orange-500 text-white",
  みず: "bg-blue-500 text-white",
  でんき: "bg-yellow-400 text-black",
  くさ: "bg-green-500 text-white",
  こおり: "bg-cyan-400 text-black",
  かくとう: "bg-red-700 text-white",
  どく: "bg-purple-500 text-white",
  じめん: "bg-amber-600 text-white",
  ひこう: "bg-indigo-400 text-white",
  エスパー: "bg-pink-500 text-white",
  むし: "bg-lime-500 text-black",
  いわ: "bg-stone-500 text-white",
  ゴースト: "bg-violet-700 text-white",
  ドラゴン: "bg-indigo-700 text-white",
  あく: "bg-neutral-700 text-white",
  はがね: "bg-slate-500 text-white",
  フェアリー: "bg-pink-300 text-black",
};
