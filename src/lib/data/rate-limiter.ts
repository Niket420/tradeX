/**
 * Sequential request pacing + retry-with-backoff for calling rate-limited
 * external APIs. Deliberately simple: one request in flight at a time, a
 * fixed minimum gap between requests, and exponential backoff on retryable
 * failures. Not a general-purpose queue — this ingestion runs one process
 * at a time, so that's all it needs to be.
 */
export interface RetryOptions {
  /** Minimum milliseconds between the start of consecutive requests. */
  minIntervalMs: number;
  maxRetries: number;
  /** Base delay for exponential backoff: attempt N waits baseDelayMs * 2^(N-1). */
  baseDelayMs: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  minIntervalMs: 250,
  maxRetries: 4,
  baseDelayMs: 1000,
};

export class RateLimitedError extends Error {
  constructor(
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "RateLimitedError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` sequentially over `items`, waiting at least `minIntervalMs`
 * between the start of each call and retrying with exponential backoff when
 * `fn` throws a RateLimitedError. A failure on one item (after exhausting
 * retries) is caught and reported via `onResult` — it never aborts the
 * remaining items, and never loses results already collected.
 */
export async function runSequentially<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  onResult: (item: T, index: number, result: { ok: true; value: R } | { ok: false; error: unknown }) => void,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<void> {
  let lastStart = 0;

  for (let i = 0; i < items.length; i++) {
    const elapsedSinceLast = Date.now() - lastStart;
    if (elapsedSinceLast < options.minIntervalMs) {
      await sleep(options.minIntervalMs - elapsedSinceLast);
    }

    let attempt = 0;
    for (;;) {
      lastStart = Date.now();
      try {
        const value = await fn(items[i], i);
        onResult(items[i], i, { ok: true, value });
        break;
      } catch (error) {
        const isRateLimited = error instanceof RateLimitedError;
        attempt++;
        if (!isRateLimited || attempt > options.maxRetries) {
          onResult(items[i], i, { ok: false, error });
          break;
        }
        const backoff = (error instanceof RateLimitedError && error.retryAfterMs) || options.baseDelayMs * 2 ** (attempt - 1);
        await sleep(backoff);
      }
    }
  }
}
