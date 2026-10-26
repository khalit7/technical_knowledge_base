// The same server and client over Streamable HTTP: the JSON-RPC messages are identical; only the envelope changes.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { writeFileSync } from "node:fs";
import { startHttp } from "./g1_mcp_server.ts";
import { tap } from "./mcp_tap.ts";

process.chdir(new URL(".", import.meta.url).pathname);
const srv = await startHttp();
const http: string[] = []; const log: any[] = [];
const sid = (s: string | null) => s ? "<session id>" : "none";           // a random UUID per session
const loggingFetch: typeof fetch = async (url, init) => {
  const h = new Headers(init?.headers);
  const res = await fetch(url, init);
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  http.push(`${init?.method ?? "GET"} /mcp  ${body?.method ?? ""}  [mcp-session-id: ${sid(h.get("mcp-session-id"))}, mcp-protocol-version: ${h.get("mcp-protocol-version") ?? "none"}]` +
    `  ->  ${res.status} ${res.headers.get("content-type") ?? ""}${res.headers.get("mcp-session-id") ? "  (sets mcp-session-id)" : ""}`);
  return res;
};
const client = new Client({ name: "page-demo", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(srv.url), { fetch: loggingFetch });
await client.connect(tap(transport, log));
await client.listTools();
const res = await client.callTool({ name: "count_tokens", arguments: { path: "chat.jsonl", top: 3 } });
console.log("call:", (res.content as any)[0].text.slice(0, 60) + "...");
await transport.terminateSession();                                      // DELETE /mcp ends the session
await client.close(); await srv.close();
console.log("HTTP exchanges:"); http.forEach(l => console.log(" ", l));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ http, log }));
