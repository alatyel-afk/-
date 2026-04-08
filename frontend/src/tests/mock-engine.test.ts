import { describe, it, expect } from "vitest";
import { buildProtocol, buildCalendarMonth, getMealMatrices, _testing as T } from "@/lib/mock-engine";
import { tithiNameRu } from "@/core/astrology/tithi-names";
import type { BodySignal } from "@/lib/api";

// ═══════════════════════════════════════════════════════════
//  UNIT TESTS
// ═══════════════════════════════════════════════════════════

// ── Astro math ─────────────────────────────────────────────

describe("Unit: elongation", () => {
  it("returns 0 when sun == moon (new moon)", () => {
    expect(T.elongation(30, 30)).toBe(0);
  });
  it("returns 180 when sun and moon are opposite (full moon)", () => {
    expect(T.elongation(0, 180)).toBe(180);
  });
  it("wraps correctly across 360", () => {
    expect(T.elongation(350, 10)).toBe(20);
  });
  it("never returns negative", () => {
    expect(T.elongation(100, 50)).toBeGreaterThanOrEqual(0);
  });
});

describe("Unit: tithi", () => {
  it("returns 1 for elongation near 0", () => {
    expect(T.tithi(0)).toBe(1);
    expect(T.tithi(5)).toBe(1);
  });
  it("returns 15 for elongation 168-180 (full moon)", () => {
    expect(T.tithi(170)).toBe(15);
  });
  it("returns 30 for elongation near 360", () => {
    expect(T.tithi(355)).toBe(30);
  });
  it("clamps to [1,30]", () => {
    expect(T.tithi(-10)).toBeGreaterThanOrEqual(1);
    expect(T.tithi(400)).toBeLessThanOrEqual(30);
  });
  it("ekadashi is tithi 11", () => {
    const el = 11 * 12 - 6;
    expect(T.tithi(el)).toBe(11);
  });
});

