import type { DayType } from "./rules";

export interface AromaOut {
  morning: string; morning_detail: string;
  daytime: string; daytime_detail: string;
  evening: string; evening_detail: string;
  /** Пояснение ротации восьми масел по дате */
  rotation_note?: string;
}

/** Восемь позиций для ротации по дате (домашняя коллекция эфирных масел). */
export const ROTATING_OIL_KEYS = [
  "frankincense",
  "geranium",
  "rose",
  "rosemary",
  "leuzea",
  "vetiver",
  "lavender",
  "bergamot",
] as const;

const RU_NAME: Record<(typeof ROTATING_OIL_KEYS)[number], string> = {
  frankincense: "Ладан",
  geranium: "Герань",
  rose: "Роза",
  rosemary: "Розмарин",
  leuzea: "Левзея",
  vetiver: "Ветивер",
  lavender: "Лаванда",
  bergamot: "Бергамот",
};

function seedFromDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return h;
}

/** Заменить первое слово до запятой (название масла) в строке рекомендации. */
function replaceLeadingOilRu(detail: string, oilRu: string): string {
  const t = detail.trim();
  if (/^Смесь/i.test(t)) return detail;
  return detail.replace(/^[^,]+/, oilRu);
}

/**
 * Базовые шаблоны по типу дня + ротация из 8 масел по календарной дате.
 * Слоты «Смесь „Антистресс“» не меняются (уже готовая композиция).
 */
export function buildRotatingAroma(dayType: DayType, dateStr: string, forceCalm: boolean): AromaOut {
  if (forceCalm) {
    const s = seedFromDate(dateStr + "calm");
    const calm = ["Роза", "Лаванда", "Герань", "Ветивер"] as const;
    const a = calm[s % 4];
    const c = calm[(s + 2) % 4];
    return {
      morning: "rose",
      morning_detail: `${a}, 1 капля. Голова перегружена — никаких тонизирующих ароматов.`,
      daytime: "anti_stress_blend",
      daytime_detail: "Смесь «Антистресс», 15–20 мин через аромалампу. Перегруз головы.",
      evening: "rose",
      evening_detail: `${c}, 1 капля. Вечером без стимуляции.`,
    };
  }

  const base = AROMAS[dayType];
  const s = seedFromDate(dateStr);
  const pick = (slot: number) => ROTATING_OIL_KEYS[(s + slot * 3) % ROTATING_OIL_KEYS.length];
  const ru = (slot: number) => RU_NAME[pick(slot)];
  const a = ru(0);
  const b = ru(1);
  const c = ru(2);

  return {
    morning: base.morning,
    morning_detail: replaceLeadingOilRu(base.morning_detail, a),
    daytime: base.daytime,
    daytime_detail: replaceLeadingOilRu(base.daytime_detail, b),
    evening: base.evening,
    evening_detail: replaceLeadingOilRu(base.evening_detail, c),
  };
}

export const AROMAS: Record<DayType, AromaOut> = {
  stable_day: { morning: "frankincense", morning_detail: "Ладан, 1 капля на запястье. Помогает собраться утром.", daytime: "geranium", daytime_detail: "Герань, 1 капля. Ровный фон без возбуждения.", evening: "rose", evening_detail: "Роза, 1 капля. Перед сном, без активных ароматов." },
  drainage_day: { morning: "rosemary", morning_detail: "Розмарин, 1 капля. Проясняет голову, помогает двигаться.", daytime: "geranium", daytime_detail: "Герань, 1 капля. Ровный фон.", evening: "frankincense", evening_detail: "Ладан, 1 капля. Только если голова не перегружена." },
  caution_day: { morning: "geranium", morning_detail: "Герань, 1 капля. Не стимулирует, снимает тяжесть в голове.", daytime: "anti_stress_blend", daytime_detail: "Смесь «Антистресс», 20 мин через аромалампу.", evening: "rose", evening_detail: "Роза, 1 капля. Без стимулирующих ароматов вечером." },
  high_sensitivity_day: { morning: "rose", morning_detail: "Роза, 1 капля на запястье. Не перегружать нос ароматами.", daytime: "anti_stress_blend", daytime_detail: "Смесь «Антистресс», 15 мин через аромалампу.", evening: "rose", evening_detail: "Роза, 1 капля. Тихий вечер, без новых запахов." },
  ekadashi_day: { morning: "rose", morning_detail: "Роза, 1 капля. Не стимулировать аппетит ароматами.", daytime: "anti_stress_blend", daytime_detail: "Смесь «Антистресс», если появится раздражительность от голода.", evening: "rose", evening_detail: "Роза, 1 капля. Вечером без стимуляции." },
  pradosh_day: { morning: "frankincense", morning_detail: "Ладан, 1 капля. Собранность с утра.", daytime: "rose", daytime_detail: "Роза, 1 капля. Если нервный фон повышен.", evening: "geranium", evening_detail: "Герань, 1 капля коротко. Не позже чем за час до сна." },
  recovery_day_after_reduction: { morning: "rosemary", morning_detail: "Розмарин, 1 капля. Помогает проснуться после разгрузки.", daytime: "geranium", daytime_detail: "Герань, 1 капля. Ровный фон.", evening: "frankincense", evening_detail: "Ладан, 1 капля. Не использовать при жаре в голове." },
  pre_full_moon_retention_day: { morning: "geranium", morning_detail: "Герань, 1 капля. Не стимулирует, снимает тяжесть.", daytime: "anti_stress_blend", daytime_detail: "Смесь «Антистресс», 20 мин через аромалампу.", evening: "rose", evening_detail: "Роза, 1 капля. Без стимулирующих ароматов." },
  pre_new_moon_precision_day: { morning: "frankincense", morning_detail: "Ладан, 1 капля. Помогает удержать фокус.", daytime: "leuzea", daytime_detail: "Левзея, 1 капля. Только при сонливости, не при тревоге.", evening: "rose", evening_detail: "Роза, 1 капля. Вечером без тонизирующих ароматов." },
};
