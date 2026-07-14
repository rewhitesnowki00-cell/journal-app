import { Database } from "lucide-react";

// Supabase にテーブルがまだ無いとき（003_pokemon.sql 未実行）に表示する案内。
// クラッシュ画面ではなく「次に何をすればいいか」を教える。
export default function SetupNotice() {
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-sm rounded-2xl border bg-card p-5 text-sm ring-1 ring-foreground/5">
        <div className="mb-3 flex items-center gap-2">
          <Database size={18} className="text-indigo-500" />
          <h1 className="text-base font-bold">初回セットアップが必要です</h1>
        </div>
        <p className="text-muted-foreground">
          データベースにポケモン用のテーブルがまだありません。次の手順で作成してください（1回だけ）：
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Supabase のダッシュボードを開く</li>
          <li>左メニューの「SQL Editor」→「New query」</li>
          <li>
            プロジェクト内の
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/003_pokemon.sql</code>
            の中身を全部コピーして貼り付け →「Run」
          </li>
          <li>
            続けて
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">004_pokemon_battle_details.sql</code>
            も同じように実行（技・持ち物の記録用）
          </li>
        </ol>
        <p className="mt-4 text-muted-foreground">完了したら、このページを再読み込みしてください。</p>
      </div>
    </div>
  );
}
