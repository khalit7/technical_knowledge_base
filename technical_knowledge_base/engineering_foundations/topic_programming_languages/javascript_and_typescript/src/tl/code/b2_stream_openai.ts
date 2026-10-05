// The same answer streamed by the OpenAI Responses API: different event names, same idea.
import OpenAI from "openai";
import { writeFileSync } from "node:fs";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const client = new OpenAI({ baseURL: mock.url + "/v1", apiKey: "mock-key" });
const stream = await client.responses.create({ model: "gpt-5.5", input: "In one sentence, what is TypeScript?", stream: true });
const kinds: string[] = []; let text = "";
for await (const ev of stream) {
  kinds.push(ev.type === "response.output_text.delta" ? `delta(${JSON.stringify(ev.delta)})` : ev.type);
  if (ev.type === "response.output_text.delta") text += ev.delta;
}
console.log(`raw events (${kinds.length}):`, kinds.join(" "));
console.log("text:", text);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ openai: mock.log[0]!.sse }));
await mock.close();
