import type {
  BreathingTemplateId,
  LunchTemplateId,
  LoadTemplateId,
  SignalRuleId,
} from "./protocol-types";
import { lunchTemplates } from "./meal-templates";
import { breathingTemplates, loadTemplates } from "./practice-templates";
import { BREAKFAST } from "../profile/fixed-rules";

const PRODUCT_RU: Record<string, string> = {
  chicken: "курица",
  veal: "телятина",
  zucchini: "кабачок",
  broccoli: "брокколи",
  cauliflower: "цветная капуста",
  sweet_pepper: "сладкий перец",
  asparagus: "спаржа",
  rice_with_pepper_mint: "рис с перцем и мятой (по протоколу)",
  green_beans: "стручковая фасоль",
  warm_vegetable_mix: "тёплый овощной микс",
};

const PRACTICE_RU: Record<string, string> = {
  sama_vritti: "Сама-вритти (равные фазы вдоха и выдоха)",
  extended_exhale: "Дыхание с удлинённым выдохом",
  bhramari: "Бхрамари",
  diaphragmatic_breathing: "Диафрагмальное дыхание",
  soft_full_breath: "Полное мягкое дыхание",
};

const TIME_RU: Record<string, string> = {
  afternoon_or_evening: "во второй половине дня или вечером",
  daytime: "в дневное время",
};

const RULE_TITLE_RU: Partial<Record<SignalRuleId, string>> = {
  stable_state: "Протокол на сегодня",
  mental_overheat: "День перегруза головы",
  ankle_swelling: "День при отёке лодыжек",
  eye_swelling: "День при отёке зоны глаз",
  poor_sleep: "После беспокойного сна",
  low_energy_no_swelling: "Мало сил без отёков",
  low_energy_with_swelling: "Мало сил на фоне удержания в тканях",
  ekadashi_day: "Экадаши",
  day_after_ekadashi: "День после экадаши",
  pradosh_day: "Прадош",
  pre_full_moon_retention: "Канун полнолуния",
  waning_mid_cycle_drainage: "Убывающая Луна: окно выведения",
  pre_new_moon_tail: "Предноволунье",
  salt_craving: "При сильной тяге к солёному",
  sweet_craving_on_fatigue: "Тяга к сладкому на усталости",
  tissue_heaviness: "Плотность и тяжесть тканей",
  baseline_no_signals: "Базовый протокол дня",
};

const RULE_BODY_RU: Partial<Record<SignalRuleId, string>> = {
  stable_state:
    "Шкалы и лунный контекст позволяют обычный ритм питания и движения без усиления режима.",
  mental_overheat:
    "Нервная система и голова требуют спокойствия: не усиливать обед и не добирать стресс едой.",
  ankle_swelling: "Тело удерживает жидкость — обед проще, без гарнира, движение мягкое.",
  eye_swelling: "Зона лица чувствительна к задержке воды — вечер спокойный, обед без перегруза.",
  poor_sleep: "Сон был слабым — не компенсировать объёмом еды; режим и гидратация важнее.",
  low_energy_no_swelling:
    "Сил мало, отёков нет — допускается малая порция риса по шаблону, без самодеятельности.",
  low_energy_with_swelling:
    "Слабость на фоне удержания в тканях — без риса и плотных тарелок, только шаблон удержания.",
  ekadashi_day: "День уменьшения объёма — без компенсации тяжёлой едой вечером.",
  day_after_ekadashi: "Мягкий выход после разгрузки — без «наградного» обеда.",
  pradosh_day: "Собранный день: ранний обед по шаблону, без гарнира и без отката.",
  pre_full_moon_retention: "Риск задержки воды высок — минимум соли и соусов, вечер лёгкий.",
  waning_mid_cycle_drainage:
    "Благоприятное окно для мягкого выведения воды без жёстких мер.",
  pre_new_moon_tail: "Снижаем шум и объём пищи, сохраняя достаточность и стабильность времени еды.",
  salt_craving: "Тяга к солёному — не усиливать соль и готовые соусы; держать тарелку чистой.",
  sweet_craving_on_fatigue:
    "Сладкое на усталости — не решение; энергию не добирать сахаром, ориентир на шаблон обеда.",
  tissue_heaviness: "Ткани плотные — ранний простой обед без гарнира и без утяжеления.",
  baseline_no_signals:
    "Нет полной картины самочувствия — показан базовый шаблон; при необходимости заполните «Самочувствие».",
};

