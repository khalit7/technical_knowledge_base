import { z } from "zod";
const Answer = z.object({ city: z.string(), population: z.number().int().positive() });
type Answer = z.infer<typeof Answer>;

// Models often wrap JSON in a Markdown fence or add a sentence around it.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced?.[1] ?? text).trim();
}
type Result = { ok: true; value: Answer } | { ok: false; error: string };
function parseAnswer(text: string): Result {
  let data: unknown;
  try { data = JSON.parse(extractJson(text)); }
  catch (e) { return { ok: false, error: `not JSON: ${(e as Error).message}` }; }
  const r = Answer.safeParse(data);
  return r.success ? { ok: true, value: r.data }
                   : { ok: false, error: r.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
const replies = [
  '{"city": "Paris", "population": 2100000}',
  'Sure! ```json\n{"city": "Paris", "population": 2100000}\n```',
  '{"city": "Paris", "population": "2.1 million"}',
  '{"city": "Paris"}',
  '{"city": "Paris", "population": 2100000',
];
for (const t of replies) console.log(JSON.stringify(parseAnswer(t)));
