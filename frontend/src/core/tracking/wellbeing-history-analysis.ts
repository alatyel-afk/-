import type { BodySignal, BodySignalWithContext } from "@/lib/api";

function numAvg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Совпадает с порогами подсказок на странице самочувствия: день менял протокол. */
export function bodySignalChangedProtocol(sig: BodySignal): boolean {
  return (
    (sig.ankles_evening ?? 0) >= 3 ||
    (sig.eye_area_morning ?? 0) >= 3 ||
    (sig.head_overload ?? 0) >= 4 ||
    (sig.sleep_quality ?? 5) <= 2 ||
    (sig.energy_level ?? 5) <= 2 ||
    (sig.tissue_density ?? 0) >= 3 ||
    (sig.salty_craving ?? 0) >= 3 ||
    (sig.sweet_craving ?? 0) >= 3
  );
}

export interface WellbeingHistoryStats {
  count: number;
  fromDate: string;
  toDate: string;
  avg: {
    ankles: number | null;
    eye: number | null;
    tissue: number | null;
    head: number | null;
    sleep: number | null;
    sweet: number | null;
    salty: number | null;
    energy: number | null;
    heaviness: number | null;
  };
  avgWaterRisk: number | null;
  avgNervousLoad: number | null;
  weightTrend: { firstKg: number; lastKg: number; deltaKg: number; spanDays: number } | null;
  reboundCount: number;
  protocolOverrideDays: number;
}

export interface WellbeingHistoryReport {
  stats: WellbeingHistoryStats;
  insights: string[];
  weightRecommendations: string[];
  emotionRecommendations: string[];
}

function collect(rows: BodySignalWithContext[]) {
  const sorted = [...rows].sort((a, b) => a.signal.day_date.localeCompare(b.signal.day_date));
  const ankles: number[] = [];
  const eye: number[] = [];
  const tissue: number[] = [];
  const head: number[] = [];
  const sleep: number[] = [];
  const sweet: number[] = [];
  const salty: number[] = [];
  const energy: number[] = [];
  const heaviness: number[] = [];
  const waterR: number[] = [];
  const nerv: number[] = [];
  const weights: { date: string; kg: number }[] = [];
  let rebound = 0;
  let protocol = 0;

  for (const r of sorted) {
    const s = r.signal;
    if (s.ankles_evening != null) ankles.push(s.ankles_evening);
    if (s.eye_area_morning != null) eye.push(s.eye_area_morning);
    if (s.tissue_density != null) tissue.push(s.tissue_density);
    if (s.head_overload != null) head.push(s.head_overload);
    if (s.sleep_quality != null) sleep.push(s.sleep_quality);
    if (s.sweet_craving != null) sweet.push(s.sweet_craving);
    if (s.salty_craving != null) salty.push(s.salty_craving);
    if (s.energy_level != null) energy.push(s.energy_level);
    if (r.nutrition?.heaviness != null) heaviness.push(r.nutrition.heaviness);
    if (r.water_retention_risk != null) waterR.push(r.water_retention_risk);
    if (r.nervous_system_load != null) nerv.push(r.nervous_system_load);
    if (s.weight_kg != null) weights.push({ date: s.day_date, kg: s.weight_kg });
    if (r.nutrition?.rebound_after_ekadashi_pradosh) rebound += 1;
    if (bodySignalChangedProtocol(s)) protocol += 1;
  }

  let weightTrend: WellbeingHistoryStats["weightTrend"] = null;
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights[weights.length - 1];
    const span =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
    weightTrend = {
      firstKg: first.kg,
      lastKg: last.kg,
      deltaKg: Math.round((last.kg - first.kg) * 10) / 10,
      spanDays: Math.max(1, Math.round(span)),
    };
  }

  const fromDate = sorted[0]?.signal.day_date ?? "";
  const toDate = sorted[sorted.length - 1]?.signal.day_date ?? "";

  const statsBase: WellbeingHistoryStats = {
    count: sorted.length,
    fromDate,
    toDate,
    avg: {
      ankles: numAvg(ankles),
      eye: numAvg(eye),
      tissue: numAvg(tissue),
      head: numAvg(head),
      sleep: numAvg(sleep),
      sweet: numAvg(sweet),
      salty: numAvg(salty),
      energy: numAvg(energy),
      heaviness: numAvg(heaviness),
    },
    avgWaterRisk: numAvg(waterR),
    avgNervousLoad: numAvg(nerv),
    weightTrend,
    reboundCount: rebound,
    protocolOverrideDays: protocol,
  };

  return { sorted, statsBase };
}

