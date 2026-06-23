"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { saveSubscription, deleteSubscription } from "@/lib/actions/push";

/** Base64URL の VAPID 公開鍵を Uint8Array に変換する（pushManager.subscribe 用）。 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = "loading" | "unsupported" | "default" | "subscribed" | "denied";

export default function PushManager() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    // 既存の購読があるか確認
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "default"))
      .catch(() => setState("default"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID公開鍵が設定されていません");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await saveSubscription({ endpoint: json.endpoint, keys: json.keys });
      setState("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "通知の有効化に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deleteSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("default");
    } catch (e) {
      setError(e instanceof Error ? e.message : "通知の解除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  if (state === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        この端末／ブラウザはプッシュ通知に対応していません。iPhone の場合は、
        まず「ホーム画面に追加」してからアプリを開いてお試しください。
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-red-500">
        通知がブロックされています。ブラウザ／端末の設定から、このサイトの通知を「許可」に変更してください。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {state === "subscribed" ? (
        <button
          onClick={disable}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 active:scale-[0.98]"
        >
          <BellOff size={18} />
          {busy ? "処理中…" : "通知をオフにする"}
        </button>
      ) : (
        <button
          onClick={enable}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50 active:scale-[0.98]"
        >
          <BellRing size={18} />
          {busy ? "処理中…" : "通知をオンにする"}
        </button>
      )}
      {state === "subscribed" && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <Bell size={13} /> この端末で通知が有効です
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
