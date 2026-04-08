import { describe, expect, it } from "vitest";
import { resolveDailyProtocol, sortSignalRulesByPriority } from "./rule-engine";
import { signalRules } from "./signal-rules";
import { rulePriority } from "./rule-priority";
describe("rule-engine", () => {
  it("sorts rules by rulePriority", () => {
    const sorted = sortSignalRulesByPriority(signalRules, rulePriority);
    expect(sorted[0]?.id).toBe("ekadashi_day");
    expect(sorted[sorted.length - 1]?.id).toBe("baseline_no_signals");
  });

  it("matches ekadashi before body rules", () => {
    const r = resolveDailyProtocol({
      ekadashiFlag: true,
      ankleSwellingEvening: 5,
    });
    expect(r).not.toBeNull();
    expect(r!.matchedRule).toBe("ekadashi_day");
  });

  it("falls back to baseline when body fields missing", () => {
    const r = resolveDailyProtocol({});
    expect(r).not.toBeNull();
    expect(r!.matchedRule).toBe("baseline_no_signals");
  });

  it("matches ankle_swelling when priority rules do not apply", () => {
    const r = resolveDailyProtocol({
      ankleSwellingEvening: 3,
      energy: 5,
      eyeSwellingMorning: 0,
      mentalOverload: 0,
    });
    expect(r?.matchedRule).toBe("ankle_swelling");
  });

  it("sortSignalRulesByPriority with empty list", () => {
    expect(sortSignalRulesByPriority([], rulePriority)).toEqual([]);
  });
});
