export type TaskStatus = "未着手" | "進行中" | "完了";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null; // ISO date string YYYY-MM-DD
  remindAt: string | null; // ISO datetime string（リマインド通知の送信予定日時。null = 通知なし）
  memo: string;
  relatedIds: string[]; // 関連付けられたタスクのID一覧（対称）
  createdAt: string;
}

export interface Conversation {
  id: string;
  person: string;
  date: string; // ISO date string YYYY-MM-DD
  content: string;
  nextAction: string;
  relatedTaskId: string | null;
  createdAt: string;
}

// --- ポケモン対戦記録 ---

export type BattleResult = "win" | "lose";

// 自分の手持ちポケモン（基本は固定の6体）
export interface PokemonMon {
  id: string;
  name: string;
  active: boolean;   // false = 今は使っていない（記録は名前で残る）
  sortOrder: number;
}

// 1試合の結果（自分のポケモン vs 相手のポケモン）
export interface PokemonBattle {
  id: string;
  myPokemon: string;
  enemyPokemon: string;
  result: BattleResult;
  oneShot: boolean;      // 負けのとき true=一撃で落とされた / false=一発は耐えた
  enemyMove: string;     // 何の技でやられたか（負けのときのみ）
  enemyItem: string;     // 相手の持ち物（わかったときだけ）
  enemyAction: string;   // 相手の行動メモ
  memo: string;
  createdAt: string;
}

