## Cursor Cloud specific instructions

### Overview

This is **tj-mcp**, an MCP (Model Context Protocol) server that searches TJ Media (태진) karaoke songs. It scrapes `tjmedia.com` and returns structured JSON results via stdio transport.

Source layout:

- `src/index.ts` — MCP server, scraping (`fetchHtml`, `searchSongs`), tool handlers
- `src/parser.ts` — HTML parsing (`parseSongTable`, `parsePagination`, `uniqueSongs`)

MCP tools:

- `search_songs` — search by title/singer/integrated (with space-stripping retry)
- `lookup_song` — lookup by song number

### Build & Run

Standard commands are in `README.md` and `package.json`. Quick reference:

- **Install**: `npm install`
- **Build**: `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start**: `node dist/index.js` (stdio-based MCP server, not an HTTP server)
- **Test**: `npm test` (parser unit tests + MCP stdio integration tests)

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
- Search results depend on live network access to `tjmedia.com`. Integration tests include one optional network call for `lookup_song`; parser tests use HTML fixtures only.
- There is no lint configuration (no ESLint/Prettier). TypeScript strict mode (`tsc`) is the only static check.
- The project uses ESM (`"type": "module"` in `package.json`).
- Requires **Node.js 20+** (`engines` in `package.json`).
