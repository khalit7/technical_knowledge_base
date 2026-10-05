// The Claude Agent SDK runs the Claude Code agent (its own loop, built-in tools, permissions) as a library.
// Here it talks to the mock through ANTHROPIC_BASE_URL, so we can see what one query() sends over the wire.
import { query } from "@anthropic-ai/claude-agent-sdk";
import { mkdirSync } from "node:fs";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const home = new URL("./agent_sdk_home/", import.meta.url).pathname; mkdirSync(home, { recursive: true });
const types: string[] = [];
for await (const m of query({
  prompt: "In one sentence, what is TypeScript?",
  options: {
    cwd: home, maxTurns: 3, allowedTools: [],   // allowedTools = auto-approve list; the tool LIST is the `tools` option
    env: { ...process.env, ANTHROPIC_BASE_URL: mock.url, ANTHROPIC_API_KEY: "mock-key", CLAUDE_CONFIG_DIR: home,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1", DISABLE_TELEMETRY: "1", DISABLE_AUTOUPDATER: "1" },
  },
})) {
  types.push(m.type + ("subtype" in m && m.subtype ? `/${m.subtype}` : ""));
  if (m.type === "result" && m.subtype === "success") console.log("result:", JSON.stringify(m.result), "| turns", m.num_turns);
}
console.log("messages from query():", types.join(", "));
const calls = mock.log.filter(e => e.path.startsWith("/v1/messages"));
console.log(`HTTP requests to the model API: ${mock.log.length} (${[...new Set(mock.log.map(e => e.path.split("?")[0]))].join(", ")})`);
const big = calls.reduce((a, e) => (JSON.stringify(e.request).length > JSON.stringify(a.request).length ? e : a), calls[0]!);
console.log(`largest request: ${JSON.stringify(big.request).length} bytes, ${big.request.tools?.length ?? 0} tools: ${(big.request.tools ?? []).map((t: any) => t.name).join(", ")}`);
await mock.close();
