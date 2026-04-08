import type { BodySignal } from "@/lib/api";
import type { Snap } from "../astrology/engine";
import type { BodySignals, DayContext } from "./protocol-types";
import { isPreFullMoonBand, isPreNewMoonBand } from "./rules";

/** Поля самочувствия из API → шкалы движка сигнальных правил. */
export function mapBodySignalToBodySignals(s: BodySignal | null | undefined): BodySignals {
  if (!s) return {};
  return {
    ankleSwellingEvening: s.ankles_evening ?? undefined,
    eyeSwellingMorning: s.eye_area_morning ?? undefined,
    mentalOverload: s.head_overload ?? undefined,
    sleepQuality: s.sleep_quality ?? undefined,
    saltCraving: s.salty_craving ?? undefined,
    sweetCraving: s.sweet_craving ?? undefined,
    tissueHeaviness: s.tissue_density ?? undefined,
    energy: s.energy_level ?? undefined,
  };
}

/**
 * Снимок `Snap` астродвижка → флаги лунного дня для `resolveDailyProtocol` / `buildDailyProtocolUi`.
 */
export function buildDayContextFromSnap(snap: Snap, prevSnap: Snap): DayContext {
  return {
    ekadashiFlag: snap.isEkadashi,
    pradoshFlag: snap.isPradosh,
    dayAfterEkadashiFlag: prevSnap.isEkadashi,
    preFullMoonFlag: isPreFullMoonBand(snap.elong),
    preNewMoonFlag: isPreNewMoonBand(snap.elong),
    waningPhase: snap.tithi >= 16,
    lunarDay: snap.tithi,
  };
}
