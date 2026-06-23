import { Task } from "@/lib/types";

/** ICS仕様に従い特殊文字をエスケープする（バックスラッシュ・カンマ・セミコロン・改行）。 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** YYYY-MM-DD → YYYYMMDD（終日イベントの DATE 値）。 */
function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/** Date → YYYYMMDDTHHMMSSZ（UTC のタイムスタンプ）。 */
function toIcsTimestampUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** 終日イベントの DTEND は「翌日」を指定する（排他的終了）。 */
function nextDay(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return toIcsDate(d.toISOString().slice(0, 10));
}

/**
 * RFC5545 の行折り返し: 1行75オクテットを超えたら CRLF + 先頭空白で折る。
 * 日本語などマルチバイト文字をバイト境界で割らないよう UTF-8 バイト数で判定する。
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  let first = true;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const limit = first ? 75 : 74; // 継続行は先頭空白1バイト分を引く
    if (currentBytes + chBytes > limit) {
      out.push(current);
      current = ch;
      currentBytes = chBytes;
      first = false;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

/**
 * タスク配列から iCalendar(.ics) テキストを生成する。
 * - 期限(due_date)を持つタスクのみ終日イベントとして出力。
 * - remind_at があれば VALARM（事前通知）を付与。
 */
export function buildIcs(tasks: Task[], calendarName = "日誌タスク"): string {
  const now = toIcsTimestampUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//journal-app//tasks//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Tokyo",
  ];

  for (const task of tasks) {
    if (!task.dueDate) continue;
    const statusSuffix = task.status === "完了" ? " ✅" : "";
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:task-${task.id}@journal-app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(task.dueDate)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(task.dueDate)}`);
    lines.push(`SUMMARY:${escapeText(task.title + statusSuffix)}`);
    if (task.memo) lines.push(`DESCRIPTION:${escapeText(task.memo)}`);
    lines.push(`STATUS:${task.status === "完了" ? "CONFIRMED" : "TENTATIVE"}`);

    if (task.remindAt) {
      const trigger = toIcsTimestampUtc(new Date(task.remindAt));
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:${escapeText(task.title)}`);
      // 絶対日時でアラームを設定
      lines.push(`TRIGGER;VALUE=DATE-TIME:${trigger}`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // RFC5545: 各行を75オクテットで折り返し、CRLF 区切りで結合
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
