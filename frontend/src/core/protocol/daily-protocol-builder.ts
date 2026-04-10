import type { DailyProtocol, CalendarDay, BodySignal } from "../../lib/api";
import { computeSnap, type Snap } from "../astrology/engine";
import { evaluateD1D9Alignment, type AstroAlignmentResult } from "../astrology/astro-alignment";
import { findHits } from "../astrology/transit-modifiers";
import { matrixIndex, moonPhaseLineRu } from "../astrology/lunar-day";
import { tithiNameRu } from "../astrology/tithi-names";
import { computeScales, resolveDayType, clamp } from "./rules";
import type { Scales, DayType } from "./rules";
import { NATAL } from "../profile/natal-profile";
import { MEALS, DAY_MATRIX, pickMeal, decideRice, lunchTime } from "./meal-matrix";
import { BREATH_MAP } from "./breathing-rules";
import { selectMudra } from "./mudra-rules";
import { buildRotatingAroma } from "./aroma-rules";
import { buildMovementGuidance } from "./movement-guidance";
import { THYROID_NOTES } from "./thyroid-safety";
import { BREAKFAST, WEEKDAYS, buildSupplements } from "../profile/fixed-rules";
import { interpretSignals } from "../tracking/signal-interpreter";
import { mealMatrixLabel } from "@/lib/meal-matrix-labels";
import { buildDailyProtocolUi } from "./daily-protocol-ui";
import { formatCanonicalLunchForSignalUi } from "./protocol-ui-texts";
import { mapBodySignalToBodySignals, buildDayContextFromSnap } from "./protocol-context";
import { buildNatalDayForecast } from "../astrology/natal-day-forecast";

const EFFECTS: Record<DayType, string> = {
  stable_day:
    "Устойчивый день по календарю: ориентир на шкалы ниже и обед по матрице. Удержание жидкости в этой карте — не «лишняя вода сама по себе», а ответ телесного контура на ритм и нагрузку; подробнее — блок «Логика карты» в настройках.",
  drainage_day:
    "День, когда телу проще отдать лишнее без агрессии к жидкости: ранний лёгкий обед, движение, без обезвоживания и без форсирования «сушки».",
  caution_day:
    "Сочетание риска удержания в тканях и перегруза нервной системы. Обед лёгкий, без гарнира, нагрузку снизить — снимать конфликт контуров, а не «давить на воду».",
  high_sensitivity_day: "Нервная система перегружена. Обед проще, порции меньше, дыхание на успокоение.",
  ekadashi_day: "Экадаши — обед без мяса, порции меньше. Горячая вода, дыхание. Не голодать до срыва вечером.",
  pradosh_day: "Прадош — ранний обед с мясом, но без гарнира. Вечером не компенсировать усталость едой.",
  recovery_day_after_reduction: "Вчера была разгрузка. Сегодня не увеличивать порции и не добавлять новые продукты.",
  pre_full_moon_retention_day: "Канун полнолуния — тело копит воду. Без гарнира, без соусов, без жареного. Обед лёгкий.",
  pre_new_moon_precision_day: "Канун новолуния — важно не сбить режим. Обед ровный и предсказуемый, время еды без сдвигов.",
};

