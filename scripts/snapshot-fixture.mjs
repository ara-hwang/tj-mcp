#!/usr/bin/env node
/**
 * TJ 검색 결과 HTML을 tests/fixtures/에 저장합니다.
 * 사용 전: npm run build
 *
 * 예:
 *   node scripts/snapshot-fixture.mjs -q "아이유" --search-type singer -o tests/fixtures/page1_iu.html
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { fetchSearchPageHtml } from "../dist/scrape.js";

const SEARCH_TYPES = new Set(["integrated", "title", "singer", "number"]);

const { values } = parseArgs({
  options: {
    query: { type: "string", short: "q" },
    "search-type": { type: "string", default: "integrated" },
    page: { type: "string", default: "1" },
    out: { type: "string", short: "o" },
  },
});

const query = values.query?.trim();
const searchType = values["search-type"] ?? "integrated";
const page = Number(values.page ?? "1");
const out = values.out;

if (!query) {
  console.error("error: --query (-q) is required");
  process.exit(1);
}
if (!out) {
  console.error("error: --out (-o) is required");
  process.exit(1);
}
if (!SEARCH_TYPES.has(searchType)) {
  console.error(
    `error: --search-type must be one of: ${[...SEARCH_TYPES].join(", ")}`
  );
  process.exit(1);
}
if (!Number.isInteger(page) || page < 1) {
  console.error("error: --page must be a positive integer");
  process.exit(1);
}

const outPath = resolve(out);
console.error(
  `Fetching searchType=${searchType} query=${JSON.stringify(query)} page=${page} ...`
);

const html = await fetchSearchPageHtml(query, searchType, page);
writeFileSync(outPath, html, "utf8");
console.error(`Wrote ${html.length} bytes to ${outPath}`);
