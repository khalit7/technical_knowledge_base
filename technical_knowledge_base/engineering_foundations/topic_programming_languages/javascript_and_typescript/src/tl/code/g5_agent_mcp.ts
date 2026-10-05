// Glue: an agent whose tools come from an MCP server. tools/list becomes the API's tools; a tool_use becomes tools/call.
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startMock } from "./mock_model.ts";

const mcp = new Client({ name: "agent", version: "1.0.0" });
await mcp.connect(new StdioClientTransport({ command: process.execPath, args: ["g1_mcp_server.ts"], cwd: new URL(".", import.meta.url).pathname }));
const tools: Anthropic.Tool[] = (await mcp.listTools()).tools.map(t =>
  ({ name: t.name, description: t.description ?? "", input_schema: t.inputSchema as Anthropic.Tool.InputSchema }));

const mock = await startMock();
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key", defaultHeaders: { "x-mock-scenario": "typo" } });
const messages: Anthropic.MessageParam[] = [{ role: "user", content: "Who are the 3 heaviest users in chat.jsonl, and what share of all tokens do they have?" }];
for (let step = 1; step <= 5; step++) {
  const msg = await client.messages.create({ model: "claude-sonnet-5-5", max_tokens: 2048, tools, messages });
  messages.push({ role: "assistant", content: msg.content });
  if (msg.stop_reason !== "tool_use") { console.log("answer:", msg.content.map(b => b.type === "text" ? b.text : "").join("")); break; }
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const b of msg.content) if (b.type === "tool_use") {
    const r = await mcp.callTool({ name: b.name, arguments: b.input as Record<string, unknown> });
    const text = (r.content as { type: string; text: string }[]).map(c => c.text).join("");
    console.log(`step ${step}: tools/call ${b.name}(${JSON.stringify(b.input)}) -> ${r.isError ? "isError " : ""}${text.slice(0, 70)}`);
    results.push({ type: "tool_result", tool_use_id: b.id, content: text, is_error: !!r.isError });
  }
  messages.push({ role: "user", content: results });
}
await mcp.close(); await mock.close();
