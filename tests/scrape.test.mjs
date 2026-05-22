import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRetryableFetchError,
  isRetryableHttpStatus,
  isValidTjSearchHtml,
} from "../dist/scrape.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

test("isRetryableHttpStatus: 429 and 5xx are retryable", () => {
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(500), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(404), false);
  assert.equal(isRetryableHttpStatus(400), false);
});

test("isValidTjSearchHtml: fixture page1_iu.html is valid", () => {
  const html = readFileSync(join(here, "fixtures", "page1_iu.html"), "utf8");
  assert.equal(isValidTjSearchHtml(html), true);
  assert.equal(isValidTjSearchHtml("<html><body>error</body></html>"), false);
});

test("isRetryableFetchError: timeout and network errors are retryable", () => {
  assert.equal(isRetryableFetchError(new Error("fetch failed")), true);
  const timeout = new Error("The operation was aborted");
  timeout.name = "TimeoutError";
  assert.equal(isRetryableFetchError(timeout), true);
  assert.equal(isRetryableFetchError(new Error("HTTP 404: Not Found")), false);
});
