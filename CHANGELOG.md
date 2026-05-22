# Changelog

All notable changes are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

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
