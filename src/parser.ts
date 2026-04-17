import * as cheerio from "cheerio";

export interface Song {
  number: string;
  title: string;
  singer: string;
  lyricist?: string;
  composer?: string;
}

export interface PaginationInfo {
  currentPage: number;
  hasNext: boolean;
  totalPages?: number;
}

export function uniqueSongs(songs: Song[]): Song[] {
  const seen = new Set<string>();
  const result: Song[] = [];

  for (const song of songs) {
    const key = `${song.number}|${song.title}|${song.singer}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(song);
  }

  return result;
}

export function parseSongTable($: cheerio.CheerioAPI): Song[] {
  const songs: Song[] = [];

  const pushSong = (
    number: string,
    title: string,
    singer: string,
    lyricist?: string,
    composer?: string
  ): void => {
    const cleanNumber = number.trim();
    const cleanTitle = title.trim();
    const cleanSinger = singer.trim();
    const cleanLyricist = lyricist?.trim();
    const cleanComposer = composer?.trim();

    if (!cleanNumber || !cleanTitle || !cleanSinger) {
      return;
    }

    songs.push({
      number: cleanNumber,
      title: cleanTitle,
      singer: cleanSinger,
      lyricist: cleanLyricist,
      composer: cleanComposer,
    });
  };

  // 신규 TJ 반주곡 검색 결과 파싱
  $(
    ".music-search-list ul.chart-list-area li ul.grid-container.list, li.search-data-list ul.grid-container.list"
  ).each((_, row) => {
    const root = $(row);

    const number =
      root.find("li.grid-item .num2.pc").first().text().trim() ||
      root
        .find("li.grid-item .num2")
        .first()
        .text()
        .replace("곡번호", "")
        .trim();
    const title = root
      .find("li.grid-item.title3 p")
      .last()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const singer = root
      .find("li.grid-item.title4.singer span")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const lyricist = root
      .find("li.grid-item.title5 span")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const composer = root
      .find("li.grid-item.title6 span")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    pushSong(number, title, singer, lyricist, composer);
  });

  if (songs.length > 0) {
    return songs;
  }

  // TJ 미디어 검색 결과 테이블 파싱
  // 일반적으로 테이블 행: 곡번호 | 곡제목 | 가수명 | 작사 | 작곡
  $("table.board_type1 tbody tr, table.tbl_board tbody tr").each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length >= 3) {
      const number = $(cols[0]).text().trim();
      const title = $(cols[1]).text().trim();
      const singer = $(cols[2]).text().trim();
      const lyricist = cols.length > 3 ? $(cols[3]).text().trim() : undefined;
      const composer = cols.length > 4 ? $(cols[4]).text().trim() : undefined;

      pushSong(number, title, singer, lyricist, composer);
    }
  });

  // Fallback: 다른 테이블 구조 시도
  if (songs.length === 0) {
    $("table tr").each((i, row) => {
      if (i === 0) return; // 헤더 스킵
      const cols = $(row).find("td");
      if (cols.length >= 3) {
        const number = $(cols[0]).text().trim();
        const title = $(cols[1]).text().trim();
        const singer = $(cols[2]).text().trim();
        const lyricist =
          cols.length > 3 ? $(cols[3]).text().trim() : undefined;
        const composer =
          cols.length > 4 ? $(cols[4]).text().trim() : undefined;

        if (number && /^\d+$/.test(number)) {
          pushSong(number, title, singer, lyricist, composer);
        }
      }
    });
  }

  return songs;
}

export function parsePagination(
  $: cheerio.CheerioAPI,
  currentPage: number
): PaginationInfo {
  // TJ 모바일 페이지네이션은 "현재/총" 구조로 총 페이지를 명시적으로 노출한다.
  // 예: <li><a class="on">N</a></li><li>/</li><li><a>TOTAL</a></li>
  const totalText = $(".mo-pagenation-wrap .page-list .page-num li")
    .last()
    .find("a")
    .text()
    .trim();

  let totalPages: number | undefined;
  if (/^\d+$/.test(totalText)) {
    totalPages = parseInt(totalText, 10);
  } else {
    // Fallback: 데스크톱 페이지네이션에서 goList('N') 최댓값
    let maxPage = 0;
    $(".pagenation a[onclick]").each((_, el) => {
      const onclick = $(el).attr("onclick") || "";
      const m = onclick.match(/goList\(\s*['"]?(\d+)/);
      if (m) {
        const p = parseInt(m[1], 10);
        if (p > maxPage) maxPage = p;
      }
    });
    if (maxPage > 0) totalPages = maxPage;
  }

  const hasNext = totalPages !== undefined && currentPage < totalPages;

  return {
    currentPage,
    hasNext,
    ...(totalPages !== undefined ? { totalPages } : {}),
  };
}
