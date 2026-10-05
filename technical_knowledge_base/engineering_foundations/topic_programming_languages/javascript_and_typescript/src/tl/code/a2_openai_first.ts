// The same question through the official OpenAI SDK and its Responses API, against the same mock.
import OpenAI from "openai";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const client = new OpenAI({ baseURL: mock.url + "/v1", apiKey: "mock-key" });   // real code: new OpenAI() reads OPENAI_API_KEY

const resp = await client.responses.create({
  model: "gpt-5.5",
  input: "In one sentence, what is TypeScript?",
});
console.log("output_text:", resp.output_text);        // a convenience the SDK computes from resp.output
console.log("output[0].type:", resp.output[0]?.type, "| usage:", JSON.stringify(resp.usage));
console.log("\nbody sent:", JSON.stringify(mock.log[0]!.request));
await mock.close();
