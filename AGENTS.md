## Cursor Cloud specific instructions

### Overview

This is **tj-mcp**, an MCP (Model Context Protocol) server that searches TJ Media (태진) karaoke songs. It scrapes `tjmedia.com` and returns structured JSON results via **Streamable HTTP** transport (Express). Tools: `search_songs`, `lookup_song`.

### Build & Run

Standard commands are in `README.md` and `package.json`. Quick reference:

- **Install**: `npm install`
- **Build**: `npm run build` (runs `tsc`, outputs to `dist/`)
- **Start**: `node dist/index.js` (HTTP server, default `http://127.0.0.1:3000/mcp`)
- **Environment**: `MCP_HOST` (default `127.0.0.1`), `MCP_PORT` (default `3000`)

### Testing the MCP Server

Parser unit tests: `npm test`. To verify the HTTP MCP server:

```bash
npm run build
node dist/index.js &
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

### Gotchas

- The server listens on HTTP (not stdio). Clients must use a Streamable HTTP URL (e.g. `http://127.0.0.1:3000/mcp`).
- Bind to all interfaces with `MCP_HOST=0.0.0.0` for containers; consider network exposure.
- Search results depend on live network access to `tjmedia.com`. If the site is down or network is unavailable, tools return a JSON error object instead of throwing.
- There is no lint configuration (no ESLint/Prettier). TypeScript strict mode (`tsc`) is the only static check.
- The project uses ESM (`"type": "module"` in `package.json`).
