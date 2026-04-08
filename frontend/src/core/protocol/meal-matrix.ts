import type { DayType, Scales } from "./rules";

export interface Meal { protein: string; vegetables: string; full_description: string }

export const MEALS: Record<string, Meal[]> = {
  A_stable: [
    { protein: "курица 120 г", vegetables: "кабачок, сладкий перец, черри 4 шт., адыгейский сыр 40 г", full_description: "Куриное филе запечённое 120 г; кабачок тушёный, сладкий перец полосками, 4 черри; адыгейский сыр 40 г к овощам." },
    { protein: "телятина 110 г", vegetables: "цветная капуста, брокколи, адыгейский сыр 40 г", full_description: "Телятина тушёная 110 г с цветной капустой и брокколи на пару; адыгейский сыр 40 г к овощам." },
    { protein: "говядина 100 г", vegetables: "баклажан, сладкий перец", full_description: "Говядина 100 г; баклажан и перец запечены вместе как овощной гарнир" },
    { protein: "курица 115 г", vegetables: "стручковая фасоль, кабачок", full_description: "Курица 115 г тушёная со стручковой фасолью и кабачком" },
    { protein: "телятина 105 г", vegetables: "морковь тушёная, свёкла 40 г", full_description: "Телятина 105 г тушёная с морковью; свёкла запечённая отдельно." },
    { protein: "курица 120 г", vegetables: "брокколи, цветная капуста", full_description: "Куриное филе 120 г на пару или запечённое; брокколи и цветная капуста на пару тем же способом" },
    { protein: "говядина 95 г", vegetables: "кабачок, помидоры, адыгейский сыр 40 г", full_description: "Говядина 95 г тушёная с кабачком и помидорами; адыгейский сыр 40 г к овощам." },
    { protein: "форель 130 г", vegetables: "макароны цельнозерновые 60 г, лук порей, шампиньоны", full_description: "Форель запечённая 130 г; макароны с луком пореем и шампиньонами." },
    { protein: "печень говяжья 110 г", vegetables: "гречка 50 г, лук порей, шампиньоны с луком, морковь", full_description: "Печень говяжья 110 г; гречка 50 г; шампиньоны с луком, лук порей, морковь." },
    { protein: "лосось 120 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Лосось 120 г запечённый; макароны с луком пореем и шампиньонами." },
    { protein: "печень куриная 120 г", vegetables: "гречка 50 г, лук порей, шампиньоны с луком, морковь", full_description: "Печень куриная 120 г; гречка 50 г; шампиньоны с луком, лук порей, морковь." },
    { protein: "треска 140 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Треска 140 г на пару или запечённая; макароны с луком пореем и шампиньонами." },
    { protein: "минтай 140 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Минтай 140 г запечённый или на пару; макароны с луком пореем и шампиньонами." },
  ],
  B_nervous: [
    { protein: "курица 110 г", vegetables: "кабачок, сладкий перец, адыгейский сыр 40 г", full_description: "Куриное филе 110 г на пару или в духовке с кабачком и сладким перцем; адыгейский сыр 40 г к овощам." },
    { protein: "телятина 100 г", vegetables: "брокколи, морковь тушёная", full_description: "Телятина 100 г тушёная с брокколи и морковью в одной сковороде / кастрюле" },
    { protein: "курица 110 г", vegetables: "стручковая фасоль, сладкий перец", full_description: "Курица 110 г тушёная со стручковой фасолью и сладким перцем." },
    { protein: "говядина 85 г", vegetables: "брокколи, морковь", full_description: "Говядина 85 г, малая порция; тушёная с брокколи и морковью." },
    { protein: "треска 130 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Треска 130 г запечённая или на пару; макароны с луком пореем и шампиньонами." },
    { protein: "печень куриная 110 г", vegetables: "гречка 50 г, лук порей, шампиньоны с луком, морковь", full_description: "Печень куриная 110 г; гречка 50 г; шампиньоны с луком, лук порей, морковь." },
  ],
  C_retention: [
    { protein: "курица 110 г", vegetables: "цветная капуста, морковь", full_description: "Лёгкий обед: курица на пару с цветной капустой и морковью." },
    { protein: "телятина 100 г", vegetables: "брокколи, белокочанная капуста", full_description: "Лёгкий обед: телятина 100 г тушёная с брокколи и белокочанной капустой" },
    { protein: "курица 105 г", vegetables: "стручковая фасоль, кабачок", full_description: "Лёгкий обед: курица 105 г тушёная с фасолью и кабачком." },
    { protein: "говядина 85 г", vegetables: "цветная капуста, перец", full_description: "Лёгкий обед: говядина 85 г, цветная капуста и перец на пару или тушёные" },
    { protein: "минтай 130 г", vegetables: "лук порей, шампиньоны тушёные", full_description: "Лёгкий обед: минтай 130 г; лук порей и шампиньоны тушёные." },
    { protein: "треска 130 г", vegetables: "макароны 55 г, лук порей, шампиньоны", full_description: "Лёгкий обед: треска 130 г; макароны 55 г с луком пореем и шампиньонами." },
  ],
  D_ekadashi: [
    { protein: "—", vegetables: "цветная капуста, сладкий перец, черри 3 шт., адыгейский сыр 40 г", full_description: "Цветная капуста, сладкий перец, 3 черри; адыгейский сыр 40 г — без мяса" },
    { protein: "—", vegetables: "стручковая фасоль, кабачок, сладкий перец", full_description: "Стручковая фасоль, кабачок, сладкий перец — без мяса" },
    { protein: "—", vegetables: "брокколи, пекинская капуста, сладкий перец", full_description: "Брокколи на пару; пекинская капуста и сладкий перец — без мяса" },
    { protein: "—", vegetables: "баклажан, перец, цветная капуста", full_description: "Баклажан, перец, цветная капуста — без мяса" },
    { protein: "—", vegetables: "белокочанная капуста тушёная, морковь, перец", full_description: "Белокочанная капуста тушёная, морковь, перец — без мяса" },
  ],
  E_pradosh: [
    { protein: "курица 110 г", vegetables: "кабачок, морковь, адыгейский сыр 40 г", full_description: "Ранний обед: курица 110 г тушёная с кабачком и морковью; адыгейский сыр 40 г к овощам." },
    { protein: "телятина 100 г", vegetables: "брокколи, морковь", full_description: "Ранний обед: телятина 100 г тушёная с брокколи и морковью" },
    { protein: "говядина 85 г", vegetables: "брокколи, морковь", full_description: "Ранний обед: говядина 85 г тушёная с брокколи и морковью." },
    { protein: "форель 120 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Ранний обед: форель 120 г запечённая; макароны с луком пореем и шампиньонами." },
  ],
  F_grain: [
    { protein: "курица 115 г", vegetables: "рис 50–70 г с перцем и мятой, кабачок", full_description: "Курица 115 г, рис 50–70 г с перцем и мятой, кабачок" },
    { protein: "телятина 105 г", vegetables: "гречка 50–60 г, сладкий перец", full_description: "Телятина 105 г, гречка 50–60 г, сладкий перец" },
    { protein: "курица 110 г", vegetables: "рис 50 г с перцем и мятой, баклажан, помидор, адыгейский сыр 40 г", full_description: "Курица 110 г, рис 50 г с перцем и мятой, баклажан, помидор; адыгейский сыр 40 г к овощам." },
    { protein: "говядина 100 г", vegetables: "гречка 50 г, кабачок, перец", full_description: "Говядина 100 г, гречка 50 г, кабачок, перец" },
    { protein: "телятина 100 г", vegetables: "чечевица красная 50 г, брокколи", full_description: "Телятина 100 г, чечевица красная 50 г, брокколи" },
    { protein: "курица 115 г", vegetables: "дикий рис 50 г, цветная капуста", full_description: "Курица 115 г, дикий рис 50 г, цветная капуста" },
    { protein: "говядина 95 г", vegetables: "паста цельнозерновая 60 г, помидоры", full_description: "Говядина 95 г, паста цельнозерновая 60 г, помидоры" },
    { protein: "телятина 105 г", vegetables: "ячневая каша 50 г, кабачок", full_description: "Телятина 105 г, ячневая каша 50 г, кабачок" },
    { protein: "курица 110 г", vegetables: "рис 50 г с перцем и мятой, брокколи, перец", full_description: "Курица 110 г, рис 50 г с перцем и мятой, брокколи, перец" },
    { protein: "лосось 120 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Лосось 120 г; макароны с луком пореем и шампиньонами." },
    { protein: "печень говяжья 100 г", vegetables: "гречка 50 г, лук порей, шампиньоны с луком, морковь", full_description: "Печень говяжья 100 г; гречка 50 г; шампиньоны с луком, лук порей, морковь." },
    { protein: "форель 130 г", vegetables: "макароны 60 г, лук порей, шампиньоны", full_description: "Форель 130 г; макароны с луком пореем и шампиньонами." },
  ],
};

