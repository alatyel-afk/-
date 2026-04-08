"use client";

import { useEffect, useState } from "react";
import { api, CalendarDay } from "@/lib/api";
import { toFive } from "@/lib/utils";
import { DayKindBadge } from "@/components/ui/DayKindBadge";

const MONTHS = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];

const WKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function retentionDot(v: number) {
  if (v >= 70) return "bg-semantic-danger";
  if (v >= 55) return "bg-accent-info";
  return "bg-accent";
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api.getCalendar(year, month).then(setDays).catch((e) => setErr(e.message));
  }, [year, month]);

  function shift(delta: number) {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  }

  const firstDay = days.length > 0 ? new Date(days[0].date + "T00:00:00").getDay() : 1;
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          className="rounded-xl border border-border-strong bg-surface-card px-3.5 py-2 text-sm text-ink-secondary hover:bg-surface-hover transition-colors shadow-card"
        >
          ←
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-burgundy via-accent-dark to-sage bg-clip-text text-transparent">
          {MONTHS[month - 1]} {year}
        </h1>
        <button
          onClick={() => shift(1)}
          className="rounded-xl border border-border-strong bg-surface-card px-3.5 py-2 text-sm text-ink-secondary hover:bg-surface-hover transition-colors shadow-card"
        >
          →
        </button>
      </div>

      {err && <p className="text-semantic-danger text-sm">{err}</p>}

      <div className="grid grid-cols-7 gap-1 text-center">
        {WKDAYS.map((d) => (
          <div key={d} className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const dayNum = new Date(d.date + "T00:00:00").getDate();
          return (
            <a
              key={d.date}
              href={`/today?on=${d.date}`}
              className="group bg-surface-card rounded-xl border border-border-strong p-2.5 shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all flex flex-col gap-1 min-h-[128px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{dayNum}</span>
                <span className="text-[10px] text-ink-tertiary tabular-nums">
                  {d.lunar_day_number} л.д.
                </span>
              </div>
              <span className="text-[10px] text-ink-secondary leading-snug truncate">
                {d.nakshatra}
              </span>
              <DayKindBadge kind={d.day_type} />

              {d.natal_alignment_hint && (
                <p className="text-[9px] text-ink-tertiary leading-snug line-clamp-3" title={d.natal_alignment_hint}>
                  {d.natal_alignment_hint}
                </p>
              )}

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1" title="Задержка воды">
                  <span className={`h-1.5 w-1.5 rounded-full ${retentionDot(d.water_retention_risk)}`} />
                  <span className="text-[10px] text-ink-tertiary tabular-nums">{toFive(d.water_retention_risk)}/5</span>
                </div>
                <div className="flex items-center gap-1" title="Возможность выведения">
                  <span className="text-[10px] text-ink-tertiary tabular-nums">{toFive(d.release_drainage_potential)}/5</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${retentionDot(100 - d.release_drainage_potential)}`} />
                </div>
              </div>

              {(d.ekadashi_flag || d.pradosh_flag) && (
                <div className="flex gap-1.5 mt-0.5">
                  {d.ekadashi_flag && (
                    <span className="text-[9px] font-semibold text-semantic-info">ЭКА</span>
                  )}
                  {d.pradosh_flag && (
                    <span className="text-[9px] font-semibold text-semantic-info">ПРА</span>
                  )}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