describe("Unit: illumination", () => {
  it("returns ~0 at elongation 0 (new moon)", () => {
    expect(T.illumination(0)).toBeCloseTo(0, 5);
  });
  it("returns ~1 at elongation 180 (full moon)", () => {
    expect(T.illumination(180)).toBeCloseTo(1, 5);
  });
  it("returns ~0.5 at elongation 90 (quarter)", () => {
    expect(T.illumination(90)).toBeCloseTo(0.5, 5);
  });
  it("always in [0,1]", () => {
    for (let e = 0; e <= 360; e += 15) {
      const v = T.illumination(e);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("Unit: phaseLabel", () => {
  it("labels new moon region", () => {
    expect(T.phaseLabel(10)).toContain("новолуние");
  });
  it("labels first quarter region", () => {
    expect(T.phaseLabel(100)).toContain("первая четверть");
  });
  it("labels near full moon", () => {
    expect(T.phaseLabel(170)).toContain("к полнолунию");
  });
  it("labels waning after full", () => {
    expect(T.phaseLabel(200)).toContain("убывающая после полнолуния");
  });
});

describe("Unit: matrixIndex", () => {
  it("maps tithi 1 → 1", () => expect(T.matrixIndex(1)).toBe(1));
  it("maps tithi 29 → 29", () => expect(T.matrixIndex(29)).toBe(29));
  it("maps tithi 30 → 29 (merge)", () => expect(T.matrixIndex(30)).toBe(29));
  it("maps tithi 0 → 1 (clamped)", () => expect(T.matrixIndex(0)).toBe(1));
});

describe("Unit: nakshatra", () => {
  it("index 0 at 0°", () => expect(T.nakIndex(0)).toBe(0));
  it("Ашвини at 0°", () => expect(T.nakName(0)).toBe("Ашвини"));
  it("Бхарани around 15°", () => expect(T.nakName(15)).toBe("Бхарани"));
  it("wraps at 360°", () => expect(T.nakIndex(360)).toBe(0));
  it("index clamped to max 26", () => expect(T.nakIndex(359.99)).toBeLessThanOrEqual(26));
  it("pada is 1-4", () => {
    for (let d = 0; d < 360; d += 20) {
      const p = T.nakPada(d);
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(4);
    }
  });
});

describe("Unit: angleDist", () => {
  it("returns 0 for identical angles", () => expect(T.angleDist(100, 100)).toBe(0));
  it("returns 10 for 10° apart", () => expect(T.angleDist(10, 20)).toBe(10));
  it("takes shortest path across 0°", () => expect(T.angleDist(5, 355)).toBe(10));
  it("180° is maximum", () => expect(T.angleDist(0, 180)).toBe(180));
});

describe("Unit: clamp", () => {
  it("clamps below 0", () => expect(T.clamp(-5)).toBe(0));
  it("clamps above 100", () => expect(T.clamp(120)).toBe(100));
  it("passes through in range", () => expect(T.clamp(50)).toBe(50));
});

describe("Unit: navamsaLongitude", () => {
  it("returns 0..360 for sample longitude", () => {
    const v = T.navamsaLongitude(62.917);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(360);
  });
});

describe("Unit: computeSnap (Meeus ephemeris)", () => {
  it("2026-04-08: титхи убывающей Луны (~21), не игрушечная Дашами", () => {
    const snap = T.computeSnap(new Date(2026, 3, 8, 12, 0, 0));
    expect(snap.tithi).toBe(21);
    expect(snap.elong).toBeGreaterThan(230);
    expect(snap.elong).toBeLessThan(270);
  });
});

describe("Unit: tithiNameRu", () => {
  it("даёт Шукла и Кришна по номеру", () => {
    expect(tithiNameRu(1)).toContain("Шукла");
    expect(tithiNameRu(15)).toContain("Пурнима");
    expect(tithiNameRu(16)).toContain("Кришна");
    expect(tithiNameRu(30)).toContain("Амавасья");
  });
});

describe("Integration: tithi label and movement bullets", () => {
  it("протокол содержит название титхи и список движения", () => {
    const p = buildProtocol("2026-04-08");
    expect(p.tithi_name_ru.length).toBeGreaterThan(3);
    expect(p.movement_load.items.length).toBeGreaterThanOrEqual(4);
    expect(p.moon_phase).toMatch(/диск ~/);
  });
});

// ── Scales ─────────────────────────────────────────────────

describe("Unit: computeScales", () => {
  function mkSnap(overrides: Record<string, unknown> = {}) {
    return {
      sun: 0, moon: 100, elong: 100, tithi: 1,
      nakshatra: "Test", pada: 1, illum: 0.5, phase: "test",
      isEkadashi: false, isPradosh: false,
      mars: 0, mercury: 0, venus: 0,
      saturn: 0, jupiter: 0, rahu: 0, ketu: 0,
      ...overrides,
    };
  }

  it("starts from base 50/50/50/50 for neutral snap", () => {
    const { scales } = T.computeScales(mkSnap(), [], false);
    expect(scales.water_retention_risk).toBe(50);
    expect(scales.release_drainage_potential).toBe(50);
    expect(scales.nervous_system_load).toBe(50);
    expect(scales.need_for_rhythm_precision).toBe(50);
  });

  it("tithi 7 increases water retention", () => {
    const { scales } = T.computeScales(mkSnap({ tithi: 7 }), [], false);
    expect(scales.water_retention_risk).toBe(60);
  });

  it("tithi 8 increases release potential", () => {
    const { scales } = T.computeScales(mkSnap({ tithi: 8 }), [], false);
    expect(scales.release_drainage_potential).toBe(58);
  });

  it("ekadashi boosts release and reduces retention", () => {
    const { scales } = T.computeScales(mkSnap({ isEkadashi: true, tithi: 11 }), [], false);
    expect(scales.release_drainage_potential).toBe(64);
    expect(scales.water_retention_risk).toBe(42);
  });

  it("pradosh boosts nervous load and rhythm", () => {
    const { scales } = T.computeScales(mkSnap({ isPradosh: true, tithi: 13 }), [], false);
    expect(scales.nervous_system_load).toBe(56);
    expect(scales.need_for_rhythm_precision).toBe(55);
  });

  it("prev reduction modifies scales", () => {
    const { scales } = T.computeScales(mkSnap(), [], true);
    expect(scales.water_retention_risk).toBe(55);
    expect(scales.release_drainage_potential).toBe(44);
    expect(scales.nervous_system_load).toBe(54);
  });

  it("high illumination increases wr and nrv", () => {
    const { scales } = T.computeScales(mkSnap({ illum: 0.9 }), [], false);
    expect(scales.water_retention_risk).toBe(58);
    expect(scales.nervous_system_load).toBe(55);
  });

  it("low illumination increases rhy and nrv", () => {
    const { scales } = T.computeScales(mkSnap({ illum: 0.05 }), [], false);
    expect(scales.need_for_rhythm_precision).toBe(58);
    expect(scales.nervous_system_load).toBe(54);
  });

  it("Saturn conjunction Moon raises all", () => {
    const hits = [{ planet: "Saturn", aspect: "conjunction", target: "moon", delta: 2 }];
    const { scales } = T.computeScales(mkSnap(), hits, false);
    expect(scales.water_retention_risk).toBe(62);
    expect(scales.nervous_system_load).toBe(60);
    expect(scales.need_for_rhythm_precision).toBe(58);
  });

  it("Rahu conjunction Moon raises nrv and wr", () => {
    const hits = [{ planet: "Rahu", aspect: "conjunction", target: "moon", delta: 3 }];
    const { scales } = T.computeScales(mkSnap(), hits, false);
    expect(scales.nervous_system_load).toBe(58);
    expect(scales.water_retention_risk).toBe(56);
  });

  it("Jupiter trine Moon improves release, lowers nrv", () => {
    const hits = [{ planet: "Jupiter", aspect: "trine", target: "moon", delta: 1 }];
    const { scales } = T.computeScales(mkSnap(), hits, false);
    expect(scales.release_drainage_potential).toBe(55);
    expect(scales.nervous_system_load).toBe(46);
  });

  it("produces trace array", () => {
    const { trace } = T.computeScales(mkSnap(), [], false);
    expect(trace.length).toBeGreaterThan(0);
    expect(trace[0]).toContain("Начальные значения");
    expect(trace[trace.length - 1]).toContain("Итого:");
  });
});

// ── Day type ───────────────────────────────────────────────

describe("Unit: resolveDayType", () => {
  const neutralSnap = {
    sun: 0, moon: 100, elong: 100, tithi: 5,
    nakshatra: "T", pada: 1, illum: 0.5, phase: "t",
    isEkadashi: false, isPradosh: false,
    mars: 0, mercury: 0, venus: 0,
    saturn: 0, jupiter: 0, rahu: 0, ketu: 0,
  };
  const neutralScales = { water_retention_risk: 50, release_drainage_potential: 50, nervous_system_load: 50, need_for_rhythm_precision: 50 };

  it("ekadashi trumps everything", () => {
    const { dayType } = T.resolveDayType(neutralScales, { ...neutralSnap, isEkadashi: true }, false);
    expect(dayType).toBe("ekadashi_day");
  });
  it("pradosh trumps non-ekadashi", () => {
    const { dayType } = T.resolveDayType(neutralScales, { ...neutralSnap, isPradosh: true }, false);
    expect(dayType).toBe("pradosh_day");
  });
  it("prev reduction → recovery", () => {
    const { dayType } = T.resolveDayType(neutralScales, neutralSnap, true);
    expect(dayType).toBe("recovery_day_after_reduction");
  });
  it("elong near full moon (узкое окно) → pre_full_moon", () => {
    const { dayType } = T.resolveDayType(neutralScales, { ...neutralSnap, elong: 170, tithi: 15, illum: 0.9 }, false);
    expect(dayType).toBe("pre_full_moon_retention_day");
  });
  it("elong near new moon (узкое окно) → pre_new_moon", () => {
    const { dayType } = T.resolveDayType(neutralScales, { ...neutralSnap, elong: 10, tithi: 1, illum: 0.05 }, false);
    expect(dayType).toBe("pre_new_moon_precision_day");
  });
  it("high illum без узкой фазы — не подменяет тип дня", () => {
    const { dayType } = T.resolveDayType(neutralScales, { ...neutralSnap, elong: 120, illum: 0.9 }, false);
    expect(dayType).toBe("stable_day");
  });
  it("high wr + nrv → caution", () => {
    const { dayType } = T.resolveDayType(
      { ...neutralScales, water_retention_risk: 75, nervous_system_load: 70 },
      neutralSnap, false,
    );
    expect(dayType).toBe("caution_day");
  });
  it("high nrv alone → high_sensitivity", () => {
    const { dayType } = T.resolveDayType(
      { ...neutralScales, nervous_system_load: 80 },
      neutralSnap, false,
    );
    expect(dayType).toBe("high_sensitivity_day");
  });
  it("high rhy alone → high_sensitivity", () => {
    const { dayType } = T.resolveDayType(
      { ...neutralScales, need_for_rhythm_precision: 80 },
      neutralSnap, false,
    );
    expect(dayType).toBe("high_sensitivity_day");
  });
  it("high rel + low wr → drainage", () => {
    const { dayType } = T.resolveDayType(
      { ...neutralScales, release_drainage_potential: 75, water_retention_risk: 45 },
      neutralSnap, false,
    );
    expect(dayType).toBe("drainage_day");
  });
  it("default → stable", () => {
    const { dayType } = T.resolveDayType(neutralScales, neutralSnap, false);
    expect(dayType).toBe("stable_day");
  });
});

// ── Rice policy ────────────────────────────────────────────

describe("Unit: decideRice", () => {
  const lowWr = { water_retention_risk: 40, release_drainage_potential: 50, nervous_system_load: 50, need_for_rhythm_precision: 50 };
  const highWr = { water_retention_risk: 70, release_drainage_potential: 50, nervous_system_load: 50, need_for_rhythm_precision: 50 };

  it("forbidden on ekadashi", () => {
    expect(T.decideRice("ekadashi_day", lowWr).allowed).toBe(false);
  });
  it("forbidden on pradosh", () => {
    expect(T.decideRice("pradosh_day", lowWr).allowed).toBe(false);
  });
  it("forbidden on pre_full_moon", () => {
    expect(T.decideRice("pre_full_moon_retention_day", lowWr).allowed).toBe(false);
  });
  it("forbidden on pre_new_moon", () => {
    expect(T.decideRice("pre_new_moon_precision_day", lowWr).allowed).toBe(false);
  });
  it("forbidden on caution_day", () => {
    expect(T.decideRice("caution_day", lowWr).allowed).toBe(false);
  });
  it("forbidden when wr >= 65 even on stable day", () => {
    expect(T.decideRice("stable_day", highWr).allowed).toBe(false);
  });
  it("allowed on stable_day with low wr", () => {
    expect(T.decideRice("stable_day", lowWr).allowed).toBe(true);
  });
  it("not allowed on drainage_day even with low wr (default → no)", () => {
    expect(T.decideRice("drainage_day", lowWr).allowed).toBe(false);
  });
  it("not allowed on recovery_day (not stable)", () => {
    expect(T.decideRice("recovery_day_after_reduction", lowWr).allowed).toBe(false);
  });
  it("always returns trace", () => {
    expect(T.decideRice("stable_day", lowWr).trace.length).toBeGreaterThan(0);
  });
});

// ── Mudra selector ─────────────────────────────────────────

describe("Unit: selectMudra", () => {
  it("drainage → apana", () => {
    const { mudra } = T.selectMudra("drainage_day", false);
    expect(mudra.mudra).toBe("apana");
    expect(mudra.suggested).toBe(true);
  });
  it("ekadashi → apana", () => {
    expect(T.selectMudra("ekadashi_day", false).mudra.mudra).toBe("apana");
  });
  it("pradosh → apana", () => {
    expect(T.selectMudra("pradosh_day", false).mudra.mudra).toBe("apana");
  });
  it("high_sensitivity → vayu", () => {
    const { mudra } = T.selectMudra("high_sensitivity_day", false);
    expect(mudra.mudra).toBe("vayu");
    expect(mudra.suggested).toBe(true);
  });
  it("pre_full_moon → none (retention)", () => {
    expect(T.selectMudra("pre_full_moon_retention_day", false).mudra.suggested).toBe(false);
  });
  it("stable_day + high retention → none", () => {
    expect(T.selectMudra("stable_day", true).mudra.suggested).toBe(false);
  });
  it("stable_day + no retention → none (not needed)", () => {
    expect(T.selectMudra("stable_day", false).mudra.suggested).toBe(false);
  });
  it("apana has finger technique", () => {
    const { mudra } = T.selectMudra("drainage_day", false);
    expect(mudra.finger_technique).toContain("пальц");
  });
  it("vayu has finger technique", () => {
    const { mudra } = T.selectMudra("high_sensitivity_day", false);
    expect(mudra.finger_technique).toContain("палец");
  });
});

// ── Body signal interpreter ────────────────────────────────

describe("Unit: interpretSignals", () => {
  const blank: BodySignal = { day_date: "2026-01-01" };

  it("all-zero signals produce no overrides", () => {
    const ov = T.interpretSignals(blank);
    expect(ov.forceRetentionMatrix).toBe(false);
    expect(ov.forceNoRice).toBe(false);
    expect(ov.forceCalmBreathing).toBe(false);
    expect(ov.noIntensifyExercise).toBe(false);
    expect(ov.trace[0]).toContain("в норме");
  });

  it("ankles >= 3 forces retention matrix", () => {
    const ov = T.interpretSignals({ ...blank, ankles_evening: 3 });
    expect(ov.forceRetentionMatrix).toBe(true);
    expect(ov.scaleDeltas.wr).toBe(12);
  });

  it("ankles >= 4 adds extra wr", () => {
    const ov = T.interpretSignals({ ...blank, ankles_evening: 4 });
    expect(ov.scaleDeltas.wr).toBe(18);
  });

  it("eyes >= 3 forces no rice", () => {
    const ov = T.interpretSignals({ ...blank, eye_area_morning: 3 });
    expect(ov.forceNoRice).toBe(true);
    expect(ov.scaleDeltas.wr).toBe(8);
  });

  it("mental >= 4 forces calm breathing + reduce meals", () => {
    const ov = T.interpretSignals({ ...blank, head_overload: 4 });
    expect(ov.forceCalmBreathing).toBe(true);
    expect(ov.reduceMealComplexity).toBe(true);
    expect(ov.scaleDeltas.nrv).toBe(16);
  });

  it("mental == 3 adds nrv but no calm breathing", () => {
    const ov = T.interpretSignals({ ...blank, head_overload: 3 });
    expect(ov.forceCalmBreathing).toBe(false);
    expect(ov.scaleDeltas.nrv).toBe(6);
  });

  it("sleep <= 2 prevents exercise intensification", () => {
    const ov = T.interpretSignals({ ...blank, sleep_quality: 2 });
    expect(ov.noIntensifyExercise).toBe(true);
    expect(ov.scaleDeltas.nrv).toBe(5);
    expect(ov.scaleDeltas.rhy).toBe(4);
  });

  it("low energy + no swelling allows conditional rice", () => {
    const ov = T.interpretSignals({ ...blank, energy_level: 1, ankles_evening: 0, eye_area_morning: 0 });
    expect(ov.riceConditionallyAllowed).toBe(true);
  });

  it("low energy + high ankles does NOT allow conditional rice", () => {
    const ov = T.interpretSignals({ ...blank, energy_level: 1, ankles_evening: 4 });
    expect(ov.riceConditionallyAllowed).toBe(false);
  });

  it("tissue >= 3 adds wr", () => {
    const ov = T.interpretSignals({ ...blank, tissue_density: 3 });
    expect(ov.scaleDeltas.wr).toBe(5);
  });

  it("salty >= 3 adds wr", () => {
    const ov = T.interpretSignals({ ...blank, salty_craving: 4 });
    expect(ov.scaleDeltas.wr).toBe(4);
  });

  it("sweet >= 3 adds nrv", () => {
    const ov = T.interpretSignals({ ...blank, sweet_craving: 5 });
    expect(ov.scaleDeltas.nrv).toBe(3);
  });

  it("multiple signals accumulate", () => {
    const ov = T.interpretSignals({
      ...blank,
      ankles_evening: 4, eye_area_morning: 3, head_overload: 4,
      sleep_quality: 1, tissue_density: 4, salty_craving: 3, sweet_craving: 3,
    });
    expect(ov.forceRetentionMatrix).toBe(true);
    expect(ov.forceNoRice).toBe(true);
    expect(ov.forceCalmBreathing).toBe(true);
    expect(ov.noIntensifyExercise).toBe(true);
    expect(ov.scaleDeltas.wr).toBe(18 + 8 + 5 + 4);
    expect(ov.scaleDeltas.nrv).toBe(16 + 5 + 3);
    expect(ov.trace.length).toBeGreaterThanOrEqual(8);
  });
});

// ── Lunch time ─────────────────────────────────────────────

describe("Unit: lunchTime", () => {
  it("ekadashi → early", () => expect(T.lunchTime("ekadashi_day").early).toBe(true));
  it("pradosh → early", () => expect(T.lunchTime("pradosh_day").early).toBe(true));
  it("drainage → early", () => expect(T.lunchTime("drainage_day").early).toBe(true));
  it("stable → not early", () => expect(T.lunchTime("stable_day").early).toBe(false));
  it("caution → early", () => expect(T.lunchTime("caution_day").early).toBe(true));
});

// ── Supplements ────────────────────────────────────────────

describe("Unit: supplements", () => {
  it("has fixed slots including ALA, lunch, spices, evening", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    expect(s.slots.length).toBeGreaterThanOrEqual(5);
  });
  it("endoluten cycle: anchor day is true", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    expect(s.endoluten_today).toBe(true);
  });
  it("endoluten cycle: day+1 is false", () => {
    const s = T.buildSupplements(new Date("2026-04-08T12:00:00"));
    expect(s.endoluten_today).toBe(false);
  });
  it("endoluten cycle: day+3 is true again", () => {
    const s = T.buildSupplements(new Date("2026-04-10T12:00:00"));
    expect(s.endoluten_today).toBe(true);
  });
  it("first slot is ALA nutraceutical, 30 min before breakfast", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    expect(s.slots[0].time).toMatch(/нутрицевтик/i);
    expect(s.slots[0].items).toMatch(/нутрицевтик/i);
    expect(s.slots[0].items).toMatch(/Альфа-липоевая|ALA/i);
    expect(s.slots[0].items).toMatch(/30 минут/i);
  });
  it("slot items contain L-theanine after breakfast", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    expect(s.slots[1].items).toContain("L-теанин");
  });
  it("lunch slot has omega-3 and zinc+selenium one capsule", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    expect(s.slots[2].items).toContain("Омега-3");
    expect(s.slots[2].items).toMatch(/одной капсуле|одна капсула/i);
  });
  it("evening slot has magnesium + GABA + 5-HTP", () => {
    const s = T.buildSupplements(new Date("2026-04-07T12:00:00"));
    const evening = s.slots[s.slots.length - 1];
    expect(evening.items).toContain("Магний бисглицинат");
    expect(evening.items).toContain("ГАМК 500 мг");
    expect(evening.items).toContain("5-HTP 120 мг");
  });
});

