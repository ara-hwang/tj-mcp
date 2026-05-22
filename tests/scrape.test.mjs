import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRetryableFetchError,
  isRetryableHttpStatus,
} from "../dist/scrape.js";

test("isRetryableHttpStatus: 429 and 5xx are retryable", () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(500), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(404), false);
  assert.equal(isRetryableHttpStatus(400), false);
});

test("isRetryableFetchError: timeout and network errors are retryable", () => {
  assert.equal(isRetryableFetchError(new Error("fetch failed")), true);
  const timeout = new Error("The operation was aborted");
  timeout.name = "TimeoutError";
  assert.equal(isRetryableFetchError(timeout), true);
  assert.equal(isRetryableFetchError(new Error("HTTP 404: Not Found")), false);
});
