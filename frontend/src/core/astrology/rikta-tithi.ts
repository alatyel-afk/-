import type { NatalProfile } from "../profile/natal-profile";
import { elongation, tithi as tithiFromElongation } from "./lunar-day";

/**
 * Рикта («пустые») титхи в панчанге: 4-я, 9-я и 14-я в шукла-пакше и те же по счёту в кришна-пакше.
 * Нумерация 1–30 как в `lunar-day.tithi`: 4, 9, 14, 19, 24, 29.
 */
export const RIKTA_TITHI_NUMBERS: readonly number[] = [4, 9, 14, 19, 24, 29];

export function isRiktaTithi(tithiNum: number): boolean {
  return RIKTA_TITHI_NUMBERS.includes(tithiNum);
}

/** Лунный день рождения по натальным долготам Солнца и Луны (элонгация Луна–Солнце). */
export function natalBirthTithiNumber(natal: NatalProfile): number {
  const elong = elongation(natal.sun, natal.moon);
  return tithiFromElongation(elong);
}
