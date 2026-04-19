# tj-mcp

TJ Media (태진) 노래방 검색용 MCP 서버입니다.

최신 TJ 웹 경로(`https://www.tjmedia.com/song/accompaniment`) 기반으로 동작하며,
MCP 도구 응답은 **항상 JSON 문자열** 형태로 반환됩니다.

## Features

- `search_songs`: 곡 검색 (통합/곡제목/가수명)
- `lookup_song`: 곡번호 단건 조회
- 검색 0건일 때 공백 제거 재시도 지원
  - 예: `미즈키 나나` -> `미즈키나나`

## Requirements

- Node.js 18+
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

| Field | Type | Description |
|---|---|---|
| `number` | `string` | 조회된 곡 번호 |
| `title` | `string` | 곡 제목 |
| `singer` | `string` | 가수명 |
| `lyricist` | `string` (optional) | 작사가 |
| `composer` | `string` (optional) | 작곡가 |

### Error response format

도구 호출 실패 시 아래 형태의 JSON 문자열을 반환합니다.

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

## npm 배포 자동화 (GitHub Actions)

`.github/workflows/npm-publish.yml` 워크플로우가 포함되어 있습니다.

- 트리거
  - `v*` 태그 푸시 (예: `v1.0.2`)
  - 수동 실행 (`workflow_dispatch`)
- 동작
  - `npm ci` -> `npm run build` -> `npm test` -> `npm publish --provenance --access public`

### 사전 설정

1. npm access token 발급 (`Automation` 권장)
2. GitHub 저장소 `Settings > Secrets and variables > Actions`에 `NPM_TOKEN` 추가

### 배포 예시

```bash
git tag v1.0.2
git push origin v1.0.2
```
