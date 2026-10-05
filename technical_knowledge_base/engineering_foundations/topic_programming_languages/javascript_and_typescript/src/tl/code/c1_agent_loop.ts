// An agent loop written by hand: call the model, run the tools it asks for, send the results back, repeat.
// Guards: a step limit, a timeout per tool, input validation with zod, errors returned to the model, a cost meter.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { writeFileSync } from "node:fs";
import { startMock } from "./mock_model.ts";
import { CountArgs, ProfileArgs, countTokens, startProfileService, userProfile } from "./tools.ts";

const PRICE = { in: 2, out: 10 };   // US$ per million tokens, claude-sonnet-5-5 (Anthropic pricing page, 2026-10-05)
const TASK = "Who are the 3 heaviest users in chat.jsonl, and what share of all tokens do they have? Add the team of the top two.";

const schema = (s: z.ZodType) => { const { $schema, ...rest } = z.toJSONSchema(s) as any; return rest as Anthropic.Tool.InputSchema; };
const tools: Anthropic.Tool[] = [
  { name: "count_tokens", description: "Count word tokens per user in a JSONL chat log; returns totals and the top users.", input_schema: schema(CountArgs) },
  { name: "user_profile", description: "Look up a user's team.", input_schema: schema(ProfileArgs) },
];

export async function runAgent(client: Anthropic, scenario: string, opts: { maxSteps?: number; toolTimeoutMs?: number; profileUrl: string }) {
  const { maxSteps = 5, toolTimeoutMs = 500 } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: TASK }];
  const steps: any[] = []; const tot = { in: 0, out: 0, usd: 0 };

  type Result = Anthropic.ToolResultBlockParam & { ms: number };
  async function runTool(call: Anthropic.ToolUseBlock): Promise<Result> {
    const t0 = performance.now();
    const done = (content: string, is_error = false): Result =>
      ({ type: "tool_result" as const, tool_use_id: call.id, content, ...(is_error ? { is_error } : {}), ms: Math.round(performance.now() - t0) });
    try {
      const signal = AbortSignal.timeout(toolTimeoutMs);             // every tool gets a deadline
      if (call.name === "count_tokens") {
        const args = CountArgs.safeParse(call.input);                 // the model's JSON is untrusted input
        if (!args.success) return done(`invalid input: ${z.prettifyError(args.error)}`, true);
        return done(JSON.stringify(await countTokens(args.data)));
      }
      if (call.name === "user_profile") {
        const args = ProfileArgs.safeParse(call.input);
        if (!args.success) return done(`invalid input: ${z.prettifyError(args.error)}`, true);
        return done(await userProfile(opts.profileUrl, args.data, signal));
      }
      return done(`unknown tool ${call.name}`, true);
    } catch (e: any) {                                                  // errors go back to the model, not up the stack
      const why = e.name === "TimeoutError" ? `timed out after ${toolTimeoutMs} ms` : e.code === "ENOENT" ? `cannot open ${(call.input as any).path}: ENOENT` : String(e);
      return done(why, true);
    }
  }

  for (let step = 1; step <= maxSteps; step++) {
    const msg = await client.messages.create({ model: "claude-sonnet-5-5", max_tokens: 2048, tools, messages },
      { headers: { "x-mock-scenario": scenario } });
    tot.in += msg.usage.input_tokens; tot.out += msg.usage.output_tokens;
    tot.usd = (tot.in * PRICE.in + tot.out * PRICE.out) / 1e6;
    messages.push({ role: "assistant", content: msg.content });
    const calls = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const t0 = performance.now();
    const results = await Promise.all(calls.map(runTool));            // several calls in one turn run concurrently
    const wall = Math.round(performance.now() - t0);
    steps.push({ step, sent: messages.length - 1, content: msg.content, stop: msg.stop_reason, usage: msg.usage, results, wall, tot: { ...tot } });
    if (msg.stop_reason !== "tool_use") {
      const answer = msg.content.filter(b => b.type === "text").map(b => b.text).join(" ");
      return { scenario, outcome: "answered", answer, steps, tot, messages: messages.length };
    }
    messages.push({ role: "user", content: results.map(({ ms, ...r }) => r) });   // all results in ONE user message
  }
  return { scenario, outcome: `stopped: hit maxSteps=${maxSteps}`, answer: null, steps, tot, messages: messages.length };
}

if (import.meta.main) {
  process.chdir(new URL(".", import.meta.url).pathname);            // chat.jsonl sits next to this file
  const mock = await startMock();
  const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key" });
  const all: any[] = [];
  for (const scenario of ["happy", "typo", "timeout", "runaway"]) {
    const prof = await startProfileService(scenario === "timeout" ? 2000 : 20);
    const r = await runAgent(client, scenario, { profileUrl: prof.url });
    await prof.close(); all.push(r);
    console.log(`\n=== ${scenario}: ${r.outcome} after ${r.steps.length} model calls, ${r.messages} messages, ` +
      `mock tokens in ${r.tot.in} out ${r.tot.out}, cost at Sonnet 5.5 prices $${r.tot.usd.toFixed(5)}`);
    for (const s of r.steps) {
      const said = s.content.map((b: any) => b.type === "text" ? JSON.stringify(b.text) : `${b.name}(${JSON.stringify(b.input)})`).join(" + ");
      console.log(` step ${s.step} [${s.stop}] ${said}`);
      for (const x of s.results) console.log(`    -> ${x.is_error ? "ERROR " : ""}${x.content.length > 110 ? x.content.slice(0, 107) + "..." : x.content}`);
    }
    if (r.answer) console.log(" answer:", r.answer);
  }
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify({ task: TASK, price: PRICE, tools, runs: all }));
  await mock.close();
}
