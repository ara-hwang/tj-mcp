## Cursor Cloud specific instructions

### Overview

This is **tj-mcp**, a single-file MCP (Model Context Protocol) server that searches TJ Media (태진) karaoke songs. It scrapes `tjmedia.com` and returns structured JSON results via stdio transport. There is only one source file (`src/index.ts`) and one MCP tool: `search_songs`.

### Build & Run

Standard commands are in `README.md` and `package.json`. Quick reference:

- **Install**: `npm install`
- **Build**: `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start**: `node dist/index.js` (stdio-based MCP server, not an HTTP server)

### Testing the MCP Server

There are no automated test suites in this project. To verify the server works, send JSON-RPC messages over stdin:

```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_songs","arguments":{"query":"아이유","searchType":"singer","page":1}}}\n' | node dist/index.js 2>/dev/null
```

### Gotchas

- The server communicates via **stdio only** (no HTTP port). You must pipe JSON-RPC messages to stdin and read responses from stdout.
- `stderr` is used for logging (`console.error`), not for MCP protocol messages.
- Search results depend on live network access to `tjmedia.com`. If the site is down or network is unavailable, the tool returns a JSON error object instead of throwing.
- There is no lint configuration (no ESLint/Prettier). TypeScript strict mode (`tsc`) is the only static check.
- The project uses ESM (`"type": "module"` in `package.json`).
