export type RetryDelayJitter = "none" | "full" | "equal";

export type RetryDelayOptions = {
  attempts?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  jitter?: RetryDelayJitter;
  seed?: string | number;
};

export type RetryDelayStep = {
  attempt: number;
  delayMs: number;
  capped: boolean;
};

export type RetryDelayIssueCode =
  | "invalid_attempts"
  | "invalid_max_attempts"
  | "attempts_exceeded_max"
  | "invalid_base_delay"
  | "invalid_factor"
  | "invalid_max_delay"
  | "unknown_jitter";

export type RetryDelayIssue = {
  code: RetryDelayIssueCode;
  message: string;
};

export type RetryDelayPlan = {
  steps: RetryDelayStep[];
  totalDelayMs: number;
  issues: RetryDelayIssue[];
};

type NormalizedOptions = {
  attempts: number;
  maxAttempts: number;
  baseDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitter: RetryDelayJitter;
  seed: string;
};

const DEFAULTS: NormalizedOptions = {
  attempts: 3,
  maxAttempts: 1_000,
  baseDelayMs: 100,
  factor: 2,
  maxDelayMs: 30_000,
  jitter: "none",
  seed: "retry-delay-plan-kit"
};

export function createRetryDelayPlan(options: RetryDelayOptions = {}): RetryDelayPlan {
  const issues: RetryDelayIssue[] = [];
  const normalized = normalizeOptions(options, issues);
  const random = createSeededRandom(normalized.seed);
  const steps: RetryDelayStep[] = [];

  for (let index = 0; index < normalized.attempts; index += 1) {
    const rawDelay = normalized.baseDelayMs * normalized.factor ** index;
    const cappedDelay = Math.min(rawDelay, normalized.maxDelayMs);
    const jitteredDelay = applyJitter(cappedDelay, normalized.jitter, random);
    steps.push({
      attempt: index + 1,
      delayMs: Math.round(jitteredDelay),
      capped: rawDelay > normalized.maxDelayMs
    });
  }

  return {
    steps,
    totalDelayMs: steps.reduce((total, step) => total + step.delayMs, 0),
    issues
  };
}

export function retryDelaySteps(options: RetryDelayOptions = {}): RetryDelayStep[] {
  return createRetryDelayPlan(options).steps;
}

export function parseRetryAfterDelay(value: string, now: Date = new Date()): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return Math.max(0, timestamp - now.getTime());
}

function normalizeOptions(options: RetryDelayOptions, issues: RetryDelayIssue[]): NormalizedOptions {
  let attempts = normalizeInteger(options.attempts, DEFAULTS.attempts, 0);
  const requestedAttempts = options.attempts ?? DEFAULTS.attempts;
  if (attempts !== requestedAttempts) {
    issues.push({
      code: "invalid_attempts",
      message: "attempts must be a finite integer greater than or equal to 0."
    });
  }

  const maxAttempts = normalizeInteger(options.maxAttempts, DEFAULTS.maxAttempts, 0);
  if (maxAttempts !== (options.maxAttempts ?? DEFAULTS.maxAttempts)) {
    issues.push({
      code: "invalid_max_attempts",
      message: "maxAttempts must be a finite integer greater than or equal to 0."
    });
  }

  if (attempts > maxAttempts) {
    attempts = maxAttempts;
    issues.push({
      code: "attempts_exceeded_max",
      message: "attempts exceeded maxAttempts and was capped."
    });
  }

  const baseDelayMs = normalizeNumber(options.baseDelayMs, DEFAULTS.baseDelayMs, 0);
  if (baseDelayMs !== (options.baseDelayMs ?? DEFAULTS.baseDelayMs)) {
    issues.push({
      code: "invalid_base_delay",
      message: "baseDelayMs must be a finite number greater than or equal to 0."
    });
  }

  const factor = normalizeNumber(options.factor, DEFAULTS.factor, 1);
  if (factor !== (options.factor ?? DEFAULTS.factor)) {
    issues.push({
      code: "invalid_factor",
      message: "factor must be a finite number greater than or equal to 1."
    });
  }

  const maxDelayMs = normalizeNumber(options.maxDelayMs, DEFAULTS.maxDelayMs, 0);
  if (maxDelayMs !== (options.maxDelayMs ?? DEFAULTS.maxDelayMs)) {
    issues.push({
      code: "invalid_max_delay",
      message: "maxDelayMs must be a finite number greater than or equal to 0."
    });
  }

  const jitter = options.jitter ?? DEFAULTS.jitter;
  const normalizedJitter: RetryDelayJitter =
    jitter === "none" || jitter === "full" || jitter === "equal" ? jitter : DEFAULTS.jitter;

  if (normalizedJitter !== jitter) {
    issues.push({
      code: "unknown_jitter",
      message: "jitter must be one of: none, full, equal."
    });
  }

  return {
    attempts,
    maxAttempts,
    baseDelayMs,
    factor,
    maxDelayMs,
    jitter: normalizedJitter,
    seed: String(options.seed ?? DEFAULTS.seed)
  };
}

function normalizeNumber(value: number | undefined, fallback: number, minimum: number): number {
  if (value === undefined) {
    return fallback;
  }

  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

function normalizeInteger(value: number | undefined, fallback: number, minimum: number): number {
  const normalized = normalizeNumber(value, fallback, minimum);
  return Math.floor(normalized);
}

function applyJitter(delayMs: number, jitter: RetryDelayJitter, random: () => number): number {
  if (jitter === "full") {
    return delayMs * random();
  }

  if (jitter === "equal") {
    return delayMs / 2 + (delayMs / 2) * random();
  }

  return delayMs;
}

function createSeededRandom(seed: string): () => number {
  let state = 2166136261;

  for (const character of seed) {
    state ^= character.codePointAt(0) ?? 0;
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
