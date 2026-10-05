// An MCP server with the official TypeScript SDK: one tool, one resource, one prompt.
// Run it over stdio (a client starts it as a child process) or over Streamable HTTP (one URL, many clients).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { z } from "zod";
import { CountArgs, countTokens } from "./tools.ts";

export function buildServer() {
  const server = new McpServer({ name: "chat-stats", version: "1.0.0" });

  server.registerTool("count_tokens", {
    title: "Count tokens per user",
    description: "Count word tokens per user in a JSONL chat log; returns totals and the top users.",
    inputSchema: CountArgs.shape,                       // validated by the SDK before the handler runs
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const stats = await countTokens(args);
      return { content: [{ type: "text", text: JSON.stringify(stats) }] };
    } catch (e: any) {                                  // a tool failure is a result the model can read, not a protocol error
      return { isError: true, content: [{ type: "text", text: `cannot open ${args.path}: ${e.code}` }] };
    }
  });

  server.registerResource("chat-log", "file:///chat.jsonl", { title: "The chat log", mimeType: "application/json" },
    async (uri) => {
      const s = await stat("chat.jsonl");
      return { contents: [{ uri: uri.href, text: JSON.stringify({ bytes: s.size, format: "JSONL, one message per line" }) }] };
    });

  server.registerPrompt("heaviest-users", {
    description: "Ask for the heaviest users of a chat log",
    argsSchema: { n: z.string().describe("how many users") },
  }, ({ n }) => ({ messages: [{ role: "user", content: { type: "text", text: `Who are the ${n} heaviest users in chat.jsonl? Use count_tokens.` } }] }));

  return server;
}

export async function startHttp(port = 0) {                // Streamable HTTP: POST /mcp, one transport per session
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  const http = createServer(async (req, res) => {
    const sid = req.headers["mcp-session-id"] as string | undefined;
    let t = sid ? sessions.get(sid) : undefined;
    if (!t) {
      t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { sessions.set(id, t!); } });
      await buildServer().connect(t);
    }
    await t.handleRequest(req, res);
  });
  await new Promise<void>(r => http.listen(port, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${(http.address() as any).port}/mcp`, close: () => new Promise(r => { http.closeAllConnections(); http.close(r); }) };
}

if (import.meta.main) {
  process.chdir(new URL(".", import.meta.url).pathname);
  if (process.argv[2] === "http") console.log("MCP over Streamable HTTP at", (await startHttp(Number(process.argv[3] ?? 3333))).url);
  else await buildServer().connect(new StdioServerTransport());   // stdout now carries JSON-RPC: log to stderr only
}
