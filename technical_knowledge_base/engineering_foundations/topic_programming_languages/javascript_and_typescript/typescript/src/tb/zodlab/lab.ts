// LLM JSON lab: every sample reply through four ways of reading it. Run with node after tsc passes; prints JSON.
import { z } from "zod";

// ---- shared: find the JSON in a reply, and what the program does with the result
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  return a >= 0 && b > a ? text.slice(a, b + 1) : text.trim();
}
interface Answer { city: string; population: number }
function use(a: Answer): string {
  return `${a.city.toUpperCase()} has ${a.population.toLocaleString("en-US")} people`;
}

// ---- A: a cast. The type says Answer; nothing is checked.
function viaCast(text: string): string {
  const a = JSON.parse(extractJson(text)) as Answer;
  return use(a);
}

// ---- B: a zod object (unknown keys are dropped)
const AnswerB = z.object({ city: z.string(), population: z.number().int().positive() });
// ---- C: a strict zod object (unknown keys are an error)
const AnswerC = z.strictObject({ city: z.string(), population: z.number().int().positive() });
// ---- D: zod with coercion: "2100000" becomes 2100000
const AnswerD = z.object({ city: z.string(), population: z.coerce.number().int().positive() });

function viaSchema(schema: z.ZodType<Answer>, text: string): string {
  let data: unknown;
  try { data = JSON.parse(extractJson(text)); }
  catch (e) { return `rejected: not JSON (${(e as Error).message})`; }
  const r = schema.safeParse(data);
  if (!r.success) return "rejected: " + r.error.issues.map(i => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  return use(r.data);
}

const samples: [string, string][] = [
  ["clean", '{"city": "Paris", "population": 2100000}'],
  ["fenced", 'Here you go:\n```json\n{"city": "Paris", "population": 2100000}\n```'],
  ["prose around", 'Sure! The answer is {"city": "Paris", "population": 2100000}. Anything else?'],
  ["number as string", '{"city": "Paris", "population": "2100000"}'],
  ["words for a number", '{"city": "Paris", "population": "2.1 million"}'],
  ["missing field", '{"city": "Paris"}'],
  ["extra field", '{"city": "Paris", "population": 2100000, "country": "France"}'],
  ["null value", '{"city": null, "population": 2100000}'],
  ["cut off (max tokens)", '{"city": "Paris", "popul'],
  ["trailing comma", '{"city": "Paris", "population": 2100000,}'],
];
const ways: [string, (t: string) => string][] = [
  ["as", viaCast],
  ["zod", t => viaSchema(AnswerB, t)],
  ["zod strict", t => viaSchema(AnswerC, t)],
  ["zod coerce", t => viaSchema(AnswerD, t)],
];
const rows = samples.map(([label, text]) => ({
  label, text,
  cells: ways.map(([w, f]) => {
    try { return { way: w, out: f(text) }; }
    catch (e) { return { way: w, out: `${(e as Error).name}: ${(e as Error).message}`, threw: true }; }
  }),
}));
console.log(JSON.stringify(rows));
