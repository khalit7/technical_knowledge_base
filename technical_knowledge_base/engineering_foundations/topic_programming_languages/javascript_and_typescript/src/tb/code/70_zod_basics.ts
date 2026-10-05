import { z } from "zod";
const ToolCall = z.object({
  tool: z.enum(["search", "calculator"]),
  args: z.object({ query: z.string().min(1) }),
  confidence: z.number().min(0).max(1),
});
type ToolCall = z.infer<typeof ToolCall>;      // the static type, derived from the schema

const good: ToolCall = ToolCall.parse({ tool: "search", args: { query: "tsc 7" }, confidence: 0.9 });
console.log(good.args.query);

const r = ToolCall.safeParse({ tool: "browse", args: { query: "" }, confidence: "high" });
if (!r.success) console.log(z.prettifyError(r.error));
