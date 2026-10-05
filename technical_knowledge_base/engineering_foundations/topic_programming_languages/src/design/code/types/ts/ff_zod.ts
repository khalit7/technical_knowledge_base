import { z } from "zod";
const Reply = z.object({ tool: z.string(), args: z.record(z.string(), z.number()) });
const raw = JSON.parse('{"tool": "search"}');       // an LLM forgot "args"
const claimed = raw as z.infer<typeof Reply>;        // a cast: accepted, unchecked
console.log(claimed.args);
const checked = Reply.safeParse(raw);                // a run-time check
console.log(checked.success, checked.error?.issues[0].message, checked.error?.issues[0].path);
