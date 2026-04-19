#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as cheerio from "cheerio";
import {
  parsePagination,
  parseSongTable,
  uniqueSongs,
  type PaginationInfo,
  type Song,
} from "./parser.js";

const PACKAGE_JSON_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);
const { version: PACKAGE_VERSION } = JSON.parse(
  readFileSync(PACKAGE_JSON_PATH, "utf-8")
) as { version: string };

// --- TJ Media Scraping ---

const TJ_BASE_URL = "https://www.tjmedia.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

interface SearchRetryInfo {
  applied: boolean;
  reason?: "no_results_with_spaces";
  normalizedQuery?: string;
}

interface SearchResult {
  songs: Song[];
  count: number;
  pagination: PaginationInfo;
  retry: SearchRetryInfo;
}

async function fetchHtml(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(60_000),
    headers: {
      "User-Agent": USER_AGENT,
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "";
  const charsetFromHeader = contentType
    .toLowerCase()
    .match(/charset=([^;\s]+)/)?.[1];

  let charset = charsetFromHeader;
  if (!charset) {
    const utf8Probe = buf.toString("utf8", 0, Math.min(buf.length, 4096));
    const charsetFromMeta = utf8Probe
      .toLowerCase()
      .match(/charset\s*=\s*['\"]?([a-z0-9\-_]+)/)?.[1];
    charset = charsetFromMeta;
  }

  const decodeWith = (enc: "utf-8" | "euc-kr"): string => {
    try {
      return new TextDecoder(enc).decode(buf);
    } catch {
      return "";
    }
  };

  const looksValidTjPage = (text: string): boolean => {
    return (
      text.includes("반주곡") ||
      text.includes("곡 제목") ||
      text.includes("검색어") ||
      text.includes("TJ미디어")
    );
  };

  const hasMojibake = (text: string): boolean => {
    return /[\uFFFD\u00C3\u00C2]{2,}/.test(text) || text.includes("\uFFFD");
  };

  if (charset && charset.includes("euc")) {
    const eucText = decodeWith("euc-kr");
    if (eucText) {
      return eucText;
    }
  }

  if (charset && charset.includes("utf")) {
    const utfText = decodeWith("utf-8");
    if (utfText) {
      const eucText = decodeWith("euc-kr");
      if (
        eucText &&
        looksValidTjPage(eucText) &&
        (!looksValidTjPage(utfText) || hasMojibake(utfText))
      ) {
        return eucText;
      }
      return utfText;
    }
  }

  const utfText = decodeWith("utf-8");
  const eucText = decodeWith("euc-kr");

  if (eucText && looksValidTjPage(eucText) && !looksValidTjPage(utfText)) {
    return eucText;
  }

  if (utfText) {
    return utfText;
  }
  if (eucText) {
    return eucText;
  }

  return buf.toString("utf-8");
}

const PAGE_SIZE = 30;

async function searchSongs(
  query: string,
  searchType: "title" | "singer" | "number" | "integrated",
  page: number = 1
): Promise<SearchResult> {
  // TJ 반주곡 검색
  // strType: 0 = 통합, 1 = 곡제목, 2 = 가수명, 16 = 곡번호
  const strTypeMap: Record<string, string> = {
    integrated: "0",
    title: "1",
    singer: "2",
    number: "16",
  };
  const strType = strTypeMap[searchType] ?? "0";

  const requestSearch = async (
    queryText: string
  ): Promise<{ songs: Song[]; count: number; pagination: PaginationInfo }> => {
    const params = new URLSearchParams({
      nationType: "",
      strType,
      searchTxt: queryText,
      strWord: "",
      pageNo: String(page),
      pageRowCnt: String(PAGE_SIZE),
      strSotrGubun: "ASC", // TJ API 원본 파라미터명 (오타 아님)
      strSortType: "",
    });

    const html = await fetchHtml(
      `${TJ_BASE_URL}/song/accompaniment_search?${params.toString()}`
    );
    const $ = cheerio.load(html);
    const songs = uniqueSongs(parseSongTable($));
    const count = songs.length;
    const pagination = parsePagination($, page);

    return { songs, count, pagination };
  };

  const primary = await requestSearch(query);
  if (primary.songs.length > 0) {
    return { ...primary, retry: { applied: false } };
  }

  const compactQuery = query.replace(/\s+/g, "");
  if (compactQuery === query) {
    return { ...primary, retry: { applied: false } };
  }

  const fallback = await requestSearch(compactQuery);
  const retry: SearchRetryInfo = {
    applied: true,
    reason: "no_results_with_spaces",
    normalizedQuery: compactQuery,
  };

  if (fallback.songs.length > 0) {
    return { ...fallback, retry };
  }

  return { ...primary, retry };
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

// --- MCP Server ---

const server = new McpServer({
  name: "tj-karaoke",
  version: PACKAGE_VERSION,
});

server.tool(
  "search_songs",
  "태진 노래방 곡 검색 - 통합/곡제목/가수명으로 검색해 노래방 번호와 곡 정보를 반환합니다",
  {
    query: z
      .string()
      .min(1, "검색어는 1자 이상이어야 합니다")
      .describe("검색어 (곡 제목 또는 가수명)"),
    searchType: z
      .enum(["title", "singer", "integrated"])
      .default("integrated")
      .describe(
        "검색 유형: integrated(통합검색), title(곡제목), singer(가수명)"
      ),
    page: z
      .number()
      .int()
      .positive()
      .default(1)
      .describe("페이지 번호 (기본값: 1)"),
  },
  async ({ query, searchType, page }) => {
    try {
      const result = await searchSongs(query, searchType, page);
      const payload = {
        query,
        searchType,
        count: result.count,
        pagination: result.pagination,
        retry: result.retry,
        songs: result.songs,
      };

      const text = toJsonText(payload);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const text = toJsonText({
        error: true,
        message: "검색 중 오류가 발생했습니다.",
        detail: msg,
        query,
        searchType,
      });
      return {
        content: [{ type: "text", text }],
        isError: true,
      };
    }
  }
);

server.tool(
  "lookup_song",
  "태진 노래방 곡번호로 곡 정보 조회 - 곡번호를 입력하면 해당 곡의 제목, 가수, 작사가, 작곡가 정보를 반환합니다",
  {
    songNumber: z
      .string()
      .regex(/^\d+$/, "곡번호는 숫자만 입력 가능합니다")
      .describe("조회할 곡번호 (숫자)"),
  },
  async ({ songNumber }) => {
    try {
      const result = await searchSongs(songNumber, "number", 1);
      const song = result.songs.find((s) => s.number === songNumber);

      if (!song) {
        const text = toJsonText({
          error: true,
          message: "해당 곡번호의 곡을 찾을 수 없습니다.",
          songNumber,
        });
        return { content: [{ type: "text", text }], isError: true };
      }

      const text = toJsonText(song);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const text = toJsonText({
        error: true,
        message: "곡 조회 중 오류가 발생했습니다.",
        detail: msg,
        songNumber,
      });
      return { content: [{ type: "text", text }], isError: true };
    }
  }
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TJ Karaoke MCP server running on stdio");
