// s8_ts: the s1_wire agent in TypeScript (@anthropic-ai/claude-agent-sdk): four tools as an in-process MCP
// server with zod schemas, a PreToolUse hook that allows read-only tools, canUseTool for the rest.
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const LOG = process.env.SDK_LOG, T0 = Date.now();
const rec = (o) => LOG && fs.appendFileSync(LOG, JSON.stringify({ _t: (Date.now() - T0) / 1000, ...o }) + "\n");
const text = (s) => ({ content: [{ type: "text", text: s }] });

function listFiles(dir = ".") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("__")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p)); else if (!p.endsWith(".pyc")) out.push(p);
  }
  return out.sort();
}
const repo = createSdkMcpServer({ name: "repo", tools: [
  tool("list_files", "List every file in the repository.", {}, async () => text(listFiles().join("\n"))),
  tool("read_file", "Return the text of one file.", { path: z.string() },
       async ({ path: p }) => { try { return text(fs.readFileSync(p, "utf8").slice(0, 20000)); } catch (e) { return text("error: " + e.message); } }),
  tool("edit_file", "Replace the exact text old with new in a file; old must occur exactly once.",
       { path: z.string(), old: z.string(), new: z.string() },
       async (a) => { let t; try { t = fs.readFileSync(a.path, "utf8"); } catch (e) { return text("error: " + e.message); }
         const n = t.split(a.old).length - 1;
         if (n !== 1) return text(`error: old text found ${n} times in ${a.path}; it must match exactly once`);
         fs.writeFileSync(a.path, t.replace(a.old, () => a.new)); return text("edited " + a.path); }),
  tool("run_tests", "Run the test suite and return its output.", {},
       async () => { let out, code = 0;
         try { out = execFileSync("python3", ["tests/test_core.py"], { encoding: "utf8", stdio: "pipe" }); }
         catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status; }
         return text(out.slice(-4000) + `\nexit code ${code}`); }),
]});

const READ_ONLY = new Set(["mcp__repo__list_files", "mcp__repo__read_file"]);
const SYSTEM = "You are a coding agent working in a small Python repository. Use the tools to look at files, edit code and run the tests. When the tests pass, reply with one sentence saying what you changed. Never use the em-dash character.";
const TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests.";

async function* prompt() { yield { type: "user", message: { role: "user", content: TASK }, parent_tool_use_id: null }; }

for await (const m of query({ prompt: prompt(), options: {
  model: process.argv[2] || "haiku", systemPrompt: SYSTEM, tools: [], mcpServers: { repo },
  hooks: { PreToolUse: [{ hooks: [async (input) => {
    rec({ _type: "callback", kind: "hook", event: "PreToolUse", tool: input.tool_name });
    return READ_ONLY.has(input.tool_name)
      ? { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: "read-only tool" } }
      : {};
  }] }] },
  canUseTool: async (name, input) => { rec({ _type: "callback", kind: "permission", tool: name, decision: "allow" });
                                      return { behavior: "allow", updatedInput: input }; },
  maxTurns: 20, settingSources: [], strictMcpConfig: true, persistSession: false,
}})) {
  rec({ _type: m.type, ...m });
  if (m.type === "result") console.log(m.subtype, m.total_cost_usd);
}
