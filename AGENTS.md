## Cursor Cloud specific instructions

Human-oriented setup, testing, and PR workflow: **[CONTRIBUTING.md](./CONTRIBUTING.md)**. User-facing tool API: **[README.md](./README.md)**.

### Overview

This is **tj-mcp**, an MCP (Model Context Protocol) server that searches TJ Media (태진) karaoke songs. It scrapes `tjmedia.com` and returns structured JSON results via stdio transport.

Source layout:

- `src/index.ts` — MCP server and tool handlers
- `src/scrape.ts` — TJ site fetching (`fetchHtml`, `searchSongs`)
- `src/parser.ts` — HTML parsing (`parseSongTable`, `parsePagination`, `uniqueSongs`)

MCP tools:

- `search_songs` — search by title/singer/integrated/number (space-stripping retry except `number`)
- TJ fetch retries transient HTTP 429/5xx and network errors (exponential backoff, max 3 attempts)
- `lookup_song` — lookup by song number

### Build & Run

Standard commands are in `README.md` and `package.json`. Quick reference:

- **Install**: `npm install`
- **Build**: `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start**: `node dist/index.js` (stdio-based MCP server, not an HTTP server)
- **Lint**: `npm run lint` (ESLint + Prettier check)
- **Test**: `npm test` (parser unit tests + MCP stdio integration tests)
- **Fixture snapshot**: `npm run snapshot-fixture -- -q "..." --search-type singer -o tests/fixtures/foo.html`

### Testing the MCP Server

Automated tests:

```bash
npm test
```

Manual stdio verification:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n' | node dist/index.js 2>/dev/null
```

With a live network call (lookup not found):

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lookup_song","arguments":{"songNumber":"999999999"}}}\n' | node dist/index.js 2>/dev/null
```

### Gotchas

- The server communicates via **stdio only** (no HTTP port). Pipe JSON-RPC messages to stdin and read responses from stdout.
- `stderr` is used for logging (`console.error`), not for MCP protocol messages.
- Search results depend on live network access to `tjmedia.com`. Parser tests use HTML fixtures only; live-network MCP tests (`lookup_song` miss, `search_songs` number `28329`) run only when `TJ_INTEGRATION=1` (set in CI).
- MCP `initialize` returns `instructions` (searchType usage hints).
- **Lint**: ESLint 9 flat config + Prettier (`npm run lint`). TypeScript strict mode (`tsc`) via `npm run build`.
- The project uses ESM (`"type": "module"` in `package.json`).
- Requires **Node.js 20+** (`engines` in `package.json`).
