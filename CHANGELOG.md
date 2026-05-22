# Changelog

All notable changes are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- `CONTRIBUTING.md` (로컬 개발, 테스트, PR, 릴리스 가이드)

### Changed

- `README.md`, `AGENTS.md` 문서 정리 및 상호 링크

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
