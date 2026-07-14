"use client";

import { useState } from "react";
import {
  TYPES, PokemonType, TYPE_COLOR, effectivenessBuckets, multiplierColor,
} from "@/lib/pokemon/typechart";

export default function TypeTab() {
  const [selected, setSelected] = useState<PokemonType[]>([]);

  function toggle(t: PokemonType) {
    setSelected((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t)
      : prev.length >= 2 ? [prev[1], t] // 3つ目を選んだら古い方を捨てて最大2つ
      : [...prev, t],
    );
  }

  const buckets = selected.length > 0 ? effectivenessBuckets(selected) : [];

  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-sm font-semibold">相手のタイプを選ぶ（最大2つ）</p>
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const on = selected.includes(t);
          return (
            <button key={t} onClick={() => toggle(t)} aria-pressed={on}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-transform active:scale-95 ${
                on ? `${TYPE_COLOR[t]} ring-2 ring-indigo-400 ring-offset-1 ring-offset-background` : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>{t}</button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          相手のタイプを選ぶと、<br />どの攻撃タイプが刺さるか（×4〜×0）を表示します。
        </div>
      ) : (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>選択中：</span>
            {selected.map((t) => (
              <span key={t} className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[t]}`}>{t}</span>
            ))}
            <button onClick={() => setSelected([])} className="ml-auto underline">クリア</button>
          </div>

          <div className="flex flex-col gap-3">
            {buckets.map((b) => (
              <section key={b.multiplier}>
                <h3 className="mb-1.5 text-xs font-bold text-muted-foreground">{b.heading}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {b.types.map((t) => (
                    <span key={t}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${multiplierColor(b.multiplier)}`}>
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">
            赤＝こちらの攻撃が効果ばつぐん（×2/×4）／青＝いまひとつ（×0.5/×0.25）／灰＝こうかなし
          </p>
        </div>
      )}
    </div>
  );
}
