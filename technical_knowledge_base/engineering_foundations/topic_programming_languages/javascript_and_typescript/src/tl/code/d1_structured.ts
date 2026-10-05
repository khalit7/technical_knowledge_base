// Structured output: one zod schema gives the JSON Schema sent to the API, the TypeScript type, and the run-time check.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { startMock } from "./mock_model.ts";

const Heaviest = z.object({
  user: z.string().regex(/^u\d{4}$/),
  tokens: z.number().int().nonnegative(),
  share_pct: z.number().min(0).max(100),
});
type Heaviest = z.infer<typeof Heaviest>;          // { user: string; tokens: number; share_pct: number }

const mock = await startMock();
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key" });
const ask = (scenario: string) => client.messages.parse({
  model: "claude-sonnet-5-5", max_tokens: 1024,
  messages: [{ role: "user", content: "From these stats, who is the heaviest user? ..." }],
  output_config: { format: zodOutputFormat(Heaviest) },
}, { headers: { "x-mock-scenario": scenario } });

const good = await ask("extract");
const h: Heaviest | null = good.parsed_output;    // typed, and already validated against the schema
console.log("1. parsed_output:", JSON.stringify(h), "| h.tokens + 1 =", (h?.tokens ?? 0) + 1);
console.log("   output_config sent:", JSON.stringify(mock.log[0]!.request.output_config));

try {                                             // the model's JSON does not match: the SDK throws, it does not guess
  const bad = await ask("extract_bad");
  console.log("2. parsed_output:", JSON.stringify(bad.parsed_output));
} catch (e) {
  console.log(`2. ${(e as Error).constructor.name}: ${(e as Error).message.split("\n").slice(0, 6).join("\n   ")}`);
}

// Without the helper (or with any other provider): parse the text yourself, then validate. safeParse never throws.
const raw = '{"user": "u0029", "tokens": "9491"}';
const r = Heaviest.safeParse(JSON.parse(raw));
console.log("3. safeParse:", r.success ? "ok" : "\n" + z.prettifyError(r.error));
await mock.close();
