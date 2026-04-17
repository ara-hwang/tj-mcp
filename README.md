# tj-mcp

TJ Media (태진) 노래방 검색용 MCP 서버입니다.

최신 TJ 웹 경로(`https://www.tjmedia.com/song/accompaniment`) 기반으로 동작하며,
MCP 도구 응답은 **항상 JSON 문자열** 형태로 반환됩니다.

## Features

- `search_songs`: 곡 검색 (통합/곡제목/가수명)
- 검색 0건일 때 공백 제거 재시도 지원
  - 예: `미즈키 나나` -> `미즈키나나`

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
npm run build
```

## Run

```bash
node dist/index.js
```

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

### OpenCode

`opencode.json`:

```json
{
  "mcp": {
    "tj-karaoke": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/tj-mcp/dist/index.js"]
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
- `searchType` (enum): `integrated` | `title` | `singer` (기본값 `integrated`)
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
      "title": "迷宮バタフライ (しゅごキャラ! OST)",
      "singer": "水樹奈々",
      "lyricist": "PEACH-PIT,斉藤恵",
      "composer": "dAice"
    }
  ]
}
```

#### Response fields

| Field | Type | Description |
|---|---|---|
| `query` | `string` | 원본 검색어 |
| `searchType` | `"integrated" \| "title" \| "singer"` | 검색 타입 |
| `count` | `number` | 현재 페이지 반환 곡 수 |
| `pagination.currentPage` | `number` | 현재 페이지 번호 |
| `pagination.hasNext` | `boolean` | 다음 페이지 존재 여부 |
| `pagination.totalPages` | `number` (optional) | 전체 페이지 수 (파싱 가능 시) |
| `retry.applied` | `boolean` | 재시도 적용 여부 |
| `retry.reason` | `"no_results_with_spaces"` (optional) | 재시도 사유 |
| `retry.normalizedQuery` | `string` (optional) | 재시도 시 사용된 검색어 |
| `songs[].number` | `string` | 곡 번호 |
| `songs[].title` | `string` | 곡 제목 |
| `songs[].singer` | `string` | 가수명 |
| `songs[].lyricist` | `string` (optional) | 작사가 |
| `songs[].composer` | `string` (optional) | 작곡가 |

### Error response format

두 도구 모두 실패 시 아래 형태의 JSON 문자열을 반환합니다.

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

```bash
npm run build
```
