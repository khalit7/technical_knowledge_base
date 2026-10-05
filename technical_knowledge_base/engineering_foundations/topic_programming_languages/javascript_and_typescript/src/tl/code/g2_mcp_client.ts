// An MCP client: start the server as a child process (stdio), discover what it offers, call it. Every message is recorded.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync } from "node:fs";
import { tap } from "./mcp_tap.ts";

const log: any[] = [];
const client = new Client({ name: "page-demo", version: "1.0.0" });
const transport = new StdioClientTransport({ command: process.execPath, args: ["g1_mcp_server.ts"], cwd: new URL(".", import.meta.url).pathname });
await client.connect(tap(transport, log));                 // initialize request, response, initialized notification

const { tools } = await client.listTools();
console.log("tools:", tools.map(t => `${t.name} ${JSON.stringify(t.inputSchema.properties)}`).join("; "));
const res = await client.callTool({ name: "count_tokens", arguments: { path: "chat.jsonl", top: 3 } });
console.log("call:", (res.content as any)[0].text);
const miss = await client.callTool({ name: "count_tokens", arguments: { path: "chats.jsonl", top: 3 } });
console.log("missing file: isError", miss.isError, (miss.content as any)[0].text);
const bad = await client.callTool({ name: "count_tokens", arguments: { path: "chat.jsonl", top: 0 } });
console.log("bad input: isError", bad.isError, JSON.stringify((bad.content as any)[0].text).slice(0, 140));
const r = await client.readResource({ uri: "file:///chat.jsonl" });
console.log("resource:", (r.contents[0] as any).text);
const p = await client.getPrompt({ name: "heaviest-users", arguments: { n: "3" } });
console.log("prompt:", JSON.stringify(p.messages[0]!.content));
console.log("server says:", JSON.stringify(client.getServerVersion()), "protocol", (log[1].msg as any).result.protocolVersion);
await client.close();
console.log(`\n${log.length} JSON-RPC messages; the first three:`);
for (const { dir, msg } of log.slice(0, 3)) console.log(dir === "->" ? "client -> server" : "server -> client", JSON.stringify(msg));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(log));
