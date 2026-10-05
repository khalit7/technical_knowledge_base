// Streaming three ways with the Anthropic SDK: raw events (stream: true), the stream helper's events, and partial JSON
// for a tool call. The mock sends one SSE event per write.
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "node:fs";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key" });
const ask = { model: "claude-sonnet-5-5", max_tokens: 1024, messages: [{ role: "user" as const, content: "In one sentence, what is TypeScript?" }] };

// 1. stream: true returns an async iterable of the raw events, already parsed from SSE
const raw = await client.messages.create({ ...ask, stream: true });
const kinds: string[] = []; let text = "";
for await (const ev of raw) {
  kinds.push(ev.type === "content_block_delta" ? `delta(${JSON.stringify(ev.delta.type === "text_delta" ? ev.delta.text : "")})` : ev.type);
  if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") text += ev.delta.text;
}
console.log(`1. raw events (${kinds.length}):`, kinds.join(" "));
console.log("   first 3 SSE frames on the wire:\n" + mock.log[0]!.sse!.split("\n\n").slice(0, 3).map(f => "   | " + f.replace(/\n/g, "\n   | ")).join("\n"));

// 2. the helper: .on("text") per delta, finalMessage() for the assembled Message
const s = client.messages.stream(ask);
let deltas = 0; s.on("text", () => deltas++);
const final = await s.finalMessage();
console.log(`2. helper: ${deltas} text events; finalMessage: stop_reason ${final.stop_reason}, ${final.content.length} block, text equal to step 1: ${final.content[0]?.type === "text" && final.content[0].text === text}`);

// 3. a tool call streams its input as partial JSON; the helper parses the snapshot so far at every step
const t = client.messages.stream({ ...ask, tools: [{ name: "count_tokens", description: "count tokens per user", input_schema: { type: "object", properties: { path: { type: "string" }, top: { type: "integer" } } } }] },
  { headers: { "x-mock-scenario": "happy" } });
t.on("inputJson", (partial, snapshot) => console.log(`   + ${JSON.stringify(partial).padEnd(16)} snapshot ${JSON.stringify(snapshot)}`));
console.log("3. tool input as it arrives:");
const tm = await t.finalMessage();
console.log("   final tool_use input:", JSON.stringify(tm.content.find(b => b.type === "tool_use")));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ anthropic: mock.log[0]!.sse, tool: mock.log[2]!.sse }));
await mock.close();
