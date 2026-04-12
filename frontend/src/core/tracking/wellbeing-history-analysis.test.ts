import { describe, expect, it } from "vitest";
import {
  analyzeWellbeingHistory,
  bodySignalChangedProtocol,
  formatHistoryReportPlainText,
} from "./wellbeing-history-analysis";
import type { BodySignalWithContext } from "@/lib/api";

describe("wellbeing-history-analysis", () => {
  it("empty rows", () => {
    const r = analyzeWellbeingHistory([]);
    expect(r.stats.count).toBe(0);
    expect(r.insights.length).toBeGreaterThan(0);
    expect(r.weightRecommendations.length).toBe(0);
    expect(r.emotionRecommendations.length).toBe(0);
  });

  it("bodySignalChangedProtocol matches high ankles", () => {
    expect(
      bodySignalChangedProtocol({
        day_date: "2026-01-01",
        ankles_evening: 3,
      }),
    ).toBe(true);
    expect(
      bodySignalChangedProtocol({
        day_date: "2026-01-01",
        ankles_evening: 2,
      }),
    ).toBe(false);
  });

  it("aggregates averages and weight trend", () => {
    const rows: BodySignalWithContext[] = [
      {
        signal: {
          day_date: "2026-04-01",
          ankles_evening: 4,
          sleep_quality: 2,
          sweet_craving: 4,
          weight_kg: 70,
        },
      },
      {
        signal: {
          day_date: "2026-04-05",
          ankles_evening: 2,
          sleep_quality: 3,
          sweet_craving: 2,
          weight_kg: 69.5,
        },
      },
    ];
    const r = analyzeWellbeingHistory(rows);
    expect(r.stats.count).toBe(2);
    expect(r.stats.avg.ankles).toBe(3);
    expect(r.stats.weightTrend?.deltaKg).toBe(-0.5);
    expect(r.insights.some((s) => s.toLowerCase().includes("лодыж"))).toBe(true);
    expect(r.weightRecommendations.length).toBeGreaterThan(0);
    expect(r.emotionRecommendations.length).toBeGreaterThan(0);
    const txt = formatHistoryReportPlainText(r);
    expect(txt).toContain("ОТЧЁТ");
    expect(txt).toContain("Рекомендации");
  });
});