function fmt(n: number | null, digits = 1): string {
  if (n == null) return "—";
  return n.toFixed(digits);
}

/**
 * Детерминированный разбор истории: без LLM, только агрегаты и эвристики для текста в UI.
 */
export function analyzeWellbeingHistory(rows: BodySignalWithContext[]): WellbeingHistoryReport {
  if (rows.length === 0) {
    return {
      stats: {
        count: 0,
        fromDate: "",
        toDate: "",
        avg: {
          ankles: null,
          eye: null,
          tissue: null,
          head: null,
          sleep: null,
          sweet: null,
          salty: null,
          energy: null,
          heaviness: null,
        },
        avgWaterRisk: null,
        avgNervousLoad: null,
        weightTrend: null,
        reboundCount: 0,
        protocolOverrideDays: 0,
      },
      insights: ["Недостаточно записей для выводов — добавьте несколько дней на вкладке «Записать»."],
      weightRecommendations: [],
      emotionRecommendations: [],
    };
  }

  const { statsBase } = collect(rows);
  const stats: WellbeingHistoryStats = statsBase;
  const { avg } = stats;
  const insights: string[] = [];

  insights.push(
    `За период ${stats.fromDate} — ${stats.toDate} в отчёте ${stats.count} ${pluralDays(stats.count)} с данными самочувствия.`,
  );

  if (avg.ankles != null && avg.ankles >= 2) {
    insights.push(
      `Средний отёк лодыжек к вечеру — около ${fmt(avg.ankles)} из 5: чаще встречается задержка жидкости; на весах это может выглядеть как «плато» или плюс, даже при соблюдении калорий.`,
    );
  }
  if (avg.eye != null && avg.eye >= 2) {
    insights.push(
      `Утренний отёк под глазами в среднем ${fmt(avg.eye)} из 5 — тот же контур, что и лодыжки: соль, вечерний объём и сон влияют сильнее, чем один день «срыва».`,
    );
  }
  if (avg.sweet != null && avg.sweet >= 2.5 && avg.sleep != null && avg.sleep <= 3) {
    insights.push(
      `Сочетание более высокой тяги к сладкому (${fmt(avg.sweet)} из 5) и более низкой оценки сна (${fmt(avg.sleep)} из 5) часто идёт рядом: организм ищет быстрый подъём настроения и энергии.`,
    );
  }
  if (avg.head != null && avg.head >= 2.5) {
    insights.push(
      `Перегруз головы в среднем ${fmt(avg.head)} из 5 — днём выше риск «заесть» стресс и устать к вечеру; это бьёт и по сну, и по выбору еды.`,
    );
  }
  if (avg.salty != null && avg.salty >= 2.5) {
    insights.push(
      `Тяга к солёному держится около ${fmt(avg.salty)} из 5 — для контура тела и веса это сигнал проверить соль и соусы в рамках вашего протокола, а не только калории.`,
    );
  }
  if (stats.reboundCount >= 2) {
    insights.push(
      `Несколько раз (${stats.reboundCount}) отмечался «откат» после экадаши/прадош: резкое увеличение объёма после разгрузки часто даёт скачок веса и настроения.`,
    );
  }
  if (stats.weightTrend) {
    const { deltaKg, spanDays, firstKg, lastKg } = stats.weightTrend;
    const dir = deltaKg < -0.05 ? "снижение" : deltaKg > 0.05 ? "рост" : "почти без изменений";
    insights.push(
      `По весу за ~${spanDays} дн.: с ${firstKg} до ${lastKg} кг (${dir}, Δ ${deltaKg > 0 ? "+" : ""}${deltaKg} кг). Учитывайте отёки — дневные колебания до 1–2 кг на фоне жидкости нормальны.`,
    );
  }
  if (stats.avgWaterRisk != null && stats.avgWaterRisk >= 55) {
    insights.push(
      `Средний календарный риск удержания в тканях в записях — около ${Math.round(stats.avgWaterRisk)}%: дни с высоким риском лучше не усиливать солёным и поздним ужином.`,
    );
  }
  if (stats.protocolOverrideDays >= Math.max(3, Math.ceil(stats.count * 0.4))) {
    insights.push(
      `В большинстве дней протокол подстраивался под самочувствие (${stats.protocolOverrideDays} из ${stats.count}) — это нормально для сигнального режима; для сравнения веса полезно смотреть недели, а не отдельные дни.`,
    );
  }

  const weightRecommendations: string[] = [];
  if (avg.ankles != null && avg.ankles >= 2) {
    weightRecommendations.push(
      "Для контура и веса: держите соль и соусы строго в рамках типа дня; воду пить равномерно, без «залпа» вечером; взвешиваться в одно время суток после туалета.",
    );
  }
  if (avg.heaviness != null && avg.heaviness >= 3) {
    weightRecommendations.push(
      "Частая тяжесть после еды: не увеличивайте порцию «на силу воли» — проверьте соответствие обеда матрице дня и окну обеда; тяжёлый вечер при лёгком дневном типе дня откладывает снижение веса.",
    );
  }
  if (avg.sweet != null && avg.sweet >= 2.5) {
    weightRecommendations.push(
      "При устойчивой тяге к сладкому: зафиксируйте один дневной слот, где сладкое возможно только если это уже есть в протоколе; убрать импульсные перекусы между делами важнее, чем «идеальный» рацион раз в неделю.",
    );
  }
  if (stats.reboundCount >= 1) {
    weightRecommendations.push(
      "После экадаши/прадош: на следующий день выходите на обычный протокол порциями, без компенсации «догонкой» — так стабильнее вес и пищеварение.",
    );
  }
  if (weightRecommendations.length === 0) {
    weightRecommendations.push(
      "Опирайтесь на текущий тип дня и матрицу обеда; при ровном сне и без выраженных отёков снижение веса обычно идёт за счёт стабильного окна обеда и отсутствия догонки вечером.",
    );
  }

  const emotionRecommendations: string[] = [];
  if (avg.sleep != null && avg.sleep <= 3) {
    emotionRecommendations.push(
      "Сон ниже комфорта: за 1–2 часа до сна — без ярких экранов и тяжёлой еды; утром свет и короткая прогулка стабилизируют настроение лучше, чем дополнительный стимулятор.",
    );
  }
  if (avg.head != null && avg.head >= 2.5) {
    emotionRecommendations.push(
      "При перегрузе головы используйте дневной блок успокаивающего дыхания из протокола до обеда; не решайте конфликты и не планируйте «жизнь» на голодный желудок.",
    );
  }
  if (stats.avgNervousLoad != null && stats.avgNervousLoad >= 60) {
    emotionRecommendations.push(
      "Высокая нервная нагрузка по календарю: снизьте кофеин после обеда, не форсируйте силовые; ровный обед вовремя снижает раздражительность к вечеру.",
    );
  }
  if (avg.energy != null && avg.energy <= 2.5) {
    emotionRecommendations.push(
      "Низкая энергия в записях: не закрывайте усталость только едой — проверьте сон и движение; в протоколе используйте разрешённый гарнир/обед, если тип дня это допускает.",
    );
  }
  if (emotionRecommendations.length === 0) {
    emotionRecommendations.push(
      "Эмоциональный фон поддерживайте предсказуемым ритмом еды и сном; при ровных оценках сна и энергии достаточно придерживаться текущего протокола без усилений.",
    );
  }

  return { stats, insights, weightRecommendations, emotionRecommendations };
}

