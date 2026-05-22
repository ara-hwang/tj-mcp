# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a vulnerability

보안 취약점은 **공개 이슈로 올리지 말고** 아래로 연락해 주세요.

- GitHub: [Security Advisories](https://github.com/ara-hwang/tj-mcp/security/advisories/new) (권장)
- 또는 저장소 소유자에게 비공개로 연락

가능하면 재현 단계, 영향 범위, 제안 수정안을 포함해 주시면 대응이 빨라집니다.

## Scope notes

- 이 프로젝트는 `tjmedia.com`을 스크래핑하며, **TJ 사이트 자체의 보안·가용성**은 이 저장소 범위 밖입니다.
- MCP 서버는 **stdio**만 사용합니다. HTTP 엔드포인트를 노출하지 않습니다.
- 클라이언트 설정(`mcp.json` 등)에 저장하는 비밀값은 없습니다. 제3자 토큰을 코드에 넣지 마세요.

## Out of scope (일반적으로)

- TJ 웹사이트 UI/마크업 변경으로 인한 검색 실패
- 사용자가 입력한 검색어 문자열 자체 (서버는 입력을 TJ로 전달할 뿐 저장하지 않음)
