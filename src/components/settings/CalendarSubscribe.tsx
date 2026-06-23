"use client";

import { useEffect, useState, useTransition } from "react";
import { Copy, Check, Calendar, ExternalLink, RefreshCw } from "lucide-react";
import { regenerateCalendarToken } from "@/lib/actions/settings";

export default function CalendarSubscribe({ token: initialToken }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [regenerating, startRegen] = useTransition();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  function regenerate() {
    if (!confirm("URLを再発行すると、今カレンダーに登録済みのリンクは無効になります。続けますか？")) return;
    startRegen(async () => {
      const next = await regenerateCalendarToken();
      setToken(next);
    });
  }

  // 本番は https。webcal:// にするとApple/Googleが購読ダイアログを開く。
  const path = `/api/calendar/${token}`;
  const httpsUrl = origin ? `${origin}${path}` : path;
  const webcalUrl = origin ? `${origin.replace(/^https?:\/\//, "webcal://")}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード非対応環境は手動コピーにフォールバック
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/40 p-3">
        <Calendar size={18} className="shrink-0 text-indigo-600" />
        <code className="flex-1 truncate text-xs text-muted-foreground" title={httpsUrl}>
          {httpsUrl}
        </code>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 active:scale-95"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "コピー済" : "コピー"}
        </button>
      </div>

      <a
        href={webcalUrl}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.98]"
      >
        <ExternalLink size={16} />
        カレンダーに追加（iPhone / Mac）
      </a>

      <div className="rounded-xl border border-input bg-background p-3 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">📅 Googleカレンダーに追加する手順</p>
        <ol className="ml-4 list-decimal space-y-0.5">
          <li>上の「コピー」でURLをコピー</li>
          <li>パソコンで Googleカレンダー を開く</li>
          <li>左の「他のカレンダー」＋ →「URLで追加」</li>
          <li>URLを貼り付けて「カレンダーを追加」</li>
        </ol>
        <p className="mt-2">
          ※ 反映はApple数時間／Google約24時間ごとの自動更新です（即時ではありません）。
        </p>
      </div>

      <button
        onClick={regenerate}
        disabled={regenerating}
        className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50 active:scale-[0.98]"
      >
        <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
        {regenerating ? "再発行中…" : "URLを再発行（漏れた場合）"}
      </button>
    </div>
  );
}
