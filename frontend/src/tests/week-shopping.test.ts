import { describe, expect, it } from "vitest";
import {
  isIgnorableShoppingSidePart,
  normalizeSideKey,
  splitSides,
} from "@/core/protocol/week-shopping";

describe("week-shopping sides summary", () => {
  it("ignores dash placeholder and whitespace-only parts", () => {
    expect(isIgnorableShoppingSidePart("—")).toBe(true);
    expect(isIgnorableShoppingSidePart(" – ")).toBe(true);
    expect(isIgnorableShoppingSidePart("  \u00a0  ")).toBe(true);
    expect(isIgnorableShoppingSidePart("кабачок")).toBe(false);
  });

  it("normalizeSideKey drops water-fast placeholder", () => {
    expect(normalizeSideKey("—")).toBe("");
    expect(normalizeSideKey(" \u2014 ")).toBe("");
  });

  it("collapses buckwheat wording to one shopping line", () => {
    expect(normalizeSideKey("гречка 50 г")).toBe("Гречка 50–60 г");
    expect(normalizeSideKey("гречка 50–60 г")).toBe("Гречка 50–60 г");
  });

  it("splitSides does not emit placeholder for water-only lunch", () => {
    expect(splitSides("—")).toEqual([]);
  });

  it("splitSides keeps distinct vegetables", () => {
    const parts = splitSides("кабачок, сладкий болгарский перец; зелень 10–15 г (укроп/петрушка)");
    expect(parts).toContain("кабачок");
    expect(parts).toContain("сладкий болгарский перец");
    expect(parts.some((p) => p.includes("зелень"))).toBe(true);
  });
});
