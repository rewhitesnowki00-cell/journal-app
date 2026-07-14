import { getTeam, getBattles } from "@/lib/actions/pokemon";
import { PokemonMon, PokemonBattle } from "@/lib/types";
import PokemonApp from "./PokemonApp";
import ThemeScope from "./ThemeScope";
import SetupNotice from "./SetupNotice";

// Supabase 側にテーブルが無い（003_pokemon.sql 未実行）ときのエラーか判定
function isMissingTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : "";
  return msg.includes("schema cache") || msg.includes("does not exist");
}

export default async function PokemonPage() {
  // データ取得だけを try/catch し、JSX の組み立ては外で行う
  let data: { team: PokemonMon[]; battles: PokemonBattle[] } | null = null;
  try {
    const [team, battles] = await Promise.all([getTeam(), getBattles()]);
    data = { team, battles };
  } catch (e) {
    if (!isMissingTableError(e)) throw e; // テーブル未作成以外は通常のエラー処理へ
  }

  return (
    <ThemeScope>
      {data ? (
        <PokemonApp initialTeam={data.team} initialBattles={data.battles} />
      ) : (
        <SetupNotice />
      )}
    </ThemeScope>
  );
}
