export type TaskStatus = "未着手" | "進行中" | "完了";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null; // ISO date string YYYY-MM-DD
  remindAt: string | null; // ISO datetime string（リマインド通知の送信予定日時。null = 通知なし）
  memo: string;
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
