// Evaluation hooks: log one JSON line per model call, then score the agent on fixed cases with checks written in code.
import Anthropic from "@anthropic-ai/sdk";
import { appendFileSync, writeFileSync } from "node:fs";
import { startMock } from "./mock_model.ts";
import { startProfileService } from "./tools.ts";
import { runAgent } from "./c1_agent_loop.ts";

process.chdir(new URL(".", import.meta.url).pathname);
const LOG = "calls.jsonl"; writeFileSync(LOG, "");
const mock = await startMock();
// The hook: a fetch wrapper sees every HTTP call the SDK makes, retries included, without touching the agent's code.
const client = new Anthropic({ baseURL: mock.url, apiKey: "mock-key", fetch: async (url, init) => {
  const t0 = performance.now(); const res = await fetch(url, init);
  const body = await res.clone().json(); const req = JSON.parse(String(init?.body));
  appendFileSync(LOG, JSON.stringify({ scenario: new Headers(init?.headers).get("x-mock-scenario"), status: res.status,
    ms: Math.round(performance.now() - t0), messages: req.messages.length, stop: body.stop_reason, in: body.usage?.input_tokens, out: body.usage?.output_tokens }) + "\n");
  return res;
} });

const cases = [
  { scenario: "happy",   expect: ["u0029", "39.8%", "research"] },
  { scenario: "typo",    expect: ["u0029", "39.8%"] },
  { scenario: "timeout", expect: ["u0029", "39.8%", "timed out"] },
  { scenario: "runaway", expect: ["39.8%"] },
];
console.log("case      result  steps  in+out tokens  cost(US$)  failed checks");
for (const c of cases) {
  const prof = await startProfileService(c.scenario === "timeout" ? 2000 : 20);
  const r = await runAgent(client, c.scenario, { profileUrl: prof.url, maxSteps: 5 });
  await prof.close();
  const failed = c.expect.filter(e => !(r.answer ?? "").includes(e));
  if (r.steps.length > 3) failed.push("steps <= 3");
  console.log(`${c.scenario.padEnd(9)} ${failed.length ? "FAIL" : "pass"}    ${String(r.steps.length).padStart(3)}  ${String(r.tot.in + r.tot.out).padStart(13)}  ${r.tot.usd.toFixed(5).padStart(9)}  ${failed.join(", ") || "-"}`);
}
await mock.close();
console.log(`\n${LOG}, first 3 of the logged calls:`);
console.log((await import("node:fs")).readFileSync(LOG, "utf8").split("\n").slice(0, 3).join("\n"));
