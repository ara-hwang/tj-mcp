#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchSongs } from "./scrape.js";

const PACKAGE_JSON_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);
const { version: PACKAGE_VERSION } = JSON.parse(
  readFileSync(PACKAGE_JSON_PATH, "utf-8")
) as { version: string };

function toJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const MCP_INSTRUCTIONS = [
  "TJ Media(태진) 반주곡 검색 MCP 서버입니다.",
  "",
  "search_songs 사용 가이드:",
  "- integrated: 제목·가수·곡번호를 한 번에 검색 (기본값)",
  "- title / singer: 제목 또는 가수명만 검색할 때",
  "- number: 곡번호만 검색 (query는 숫자만)",
  "- 결과 0건이고 검색어에 공백이 있으면 공백 제거 후 자동 재시도 (retry 필드 참고)",
  "- page로 페이지 이동 (pagination.hasNext 확인)",
  "",
  "lookup_song: 곡번호 한 건의 제목·가수·작사·작곡 조회",
  "",
  "응답은 content[0].text 의 JSON 문자열입니다. error: true 이면 isError입니다.",
].join("\n");

const server = new McpServer(
  {
    name: "tj-karaoke",
    version: PACKAGE_VERSION,
  },
  { instructions: MCP_INSTRUCTIONS }
);

server.tool(
  "search_songs",
  [
    "태진 노래방 곡 검색.",
    "searchType: integrated(통합, 기본) | title(곡제목) | singer(가수명) | number(곡번호, query 숫자만).",
    "0건+공백 포함 시 공백 제거 재시도. pagination.hasNext 로 다음 페이지.",
  ].join(" "),
  {
    query: z
      .string()
      .min(1, "검색어는 1자 이상이어야 합니다")
      .describe("검색어 (곡 제목, 가수명, 또는 곡번호)"),
    searchType: z
      .enum(["title", "singer", "integrated", "number"])
      .default("integrated")
      .describe(
        "검색 유형: integrated(통합), title(곡제목), singer(가수명), number(곡번호)"
      ),
    page: z
      .number()
      .int()
      .positive()
      .default(1)
      .describe("페이지 번호 (기본값: 1)"),
  },
  async ({ query, searchType, page }) => {
    if (searchType === "number" && !/^\d+$/.test(query)) {
      const text = toJsonText({
        error: true,
        message: "곡번호 검색 시 query는 숫자만 입력 가능합니다.",
        query,
        searchType,
      });
      return { content: [{ type: "text", text }], isError: true };
    }

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
  "태진 노래방 곡번호 단건 조회. songNumber(숫자)로 제목·가수·작사·작곡 반환. search_songs number 검색보다 단일 곡에 적합.",
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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("TJ Karaoke MCP server running on stdio");
