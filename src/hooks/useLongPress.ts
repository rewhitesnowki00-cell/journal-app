"use client";

import { useRef, useCallback } from "react";

interface Options {
  onTap?: () => void;
  onLongPress?: () => void;
  delay?: number; // 長押し判定までのms
  moveThreshold?: number; // この距離(px)以上動いたらキャンセル（スクロール扱い）
}

/**
 * タップと長押しを判別するフック（pointerイベントベース）。
 * - 短く押して離す → onTap
 * - 約450ms押し続ける → onLongPress（離した時の onTap は発火しない）
 * - 指/カーソルが閾値以上動いたら（＝スクロール）キャンセル
 * 行の末尾コントロール（ボタン等）は onPointerDown で stopPropagation すれば誤爆しない。
 */
export function useLongPress({ onTap, onLongPress, delay = 450, moveThreshold = 10 }: Options) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return; // 右クリック等は無視
      longPressed.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timer.current = setTimeout(() => {
        longPressed.current = true;
        // 長押し成立を触覚で伝える（対応端末のみ）
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
        onLongPress?.();
      }, delay);
    },
    [clearTimer, delay, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = Math.abs(e.clientX - start.current.x);
      const dy = Math.abs(e.clientY - start.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clearTimer();
        start.current = null; // スクロール扱いでタップも長押しも無効化
      }
    },
    [clearTimer, moveThreshold]
  );

  const onPointerUp = useCallback(() => {
    const wasLong = longPressed.current;
    const moved = start.current === null;
    clearTimer();
    if (!wasLong && !moved) onTap?.();
    start.current = null;
  }, [clearTimer, onTap]);

  const cancel = useCallback(() => {
    clearTimer();
    start.current = null;
  }, [clearTimer]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
}
