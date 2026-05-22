# Contributing to tj-mcp

기여해 주셔서 감사합니다. 이 문서는 로컬 개발, 테스트, PR, 릴리스 절차를 정리합니다.

## 목차

- [시작하기](#시작하기)
- [프로젝트 구조](#프로젝트-구조)
- [개발 워크플로](#개발-워크플로)
- [테스트](#테스트)
- [변경 시 유의사항](#변경-시-유의사항)
- [Pull Request](#pull-request)
- [릴리스](#릴리스)
- [관련 문서](#관련-문서)

## 시작하기

### 요구 사항

- **Node.js 20+** (`package.json`의 `engines` 참고; CI는 Node 22 사용)
- **npm**
- TJ 사이트 연동 테스트 시 인터넷 접근 (`tjmedia.com`)

### 저장소 클론 및 설치

```bash
git clone https://github.com/ara-hwang/tj-mcp.git
cd tj-mcp
npm install
npm run build
npm run lint
npm test
```

### 로컬 MCP 서버 실행

빌드 후 stdio로 MCP 서버를 실행합니다.

```bash
npm run build
node dist/index.js
```

Cursor 등 클라이언트에서 로컬 개발용으로 연결할 때는 `npx` 대신 저장소 경로를 지정할 수 있습니다.

```json
{
  "mcpServers": {
    "tj-karaoke-dev": {
      "command": "node",
      "args": ["/absolute/path/to/tj-mcp/dist/index.js"]
    }
  }
}
```

수동으로 JSON-RPC를 보내 동작을 확인하려면 [AGENTS.md](./AGENTS.md)의 예시를 참고하세요.

## 프로젝트 구조

| 경로                             | 역할                                               |
| -------------------------------- | -------------------------------------------------- |
| `src/index.ts`                   | MCP 서버, 도구(`search_songs`, `lookup_song`) 정의 |
| `src/scrape.ts`                  | TJ 사이트 HTTP 요청, 재시도, `searchSongs`         |
| `src/parser.ts`                  | HTML 파싱 (`parseSongTable`, `parsePagination` 등) |
| `tests/parser.test.mjs`          | 파서 단위 테스트 (HTML fixture)                    |
| `tests/scrape.test.mjs`          | fetch 재시도 헬퍼 단위 테스트                      |
| `tests/mcp.integration.test.mjs` | stdio MCP 통합 테스트                              |
| `tests/fixtures/`                | 파서용 정적 HTML 스냅샷                            |

- **전송**: stdio만 사용 (HTTP 서버 없음). MCP 프로토콜 메시지는 stdout, 로그는 stderr.
- **패키징**: ESM (`"type": "module"`). `npm run build`로 `dist/` 생성.
- **정적 검사**: ESLint/Prettier 없음. `tsc` strict 모드가 유일한 정적 검사입니다.

## 개발 워크플로

1. `main`에서 기능 브랜치를 만듭니다.
2. 변경 후 `npm run build`와 `npm test`를 실행합니다.
3. 동작·API·에러 형식이 바뀌면 `README.md`와 필요 시 `CHANGELOG.md`를 함께 수정합니다.
4. PR을 열고 CI가 통과하는지 확인합니다.

### 자주 수정하는 영역

| 변경 목적                     | 주로 수정하는 파일                               |
| ----------------------------- | ------------------------------------------------ |
| 새 MCP 도구 / 입력 스키마     | `src/index.ts`                                   |
| TJ URL·요청·재시도            | `src/scrape.ts`                                  |
| HTML 테이블·페이지네이션 파싱 | `src/parser.ts`, `tests/fixtures/*.html`         |
| MCP stdio 동작                | `src/index.ts`, `tests/mcp.integration.test.mjs` |

TJ 웹사이트 마크업이 바뀌면 fixture HTML을 갱신하고 `tests/parser.test.mjs`를 업데이트하는 것이 일반적입니다.

## 테스트

```bash
npm run lint   # ESLint + Prettier (--check)
npm test
```

`npm test`는 `npm run build` 후 `node --test tests/**/*.test.mjs`를 실행합니다.

코드 스타일 수정:

```bash
npm run lint:fix
```

### 테스트 종류

| 파일                                     | 내용                                 | 네트워크                |
| ---------------------------------------- | ------------------------------------ | ----------------------- |
| `parser.test.mjs`                        | fixture HTML 파싱                    | 불필요                  |
| `scrape.test.mjs`                        | 재시도 조건 헬퍼                     | 불필요                  |
| `mcp.integration.test.mjs`               | initialize, tools/list, 검증 오류 등 | 대부분 불필요           |
| `mcp.integration.test.mjs` (live lookup) | `lookup_song` 미존재 곡번호          | `TJ_INTEGRATION=1` 필요 |
| `mcp.integration.test.mjs` (live search) | `search_songs` 곡번호 `28329`        | `TJ_INTEGRATION=1` 필요 |

로컬에서 TJ 라이브 연동까지 포함하려면:

```bash
TJ_INTEGRATION=1 npm test
```

GitHub Actions [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)에서는 `TJ_INTEGRATION=1`로 전체 테스트를 실행합니다.

### fixture 추가·갱신

**권장: 스냅샷 스크립트**

```bash
npm run snapshot-fixture -- -q "아이유" --search-type singer --page 1 -o tests/fixtures/page1_iu.html
```

옵션:

| 옵션            | 설명                                                                |
| --------------- | ------------------------------------------------------------------- |
| `-q`, `--query` | 검색어 (필수)                                                       |
| `--search-type` | `integrated` \| `title` \| `singer` \| `number` (기본 `integrated`) |
| `--page`        | 페이지 번호 (기본 `1`)                                              |
| `-o`, `--out`   | 저장 경로 (필수)                                                    |

이후 `tests/parser.test.mjs`에 기대값을 추가·수정합니다.

**수동**: 브라우저로 TJ 검색 결과 HTML을 저장해 `tests/fixtures/`에 넣어도 됩니다.

실제 사이트 HTML을 커밋할 때는 개인정보·세션 쿠키 등이 포함되지 않았는지 확인하세요.

## 변경 시 유의사항

### MCP 응답 형식

- 성공·비즈니스 오류: `content[0].text`에 **JSON 문자열** (pretty-printed).
- Zod 입력 검증 실패: MCP 표준 검증 오류 텍스트 (`isError: true`).
- 도구 실행 실패(HTTP, TJ 오류 등): `{ "error": true, "message": "...", "detail": "..." }` 형태의 JSON.

새 필드를 추가할 때는 [README.md](./README.md)의 도구·필드 표를 함께 갱신하세요.

### 외부 사이트 의존

- 검색·조회는 `https://www.tjmedia.com/song/accompaniment` 스크래핑에 의존합니다.
- 사이트 구조·레이트 리밋 변경 시 파서·재시도 로직 조정이 필요할 수 있습니다.
- fetch 재시도(429/5xx·일시적 네트워크)는 응답 JSON의 `retry` 필드와 무관합니다 (`retry`는 공백 제거 재시도 전용).

### 범위

- 최소한의 diff를 유지하고, 요청과 무관한 리팩터는 PR에서 분리하세요.
- 의미 있는 동작 변경에는 테스트를 추가하거나 기존 테스트를 수정하세요.

## Pull Request

1. **설명**: 무엇을 바꿨는지, 왜 필요한지 (TJ 마크업 변경, 버그 재현 등).
2. **체크리스트**:
   - [ ] `npm run lint` 성공
   - [ ] `npm run build` 성공
   - [ ] `npm test` 성공 (가능하면 `TJ_INTEGRATION=1 npm test`)
   - [ ] API·에러 형식 변경 시 `README.md` / `CHANGELOG.md` 반영
3. **CI**: `main`으로의 PR은 [CI workflow](./.github/workflows/ci.yml)가 자동 실행됩니다.

이슈 없이 작은 수정도 환영합니다. 큰 기능은 이슈에서 방향을 먼저 논의하면 리뷰가 수월합니다.

## 릴리스

npm 배포는 [`.github/workflows/npm-publish.yml`](./.github/workflows/npm-publish.yml)가 담당합니다.

1. `CHANGELOG.md`에 버전 섹션 정리
2. `package.json`의 `version` bump
3. 태그 생성 후 푸시

```bash
git tag v1.2.0
git push origin v1.2.0
```

저장소 `Settings > Secrets and variables > Actions`에 `NPM_TOKEN`(Automation 권한 권장)이 설정되어 있어야 합니다.

## 관련 문서

| 문서                           | 설명                             |
| ------------------------------ | -------------------------------- |
| [README.md](./README.md)       | 사용자·클라이언트 설정, 도구 API |
| [AGENTS.md](./AGENTS.md)       | Cursor Cloud / 에이전트용 요약   |
| [CHANGELOG.md](./CHANGELOG.md) | 버전별 변경 이력                 |
| [LICENSE](./LICENSE)           | MIT                              |
| [SECURITY.md](./SECURITY.md)   | 보안 취약점 제보                 |

질문이나 제안은 [GitHub Issues](https://github.com/ara-hwang/tj-mcp/issues)를 이용해 주세요. 보안 이슈는 [SECURITY.md](./SECURITY.md)를 참고하세요.
