import "server-only";
import webpush from "web-push";

let configured = false;

/** VAPID 鍵で web-push を初期化する（最初の送信時に一度だけ実行）。 */
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY が未設定です。");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * 1つの購読へ通知を送る。
 * 失効（404/410）した場合は { expired: true } を返し、呼び出し側でDB削除させる。
 */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload
): Promise<{ ok: boolean; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true, expired: false };
  } catch (err: unknown) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    const expired = statusCode === 404 || statusCode === 410;
    return { ok: false, expired };
  }
}