function pluralDays(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "дней";
  if (m10 === 1) return "день";
  if (m10 >= 2 && m10 <= 4) return "дня";
  return "дней";
}

export function formatHistoryReportPlainText(report: WellbeingHistoryReport): string {
  const { stats, insights, weightRecommendations, emotionRecommendations } = report;
  const a = stats.avg;
  const lines: string[] = [
    "ОТЧЁТ ПО САМОЧУВСТВИЮ",
    `Период: ${stats.fromDate} — ${stats.toDate}`,
    `Записей: ${stats.count}`,
    "",
    "Средние (0–5, где есть):",
    `  Лодыжки: ${fmt(a.ankles)}  Глаза: ${fmt(a.eye)}  Тяжесть в теле: ${fmt(a.tissue)}`,
    `  Голова: ${fmt(a.head)}  Сон: ${fmt(a.sleep)}  Энергия: ${fmt(a.energy)}`,
    `  Сладкое: ${fmt(a.sweet)}  Солёное: ${fmt(a.salty)}  Тяжесть после еды: ${fmt(a.heaviness)}`,
    "",
    "Анализ:",
    ...insights.map((x) => `• ${x}`),
    "",
    "Рекомендации — вес и контур:",
    ...weightRecommendations.map((x) => `• ${x}`),
    "",
    "Рекомендации — эмоциональный фон:",
    ...emotionRecommendations.map((x) => `• ${x}`),
    "",
  ];
  if (stats.weightTrend) {
    lines.push(
      `Вес: ${stats.weightTrend.firstKg} → ${stats.weightTrend.lastKg} кг (Δ ${stats.weightTrend.deltaKg} за ~${stats.weightTrend.spanDays} дн.)`,
    );
  }
  return lines.join("\n");
}
