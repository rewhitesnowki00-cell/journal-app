"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BattleResult, PokemonMon, PokemonBattle } from "@/lib/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

// --- 手持ち（pokemon_team） ---

export async function getTeam(): Promise<PokemonMon[]> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("pokemon_team")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    active: m.active,
    sortOrder: m.sort_order,
  }));
}

export async function addTeamMon(name: string) {
  const { supabase, user } = await getUser();
  // 末尾に追加するため、現在の最大 sort_order + 1 を使う
  const { data: last } = await supabase
    .from("pokemon_team")
    .select("sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (last?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("pokemon_team").insert({
    user_id: user.id,
    name: name.trim(),
    sort_order: nextOrder,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/pokemon");
}

export async function setTeamMonActive(id: string, active: boolean) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("pokemon_team")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/pokemon");
}

export async function deleteTeamMon(id: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("pokemon_team")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/pokemon");
}

// --- 対戦記録（pokemon_battles） ---

export async function getBattles(): Promise<PokemonBattle[]> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("pokemon_battles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    id: b.id,
    myPokemon: b.my_pokemon,
    enemyPokemon: b.enemy_pokemon,
    result: b.result as BattleResult,
    oneShot: b.one_shot,
    movedFirst: b.moved_first ?? null, // 005 未実行のDBでも null 扱いで安全に動く
    enemyMove: b.enemy_move ?? "",   // 004 未実行のDBでも ?? "" で安全に動く
    enemyItem: b.enemy_item ?? "",
    enemyAction: b.enemy_action ?? "",
    memo: b.memo ?? "",
    createdAt: b.created_at,
  }));
}

export async function addBattle(data: {
  myPokemon: string;
  enemyPokemon: string;
  result: BattleResult;
  oneShot: boolean;
  movedFirst: boolean | null;
  enemyMove: string;
  enemyItem: string;
  enemyAction: string;
  memo: string;
}) {
  const { supabase, user } = await getUser();
  const { error } = await supabase.from("pokemon_battles").insert({
    user_id: user.id,
    my_pokemon: data.myPokemon.trim(),
    enemy_pokemon: data.enemyPokemon.trim(),
    result: data.result,
    // 勝ちのときは「一撃」「とどめの技」は意味を持たないので空に固定
    one_shot: data.result === "lose" ? data.oneShot : false,
    moved_first: data.movedFirst,
    enemy_move: data.result === "lose" ? data.enemyMove.trim() : "",
    enemy_item: data.enemyItem.trim(),
    enemy_action: data.enemyAction.trim(),
    memo: data.memo.trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/pokemon");
}

export async function deleteBattle(id: string) {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("pokemon_battles")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/pokemon");
}
