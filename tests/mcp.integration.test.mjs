import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const serverEntry = join(here, "..", "dist", "index.js");

/** @param {string[]} lines */
function sendRpc(lines) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverEntry], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", () => {});

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}`));
        return;
      }
      const text = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const responses = text
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      resolve(responses);
    });

    for (const line of lines) {
      child.stdin.write(`${line}\n`);
    }
    child.stdin.end();
  });
}

function responseForId(responses, id) {
  const match = responses.find((r) => r.id === id);
  assert.ok(match, `missing response for id=${id}`);
  return match;
}

test("MCP: initialize returns server info", async () => {
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  ]);

  const init = responseForId(responses, 1);
  assert.equal(init.jsonrpc, "2.0");
  assert.equal(init.result.serverInfo.name, "tj-karaoke");
  assert.match(init.result.serverInfo.version, /^\d+\.\d+\.\d+$/);
  assert.ok(init.result.instructions);
  assert.match(init.result.instructions, /search_songs/);
  assert.match(init.result.instructions, /integrated/);
});

test("MCP: tools/list exposes search_songs and lookup_song", async () => {
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
  ]);

  const list = responseForId(responses, 2);
  const names = list.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["lookup_song", "search_songs"]);

  const searchTool = list.result.tools.find((t) => t.name === "search_songs");
  const searchTypes = searchTool.inputSchema.properties.searchType.enum ?? [];
  assert.ok(searchTypes.includes("number"));
});

test("MCP: lookup_song invalid songNumber returns validation error", async () => {
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "lookup_song",
        arguments: { songNumber: "not-a-number" },
      },
    }),
  ]);

  const call = responseForId(responses, 2);
  assert.equal(call.result.isError, true);
  assert.equal(call.result.content[0].type, "text");
  assert.match(call.result.content[0].text, /곡번호는 숫자만/);
});

test("MCP: search_songs number query rejects non-digits", async () => {
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "search_songs",
        arguments: {
          query: "not-a-number",
          searchType: "number",
        },
      },
    }),
  ]);

  const call = responseForId(responses, 2);
  assert.equal(call.result.isError, true);
  const payload = JSON.parse(call.result.content[0].text);
  assert.equal(payload.error, true);
  assert.match(payload.message, /숫자만/);
});

test("MCP: lookup_song missing song returns JSON error payload", async (t) => {
  if (process.env.TJ_INTEGRATION !== "1") {
    t.skip("TJ_INTEGRATION=1 required for live network test");
  }
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "lookup_song",
        arguments: { songNumber: "999999999" },
      },
    }),
  ]);

  const call = responseForId(responses, 2);
  assert.equal(call.result.isError, true);
  const payload = JSON.parse(call.result.content[0].text);
  assert.equal(payload.error, true);
  assert.equal(payload.songNumber, "999999999");
  assert.match(payload.message, /찾을 수 없습니다/);
});

test("MCP: search_songs number lookup returns at least one song", async (t) => {
  if (process.env.TJ_INTEGRATION !== "1") {
    t.skip("TJ_INTEGRATION=1 required for live network test");
  }
  // README 예시 곡번호; TJ 카탈로그에 존재하는 안정적인 번호
  const songNumber = "28329";
  const responses = await sendRpc([
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
    }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "search_songs",
        arguments: {
          query: songNumber,
          searchType: "number",
          page: 1,
        },
      },
    }),
  ]);

  const call = responseForId(responses, 2);
  assert.notEqual(call.result.isError, true);
  const payload = JSON.parse(call.result.content[0].text);
  assert.equal(payload.searchType, "number");
  assert.ok(payload.count >= 1);
  assert.ok(
    payload.songs.some((s) => s.number === songNumber),
    `expected song ${songNumber} in results`
  );
});
