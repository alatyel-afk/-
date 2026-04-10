import type { Snap } from "../astrology/engine";
import type { Hit } from "../astrology/transit-modifiers";

export type DayType =
  | "stable_day" | "drainage_day" | "caution_day" | "high_sensitivity_day"
  | "ekadashi_day" | "pradosh_day" | "recovery_day_after_reduction"
  | "pre_full_moon_retention_day" | "pre_new_moon_precision_day";

export interface Scales {
  water_retention_risk: number;
  release_drainage_potential: number;
  nervous_system_load: number;
  need_for_rhythm_precision: number;
}

export function clamp(v: number): number { return Math.max(0, Math.min(100, v)); }

const ASPECT_RU: Record<string, string> = { conjunction: "соединении", opposition: "оппозиции", square: "квадрате", trine: "трине" };
const PLANET_RU: Record<string, string> = { Saturn: "Сатурн", Jupiter: "Юпитер", Rahu: "Раху", Ketu: "Кету" };

export function computeScales(snap: Snap, hits: Hit[], prevReduction: boolean): { scales: Scales; trace: string[] } {
  let wr = 50, rel = 50, nrv = 50, rhy = 50;
  const trace = ["Начальные значения: задержка воды 50, выведение 50, нервная нагрузка 50, режим 50"];
  const ld = snap.tithi;

  if ([7, 14, 21, 27].includes(ld)) { wr += 10; trace.push(`${ld}-й лунный день повышает задержку воды (+10)`); }
  if ([8, 17, 25].includes(ld)) { rel += 8; trace.push(`${ld}-й лунный день улучшает выведение (+8)`); }
  if ([5, 10, 15, 24].includes(ld)) { nrv += 6; trace.push(`${ld}-й лунный день повышает нервную нагрузку (+6)`); }
  if ([4, 9, 18, 26].includes(ld)) { rhy += 6; trace.push(`${ld}-й лунный день повышает важность режима (+6)`); }

  if (snap.isEkadashi) { rel += 14; wr -= 8; rhy += 6; trace.push("Экадаши: выведение усилено (+14), задержка снижена (−8), режим важнее (+6)"); }
  if (snap.isPradosh) { nrv += 6; rhy += 5; rel += 6; trace.push("Прадош: нервная нагрузка выше (+6), режим важнее (+5), выведение чуть лучше (+6)"); }
  if (prevReduction) { rel -= 6; wr += 5; nrv += 4; trace.push("Вчера была разгрузка: выведение ослабло (−6), задержка чуть выше (+5), нервы напряжены (+4)"); }

  if (snap.illum > 0.85) { wr += 8; nrv += 5; trace.push(`Луна почти полная (${(snap.illum * 100).toFixed(0)}%): задержка воды выше (+8), нервная нагрузка выше (+5)`); }
  else if (snap.illum < 0.15) { rhy += 8; nrv += 4; trace.push(`Луна почти новая (${(snap.illum * 100).toFixed(0)}%): режим критичнее (+8), нервная нагрузка чуть выше (+4)`); }

  for (const h of hits) {
    if (h.target === "moon" && h.planet === "Saturn" && h.aspect === "conjunction") {
      wr += 12; nrv += 10; rhy += 8;
      trace.push("Транзит Сатурна в соединении с натальной Луной — задержка (+12), нервы (+10), режим (+8)");
    }
    if (h.target === "moon" && ["Rahu", "Ketu"].includes(h.planet) && ["conjunction", "opposition"].includes(h.aspect)) {
      nrv += 8; wr += 6;
      trace.push(`Транзит ${PLANET_RU[h.planet] ?? h.planet} в ${ASPECT_RU[h.aspect] ?? h.aspect} с натальной Луной — нервы (+8), задержка (+6)`);
    }
    if (h.target === "moon" && h.planet === "Jupiter" && h.aspect === "trine") {
      rel += 5; nrv -= 4;
      trace.push("Транзит Юпитера в трине с натальной Луной — выведение лучше (+5), нервная нагрузка ниже (−4)");
    }
  }

  const scales = {
    water_retention_risk: clamp(wr), release_drainage_potential: clamp(rel),
    nervous_system_load: clamp(nrv), need_for_rhythm_precision: clamp(rhy),
  };
  trace.push(`Итого: задержка ${scales.water_retention_risk}, выведение ${scales.release_drainage_potential}, нервная нагрузка ${scales.nervous_system_load}, режим ${scales.need_for_rhythm_precision}`);
  return { scales, trace };
}

/** Узкое окно у полнолуния (элонгация Луна–Солнце): ~последние титхи перед пиком, не половина месяца. */
export function isPreFullMoonBand(elongDeg: number): boolean {
  const e = elongDeg % 360;
  return e >= 156 && e <= 180;
}

/** Узкое окно у новолуния: начало/конец цикла по элонгации. */
export function isPreNewMoonBand(elongDeg: number): boolean {
  const e = elongDeg % 360;
  return e <= 24 || e >= 336;
}

export function resolveDayType(scales: Scales, snap: Snap, prevReduction: boolean): { dayType: DayType; trace: string[] } {
  const trace: string[] = [];
  if (snap.isEkadashi) { trace.push("Сегодня экадаши — это определяет тип дня"); return { dayType: "ekadashi_day", trace }; }
  if (snap.isPradosh) { trace.push("Сегодня прадоша — это определяет тип дня"); return { dayType: "pradosh_day", trace }; }
  if (prevReduction) { trace.push("Вчера была экадаши или прадоша — сегодня день восстановления"); return { dayType: "recovery_day_after_reduction", trace }; }
  if (isPreFullMoonBand(snap.elong)) {
    trace.push(
      `Элонгация ${snap.elong.toFixed(0)}° (узкий канун полнолуния) — задержка жидкости, тип «канун полнолуния»`
    );
    return { dayType: "pre_full_moon_retention_day", trace };
  }
  if (isPreNewMoonBand(snap.elong)) {
    trace.push(
      `Элонгация ${snap.elong.toFixed(0)}° (узкий канун новолуния) — важна точность режима`
    );
    return { dayType: "pre_new_moon_precision_day", trace };
  }
  if (scales.water_retention_risk >= 72 && scales.nervous_system_load >= 68) { trace.push(`Удержание в тканях (${scales.water_retention_risk}) и нервная нагрузка (${scales.nervous_system_load}) одновременно высокие — день повышенного внимания`); return { dayType: "caution_day", trace }; }
  if (scales.nervous_system_load >= 75 || scales.need_for_rhythm_precision >= 78) { trace.push(`Нервная нагрузка (${scales.nervous_system_load}) или важность режима (${scales.need_for_rhythm_precision}) критически высокие — нервная система под нагрузкой`); return { dayType: "high_sensitivity_day", trace }; }
  if (scales.release_drainage_potential >= 72 && scales.water_retention_risk <= 55) { trace.push(`Хороший потенциал выведения (${scales.release_drainage_potential}) при низкой задержке (${scales.water_retention_risk}) — день выведения воды`); return { dayType: "drainage_day", trace }; }
  trace.push("Нет особых факторов — устойчивый тип дня по шкалам");
  return { dayType: "stable_day", trace };
}

export { ASPECT_RU, PLANET_RU };
