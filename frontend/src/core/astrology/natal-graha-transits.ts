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
    "Совпадение накшатр: сильнее реакция на сбой графика, еду в спешке и резкую смену продуктов. Держите привычное время завтрака и обеда; список на день не перечёркивайте.",
  close:
    "Транзит близок к натальному: проще удерживать ясный список продуктов и тайминг приёмов пищи без лишних отвлечений.",
  opposite:
    "Транзит примерно напротив натального на кругу из 27 накшатр: чаще колебания между желанием разнообразить меню и необходимостью жёсткого списка. Зафиксируйте время еды и не сдвигайте его из‑за настроения.",
  middle:
    "Умеренный разрыв между наталом и транзитом: следите за перекусами от скуги и едой в фоне экрана вне протокола.",
};

const VENUS: Record<NakRelation, string> = {
  same:
    "Совпадение накшатр: ярче тяга к вкусу, соусам и красивой подаче. Ограничьтесь оформлением и разрешёнными ингредиентами; не расширяйте список ради удовольствия.",
  close:
    "Транзит близок к натальному: проще получать удовольствие от разрешённых блюд без срывов на запрещённое.",
  opposite:
    "Транзит примерно напротив натального: сильнее разрыв между желанием угостить себя и правилами дня. Заранее заложите один перекус или десерт в рамках протокола и не добавляйте сверх него.",
  middle:
    "Умеренный контраст: контролируйте «наградные» приёмы пищи и сладкое вне списка.",
};

const SATURN: Record<NakRelation, string> = {
  same:
    "Совпадение накшатр: сильнее ощущение ограничений и важность ровного режима. Не наращивайте порцию «от раздражения» — переносимость объёма сейчас ниже обычного.",
  close:
    "Транзит близок к натальному: дисциплина и умеренность переносятся ровнее; удачный день закрепить привычный объём без экспериментов.",
  opposite:
    "Транзит примерно напротив натального: чаще внутренний спор между «надо строго» и «хочется выйти из рамок». Протокол не ослабляйте, но и не наказывайте голодом — только стабильные порции по правилам дня.",
  middle:
    "Умеренный разрыв: следите за тяжестью в желудке к вечеру и не форсируйте тяжёлую еду подряд вне типа дня.",
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
  return `${title} — натальная накшатра «${nNak}», сегодня в транзите «${tNak}». ${hints[rel]}`;
}

/**
 * Четыре абзаца: вводная + Меркурий, Венера, Сатурн (натал vs транзит по накшатрам, влияние на режим и самочувствие в терминах приложения).
 */
export function buildGrahaTransitParagraphs(natal: NatalProfile, snap: Snap): string[] {
  const intro =
    "Меркурий, Венера и Сатурн сравниваются с натальной картой по тем же 27 накшатрам, что и Луна. В этом приложении Меркурий читается как расписание еды, нервная регуляция и склонность есть в спешке или от скуки; Венера — как вкус, сладкое и еда как удовольствие; Сатурн — как чувство ограничений, тяжести, дисциплина и переносимость строгого или суховатого режима. Дальше — факты по вашей карте и сегодняшнему небу и короткая расшифровка для рациона.";

  return [
    intro,
    grahaParagraph("Меркурий", natal.mercury, snap.mercury, MERCURY),
    grahaParagraph("Венера", natal.venus, snap.venus, VENUS),
    grahaParagraph("Сатурн", natal.saturn, snap.saturn, SATURN),
  ];
}
