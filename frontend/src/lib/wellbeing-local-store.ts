/**
 * Резервная копия записей самочувствия в localStorage (браузер).
 * Серверный in-memory store теряется при перезапуске — локальная копия позволяет не потерять историю на устройстве.
 */

import type { BodySignal, BodySignalWithContext, NutritionLog } from "./api";

const KEY = "jyotish_wellbeing_days_v1";

interface StoredPayload {
  v: 1;
  days: Record<string, { signal: BodySignal; nutrition: NutritionLog | null }>;
}

function readRaw(): StoredPayload {
  if (typeof window === "undefined") return { v: 1, days: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { v: 1, days: {} };
    const p = JSON.parse(raw) as StoredPayload;
    if (p?.v !== 1 || typeof p.days !== "object" || !p.days) return { v: 1, days: {} };
    return p;
  } catch {
    return { v: 1, days: {} };
  }
}

function writeRaw(p: StoredPayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* квота / приватный режим */
  }
}

/** Сохранить или обновить день после успешного сохранения на сервере. */
export function persistWellbeingDay(signal: BodySignal, nutrition: NutritionLog | null) {
  const date = signal.day_date;
  if (!date) return;
  const cur = readRaw();
  cur.days[date] = { signal: { ...signal, day_date: date }, nutrition };
  writeRaw(cur);
}

/** Объединить ответ API с локальной копией (локальные поля дополняют пропуски в API). */
export function mergeWellbeingHistoryWithLocal(apiRows: BodySignalWithContext[]): BodySignalWithContext[] {
  const local = readRaw().days;
  const map = new Map<string, BodySignalWithContext>();

  for (const row of apiRows) {
    map.set(row.signal.day_date, { ...row, signal: { ...row.signal }, nutrition: row.nutrition });
  }

  for (const [date, pack] of Object.entries(local)) {
    const existing = map.get(date);
    if (!existing) {
      map.set(date, {
        signal: pack.signal,
        nutrition: pack.nutrition,
      });
      continue;
    }
    map.set(date, {
      ...existing,
      signal: mergeSignals(existing.signal, pack.signal),
      nutrition: mergeNutrition(existing.nutrition, pack.nutrition),
    });
  }

  return [...map.values()].sort((a, b) => a.signal.day_date.localeCompare(b.signal.day_date));
}

function mergeSignals(a: BodySignal, b: BodySignal): BodySignal {
  const m = <T,>(va: T | null | undefined, vb: T | null | undefined): T | null | undefined =>
    vb !== null && vb !== undefined ? vb : va;
  return {
    day_date: a.day_date,
    ankles_evening: m(a.ankles_evening, b.ankles_evening) ?? null,
    eye_area_morning: m(a.eye_area_morning, b.eye_area_morning) ?? null,
    weight_kg: m(a.weight_kg, b.weight_kg) ?? null,
    tissue_density: m(a.tissue_density, b.tissue_density) ?? null,
    head_overload: m(a.head_overload, b.head_overload) ?? null,
    sleep_quality: m(a.sleep_quality, b.sleep_quality) ?? null,
    sweet_craving: m(a.sweet_craving, b.sweet_craving) ?? null,
    salty_craving: m(a.salty_craving, b.salty_craving) ?? null,
    energy_level: m(a.energy_level, b.energy_level) ?? null,
    notes: b.notes != null && b.notes !== "" ? b.notes : a.notes ?? null,
  };
}

function mergeNutrition(
  a: NutritionLog | null | undefined,
  b: NutritionLog | null | undefined,
): NutritionLog | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return {
    day_date: a.day_date,
    lunch_type: b.lunch_type ?? a.lunch_type,
    had_rice: b.had_rice ?? a.had_rice,
    heaviness: b.heaviness ?? a.heaviness,
    rebound_after_ekadashi_pradosh: b.rebound_after_ekadashi_pradosh ?? a.rebound_after_ekadashi_pradosh,
    notes: b.notes ?? a.notes,
  };
}

export function exportLocalWellbeingRawJson(): string {
  return JSON.stringify(readRaw(), null, 2);
}