const DAY_TYPE_LABEL_RU: Record<DayType, string> = {
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

/** Текст для пользователя: протокол уже учёл накшатру, титхи, фазу, D1/D9 и тип дня. */
function buildSelectionAssurance(
  snap: Snap,
  tithiName: string,
  dayType: DayType,
  astroSummary: string
): string {
  const dtRu = DAY_TYPE_LABEL_RU[dayType];
  const illumPct = Math.round(snap.illum * 1000) / 10;
  return (
    `Состав обеда подобран автоматически из текущих данных: транзит Луны в накшатре «${snap.nakshatra}», титхи ${snap.tithi} (${tithiName}), фаза — «${snap.phase}» (~${illumPct}% освещённости диска). ` +
    `Тип дня — «${dtRu}»; матрица тарелки и крупа рассчитаны после сверки натального профиля с транзитом (D1/D9) и поправок по шкалам — приложение не подбирает ингредиенты произвольно и не ротирует их вне этих правил. ` +
    `${astroSummary} ` +
    `Если меняется самочувствие — отметьте его на странице «Самочувствие», чтобы пересчитать протокол; допустимые продукты и исключения заданы в «Настройках» и встроены в фиксированные правила расчёта.`
  );
}

function buildWarnings(dt: DayType, scales: Scales): string[] {
  const w: string[] = [];
  if (scales.water_retention_risk >= 65) w.push("Вечером посмотреть на лодыжки. Если отёк больше обычного — утром проверить зону под глазами.");
  if (scales.nervous_system_load >= 70) w.push("Вечером без лишнего кофеина. Только вечерний слот добавок (магний, ГАМК, 5-HTP).");
  if (dt === "ekadashi_day") w.push("Голод — не повод есть после 18:00. Если тяжело — горячая вода.");
  if (dt === "pradosh_day") w.push("Вечером не принимать серьёзных решений и не ввязываться в споры. Желудок пустой, нервная система на взводе.");
  if (dt === "pre_full_moon_retention_day") w.push("Полнолуние ухудшает сон. Никаких острых специй сверх фиксированного завтрака.");
  return w;
}

function buildTracking(dt: DayType, scales: Scales): string[] {
  const t = [
    "Лодыжки к вечеру — есть ли отёк, больше или меньше, чем вчера",
    "Глаза утром следующего дня — припухлость, мешки",
    "Тянет ли на плотную или солёную еду — записать, если да",
    "Голова перегружена или раздражительность — отметить уровень",
  ];
  if (scales.need_for_rhythm_precision >= 70) t.push("Обед точно по времени — сдвиг не больше 15 минут");
  if (dt === "recovery_day_after_reduction") t.push("Есть ли тяжесть в теле после вчерашней разгрузки");
  return t;
}

export function buildProtocol(dateStr: string, bodySignals?: BodySignal | null): DailyProtocol {
  const d = new Date(`${dateStr}T12:00:00`);
  const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);

  const snap = computeSnap(d);
  const hits = findHits(snap);

  const prevD = new Date(d.getTime() - 86400000);
  const prevSnap = computeSnap(prevD);
  const prevReduction = prevSnap.isEkadashi || prevSnap.isPradosh;

  const { scales: baseScales, trace: scalesTrace } = computeScales(snap, hits, prevReduction);
  scalesTrace.pop();

  const astro = evaluateD1D9Alignment(NATAL, snap);
  const scalesAfterAstro: Scales = {
    water_retention_risk: clamp(baseScales.water_retention_risk + astro.deltas.wr),
    release_drainage_potential: clamp(baseScales.release_drainage_potential + astro.deltas.rel),
    nervous_system_load: clamp(baseScales.nervous_system_load + astro.deltas.nrv),
    need_for_rhythm_precision: clamp(baseScales.need_for_rhythm_precision + astro.deltas.rhy),
  };
  if (astro.deltas.wr || astro.deltas.rel || astro.deltas.nrv || astro.deltas.rhy) {
    scalesTrace.push(
      `Сверка D1/D9 (Луна, Солнце, натал vs транзит): Δ задержка ${astro.deltas.wr}, Δ выведение ${astro.deltas.rel}, Δ нервы ${astro.deltas.nrv}, Δ режим ${astro.deltas.rhy}`
    );
  }
  scalesTrace.push(
    `Натал vs транзит: Луна D1 ${astro.natal_moon.d1_nak} / D9 ${astro.natal_moon.d9_nak} → транзит D1 ${astro.transit_moon.d1_nak} / D9 ${astro.transit_moon.d9_nak}; Солнце D1 ${astro.natal_sun.d1_nak} / D9 ${astro.natal_sun.d9_nak} → транзит D1 ${astro.transit_sun.d1_nak} / D9 ${astro.transit_sun.d9_nak}`
  );
  scalesTrace.push(
    `Итого после сверки D1/D9: задержка ${scalesAfterAstro.water_retention_risk}, выведение ${scalesAfterAstro.release_drainage_potential}, нервная нагрузка ${scalesAfterAstro.nervous_system_load}, режим ${scalesAfterAstro.need_for_rhythm_precision}`
  );

  const ov = bodySignals ? interpretSignals(bodySignals) : null;
  const scales: Scales = ov
    ? {
        water_retention_risk: clamp(scalesAfterAstro.water_retention_risk + ov.scaleDeltas.wr),
        release_drainage_potential: clamp(scalesAfterAstro.release_drainage_potential + ov.scaleDeltas.rel),
        nervous_system_load: clamp(scalesAfterAstro.nervous_system_load + ov.scaleDeltas.nrv),
        need_for_rhythm_precision: clamp(scalesAfterAstro.need_for_rhythm_precision + ov.scaleDeltas.rhy),
      }
    : scalesAfterAstro;

  if (ov) {
    scalesTrace.push(`Самочувствие сдвинуло шкалы: задержка +${ov.scaleDeltas.wr}, выведение +${ov.scaleDeltas.rel}, нервы +${ov.scaleDeltas.nrv}, режим +${ov.scaleDeltas.rhy}`);
    scalesTrace.push(`Итого: задержка ${scales.water_retention_risk}, выведение ${scales.release_drainage_potential}, нервная нагрузка ${scales.nervous_system_load}, режим ${scales.need_for_rhythm_precision}`);
  }

  const { dayType, trace: dtTrace } = resolveDayType(scales, snap, prevReduction);

  let matrix = DAY_MATRIX[dayType];
  const mmTrace = [`По типу дня подобран обед: ${mealMatrixLabel(matrix)}`];

  if (ov?.forceRetentionMatrix && matrix !== "C_retention" && matrix !== "D_ekadashi") {
    matrix = "C_retention";
    mmTrace.push("Лодыжки отекли — обед переключён на лёгкий вариант при отёках");
  }
  if (ov?.reduceMealComplexity && matrix === "A_stable") {
    matrix = "B_nervous";
    mmTrace.push("Голова перегружена — полноценный обед заменён на более простой");
  }

  const rice = decideRice(dayType, scales);
  if (ov?.forceNoRice && rice.allowed) {
    rice.allowed = false;
    rice.reason = "Отёк под глазами утром — гарнир и тяжёлая еда исключены.";
    rice.trace.push("Отёк под глазами — гарнир запрещён");
  }
  if (ov?.riceConditionallyAllowed && !rice.allowed && dayType === "stable_day" && !ov.forceNoRice && !ov.forceRetentionMatrix) {
    rice.allowed = true;
    rice.reason = "Мало сил, отёков нет — малая порция крупы допустима.";
    rice.trace.push("Мало сил, отёков нет — гарнир допустим в ровный день");
  }

  let finalMatrix = matrix;
  if (rice.allowed && finalMatrix !== "F_grain" && finalMatrix !== "D_ekadashi") {
    finalMatrix = "F_grain";
    mmTrace.push("Крупа разрешена по правилам дня — в обед добавлен гарнир");
  }
  const meal = pickMeal(finalMatrix, doy);
  mmTrace.push(`Итого: ${mealMatrixLabel(finalMatrix)}`);

  let br = BREATH_MAP[dayType];
  const breathTrace = [`По типу дня назначена практика: ${br.title}`];
  if (ov?.forceCalmBreathing && br.practice !== "bhramari" && br.practice !== "diaphragmatic") {
    if (scales.nervous_system_load >= 70) {
      br = BREATH_MAP.high_sensitivity_day;
      breathTrace.push("Голова сильно перегружена (нервная нагрузка ≥ 70) — переключено на бхрамари");
    } else {
      br = { practice: "lengthened_exhale", title: "Удлинённый выдох 1:2 (голова перегружена)", min: 10, time: "Как только почувствовали перегруз, но не позже 17:30.", posture: "Сидя с прямой спиной, стопы на полу.", technique: "Вдох через нос на 4 счёта. Выдох через нос на 8 счётов — очень плавно, без усилия.", tongue: "Кончик языка к верхнему нёбу.", contra: "Не делать на полный желудок. При головокружении — остановиться." };
      breathTrace.push("Голова перегружена — переключено на удлинённый выдох для успокоения");
    }
  }
  breathTrace.push(`Выбрано: ${br.title}, ${br.min} мин`);

  const highRetention = scales.water_retention_risk >= 65 || (ov?.forceRetentionMatrix ?? false);
  const { mudra, trace: mudraTrace } = selectMudra(dayType, highRetention);
  if (ov?.forceCalmBreathing && !mudra.suggested) {
    mudraTrace.push("Голова перегружена — рассматривается ваю-мудра");
    if (!highRetention) {
      Object.assign(mudra, {
        mudra: "vayu", suggested: true, name_ru: "Ваю-мудра", duration_minutes: 3,
        reason: "Голова перегружена — снижение напряжения.",
        finger_technique: "Указательный палец к основанию большого, большой прижимает сверху.",
        posture: "Сидя, руки на коленях.", breathing_during: "Ровное, 4:4.",
        tongue_position: "Язык свободно.", when_to_do: "При нервном напряжении, максимум 3 мин.",
        caution: "При тревоге сократить до 2 мин.",
      });
      mudraTrace.push("Голова перегружена, задержка невысокая — назначена ваю-мудра");
    }
  }

  const mg = buildMovementGuidance(dayType, snap.tithi, snap.elong, {
    noIntensifyExercise: ov?.noIntensifyExercise ?? false,
  });
  let load = { profile: mg.profile, detail: mg.detail, items: mg.items };
  if (ov?.noIntensifyExercise && dayType === "stable_day" && mg.profile === "moderate") {
    load = {
      profile: "walk_soft",
      detail: mg.detail,
      items: [
        "Плохой сон — объём движения снижен: без умеренной нагрузки, только мягкая ходьба и короткая виброплатформа.",
        ...mg.items,
      ],
    };
  }
  const loadTrace = [
    `Движение по типу дня, титхи ${snap.tithi} и фазе Луны (без спортивного тона).`,
    ...load.items.map((line) => `→ ${line}`),
  ];
  if (ov?.noIntensifyExercise) {
    loadTrace.push("Плохой сон — нагрузка дополнительно смягчена в блоке рекомендаций.");
  }

  let aroma = buildRotatingAroma(dayType, dateStr, false);
  const aromaTrace = [`По типу дня и ротации 8 масел (${dateStr})`];
  if (ov?.forceCalmBreathing) {
    aroma = buildRotatingAroma(dayType, dateStr, true);
    aromaTrace.push("Голова перегружена — ароматы переключены на успокаивающие");
  }
  aromaTrace.push(`Утро: ${aroma.morning_detail}`, `День: ${aroma.daytime_detail}`, `Вечер: ${aroma.evening_detail}`);
  if (aroma.rotation_note) aromaTrace.push(aroma.rotation_note);

  const warnings = buildWarnings(dayType, scales);
  if (ov?.forceRetentionMatrix) warnings.push("Лодыжки отекли — обед переведён на лёгкий вариант, без гарнира.");
  if (ov?.forceNoRice) warnings.push("Отёк под глазами — гарнир и тяжёлая еда исключены.");
  if (ov?.forceCalmBreathing) warnings.push("Голова перегружена — дыхание переключено на успокаивающее.");
  if (ov?.noIntensifyExercise) warnings.push("Плохой сон — без силовых, только ходьба.");

  const tracking = buildTracking(dayType, scales);
  if (ov?.forceRetentionMatrix) tracking.push("Лодыжки завтра утром — стало лучше или нет");
  if (ov?.forceCalmBreathing) tracking.push("Голова к вечеру — снизился ли перегруз после дыхания");
  if (bodySignals?.weight_kg) tracking.push(`Вес сегодня: ${bodySignals.weight_kg} кг — сравнить через 2 дня`);

  const lt = lunchTime(dayType);
  const thyroidTrace = [`Защита щитовидной железы: консервативный режим, ${THYROID_NOTES.length} ограничений`];

  const alignmentRules = [
    astro.summary,
    ...astro.checks,
    "Рекомендации по набору продуктов (обед) строятся после этой сверки и применённых к шкалам поправок.",
  ];

  const tithiLabel = tithiNameRu(snap.tithi);
  const natal_forecast = buildNatalDayForecast(NATAL, snap, tithiLabel);

  const signal_protocol_ui_base = buildDailyProtocolUi({
    meta: {
      date: dateStr,
      weekday: WEEKDAYS[d.getDay()],
      lunarDayNumber: snap.tithi,
      moonPhaseLabel: moonPhaseLineRu(snap.elong, snap.illum),
      nakshatraLabel: snap.nakshatra,
      ekadashiFlag: snap.isEkadashi,
      pradoshFlag: snap.isPradosh,
    },
    bodySignals: mapBodySignalToBodySignals(bodySignals ?? null),
    context: buildDayContextFromSnap(snap, prevSnap),
    hasCombinedZincSelenium: true,
  });

  const signal_protocol_ui = {
    ...signal_protocol_ui_base,
    protocol: {
      ...signal_protocol_ui_base.protocol,
      lunchText: formatCanonicalLunchForSignalUi({
        timeWindow: lt.window,
        matrixLabel: mealMatrixLabel(finalMatrix),
        fullDescription: meal.full_description,
        riceAllowed: rice.allowed,
        riceReason: rice.reason,
      }),
    },
  };

  return {
    date: dateStr,
    weekday: WEEKDAYS[d.getDay()],
    lunar_day_number: snap.tithi,
    tithi_name_ru: tithiLabel,
    moon_phase: moonPhaseLineRu(snap.elong, snap.illum),
    nakshatra: snap.nakshatra,
    ekadashi_flag: snap.isEkadashi,
    pradosh_flag: snap.isPradosh,
    day_type: dayType,
    body_effect_summary: EFFECTS[dayType],
    nutrition: {
      breakfast: BREAKFAST,
      selection_assurance: buildSelectionAssurance(
        snap,
        tithiLabel,
        dayType,
        astro.summary
      ),
      lunch: {
        matrix_used: finalMatrix,
        protein: meal.protein,
        vegetables: meal.vegetables,
        full_description: meal.full_description,
        time_window: lt.window,
        early_lunch: lt.early,
      },
      rice: { allowed: rice.allowed, reason: rice.reason },
      no_food_after_18: true,
    },
    supplements: buildSupplements(d),
    breathing_practice: {
      practice: br.practice, title_ru: br.title, minutes: br.min,
      best_time: br.time, posture: br.posture, technique: br.technique,
      tongue_position: br.tongue, contraindication: br.contra,
    },
    mudra_recommendation: mudra,
    aroma_protocol: aroma,
    movement_load: load,
    thyroid_safety_notes: { mode: "conservative_thyroid_safe", notes: THYROID_NOTES },
    body_markers_to_track: tracking,
    warnings,
    scales,
    moon_illumination_pct: Math.round(snap.illum * 1000) / 10,
    matrix_index: matrixIndex(snap.tithi),
    astro_alignment: {
      summary: astro.summary,
      checks: astro.checks,
      scale_deltas: astro.deltas,
      natal_moon: astro.natal_moon,
      transit_moon: astro.transit_moon,
      natal_sun: astro.natal_sun,
      transit_sun: astro.transit_sun,
    },
    natal_forecast,
    signal_protocol_ui,
    rule_trace: {
      day_type_rules: dtTrace,
      scales_modifiers: scalesTrace,
      rice_rules: rice.trace,
      breathing_rules: breathTrace,
      mudra_rules: mudraTrace,
      thyroid_rules: thyroidTrace,
      body_signal_rules: ov?.trace ?? ["Самочувствие не записано, протокол по умолчанию"],
      meal_matrix_rules: mmTrace,
      load_rules: loadTrace,
      aroma_rules: aromaTrace,
      alignment_rules: alignmentRules,
      signal_protocol_engine: signal_protocol_ui.technical.ruleTrace,
    },
  };
}