export interface BuildRussianUiProtocolInput {
  matchedRule: SignalRuleId;
  lunchTemplateId: LunchTemplateId;
  breathingTemplateId: BreathingTemplateId;
  loadTemplateId: LoadTemplateId;
  warning: string;
}

export interface RussianUiProtocolTexts {
  title: string;
  bodyEffect: string;
  breakfast: string;
  lunchTitle: string;
  lunchText: string;
  breathingTitle: string;
  breathingText: string;
  loadTitle: string;
  loadText: string;
  /** Дублирует предупреждение движка для удобства блока summary */
  warning: string;
}

function formatLunchItemsRu(templateId: LunchTemplateId): string {
  const t = lunchTemplates[templateId];
  if (!t) return "";
  const lines = t.items.map((it) => {
    const name = PRODUCT_RU[it.product] ?? it.product.replace(/_/g, " ");
    return `• ${name} — ${it.amount_g} г`;
  });
  const rice = t.riceAllowed ? "Рис по протоколу разрешён." : "Рис сегодня не включать.";
  const meat =
    t.meatAllowed === false ? "Мясо/рыба в этом шаблоне не предусмотрены." : "";
  return [`Окно обеда: ${t.timeWindow}.`, "", ...lines, "", rice, meat].filter(Boolean).join("\n");
}

/** Текст обеда для UI — тот же источник, что и `nutrition.lunch` (матрица дня), не шаблоны rule-engine. */
export function formatCanonicalLunchForSignalUi(input: {
  timeWindow: string;
  matrixLabel: string;
  fullDescription: string;
  riceAllowed: boolean;
  riceReason?: string;
}): string {
  const riceLine = input.riceAllowed
    ? `Крупа: можно${input.riceReason ? ` — ${input.riceReason}` : ""}.`
    : `Крупа: сегодня без крупы${input.riceReason ? ` — ${input.riceReason}` : ""}.`;
  return [
    `Окно обеда: ${input.timeWindow}.`,
    "",
    input.matrixLabel,
    "",
    input.fullDescription.trim(),
    "",
    riceLine,
  ].join("\n");
}

export function buildRussianUiProtocol(input: BuildRussianUiProtocolInput): RussianUiProtocolTexts {
  const { matchedRule, lunchTemplateId, breathingTemplateId, loadTemplateId, warning } = input;

  const title = RULE_TITLE_RU[matchedRule] ?? "Протокол на сегодня";
  const bodyEffect = RULE_BODY_RU[matchedRule] ?? RULE_BODY_RU.baseline_no_signals!;

  const br = breathingTemplates[breathingTemplateId];
  const practiceRu = br ? (PRACTICE_RU[br.practice] ?? br.practice) : "";
  const timeRu = br ? (TIME_RU[br.time] ?? br.time) : "";

  const ld = loadTemplates[loadTemplateId];

  return {
    title,
    bodyEffect,
    breakfast: BREAKFAST,
    lunchTitle: "Обед",
    lunchText: formatLunchItemsRu(lunchTemplateId),
    breathingTitle: "Дыхание",
    breathingText: br
      ? `${practiceRu}, ${br.durationMin} мин, ${timeRu}.`
      : "Шаблон дыхания не найден.",
    loadTitle: "Нагрузка и движение",
    loadText: ld?.description ?? "",
    warning,
  };
}

export function formatSupplementsBlock(hasCombinedZincSelenium = true): string[] {
  const base = [
    "Утром после завтрака: женолутен, L-теанин.",
    "С обедом: омега-3, хром, берберин, витамин D + K2.",
  ];

  if (hasCombinedZincSelenium) {
    base.push("С обедом: препарат с цинком и селеном.");
  } else {
    base.push("С обедом: селен.");
    base.push("Днем отдельно: цинк, если переносится.");
  }

  base.push("Вечером: магний бисглицинат, ГАМК 500 мг, 5-HTP 120 мг.");
  base.push("Эндолутен: раз в 3 дня в первой половине дня.");

  return base;
}
