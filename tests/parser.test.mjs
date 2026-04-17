import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as cheerio from "cheerio";
import {
  parsePagination,
  parseSongTable,
  uniqueSongs,
} from "../dist/parser.js";

const here = dirname(fileURLToPath(import.meta.url));
const loadFixture = (name) =>
  cheerio.load(readFileSync(join(here, "fixtures", name)));

test("parsePagination: 첫 페이지(26페이지 중 1)", () => {
  const $ = loadFixture("page1_iu.html");
  assert.deepEqual(parsePagination($, 1), {
    currentPage: 1,
    hasNext: true,
    totalPages: 26,
  });
});

test("parsePagination: 마지막 페이지에서 hasNext=false", () => {
  const $ = loadFixture("last_iu.html");
  assert.deepEqual(parsePagination($, 26), {
    currentPage: 26,
    hasNext: false,
    totalPages: 26,
  });
});

test("parsePagination: 결과 0건이면 totalPages=0, hasNext=false", () => {
  const $ = loadFixture("zero.html");
  assert.deepEqual(parsePagination($, 1), {
    currentPage: 1,
    hasNext: false,
    totalPages: 0,
  });
});

test("parseSongTable: 첫 페이지에서 30곡 추출", () => {
  const $ = loadFixture("page1_iu.html");
  const songs = parseSongTable($);
  assert.equal(songs.length, 30);
  for (const s of songs) {
    assert.ok(s.number, `곡번호 누락: ${JSON.stringify(s)}`);
    assert.ok(s.title, `곡제목 누락: ${JSON.stringify(s)}`);
    assert.ok(s.singer, `가수 누락: ${JSON.stringify(s)}`);
  }
});

test("parseSongTable: 마지막 페이지(5곡) 추출", () => {
  const $ = loadFixture("last_iu.html");
  const songs = parseSongTable($);
  assert.equal(songs.length, 5);
});

test("parseSongTable: 결과 0건이면 빈 배열", () => {
  const $ = loadFixture("zero.html");
  assert.deepEqual(parseSongTable($), []);
});

test("uniqueSongs: 같은 number+title+singer 중복 제거", () => {
  const a = { number: "1", title: "A", singer: "X" };
  const b = { number: "1", title: "A", singer: "X" };
  const c = { number: "2", title: "A", singer: "X" };
  const d = { number: "1", title: "A", singer: "Y" };
  assert.deepEqual(uniqueSongs([a, b, c, d]), [a, c, d]);
});

test("uniqueSongs: 빈 배열은 빈 배열", () => {
  assert.deepEqual(uniqueSongs([]), []);
});
