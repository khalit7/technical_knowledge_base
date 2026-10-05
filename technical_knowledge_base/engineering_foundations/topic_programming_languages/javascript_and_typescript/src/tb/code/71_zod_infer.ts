// run: no
import { z } from "zod";
const ToolCall = z.object({
  tool: z.enum(["search", "calculator"]),
  args: z.object({ query: z.string() }),
  confidence: z.number().optional(),
});
type Show<T> = {} & { [K in keyof T]: T[K] };
declare const t: Show<z.infer<typeof ToolCall>>; t satisfies never;