function calendarNatalHint(astro: AstroAlignmentResult): string {
  const skip = "Явных совпадений Луны/Солнца";
  const line = astro.checks.find((c) => !c.startsWith(skip)) ?? astro.summary;
  return line.length > 160 ? `${line.slice(0, 157)}…` : line;
}

export function buildCalendarMonth(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const d = new Date(dateStr + "T12:00:00");
    const snap = computeSnap(d);
    const hits = findHits(snap);
    const prevD = new Date(d.getTime() - 86400000);
    const prevSnap = computeSnap(prevD);
    const prevReduction = prevSnap.isEkadashi || prevSnap.isPradosh;
    const { scales: baseScales } = computeScales(snap, hits, prevReduction);
    const astro = evaluateD1D9Alignment(NATAL, snap);
    const scales: Scales = {
      water_retention_risk: clamp(baseScales.water_retention_risk + astro.deltas.wr),
      release_drainage_potential: clamp(baseScales.release_drainage_potential + astro.deltas.rel),
      nervous_system_load: clamp(baseScales.nervous_system_load + astro.deltas.nrv),
      need_for_rhythm_precision: clamp(baseScales.need_for_rhythm_precision + astro.deltas.rhy),
    };
    const { dayType } = resolveDayType(scales, snap, prevReduction);
    days.push({
      date: dateStr,
      lunar_day_number: snap.tithi,
      nakshatra: snap.nakshatra,
      ekadashi_flag: snap.isEkadashi,
      pradosh_flag: snap.isPradosh,
      day_type: dayType,
      water_retention_risk: scales.water_retention_risk,
      release_drainage_potential: scales.release_drainage_potential,
      matrix_index: matrixIndex(snap.tithi),
      natal_alignment_hint: calendarNatalHint(astro),
    });
  }
  return days;
}

export function getMealMatrices(): Record<string, { protein: string; vegetables: string; full_description: string }[]> {
  return { ...MEALS };
}

export { EFFECTS };

export {
  buildDailyProtocolUi,
  type BuildDailyProtocolInput,
  type DailyProtocolUi,
  type DailyMeta,
  type DailyScores,
  type DailyStatusBadge,
} from "./daily-protocol-ui";

export { mapBodySignalToBodySignals, buildDayContextFromSnap } from "./protocol-context";
export { resolveDailyProtocol, sortSignalRulesByPriority } from "./rule-engine";
export { formatSupplementsBlock, buildRussianUiProtocol } from "./protocol-ui-texts";
