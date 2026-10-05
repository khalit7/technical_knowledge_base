import { z } from "zod";
const Loose = z.object({ id: z.number() });                 // unknown keys are dropped
const Strict = z.strictObject({ id: z.number() });          // unknown keys are an error
const Coerced = z.object({ id: z.coerce.number() });        // "7" becomes 7
const Clean = z.object({ tags: z.string().transform(s => s.split(",").map(t => t.trim())) });
const input = { id: "7", extra: true };
console.log(Loose.safeParse({ id: 7, extra: true }).data);
console.log(Strict.safeParse({ id: 7, extra: true }).error?.issues[0]?.message);
console.log(Coerced.parse(input));
console.log(Clean.parse({ tags: "ts, zod ,llm" }));
