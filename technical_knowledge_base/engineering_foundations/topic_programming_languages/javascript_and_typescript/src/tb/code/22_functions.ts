function complete(prompt: string, maxTokens = 256, stop?: string): string {
  return `${prompt} [max ${maxTokens}${stop ? `, stop ${stop}` : ""}]`;
}
function sum(...xs: number[]): number { return xs.reduce((a, b) => a + b, 0); }
type Scorer = (text: string) => number;          // a function type
const byLength: Scorer = t => t.length;          // t is inferred as string
function log(msg: string): void { console.log(msg); }
log(complete("hi"));
log(complete("hi", 10, "\n").replace("\n", "\\n"));
log(String(sum(1, 2, 3)) + " " + byLength("four"));
