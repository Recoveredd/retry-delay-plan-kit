import { describe, expect, it } from "vitest";
import { createRetryDelayPlan, parseRetryAfterDelay, retryDelaySteps } from "../src/index.js";

describe("createRetryDelayPlan", () => {
  it("creates a nominal exponential plan", () => {
    expect(
      createRetryDelayPlan({
        attempts: 4,
        baseDelayMs: 100,
        factor: 2,
        maxDelayMs: 500,
        jitter: "none"
      })
    ).toEqual({
      steps: [
        { attempt: 1, delayMs: 100, capped: false },
        { attempt: 2, delayMs: 200, capped: false },
        { attempt: 3, delayMs: 400, capped: false },
        { attempt: 4, delayMs: 500, capped: true }
      ],
      totalDelayMs: 1200,
      issues: []
    });
  });

  it("supports empty plans", () => {
    expect(createRetryDelayPlan({ attempts: 0 }).steps).toEqual([]);
  });

  it("reports invalid options and keeps conservative defaults", () => {
    const plan = createRetryDelayPlan({
      attempts: Number.NaN,
      maxAttempts: Number.NEGATIVE_INFINITY,
      baseDelayMs: -1,
      factor: 0,
      maxDelayMs: Number.POSITIVE_INFINITY,
      jitter: "wide" as "none"
    });

    expect(plan.steps).toHaveLength(3);
    expect(plan.issues.map((issue) => issue.code)).toEqual([
      "invalid_attempts",
      "invalid_max_attempts",
      "invalid_base_delay",
      "invalid_factor",
      "invalid_max_delay",
      "unknown_jitter"
    ]);
  });

  it("does not throw when runtime callers pass a non-object options value", () => {
    const plan = createRetryDelayPlan(null as unknown as Parameters<typeof createRetryDelayPlan>[0]);

    expect(plan.steps).toHaveLength(3);
    expect(plan.issues).toContainEqual({
      code: "invalid_options",
      message: "options must be an object when provided."
    });
  });

  it("caps untrusted attempt counts", () => {
    const plan = createRetryDelayPlan({
      attempts: 10_000,
      maxAttempts: 5,
      baseDelayMs: 1,
      factor: 1,
      jitter: "none"
    });

    expect(plan.steps).toHaveLength(5);
    expect(plan.totalDelayMs).toBe(5);
    expect(plan.issues).toContainEqual({
      code: "attempts_exceeded_max",
      message: "attempts exceeded maxAttempts and was capped."
    });
  });

  it("makes jitter deterministic for a given seed", () => {
    const first = retryDelaySteps({ attempts: 3, jitter: "equal", seed: "équipe" });
    const second = retryDelaySteps({ attempts: 3, jitter: "equal", seed: "équipe" });
    const third = retryDelaySteps({ attempts: 3, jitter: "equal", seed: "autre" });

    expect(first).toEqual(second);
    expect(first).not.toEqual(third);
  });
});

describe("parseRetryAfterDelay", () => {
  it("parses delta seconds", () => {
    expect(parseRetryAfterDelay("12")).toBe(12_000);
  });

  it("parses HTTP dates", () => {
    const now = new Date("2026-05-12T12:00:00.000Z");
    expect(parseRetryAfterDelay("Tue, 12 May 2026 12:00:05 GMT", now)).toBe(5000);
  });

  it("rejects empty and invalid values", () => {
    expect(parseRetryAfterDelay("")).toBeUndefined();
    expect(parseRetryAfterDelay("later")).toBeUndefined();
  });

  it("rejects non-string values and invalid now timestamps without throwing", () => {
    expect(parseRetryAfterDelay(null)).toBeUndefined();
    expect(parseRetryAfterDelay("Tue, 12 May 2026 12:00:05 GMT", new Date("invalid"))).toBeUndefined();
    expect(parseRetryAfterDelay("Tue, 12 May 2026 12:00:05 GMT", Number.NaN)).toBeUndefined();
  });
});
