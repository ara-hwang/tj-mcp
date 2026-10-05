# tj-mcp

[![CI](https://github.com/ara-hwang/tj-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ara-hwang/tj-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tj-mcp.svg)](https://www.npmjs.com/package/tj-mcp)
[![Node](https://img.shields.io/node/v/tj-mcp.svg)](https://www.npmjs.com/package/tj-mcp)

TJ Media (태진) 노래방 검색용 [MCP](https://modelcontextprotocol.io/) 서버입니다.

최신 TJ 웹 경로(`https://www.tjmedia.com/song/accompaniment_search`) 기반으로 동작하며,
MCP 도구 응답은 **항상 JSON 문자열** 형태로 반환됩니다.

- [기능](#features)
- [요구 사항](#requirements)
- [클라이언트 설정](#mcp-client-config)
- [도구 API](#tools)
- [참고 사항](#notes)
- [개발](#dev)
- [변경 이력](#changelog)
- [라이선스](#license)

## Features

- `search_songs`: 곡 검색 (통합/곡제목/가수명/곡번호)
- HTTP 429·5xx·일시적 네트워크 오류 시 지수 백오프 재시도 (최대 3회)
- `lookup_song`: 곡번호 단건 조회
- 검색 0건일 때 공백 제거 재시도 지원
  - 예: `미즈키 나나` -> `미즈키나나`

## Requirements

- Node.js 20+ (CI uses Node 22)
- npm

## MCP Client Config

### Claude Desktop

`claude_desktop_config.json` (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tj-karaoke": {
      "command": "npx",
      "args": ["-y", "tj-mcp"]
    }
  }
}
```

### Cursor

`.cursor/mcp.json` (프로젝트별) 또는 `~/.cursor/mcp.json` (전역):

```json
{
  "mcpServers": {
    "tj-karaoke": {
      "command": "npx",
      "args": ["-y", "tj-mcp"]
    }
  }
}
```

### OpenCode

`opencode.json`:

```json
{
  "mcp": {
    "tj-karaoke": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "tj-mcp"]
    }
  }
}
```

## Tools

### 1) `search_songs`

#### Input

```json
{
  "query": "미즈키 나나",
  "searchType": "integrated",
  "page": 1
}
```

- `query` (string): 검색어
- `searchType` (enum): `integrated` | `title` | `singer` | `number` (기본값 `integrated`)
- `page` (number): 페이지 번호 (기본값 `1`)

#### Output (JSON text)

```json
{
  "query": "미즈키 나나",
  "searchType": "integrated",
  "count": 5,
  "pagination": {
    "currentPage": 1,
    "hasNext": false
  },
  "retry": {
    "applied": true,
    "reason": "no_results_with_spaces",
    "normalizedQuery": "미즈키나나"
  },
  "songs": [
    {
      "number": "28329",
      "title": "迷宮バタフライ(しゅごキャラ! OST)",
      "singer": "水樹奈々",
      "lyricist": "PEACH-PIT,斉藤恵",
      "composer": "dAice"
    }
  ]
}
```

#### Response fields

| Field                    | Type                                              | Description                                                         |
| ------------------------ | ------------------------------------------------- | ------------------------------------------------------------------- |
| `query`                  | `string`                                          | 원본 검색어                                                         |
| `searchType`             | `"integrated" \| "title" \| "singer" \| "number"` | 검색 타입                                                           |
| `count`                  | `number`                                          | 현재 페이지 반환 곡 수                                              |
| `pagination.currentPage` | `number`                                          | 현재 페이지 번호                                                    |
| `pagination.hasNext`     | `boolean`                                         | 다음 페이지 존재 여부                                               |
| `pagination.totalPages`  | `number` (optional)                               | 전체 페이지 수 (파싱 가능 시)                                       |
| `retry.applied`          | `boolean`                                         | 공백 제거 재시도 적용 여부 (`searchType`이 `number`면 항상 `false`) |
| `retry.reason`           | `"no_results_with_spaces"` (optional)             | 공백 제거 재시도 사유                                               |
| `retry.normalizedQuery`  | `string` (optional)                               | 공백 제거 재시도 시 사용된 검색어                                   |
| `songs[].number`         | `string`                                          | 곡 번호                                                             |
| `songs[].title`          | `string`                                          | 곡 제목                                                             |
| `songs[].singer`         | `string`                                          | 가수명                                                              |
| `songs[].lyricist`       | `string` (optional)                               | 작사가                                                              |
| `songs[].composer`       | `string` (optional)                               | 작곡가                                                              |

> HTTP 429/5xx·네트워크 오류에 대한 fetch 재시도는 서버 내부 동작이며, 응답 JSON의 `retry` 필드에는 포함되지 않습니다.

### 2) `lookup_song`

#### Input

```json
{
  "songNumber": "44656"
}
```

- `songNumber` (string): 조회할 TJ 곡번호 (숫자만 허용)

#### Output (JSON text)

```json
{
  "number": "44656",
  "title": "Eternity",
  "singer": "잠골버스(준헌)",
  "lyricist": "이재혁",
  "composer": "이재혁"
}
```

#### Response fields

| Field      | Type                | Description    |
| ---------- | ------------------- | -------------- |
| `number`   | `string`            | 조회된 곡 번호 |
| `title`    | `string`            | 곡 제목        |
| `singer`   | `string`            | 가수명         |
| `lyricist` | `string` (optional) | 작사가         |
| `composer` | `string` (optional) | 작곡가         |

### Error response format

오류는 두 가지 형태로 반환됩니다.

**1) MCP 입력 검증 실패** (Zod 스키마 위반, 예: 잘못된 `songNumber`)

- `tools/call` 결과의 `content[0].text`에 `MCP error -32602: Input validation error: ...` 형태의 **일반 텍스트**
- `isError: true`

**2) 도구 실행 실패** (TJ 조회 실패, HTTP 오류, 비즈니스 규칙 위반)

- `content[0].text`에 아래와 같은 **JSON 문자열**

```json
{
  "error": true,
  "message": "검색 중 오류가 발생했습니다.",
  "detail": "HTTP 500: Internal Server Error"
}
```

## Notes

- TJ 사이트 구조 변경 시 파서 조정이 필요할 수 있습니다.
- 일부 검색어는 공백 유무에 따라 결과가 달라질 수 있습니다.
- 네트워크/사이트 상태에 따라 응답 실패 시 JSON 에러 객체를 반환합니다.

## Dev

### 프로젝트 구조

| 경로              | 설명                            |
| ----------------- | ------------------------------- |
| `src/index.ts`    | MCP 서버 및 도구 핸들러         |
| `src/scrape.ts`   | TJ 사이트 fetch·재시도·검색     |
| `src/parser.ts`   | 검색 결과 HTML 파싱             |
| `tests/`          | 파서·스크래핑·stdio 통합 테스트 |
| `tests/fixtures/` | 파서용 HTML 스냅샷              |

### 명령어

```bash
npm install
npm run build        # tsc → dist/
npm run lint         # ESLint + Prettier check
npm start            # node dist/index.js (stdio)
npm test             # build + node --test
npm run snapshot-fixture -- -q "아이유" --search-type singer -o tests/fixtures/page1_iu.html
```

로컬에서 TJ 라이브 연동 테스트까지 실행:

```bash
TJ_INTEGRATION=1 npm test
```

CI(`.github/workflows/ci.yml`)는 push/PR 시 Node 22에서 `TJ_INTEGRATION=1`로 전체 테스트를 돌립니다.

### 로컬 클라이언트 연결 (개발용)

저장소를 클론한 뒤 빌드하고, MCP 설정에서 `dist/index.js` 절대 경로를 지정합니다.

```json
{
  "mcpServers": {
    "tj-karaoke-dev": {
      "command": "node",
      "args": ["/path/to/tj-mcp/dist/index.js"]
    }
  }
}
```

## Changelog

버전별 변경 사항은 [CHANGELOG.md](./CHANGELOG.md)를 참고하세요.

## License

[MIT](./LICENSE)
