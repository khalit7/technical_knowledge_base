// The same agent with the SDK's tool runner (beta): you write the tools, the SDK writes the loop.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { startMock } from "./mock_model.ts";
import { CountArgs, ProfileArgs, countTokens, startProfileService, userProfile } from "./tools.ts";

process.chdir(new URL(".", import.meta.url).pathname);
const mock = await startMock();
const prof = await startProfileService(20);
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key", defaultHeaders: { "x-mock-scenario": "happy" } });

const runner = client.beta.messages.toolRunner({
  model: "claude-sonnet-5-5", max_tokens: 2048, max_iterations: 5,          // max_iterations is the step limit
  messages: [{ role: "user", content: "Who are the 3 heaviest users in chat.jsonl, and what share of all tokens do they have? Add the team of the top two." }],
  tools: [
    betaZodTool({ name: "count_tokens", description: "Count word tokens per user in a JSONL chat log.", inputSchema: CountArgs,
      run: async (args) => JSON.stringify(await countTokens(args)) }),          // args is typed from the zod schema
    betaZodTool({ name: "user_profile", description: "Look up a user's team.", inputSchema: ProfileArgs,
      run: (args) => userProfile(prof.url, args, AbortSignal.timeout(500)) }),
  ],
});
for await (const message of runner) {                                        // one iteration per model call
  console.log(`model call: stop_reason ${message.stop_reason}, blocks ${message.content.map(b => b.type).join(", ")}`);
}
const final = await runner.done();
console.log("final:", final.content.filter(b => b.type === "text").map(b => b.text).join(" "));
console.log("requests the runner made:", mock.log.map(e => e.path).join(", "));
await prof.close(); await mock.close();
