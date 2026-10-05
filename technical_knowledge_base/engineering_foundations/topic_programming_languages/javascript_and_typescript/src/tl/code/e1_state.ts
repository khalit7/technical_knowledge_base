// The Messages API is stateless: the conversation is an array you keep and resend in full every turn.
import Anthropic from "@anthropic-ai/sdk";
import { startMock } from "./mock_model.ts";

const mock = await startMock();
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key" });
const turn = async (messages: Anthropic.MessageParam[]) => {
  const r = await client.messages.create({ model: "claude-sonnet-5-5", max_tokens: 256, messages });
  return { text: r.content[0]?.type === "text" ? r.content[0].text : "", input: r.usage.input_tokens };
};

// Wrong: two separate calls. The second request does not contain the first, so the "model" cannot know.
await turn([{ role: "user", content: "My name is Khalid." }]);
console.log("forgetful:", (await turn([{ role: "user", content: "What is my name?" }])).text);

// Right: keep the history and append both sides of every turn.
const history: Anthropic.MessageParam[] = []; let billed = 0;
for (const q of ["My name is Khalid.", "What is my name?", "In one sentence, what is TypeScript?", "In one sentence, what is TypeScript?", "In one sentence, what is TypeScript?", "What is my name?"]) {
  history.push({ role: "user", content: q });
  const a = await turn(history);
  history.push({ role: "assistant", content: a.text }); billed += a.input;
  console.log(`turn ${history.length / 2}: sent ${history.length - 1} messages, input ${String(a.input).padStart(3)} (mock est.)  ${JSON.stringify(a.text)}`);
}
console.log(`input tokens billed over the 6 turns: ${billed} (each turn pays again for everything before it)`);
await mock.close();
