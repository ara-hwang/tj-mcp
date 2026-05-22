import * as cheerio from "cheerio";
import {
  parsePagination,
  parseSongTable,
  uniqueSongs,
  type PaginationInfo,
  type Song,
} from "./parser.js";

const TJ_BASE_URL = "https://www.tjmedia.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export interface SearchRetryInfo {
  applied: boolean;
  reason?: "no_results_with_spaces";
  normalizedQuery?: string;
}

export interface SearchResult {
  songs: Song[];
  count: number;
  pagination: PaginationInfo;
  retry: SearchRetryInfo;
}

export type SearchType = "title" | "singer" | "number" | "integrated";

const MAX_FETCH_ATTEMPTS = 3;
const RETRY_BASE_MS = 500;

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

export function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("network")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function decodeHtmlResponse(res: Response): Promise<string> {
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

async function fetchHtml(url: string, init?: RequestInit): Promise<string> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(60_000),
        headers: {
          "User-Agent": USER_AGENT,
          ...(init?.headers as Record<string, string>),
        },
      });

      if (!res.ok) {
        const httpError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        if (
          isRetryableHttpStatus(res.status) &&
          attempt < MAX_FETCH_ATTEMPTS - 1
        ) {
          lastError = httpError;
          await sleep(RETRY_BASE_MS * 2 ** attempt);
          continue;
        }
        throw httpError;
      }

      return await decodeHtmlResponse(res);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (isRetryableFetchError(err) && attempt < MAX_FETCH_ATTEMPTS - 1) {
        lastError = err;
        await sleep(RETRY_BASE_MS * 2 ** attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("TJ fetch failed after retries");
}

const PAGE_SIZE = 30;

export async function searchSongs(
  query: string,
  searchType: SearchType,
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
  if (primary.songs.length > 0 || searchType === "number") {
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
