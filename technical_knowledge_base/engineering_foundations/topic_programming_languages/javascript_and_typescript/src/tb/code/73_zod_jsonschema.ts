import { z } from "zod";
const Weather = z.object({
  city: z.string().describe("City name, e.g. Paris"),
  unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
});
// One schema: the static type, the run-time check, and the JSON Schema you send to the model as a tool definition.
console.log(JSON.stringify(z.toJSONSchema(Weather), null, 1));
// The input side: what a caller (or a model) may send, where a field with a default is optional.
console.log(JSON.stringify(z.toJSONSchema(Weather, { io: "input" }).required));
