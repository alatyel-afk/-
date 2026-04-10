/**
 * Список покупок на неделю: строится из buildProtocol по датам (те же транзиты,
 * титхи, фаза, тип дня и матрица, что на «Сегодня»). Подмена ингредиентов вне
 * протокола не предусмотрена; допустимые продукты — в fixed-rules / «Настройки».
 */
import { buildProtocol } from "./daily-protocol-builder";
import { WEEKDAYS } from "../profile/fixed-rules";

/** Понедельник недели, в которой лежит `dateStr` (YYYY-MM-DD). */
export function mondayOfWeekContaining(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

/** 7 дат с понедельника по воскресенье. */
export function weekDatesFromMonday(mondayISO: string): string[] {
  const d = new Date(mondayISO + "T12:00:00");
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    dates.push(x.toISOString().slice(0, 10));
  }
  return dates;
}

/** Подписи как на странице «Сегодня» (бейдж типа дня). */
const DAY_TYPE_RU: Record<string, string> = {
  stable_day: "устойчивый день",
  drainage_day: "день дренажа",
  caution_day: "день осторожности",
  high_sensitivity_day: "чувствительный день",
  ekadashi_day: "экадаши",
  pradosh_day: "прадош",
  recovery_day_after_reduction: "день восстановления",
  pre_full_moon_retention_day: "канун полнолуния",
  pre_new_moon_precision_day: "канун новолуния",
};

export interface WeekDayPurchaseRow {
  date: string;
  weekday: string;
  dayTypeRu: string;
  protein: string;
  vegetables: string;
  riceAllowed: boolean;
}

export interface CountedLine {
  line: string;
  days: number;
}

/** Сумма граммов по нормализованному названию белка (без «г» в ключе). */
export interface ProteinTotalRow {
  /** Например: «курица», «печень говяжья» */
  name: string;
  /** Сумма граммов за неделю по всем обедам этого типа */
  totalGrams: number;
  /** Сколько обедов с этим типом белка */
  portions: number;
}

/** Строки завтрака на 7 дней по фиксированному протоколу (BREAKFAST). */
export const WEEKLY_BREAKFAST_PURCHASES: { product: string; qty: string }[] = [
  { product: "Яйца", qty: "7 шт. (по 1 на завтрак)" },
  { product: "Бананы или финики", qty: "7 бананов или 14 фиников" },
  { product: "Черри", qty: "≈35 шт. (по 5 на завтрак)" },
  { product: "Листовой салат", qty: "≈175–210 г (по 25–30 г на завтрак)" },
  { product: "Адыгейский сыр (по желанию)", qty: "до ≈210–280 г (по 30–40 г) или реже" },
];

function bump(map: Map<string, number>, key: string) {
  const k = key.toLowerCase().replace(/\s+/g, " ").trim();
  if (!k) return;
  map.set(k, (map.get(k) ?? 0) + 1);
}

/** Запятые внутри круглых скобок не разделяют позиции (напр. уточнение к зелени в скобках). */
export function splitCommaOutsideParens(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth += 1;
    else if (c === ")" && depth > 0) depth -= 1;
    if (c === "," && depth === 0) {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
    } else {
      cur += c;
    }
  }
  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

