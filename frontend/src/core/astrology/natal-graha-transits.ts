import type { Snap } from "./engine";
import { nakIndex, nakName } from "./nakshatra";
import type { NatalProfile } from "../profile/natal-profile";

/** Минимальное расстояние между накшатрами по кругу (0–13). */
function nakSeparationSteps(iA: number, iB: number): number {
  const d = Math.abs(iA - iB);
  return Math.min(d, 27 - d);
}

type NakRelation = "same" | "close" | "opposite" | "middle";

function relationForLongitudes(natalLon: number, transitLon: number): NakRelation {
  const sep = nakSeparationSteps(nakIndex(natalLon), nakIndex(transitLon));
  if (sep === 0) return "same";
  if (sep <= 3) return "close";
  if (sep === 13 || sep === 14) return "opposite";
  return "middle";
}

const MERCURY: Record<NakRelation, string> = {
  same:
    "Нервная система острее реагирует на срыв графика и еду в спешке. Состав дня задайте утром и не подменяйте продукты импульсом; время завтрака и обеда держите как опору, а не как фон для других дел.",
  close:
    "Транзит в соседних к наталу накшатрах: проще удерживать список покупок и тайминг приёмов пищи, меньше соблазна есть «между делами».",
  opposite:
    "Транзит почти напротив натальной накшатры на лунном кругу: чаще качели между желанием разнообразить меню и необходимостью жёсткого списка. Зафиксируйте время еды заранее и не сдвигайте его из настроения.",
  middle:
    "Среднее расстояние между наталом и транзитом: следите за перекусами от скуки и за едой перед экраном вне протокола — это типичные слабые места при таком соотношении.",
};

const VENUS: Record<NakRelation, string> = {
  same:
    "Усиливается тяга к вкусу, соусам и аккуратной подаче. Разрешите себе оформление и те ингредиенты, что уже в протоколе; не расширяйте список ради удовольствия и не закрывайте усталость сладким вне правил.",
  close:
    "Транзит рядом с наталом: проще получать удовольствие от разрешённых блюд и не срываться на запрещённое — используйте это как опору дня.",
  opposite:
    "Транзит напротив натала на кругу из 27 накшатр: выше риск «наградить» себя едой вопреки дню. Если нужна психологическая награда — одна порция строго в рамках протокола, без добавок сверх.",
  middle:
    "Умеренный контраст: держите под контролем десерты и перекусы вне списка; именно сейчас они чаще выбивают из режима.",
};

const SATURN: Record<NakRelation, string> = {
  same:
    "Сильнее ощущение границ, сухости режима и усталости от ограничений. Не наращивайте порцию «от злости» — объём сейчас переносится хуже; зато ровные порции по протоколу дают больше опоры, чем в обычный день.",
  close:
    "Транзит близок к наталу: дисциплина и умеренность идут ровнее; хороший день закрепить привычный объём без экспериментов и без голодовок.",
  opposite:
    "Транзит напротив натала: внутренний конфликт «надо строго» / «хочется сорваться». Протокол не ослабляйте, но и не наказывайте голодом — только стабильные приёмы пищи по типу дня.",
  middle:
    "Среднее расстояние: к вечеру чаще даёт о себе знать тяжесть в желудке; не копите несколько тяжёлых приёмов подряд вне разрешённого типа дня.",
};

const RELATION_LABEL_RU: Record<NakRelation, string> = {
  same: "накшатра натала и транзита совпадают",
  close: "транзит в соседних к наталу накшатрах (близкое соотношение)",
  opposite: "транзит примерно напротив натальной накшатры на лунном кругу",
  middle: "между наталом и транзитом умеренный разрыв (не рядом и не напротив)",
};

function grahaParagraph(
  title: string,
  natalLon: number,
  transitLon: number,
  hints: Record<NakRelation, string>,
): string {
  const nNak = nakName(natalLon);
  const tNak = nakName(transitLon);
  const rel = relationForLongitudes(natalLon, transitLon);
  return `${title}: натал «${nNak}», транзит «${tNak}» (${RELATION_LABEL_RU[rel]}). ${hints[rel]}`;
}

/**
 * Три абзаца: Меркурий, Венера, Сатурн (натал vs транзит по накшатре долготы).
 */
export function buildGrahaTransitParagraphs(natal: NatalProfile, snap: Snap): string[] {
  return [
    grahaParagraph("Меркурий", natal.mercury, snap.mercury, MERCURY),
    grahaParagraph("Венера", natal.venus, snap.venus, VENUS),
    grahaParagraph("Сатурн", natal.saturn, snap.saturn, SATURN),
  ];
}
