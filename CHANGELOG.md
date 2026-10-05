# Changelog

All notable changes are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.3.0] - 2026-10-05

### Changed

- MCP 도구 등록을 deprecated `server.tool` → `server.registerTool`로 전환하고 `title`·`annotations`(`readOnlyHint`, `openWorldHint`) 추가
- TJ fetch 시도당 타임아웃 60초 → 15초 (재시도 포함 최악의 경우에도 MCP 클라이언트 기본 타임아웃 60초 이내)
- 작사·작곡 정보가 비어 있으면 `lyricist`/`composer` 필드를 빈 문자열 대신 생략
- 런타임 의존성 최소 버전 상향: `@modelcontextprotocol/sdk` ^1.32.1, `zod` ^4.6.5, `cheerio` ^1.2.0
- 개발 의존성 메이저 업데이트: `eslint` 10, `@eslint/js` 10, `globals` 17, TypeScript 7
  - typescript-eslint가 아직 TS 7을 지원하지 않아, 빌드는 TS 7(`@typescript/native` → `tsc`)로 하고 린트용 TypeScript API는 `@typescript/typescript6`(TS 6)를 함께 설치하는 공식 side-by-side 구성 사용
  - `eslint.config.js`: deprecated `tseslint.config()` → ESLint `defineConfig()`
  - `tsconfig.json`: TS 7의 `types` 기본값 변경(`[]`)에 대비해 `"types": ["node"]` 명시
- npm 배포를 Trusted Publisher(OIDC)로 전환: `.github/workflows/publish.yml` 추가, `NPM_TOKEN` 기반 `npm-publish.yml` 제거. 태그와 `package.json` 버전 일치 검사 추가

### Removed

- `CONTRIBUTING.md`, `SECURITY.md`, Issue/PR 템플릿 (npm `files`·`AGENTS.md`의 참조도 정리)

### Fixed

- README: 응답 필드 표 중 `songs[]` 행이 인용문으로 렌더링되던 문제, 목차의 깨진 `#contributing` 링크, TJ 검색 경로 표기

## [1.2.1] - 2026-05-22

### Added

- `CONTRIBUTING.md` (로컬 개발, 테스트, PR, 릴리스 가이드)
- `SECURITY.md`, GitHub Issue/PR 템플릿
- ESLint + Prettier (`npm run lint`, CI 연동)
- `scripts/snapshot-fixture.mjs` (`npm run snapshot-fixture`) — TJ HTML fixture 갱신
- `fetchSearchPageHtml` / `buildSearchUrl` (`src/scrape.ts`)
- MCP 서버 `instructions` 및 도구 설명 보강
- `search_songs` 라이브 통합 테스트 (`TJ_INTEGRATION=1`, 곡번호 `28329`)

### Changed

- `README.md`, `AGENTS.md` 문서 정리 및 상호 링크
- Issue 템플릿: 미등록 라벨 자동 부여 제거
- npm 패키지 `files`에 `SECURITY.md` 포함
- README CI/npm/Node 배지, `package.json` `homepage`/`bugs`
- `prepublishOnly`에 `npm run lint` 포함

### Fixed

- 라이브 `search_songs` 테스트: `isError` 성공 응답 assertion 보강
- `snapshot-fixture`: TJ 검색 페이지 HTML 검증 후 저장 (`isValidTjSearchHtml`)

## [1.2.0] - 2026-05-22

### Added

- `search_songs` `searchType: "number"` (곡번호 검색)
- TJ fetch 재시도 (HTTP 429/5xx, 일시적 네트워크 오류, 최대 3회)
- `lookup_song` 곡번호 단건 조회
- CI workflow (`ci.yml`), MCP stdio 통합 테스트
- `src/scrape.ts` 모듈 분리

### Changed

- Zod 3 → Zod 4
- Node.js 요구사항 20+ (`engines`)
- `prepublishOnly`에 `npm test` 포함

## [1.0.4] - earlier

- TJ 반주곡 검색 경로 및 파서 개선
- 공백 제거 재시도 (`retry` 필드)