/** В сводке покупок убираем повторяющееся уточнение «(укроп/петрушка)» из строк овощей — зелень и так в списке отдельно. */
export function stripGreensCilantroNoteForShopping(s: string): string {
  return s
    .replace(/\s*\(\s*укроп\/петрушка\s*,\s*без кинзы\s*\)/gi, "")
    .replace(/\s*\(\s*укроп\/петрушка\s*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Разбор строки гарнира: сначала по «;», затем по запятым вне скобок; специи к рису — одна строка в списке покупок. */
export function normalizeSideKey(part: string): string {
  const t = part.trim();
  if (!t) return t;
  if (/специи к варёному рису в крупе/i.test(t)) {
    return "Специи к варёному рису в крупе: молотый чёрный перец, сушёная мята";
  }
  if (/варёный со специями в крупе/i.test(t) || /специями в зёрнах/i.test(t)) {
    return "Специи к варёному рису в крупе: молотый чёрный перец, сушёная мята";
  }
  if (/молотый чёрный перец\s+и\s+сушёная мята/i.test(t)) {
    return "Специи к варёному рису в крупе: молотый чёрный перец, сушёная мята";
  }
  const rest = stripGreensCilantroNoteForShopping(t.replace(/сушеная мята/gi, "сушёная мята"));
  return rest;
}

function splitSides(s: string): string[] {
  const fixed = s.replace(/сушеная мята/gi, "сушёная мята");
  const segments = fixed.split(";").map((x) => x.trim()).filter(Boolean);
  const out: string[] = [];
  for (const seg of segments) {
    for (const part of splitCommaOutsideParens(seg)) {
      out.push(normalizeSideKey(part));
    }
  }
  return out.filter((x) => x.length > 0);
}

function mapToSortedCounts(map: Map<string, number>): CountedLine[] {
  return [...map.entries()]
    .map(([line, days]) => ({ line, days }))
    .sort((a, b) => b.days - a.days || a.line.localeCompare(b.line, "ru"));
}

/**
 * Из строки вида «курица 110 г» / «печень говяжья 110 г» извлекает название и граммы.
 * Для «—» (экадаши) граммы нет.
 */
export function parseProteinLine(line: string): { name: string; grams: number | null } {
  const t = line.trim();
  if (t === "—") return { name: "Без мяса (экадаши)", grams: null };
  const m = t.match(/^(.*?)(\d+)\s*г\s*$/u);
  if (!m) return { name: t, grams: null };
  const name = m[1].trim().replace(/\s+/g, " ");
  const grams = parseInt(m[2], 10);
  if (Number.isNaN(grams)) return { name, grams: null };
  return { name, grams };
}

function aggregateProteinTotals(proteinLines: string[]): ProteinTotalRow[] {
  const map = new Map<string, { grams: number; portions: number }>();
  for (const line of proteinLines) {
    const { name, grams } = parseProteinLine(line);
    const cur = map.get(name) ?? { grams: 0, portions: 0 };
    cur.portions += 1;
    if (grams !== null) cur.grams += grams;
    map.set(name, cur);
  }
  return [...map.entries()]
    .map(([name, { grams, portions }]) => ({
      name,
      totalGrams: grams,
      portions,
    }))
    .sort((a, b) => {
      if (b.totalGrams !== a.totalGrams) return b.totalGrams - a.totalGrams;
      return a.name.localeCompare(b.name, "ru");
    });
}

export interface WeekShoppingPlan {
  weekMonday: string;
  days: WeekDayPurchaseRow[];
  /** Суммы граммов по типу белка за неделю */
  proteinTotals: ProteinTotalRow[];
  /** Сколько раз встречается та же строка белка за неделю (детализация) */
  proteinSummary: CountedLine[];
  /** Сколько раз встречается позиция из гарнира/овощей (по частям списка) */
  sidesSummary: CountedLine[];
}

/**
 * План покупок на неделю по протоколу без учёта самочувствия (как база для магазина).
 */
export function buildWeekShoppingPlan(weekMondayISO: string): WeekShoppingPlan {
  const dates = weekDatesFromMonday(weekMondayISO);
  const days: WeekDayPurchaseRow[] = [];
  const proteinMap = new Map<string, number>();
  const sidesMap = new Map<string, number>();
  const proteinLines: string[] = [];

  for (const dateStr of dates) {
    const p = buildProtocol(dateStr, null);
    const lunch = p.nutrition.lunch;
    const dow = new Date(dateStr + "T12:00:00").getDay();

    days.push({
      date: dateStr,
      weekday: WEEKDAYS[dow] ?? dateStr,
      dayTypeRu: DAY_TYPE_RU[p.day_type] ?? p.day_type,
      protein: lunch.protein,
      vegetables: lunch.vegetables,
      riceAllowed: p.nutrition.rice.allowed,
    });

    bump(proteinMap, lunch.protein);
    proteinLines.push(lunch.protein);
    for (const part of splitSides(lunch.vegetables)) {
      bump(sidesMap, part);
    }
  }

  return {
    weekMonday: weekMondayISO,
    days,
    proteinTotals: aggregateProteinTotals(proteinLines),
    proteinSummary: mapToSortedCounts(proteinMap),
    sidesSummary: mapToSortedCounts(sidesMap),
  };
}