export const DAY_MATRIX: Record<DayType, string> = {
  stable_day: "A_stable", drainage_day: "C_retention", caution_day: "C_retention",
  high_sensitivity_day: "B_nervous", ekadashi_day: "D_ekadashi", pradosh_day: "E_pradosh",
  recovery_day_after_reduction: "A_stable", pre_full_moon_retention_day: "C_retention",
  pre_new_moon_precision_day: "B_nervous",
};

export const GRAIN_FORBIDDEN: Set<DayType> = new Set([
  "ekadashi_day", "pradosh_day", "pre_full_moon_retention_day",
  "pre_new_moon_precision_day", "caution_day",
]);

export function pickMeal(matrix: string, doy: number): Meal {
  const opts = MEALS[matrix] ?? MEALS.A_stable;
  return opts[doy % opts.length];
}

export function decideRice(dt: DayType, scales: Scales): { allowed: boolean; reason: string; trace: string[] } {
  const trace: string[] = [];
  if (GRAIN_FORBIDDEN.has(dt)) {
    const dtLabel = dt === "ekadashi_day" ? "Экадаши" : dt === "pradosh_day" ? "Прадош" : dt === "caution_day" ? "День повышенного внимания" : dt === "pre_full_moon_retention_day" ? "Канун полнолуния" : "Канун новолуния";
    trace.push(`Тип дня (${dtLabel}) — гарнир из крупы не включён`);
    return { allowed: false, reason: `${dtLabel} — обед без крупяного гарнира.`, trace };
  }
  if (scales.water_retention_risk >= 65) {
    trace.push(`Задержка воды ${scales.water_retention_risk}/100 — гарнир не рекомендуется`);
    return { allowed: false, reason: `Задержка воды ${scales.water_retention_risk}/100 — обед без гарнира.`, trace };
  }
  if (dt === "stable_day" && scales.water_retention_risk < 55) {
    trace.push(`Устойчивый день, задержка воды низкая (${scales.water_retention_risk}/100) — гарнир разрешён`);
    return { allowed: true, reason: "Устойчивый день, отёков мало — малая порция крупы допустима.", trace };
  }
  trace.push("Нет условий для гарнира — обед без крупы");
  return { allowed: false, reason: "Сегодня обед без крупяного гарнира.", trace };
}

export function lunchTime(dt: DayType): { window: string; early: boolean } {
  const early = new Set<DayType>(["ekadashi_day", "pradosh_day", "pre_full_moon_retention_day", "drainage_day"]);
  if (early.has(dt)) return { window: "12:15–12:45", early: true };
  if (dt === "caution_day" || dt === "pre_new_moon_precision_day") return { window: "12:30–13:00", early: true };
  return { window: "13:00–13:30", early: false };
}
