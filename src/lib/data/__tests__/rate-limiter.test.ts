import { describe, expect, it } from "vitest";
import { runSequentially, RateLimitedError, type RetryOptions } from "@/lib/data/rate-limiter";

const FAST_OPTIONS: RetryOptions = { minIntervalMs: 1, maxRetries: 3, baseDelayMs: 2 };

describe("runSequentially", () => {
  it("processes items in order and reports each success", async () => {
    const results: number[] = [];
    await runSequentially(
      [1, 2, 3],
      async (n) => n * 10,
      (item, index, result) => {
        if (result.ok) results.push(result.value);
      },
      FAST_OPTIONS
    );
    expect(results).toEqual([10, 20, 30]);
  });

  it("retries on RateLimitedError and eventually succeeds", async () => {
    let attempts = 0;
    const results: string[] = [];
    await runSequentially(
      ["a"],
      async () => {
        attempts++;
        if (attempts < 3) throw new RateLimitedError("slow down");
        return "ok";
      },
      (item, index, result) => {
        results.push(result.ok ? result.value : "failed");
      },
      FAST_OPTIONS
    );
    expect(attempts).toBe(3);
    expect(results).toEqual(["ok"]);
  });

  it("gives up after maxRetries, reports failure, and continues to the next item", async () => {
    const results: Array<{ ok: boolean }> = [];
    await runSequentially(
      ["always-fails", "succeeds"],
      async (item) => {
        if (item === "always-fails") throw new RateLimitedError("nope");
        return "done";
      },
      (item, index, result) => {
        results.push(result);
      },
      FAST_OPTIONS
    );
    expect(results[0].ok).toBe(false);
    expect(results[1]).toEqual({ ok: true, value: "done" });
  });

  it("does not retry non-rate-limit errors", async () => {
    let attempts = 0;
    const results: Array<{ ok: boolean }> = [];
    await runSequentially(
      ["x"],
      async () => {
        attempts++;
        throw new Error("some other failure");
      },
      (item, index, result) => results.push(result),
      FAST_OPTIONS
    );
    expect(attempts).toBe(1);
    expect(results[0].ok).toBe(false);
  });

  it("never loses already-successful results when a later item fails", async () => {
    const succeeded: string[] = [];
    await runSequentially(
      ["ok1", "ok2", "fails"],
      async (item) => {
        if (item === "fails") throw new RateLimitedError("nope");
        return item;
      },
      (item, index, result) => {
        if (result.ok) succeeded.push(result.value);
      },
      FAST_OPTIONS
    );
    expect(succeeded).toEqual(["ok1", "ok2"]);
  });
});
