// The same agent with the Vercel AI SDK: one API over many providers; the loop is generateText + stopWhen.
import { generateText, streamText, tool, isStepCount } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { startMock } from "./mock_model.ts";
import { CountArgs, ProfileArgs, countTokens, startProfileService, userProfile } from "./tools.ts";

process.chdir(new URL(".", import.meta.url).pathname);
const mock = await startMock();
const prof = await startProfileService(20);
const anthropic = createAnthropic({ baseURL: mock.url + "/v1", apiKey: "mock-key", headers: { "x-mock-scenario": "happy" } });
const tools = {
  count_tokens: tool({ description: "Count word tokens per user in a JSONL chat log.", inputSchema: CountArgs,
    execute: async (args) => countTokens(args) }),
  user_profile: tool({ description: "Look up a user's team.", inputSchema: ProfileArgs,
    execute: async (args, { abortSignal }) => JSON.parse(await userProfile(prof.url, args, abortSignal)) }),
};
const prompt = "Who are the 3 heaviest users in chat.jsonl, and what share of all tokens do they have? Add the team of the top two.";

const one = await generateText({ model: anthropic("claude-sonnet-5-5"), tools, prompt });          // default: one step
console.log(`default stopWhen: ${one.steps.length} step, finishReason ${one.finishReason}, text ${JSON.stringify(one.text)}`);

const r = await generateText({ model: anthropic("claude-sonnet-5-5"), tools, prompt, stopWhen: isStepCount(5) });
for (const [i, s] of r.steps.entries())
  console.log(`step ${i + 1}: ${s.toolCalls.map(c => `${c.toolName}(${JSON.stringify(c.input)})`).join(" + ") || "no tool calls"} -> finish ${s.finishReason}`);
console.log("text:", r.text);
console.log("usage summed over steps:", JSON.stringify(r.totalUsage.inputTokens), "in,", JSON.stringify(r.totalUsage.outputTokens), "out (mock est.)");

const s = streamText({ model: anthropic("claude-sonnet-5-5"), prompt: "In one sentence, what is TypeScript?",
  headers: { "x-mock-scenario": "chat" } });
const parts: string[] = [];
for await (const delta of s.textStream) parts.push(delta);
console.log(`streamText: ${parts.length} text deltas, first three ${JSON.stringify(parts.slice(0, 3))}`);
await prof.close(); await mock.close();
