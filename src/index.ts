#!/usr/bin/env node
import type { Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { createMcpServer } from "./mcp-server.js";

const MCP_HOST = process.env.MCP_HOST ?? "127.0.0.1";
const MCP_PORT = process.env.MCP_PORT
  ? parseInt(process.env.MCP_PORT, 10)
  : 3000;

const app = createMcpExpressApp({ host: MCP_HOST });

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const methodNotAllowed = (res: Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
};

app.post("/mcp", async (req, res) => {
  const server = createMcpServer();
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", (_req, res) => {
  methodNotAllowed(res);
});

app.delete("/mcp", (_req, res) => {
  methodNotAllowed(res);
});

app.listen(MCP_PORT, MCP_HOST, () => {
  console.error(
    `TJ Karaoke MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp`
  );
});

process.on("SIGINT", () => {
  process.exit(0);
});
