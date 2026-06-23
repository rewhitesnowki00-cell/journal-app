import { getCalendarToken } from "@/lib/actions/settings";
import CalendarSubscribe from "@/components/settings/CalendarSubscribe";
import PushManager from "@/components/push/PushManager";
import { Bell, CalendarSync, Smartphone } from "lucide-react";

export default async function SettingsPage() {
  const token = await getCalendarToken();

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-[#FAFAF9]/80 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold">⚙️ 設定</h1>
      </div>

      <div className="flex flex-col gap-6 p-4">
        {/* プッシュ通知 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-indigo-600" />
            <h2 className="text-sm font-semibold">プッシュ通知</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            タスクに設定したリマインド日時になると、この端末に通知が届きます。
          </p>
          <PushManager />
        </section>

        {/* カレンダー連携 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarSync size={18} className="text-indigo-600" />
            <h2 className="text-sm font-semibold">カレンダー連携</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            締め切りのあるタスクを、Apple純正カレンダー / Googleカレンダーに自動で反映できます。
          </p>
          <CalendarSubscribe token={token} />
        </section>

        {/* ホーム画面に追加の案内 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-indigo-600" />
            <h2 className="text-sm font-semibold">ホーム画面に追加（iPhone）</h2>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            iPhoneでプッシュ通知を受け取るには、Safariの共有ボタン
            <span className="mx-1">⬆️</span>
            →「ホーム画面に追加」でアプリを追加し、追加したアイコンから開いて通知をオンにしてください。
          </p>
        </section>
      </div>
    </div>
  );
}
