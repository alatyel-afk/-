"use client";

import { useMemo, useState } from "react";
import {
  buildWeekShoppingPlan,
  mondayOfWeekContaining,
  weekDatesFromMonday,
  WEEKLY_BREAKFAST_PURCHASES,
} from "@/core/protocol/week-shopping";

function pluralObed(n: number): string {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 14) return `${n} обедов`;
  if (m10 === 1) return `${n} обед`;
  if (m10 >= 2 && m10 <= 4) return `${n} обеда`;
  return `${n} обедов`;
}

function fmtWeekRange(mondayISO: string): string {
  const dates = weekDatesFromMonday(mondayISO);
  const a = new Date(dates[0] + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const b = new Date(dates[6] + "T12:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${a} — ${b}`;
}

export default function ShoppingWeekPage() {
  const [anchor, setAnchor] = useState(() => mondayOfWeekContaining(new Date().toISOString().slice(0, 10)));

  const plan = useMemo(() => buildWeekShoppingPlan(anchor), [anchor]);

  const shiftWeek = (delta: number) => {
    const d = new Date(anchor + "T12:00:00");
    d.setDate(d.getDate() + delta * 7);
    setAnchor(mondayOfWeekContaining(d.toISOString().slice(0, 10)));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-hero-mobile lg:text-hero text-ink-strong tracking-[-0.03em]">
            Покупки на неделю
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border border-gold/25 bg-surface-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-soft/70"
          >
            ← Назад
          </button>
          <button
            type="button"
            onClick={() => setAnchor(mondayOfWeekContaining(new Date().toISOString().slice(0, 10)))}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-md"
          >
            Текущая неделя
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg border border-gold/25 bg-surface-card px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-soft/70"
          >
            Вперёд →
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-gold tracking-wide">
        {fmtWeekRange(anchor)}
      </p>

      {/* Завтрак × 7 */}
      <section className="premium-card rounded-2xl p-6 border-l-[3px] border-l-gold shadow-[var(--shadow-premium-lg)]">
        <h2 className="font-display text-card-title text-ink-strong mb-4">Завтрак (на 7 дней)</h2>
        <ul className="space-y-2.5">
          {WEEKLY_BREAKFAST_PURCHASES.map((row) => (
            <li key={row.product} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-[15px]">
              <span className="font-semibold text-ink min-w-[12rem]">{row.product}</span>
              <span className="text-ink-secondary">{row.qty}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-tertiary mt-4 pt-3 border-t border-border">
          Специи к кофе после завтрака — по вашему обычному запасу; горячая вода — без ограничений по покупке.
        </p>
      </section>

      {/* По дням */}
      <section>
        <h2 className="text-card-title text-ink mb-4">Обеды по дням</h2>
        <div className="overflow-x-auto rounded-2xl border border-gold/20 bg-surface-card shadow-[var(--shadow-premium)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gold-soft/50 border-b border-gold/20">
                <th className="px-4 py-3 font-semibold text-ink-secondary">День</th>
                <th className="px-4 py-3 font-semibold text-ink-secondary">Дата</th>
                <th className="px-4 py-3 font-semibold text-ink-secondary">Тип дня</th>
                <th className="px-4 py-3 font-semibold text-ink-secondary">Белок</th>
                <th className="px-4 py-3 font-semibold text-ink-secondary min-w-[12rem]">Овощи / гарнир</th>
                <th className="px-4 py-3 font-semibold text-ink-secondary">Крупа</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15 bg-surface-card">
              {plan.days.map((row) => (
                <tr key={row.date} className="hover:bg-gold-soft/40">
                  <td className="px-4 py-3 text-ink font-medium capitalize">{row.weekday}</td>
                  <td className="px-4 py-3 text-ink-tertiary tabular-nums">
                    {new Date(row.date + "T12:00:00").toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-secondary max-w-[10rem] leading-snug">{row.dayTypeRu}</td>
                  <td className="px-4 py-3 text-ink">{row.protein}</td>
                  <td className="px-4 py-3 text-ink leading-snug">{row.vegetables}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.riceAllowed ? "text-accent-info font-semibold text-xs" : "text-ink-tertiary text-xs"
                      }
                    >
                      {row.riceAllowed ? "можно" : "без крупы"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Сводка */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="premium-card rounded-2xl p-6">
          <h2 className="text-card-title text-ink-strong mb-1">Сводка: белок за неделю</h2>
          <p className="text-xs text-ink-tertiary mb-4">
            Граммы суммируются по типу продукта (все варианты «курица … г» складываются в одну строку).
          </p>
          <ul className="space-y-3">
            {plan.proteinTotals.map((p) => (
              <li
                key={p.name}
                className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-border/80 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-[15px] font-medium text-ink">{p.name}</span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0 text-[15px] tabular-nums">
                  {p.totalGrams > 0 && (
                    <span className="font-semibold text-accent-dark">{p.totalGrams} г</span>
                  )}
                  {p.totalGrams === 0 && p.name.includes("Без мяса") && (
                    <span className="text-ink-secondary">без порции мяса</span>
                  )}
                  <span className="text-ink-tertiary text-sm">{pluralObed(p.portions)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-surface-card rounded-2xl border border-border-strong p-6 shadow-card">
          <h2 className="text-card-title text-ink mb-4">Сводка: овощи и гарниры</h2>
          <p className="text-xs text-ink-tertiary mb-3">
            Позиции из гарнира по дням; число — в скольких обедах встречается строка. Граммы в названиях не суммируются
            автоматически. Постовые дни и плейсхолдер «—» не учитываются; «гречка 50 г» и «гречка 50–60 г» — одна строка в
            списке (граммы не складываются).
          </p>
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {plan.sidesSummary.map((s) => (
              <li key={s.line} className="flex justify-between items-baseline gap-4 text-[15px] leading-snug">
                <span className="text-ink min-w-0 break-words pr-2">{s.line}</span>
                <span className="text-ink-secondary font-semibold tabular-nums shrink-0 whitespace-nowrap">
                  {s.days}×
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
