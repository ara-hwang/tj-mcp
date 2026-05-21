import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchSongs, toJsonText } from "./scraper.js";

const PACKAGE_JSON_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package.json"
);
const { version: PACKAGE_VERSION } = JSON.parse(
  readFileSync(PACKAGE_JSON_PATH, "utf-8")
) as { version: string };

export function createMcpServer(): McpServer {
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

  return server;
}
