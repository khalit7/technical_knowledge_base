// The first call: the official Anthropic SDK, pointed at the local mock (baseURL) instead of api.anthropic.com.
import Anthropic from "@anthropic-ai/sdk";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key" });   // real code: new Anthropic() reads ANTHROPIC_API_KEY

const msg = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "In one sentence, what is TypeScript?" }],
});

// msg is typed Anthropic.Message: content is an array of blocks, so narrow on .type before reading .text
for (const block of msg.content) if (block.type === "text") console.log("text:", block.text);
console.log("stop_reason:", msg.stop_reason, "| usage:", JSON.stringify({ in: msg.usage.input_tokens, out: msg.usage.output_tokens }));
console.log("request id:", msg._request_id);

const sent = mock.log[0]!;
console.log("\nwhat went over the wire:");
console.log("POST", sent.path, JSON.stringify(sent.headers, null, 1).replace(/\n\s*/g, " "));
console.log("body:", JSON.stringify(sent.request));
console.log("response:", JSON.stringify(sent.response));
await mock.close();
