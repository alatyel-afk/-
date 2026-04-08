import type { DailyProtocolUi } from "@/core/protocol/daily-protocol-ui";

const BASE = "/api";

function parseJson<T>(text: string, hint: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`${hint}: ответ не JSON (${preview}${text.length > 160 ? "…" : ""})`);
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    const preview = text.replace(/\s+/g, " ").slice(0, 200);
    throw new Error(
      `API ${res.status}: ${res.statusText}${preview ? ` — ${preview}` : ""}`
    );
  }
  return parseJson<T>(text, "API");
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const preview = text.replace(/\s+/g, " ").slice(0, 200);
    throw new Error(
      `API ${res.status}: ${res.statusText}${preview ? ` — ${preview}` : ""}`
    );
  }
  return parseJson<T>(text, "API");
}

export interface RiceDecision {
  allowed: boolean;
  reason: string;
}

export interface LunchSpec {
  matrix_used: string;
  protein: string;
  vegetables: string;
  full_description: string;
  time_window: string;
  early_lunch: boolean;
}

export interface SupplementSlot {
  time: string;
  items: string;
}

export interface NatalDayForecastPayload {
  title: string;
  tithi_label: string;
  paragraphs: string[];
}

export interface DailyProtocol {
  date: string;
  weekday: string;
  lunar_day_number: number;
  /** Напр. «Кришна Шаштхи», «Шукла Пурнима» */
  tithi_name_ru: string;
  moon_phase: string;
  nakshatra: string;
  ekadashi_flag: boolean;
  pradosh_flag: boolean;
  day_type: string;
  body_effect_summary: string;
  nutrition: {
    breakfast: string;
    /** Протокол уже учёл накшатру, титхи, фазу, D1/D9 и настройки (поле выдаёт локальный движок; прокси может отсутствовать). */
    selection_assurance?: string;
    lunch: LunchSpec;
    rice: RiceDecision;
    no_food_after_18: boolean;
  };
  supplements: {
    slots: SupplementSlot[];
    endoluten_today: boolean;
    endoluten_note: string;
  };
  breathing_practice: {
    practice: string;
    title_ru: string;
    minutes: number;
    best_time: string;
    posture: string;
    technique: string;
    tongue_position: string;
    contraindication: string;
  };
  mudra_recommendation: {
    mudra: string;
    suggested: boolean;
    name_ru: string;
    duration_minutes: number;
    reason: string;
    finger_technique: string;
    posture: string;
    breathing_during: string;
    tongue_position: string;
    when_to_do: string;
    caution: string;
  };
  aroma_protocol: {
    morning: string;
    morning_detail: string;
    daytime: string;
    daytime_detail: string;
    evening: string;
    evening_detail: string;
    rotation_note?: string;
  };
  movement_load: {
    profile: string;
    detail: string;
    items: string[];
  };
  thyroid_safety_notes: {
    mode: string;
    notes: string[];
  };
  body_markers_to_track: string[];
  warnings: string[];
  scales: {
    water_retention_risk: number;
    release_drainage_potential: number;
    nervous_system_load: number;
    need_for_rhythm_precision: number;
  };
  moon_illumination_pct: number;
  matrix_index: number;
  astro_alignment: AstroAlignment;
  rule_trace: RuleTrace;
  /** Сигнальный движок: шаблоны обеда/дыхания/нагрузки по правилам + русские тексты для UI (локальный движок; прокси может не отдать). */
  signal_protocol_ui?: DailyProtocolUi;
  /** Прогноз по натальной карте (профиль в коде): титхи + транзит Луны в накшатре + связка с наталом. */
  natal_forecast?: NatalDayForecastPayload;
}

export interface AstroAlignment {
  summary: string;
  checks: string[];
  scale_deltas: { wr: number; rel: number; nrv: number; rhy: number };
  natal_moon: { d1_nak: string; d9_nak: string };
  transit_moon: { d1_nak: string; d9_nak: string };
  natal_sun: { d1_nak: string; d9_nak: string };
  transit_sun: { d1_nak: string; d9_nak: string };
}

export interface RuleTrace {
  day_type_rules: string[];
  scales_modifiers: string[];
  rice_rules: string[];
  breathing_rules: string[];
  mudra_rules: string[];
  thyroid_rules: string[];
  body_signal_rules: string[];
  meal_matrix_rules: string[];
  load_rules: string[];
  aroma_rules: string[];
  alignment_rules: string[];
  /** Трассировка сигнального rule-engine (порядок правил, условия). */
  signal_protocol_engine?: string[];
}

export interface CalendarDay {
  date: string;
  lunar_day_number: number;
  nakshatra: string;
  ekadashi_flag: boolean;
  pradosh_flag: boolean;
  day_type: string;
  water_retention_risk: number;
  release_drainage_potential: number;
  matrix_index: number;
  /** Сверка натала с транзитом (D1/D9), как в протоколе «Сегодня» — кратко для ячейки календаря. */
  natal_alignment_hint?: string;
}

export interface BodySignal {
  day_date: string;
  ankles_evening?: number | null;
  eye_area_morning?: number | null;
  weight_kg?: number | null;
  tissue_density?: number | null;
  head_overload?: number | null;
  sleep_quality?: number | null;
  sweet_craving?: number | null;
  salty_craving?: number | null;
  energy_level?: number | null;
  notes?: string | null;
}

export interface NutritionLog {
  day_date: string;
  lunch_type?: string | null;
  had_rice?: boolean | null;
  heaviness?: number | null;
  rebound_after_ekadashi_pradosh?: boolean | null;
  notes?: string | null;
}

export interface BodySignalWithContext {
  signal: BodySignal;
  nutrition?: NutritionLog | null;
  tithi_number?: number | null;
  nakshatra_ru?: string | null;
  day_kind?: string | null;
  water_retention_risk?: number | null;
  release_drainage_potential?: number | null;
  nervous_system_load?: number | null;
}

export const api = {
  getToday: (on?: string) =>
    get<DailyProtocol>(`/today${on ? `?on=${on}` : ""}`),
  getCalendar: (year: number, month: number) =>
    get<CalendarDay[]>(`/calendar?year=${year}&month=${month}`),
  getLunarMatrix: () =>
    get<Record<string, { protein: string; vegetables: string; full_description: string }[]>>("/lunar-matrix"),
  postBodySignal: (entry: BodySignal) =>
    post<BodySignal>("/body-signals", entry),
  getBodySignal: (d: string) =>
    get<BodySignal>(`/body-signals/${d}`),
  postNutritionLog: (entry: NutritionLog) =>
    post<NutritionLog>("/nutrition-log", entry),
  getHistory: (from: string, to: string) =>
    get<BodySignalWithContext[]>(`/history?from_date=${from}&to_date=${to}`),
};
