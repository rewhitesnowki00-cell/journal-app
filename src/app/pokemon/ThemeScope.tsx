"use client";

import { useSyncExternalStore } from "react";

// /pokemon 配下だけを、端末のライト/ダーク設定に自動追従させるラッパ。
// globals.css の `@custom-variant dark (&:is(.dark *))` により、
// この <div> に `dark` クラスが付くと、この配下の要素だけ `dark:` が有効になる。
// → 他ページ（台帳・タスク・日誌＝ライト固定）には一切影響しない。
const QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void): () => void {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}
function getServerSnapshot(): boolean {
  return false; // サーバー側は不明なのでライト扱い（描画後にクライアントで補正）
}

export default function ThemeScope({ children }: { children: React.ReactNode }) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className={dark ? "dark min-h-[100dvh] bg-background text-foreground" : "min-h-[100dvh] bg-background text-foreground"}>
      {children}
    </div>
  );
}