// ═══════════════════════════════════════════════════════════
//  THYROID SAFETY LAYER TESTS
// ═══════════════════════════════════════════════════════════

describe("Thyroid Safety Layer", () => {
  const FORBIDDEN_SUPPLEMENTS = ["йод", "тирозин", "келп", "водоросл", "iodine", "tyrosine", "kelp", "seaweed", "thyroid support"];
  const FORBIDDEN_PRACTICES_AS_TREATMENT = ["лечени", "терапи", "лечит"];

  it("thyroid notes always present in every protocol", () => {
    const dates = ["2026-01-15", "2026-04-07", "2026-07-22", "2026-12-31"];
    for (const d of dates) {
      const p = buildProtocol(d);
      expect(p.thyroid_safety_notes.mode).toBe("conservative_thyroid_safe");
      expect(p.thyroid_safety_notes.notes.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("thyroid notes explicitly prohibit iodine and tyrosine", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("йод");
    expect(notes).toContain("тирозин");
    expect(notes).toContain("водоросли");
    expect(notes).toContain("келп");
  });

  it("selenium is marked as not a treatment", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("селен");
    expect(notes).toContain("не является лечением");
  });

  it("breathing practices disclaimed as not thyroid therapy", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("дыхательные практики");
    expect(notes).toContain("не являются терапией щитовидной железы");
  });

  it("no food after 18:00 enforced (stable meal timing)", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("стабильное время еды");
  });

  it("no stimulant escalation mentioned", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("без эскалации стимуляторов");
  });

  it("no extreme fasting mentioned", () => {
    const notes = T.THYROID_NOTES.join(" ").toLowerCase();
    expect(notes).toContain("без экстремального голодания");
  });

  it("supplements never contain forbidden thyroid items", () => {
    const dates = ["2026-01-01", "2026-04-07", "2026-06-15", "2026-10-30"];
    for (const d of dates) {
      const p = buildProtocol(d);
      const allItems = p.supplements.slots.map((s) => s.items.toLowerCase()).join(" ");
      for (const f of FORBIDDEN_SUPPLEMENTS) {
        expect(allItems).not.toContain(f);
      }
    }
  });

  it("breathing practice never claims to treat thyroid", () => {
    const dates = ["2026-01-01", "2026-04-07", "2026-06-15", "2026-10-30"];
    for (const d of dates) {
      const p = buildProtocol(d);
      const breathText = Object.values(p.breathing_practice).join(" ").toLowerCase();
      for (const f of FORBIDDEN_PRACTICES_AS_TREATMENT) {
        expect(breathText).not.toContain(f);
      }
    }
  });

  it("mudra never claims to treat thyroid", () => {
    const dates = ["2026-01-01", "2026-04-07", "2026-06-15", "2026-10-30"];
    for (const d of dates) {
      const p = buildProtocol(d);
      if (p.mudra_recommendation.suggested) {
        const mudraText = Object.values(p.mudra_recommendation).join(" ").toLowerCase();
        for (const f of FORBIDDEN_PRACTICES_AS_TREATMENT) {
          expect(mudraText).not.toContain(f);
        }
      }
    }
  });

  it("thyroid safety rule trace always present", () => {
    const p = buildProtocol("2026-04-07");
    expect(p.rule_trace.thyroid_rules.length).toBeGreaterThan(0);
    expect(p.rule_trace.thyroid_rules[0]).toContain("Защита щитовидной железы");
  });

  it("no_food_after_18 always true in protocol", () => {
    const dates = ["2026-01-01", "2026-04-07", "2026-06-15"];
    for (const d of dates) {
      expect(buildProtocol(d).nutrition.no_food_after_18).toBe(true);
    }
  });

  it("thyroid safety layer persists even with extreme body signals", () => {
    const sig: BodySignal = {
      day_date: "2026-04-07", ankles_evening: 5, eye_area_morning: 5,
      head_overload: 5, sleep_quality: 0, energy_level: 0,
      tissue_density: 5, salty_craving: 5, sweet_craving: 5,
    };
    const p = buildProtocol("2026-04-07", sig);
    expect(p.thyroid_safety_notes.mode).toBe("conservative_thyroid_safe");
    expect(p.thyroid_safety_notes.notes.length).toBeGreaterThanOrEqual(4);
    expect(p.nutrition.no_food_after_18).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
//  INTEGRATION TESTS — full pipeline
// ═══════════════════════════════════════════════════════════

describe("Integration: buildProtocol — structure", () => {
  const p = buildProtocol("2026-04-07");

  it("returns all required fields", () => {
    const required = [
      "date", "weekday", "lunar_day_number", "tithi_name_ru", "moon_phase", "nakshatra",
      "ekadashi_flag", "pradosh_flag", "day_type", "body_effect_summary",
      "nutrition", "supplements", "breathing_practice", "mudra_recommendation",
      "aroma_protocol", "movement_load", "thyroid_safety_notes",
      "body_markers_to_track", "warnings", "scales", "rule_trace",
      "moon_illumination_pct", "matrix_index", "astro_alignment",
      "signal_protocol_ui",
      "natal_forecast",
    ];
    for (const key of required) {
      expect(p).toHaveProperty(key);
    }
  });

  it("nutrition has breakfast, lunch, rice, no_food_after_18, selection_assurance", () => {
    expect(p.nutrition.breakfast).toBeTruthy();
    expect(p.nutrition.lunch).toBeTruthy();
    expect(p.nutrition.rice).toBeTruthy();
    expect(p.nutrition.no_food_after_18).toBe(true);
    expect(p.nutrition.selection_assurance).toContain("накшатр");
    expect(p.nutrition.selection_assurance).toContain("D1/D9");
  });

  it("scales are all 0-100", () => {
    for (const v of Object.values(p.scales)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("lunch matrix is a known matrix key", () => {
    const validKeys = ["A_stable", "B_nervous", "C_retention", "D_ekadashi", "E_pradosh", "F_grain"];
    expect(validKeys).toContain(p.nutrition.lunch.matrix_used);
  });

  it("day_type is one of 9 types", () => {
    const types = [
      "stable_day", "drainage_day", "caution_day", "high_sensitivity_day",
      "ekadashi_day", "pradosh_day", "recovery_day_after_reduction",
      "pre_full_moon_retention_day", "pre_new_moon_precision_day",
    ];
    expect(types).toContain(p.day_type);
  });

  it("rule_trace has all 12 categories", () => {
    const cats = [
      "day_type_rules", "scales_modifiers", "rice_rules", "breathing_rules",
      "mudra_rules", "thyroid_rules", "body_signal_rules", "meal_matrix_rules",
      "load_rules", "aroma_rules", "alignment_rules", "signal_protocol_engine",
    ];
    for (const c of cats) {
      expect(p.rule_trace).toHaveProperty(c);
      const lines = p.rule_trace[c as keyof typeof p.rule_trace];
      expect(Array.isArray(lines) && lines.length > 0).toBe(true);
    }
  });

  it("breakfast is always fixed", () => {
    expect(p.nutrition.breakfast).toContain("яйцо");
    expect(p.nutrition.breakfast).toContain("нутрицевтик");
  });

  it("moon illumination is percentage 0-100", () => {
    expect(p.moon_illumination_pct).toBeGreaterThanOrEqual(0);
    expect(p.moon_illumination_pct).toBeLessThanOrEqual(100);
  });
});

describe("Integration: stable day without signals", () => {
  const p = buildProtocol("2026-04-07");

  it("produces stable_day", () => expect(p.day_type).toBe("stable_day"));
  it("uses A_stable or F_grain matrix", () => {
    expect(["A_stable", "F_grain"]).toContain(p.nutrition.lunch.matrix_used);
  });
  it("body signal rules say no signals", () => {
    expect(p.rule_trace.body_signal_rules[0]).toContain("не записано");
  });
});

describe("Integration: body signals override protocol", () => {
  it("ankle swelling >= 3 forces C_retention matrix", () => {
    const p = buildProtocol("2026-04-07", { day_date: "2026-04-07", ankles_evening: 4 });
    expect(p.nutrition.lunch.matrix_used).toBe("C_retention");
    expect(p.rule_trace.meal_matrix_rules.join(" ")).toContain("Лодыжки");
  });

  it("eye swelling >= 3 forbids rice", () => {
    const p = buildProtocol("2026-04-07", { day_date: "2026-04-07", eye_area_morning: 4 });
    expect(p.nutrition.rice.allowed).toBe(false);
    expect(p.rule_trace.body_signal_rules.join(" ")).toContain("глазами");
  });

  it("mental overload >= 4 changes aroma to calming", () => {
    const p = buildProtocol("2026-04-07", { day_date: "2026-04-07", head_overload: 5 });
    expect(p.aroma_protocol.daytime).toBe("anti_stress_blend");
    expect(p.rule_trace.aroma_rules.join(" ")).toContain("перегружена");
  });

  it("sleep <= 2 on stable day downgrades moderate to walk_soft", () => {
    const p = buildProtocol("2026-04-07", { day_date: "2026-04-07", sleep_quality: 1 });
    expect(p.movement_load.profile).toBe("walk_soft");
    expect(p.rule_trace.load_rules.join(" ")).toContain("сон");
  });

  it("low energy no swelling conditionally allows rice on stable day", () => {
    const p = buildProtocol("2026-04-07", {
      day_date: "2026-04-07", energy_level: 1, ankles_evening: 0, eye_area_morning: 0,
    });
    expect(p.nutrition.rice.allowed).toBe(true);
    expect(p.rule_trace.body_signal_rules.join(" ")).toContain("гарнир допустим");
  });

  it("extreme signals escalate day type via scales", () => {
    const p = buildProtocol("2026-04-07", {
      day_date: "2026-04-07", ankles_evening: 5, eye_area_morning: 5,
      head_overload: 5, salty_craving: 5, tissue_density: 5,
      sweet_craving: 5, sleep_quality: 0,
    });
    expect(["caution_day", "high_sensitivity_day"]).toContain(p.day_type);
    expect(p.scales.water_retention_risk).toBeGreaterThan(70);
  });

  it("signals add warnings", () => {
    const p = buildProtocol("2026-04-07", {
      day_date: "2026-04-07", ankles_evening: 4, head_overload: 5, sleep_quality: 1,
    });
    expect(p.warnings.some((w) => w.includes("Лодыжки"))).toBe(true);
    expect(p.warnings.some((w) => w.includes("перегружена"))).toBe(true);
    expect(p.warnings.some((w) => w.includes("сон"))).toBe(true);
  });

  it("signals add tracking items", () => {
    const p = buildProtocol("2026-04-07", {
      day_date: "2026-04-07", ankles_evening: 3, weight_kg: 65.5,
    });
    expect(p.body_markers_to_track.some((t) => t.includes("Лодыжки"))).toBe(true);
    expect(p.body_markers_to_track.some((t) => t.includes("65.5 кг"))).toBe(true);
  });
});

describe("Integration: mental overload mudra override", () => {
  it("mental overload activates vayu mudra when retention is low", () => {
    const p = buildProtocol("2026-04-07", { day_date: "2026-04-07", head_overload: 5 });
    if (p.scales.water_retention_risk < 65) {
      expect(p.mudra_recommendation.suggested).toBe(true);
      expect(p.mudra_recommendation.mudra).toBe("vayu");
    }
  });

  it("mental overload does NOT activate vayu when retention is high", () => {
    const p = buildProtocol("2026-04-07", {
      day_date: "2026-04-07", head_overload: 5, ankles_evening: 5,
    });
    if (p.scales.water_retention_risk >= 65) {
      expect(p.mudra_recommendation.mudra).not.toBe("vayu");
    }
  });
});

describe("Integration: calendar month", () => {
  it("April 2026 has 30 days", () => {
    const days = buildCalendarMonth(2026, 4);
    expect(days).toHaveLength(30);
  });

  it("each day has required fields", () => {
    const days = buildCalendarMonth(2026, 4);
    for (const d of days) {
      expect(d.date).toBeTruthy();
      expect(d.lunar_day_number).toBeGreaterThanOrEqual(1);
      expect(d.lunar_day_number).toBeLessThanOrEqual(30);
      expect(d.nakshatra).toBeTruthy();
      expect(d.matrix_index).toBeGreaterThanOrEqual(1);
      expect(d.matrix_index).toBeLessThanOrEqual(29);
    }
  });

  it("February 2026 has 28 days", () => {
    expect(buildCalendarMonth(2026, 2)).toHaveLength(28);
  });

  it("day types vary across a month", () => {
    const types = new Set(buildCalendarMonth(2026, 4).map((d) => d.day_type));
    expect(types.size).toBeGreaterThan(1);
  });
});

describe("Integration: meal matrices API", () => {
  it("returns 6 matrices", () => {
    const m = getMealMatrices();
    expect(Object.keys(m)).toHaveLength(6);
  });

  it("each matrix has at least 3 options", () => {
    const m = getMealMatrices();
    for (const [, meals] of Object.entries(m)) {
      expect(meals.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("no matrix contains forbidden foods", () => {
    const forbidden = ["маш", "овсянк", "рыб", "тыкв", "индейк", "свинин", "авокадо", "кинз", "перлов", "булгур", "киноа"];
    const m = getMealMatrices();
    for (const [, meals] of Object.entries(m)) {
      for (const meal of meals) {
        const text = meal.full_description.toLowerCase();
        for (const f of forbidden) {
          expect(text).not.toContain(f);
        }
      }
    }
  });

  it("D_ekadashi matrix has no meat", () => {
    const m = getMealMatrices();
    for (const meal of m.D_ekadashi) {
      expect(meal.protein).toBe("—");
    }
  });

  it("approved proteins only: мясо, рыба, печень или без мяса (экадаши)", () => {
    const approved = ["курица", "телятина", "говядина", "форель", "лосось", "треска", "минтай", "печень", "—"];
    const m = getMealMatrices();
    for (const [, meals] of Object.entries(m)) {
      for (const meal of meals) {
        const p = meal.protein.toLowerCase();
        expect(approved.some((a) => p.includes(a))).toBe(true);
      }
    }
  });
});

describe("Integration: determinism", () => {
  it("same date always produces identical protocol", () => {
    const a = buildProtocol("2026-04-07");
    const b = buildProtocol("2026-04-07");
    expect(a).toEqual(b);
  });

  it("same date + same signals produces identical protocol", () => {
    const sig: BodySignal = { day_date: "2026-04-07", ankles_evening: 3, head_overload: 4 };
    const a = buildProtocol("2026-04-07", sig);
    const b = buildProtocol("2026-04-07", sig);
    expect(a).toEqual(b);
  });

  it("different dates produce different protocols", () => {
    const a = buildProtocol("2026-04-07");
    const b = buildProtocol("2026-04-08");
    expect(a.date).not.toBe(b.date);
  });
});

describe("Integration: breathing practice rules", () => {
  it("every day type maps to an allowed practice", () => {
    const allowed = ["diaphragmatic", "lengthened_exhale", "sama_vritti", "nadi_shodhana_gentle", "bhramari", "chandra_bhedana"];
    for (const dt of Object.keys(T.BREATH_MAP)) {
      const entry = T.BREATH_MAP[dt as keyof typeof T.BREATH_MAP];
      expect(allowed).toContain(entry.practice);
    }
  });

  it("no aggressive practices by default", () => {
    const aggressive = ["kapalabhati", "bhastrika", "hyperventilation"];
    for (const dt of Object.keys(T.BREATH_MAP)) {
      const entry = T.BREATH_MAP[dt as keyof typeof T.BREATH_MAP];
      for (const a of aggressive) {
        expect(entry.practice).not.toContain(a);
        expect(entry.technique.toLowerCase()).not.toContain(a);
      }
    }
  });

  it("all practices specify duration, time, posture, technique, tongue, contraindication", () => {
    for (const dt of Object.keys(T.BREATH_MAP)) {
      const entry = T.BREATH_MAP[dt as keyof typeof T.BREATH_MAP];
      expect(entry.min).toBeGreaterThan(0);
      expect(entry.time).toBeTruthy();
      expect(entry.posture).toBeTruthy();
      expect(entry.technique).toBeTruthy();
      expect(entry.tongue).toBeTruthy();
      expect(entry.contra).toBeTruthy();
    }
  });
});

describe("Integration: aroma rules", () => {
  it("only approved aromas used", () => {
    const approved = ["frankincense", "rose", "geranium", "rosemary", "leuzea", "anti_stress_blend"];
    for (const dt of Object.keys(T.AROMAS)) {
      const entry = T.AROMAS[dt as keyof typeof T.AROMAS];
      expect(approved).toContain(entry.morning);
      expect(approved).toContain(entry.daytime);
      expect(approved).toContain(entry.evening);
    }
  });

  it("all aroma entries have detail texts", () => {
    for (const dt of Object.keys(T.AROMAS)) {
      const entry = T.AROMAS[dt as keyof typeof T.AROMAS];
      expect(entry.morning_detail).toBeTruthy();
      expect(entry.daytime_detail).toBeTruthy();
      expect(entry.evening_detail).toBeTruthy();
    }
  });
});
