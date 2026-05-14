# retry-delay-plan-kit

Small TypeScript utilities for building deterministic retry delay plans.

Use it when you need to show, test, log, or cap the retry schedule before running an operation. The package does not execute retries, touch timers, make network requests, or require Node APIs.

## Install

```bash
npm install retry-delay-plan-kit
```

## Usage

```ts
import { createRetryDelayPlan } from "retry-delay-plan-kit";

const plan = createRetryDelayPlan({
  attempts: 4,
  maxAttempts: 20,
  baseDelayMs: 100,
  factor: 2,
  maxDelayMs: 1000,
  jitter: "equal",
  seed: "deploy-42"
});

console.log(plan.steps);
// [
//   { attempt: 1, delayMs: 100, capped: false },
//   { attempt: 2, delayMs: 189, capped: false },
//   { attempt: 3, delayMs: 286, capped: false },
//   { attempt: 4, delayMs: 687, capped: false }
// ]
```

## API

### `createRetryDelayPlan(options)`

Returns a structured plan:

```ts
type RetryDelayPlan = {
  steps: RetryDelayStep[];
  totalDelayMs: number;
  issues: RetryDelayIssue[];
};
```

Invalid numeric options are clamped to conservative defaults and reported in `issues`.
If `attempts` comes from untrusted configuration, `maxAttempts` caps the generated plan and reports an `attempts_exceeded_max` issue.

### `retryDelaySteps(options)`

Returns only the delay steps.

### `parseRetryAfterDelay(value, now?)`

Parses an HTTP `Retry-After` value as either delta seconds or an HTTP date and returns a delay in milliseconds.

## Options

- `attempts`: number of retry delays to generate, default `3`.
- `maxAttempts`: protective cap for generated steps, default `1_000`.
- `baseDelayMs`: first delay before jitter, default `100`.
- `factor`: exponential multiplier, default `2`.
- `maxDelayMs`: cap for each delay, default `30_000`.
- `jitter`: `"none"`, `"full"`, or `"equal"`, default `"none"`.
- `seed`: deterministic seed used by jitter.

## Browser compatibility

The core uses only standard JavaScript: numbers, strings, arrays, and `Date.parse`. It has no runtime dependencies and no required Node APIs.

## CLI

No CLI is included in this draft. The useful value is an embeddable, deterministic plan that callers can render, log, or feed into their own retry loop.
