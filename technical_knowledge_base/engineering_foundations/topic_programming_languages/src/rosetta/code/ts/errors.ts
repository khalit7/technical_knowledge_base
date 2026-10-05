// Task: report why each malformed line fails, then let one error escape.
import { readFileSync } from "node:fs";

interface Message { user: string; text: string }

class BadLine extends Error {}

// Like Python: the signature does not say this can throw.
function parse(line: string): Message {
  let rec: unknown;
  try {
    rec = JSON.parse(line);
  } catch (e) {
    throw new BadLine(`invalid JSON: ${(e as Error).message}`);
  }
  if (typeof rec !== "object" || rec === null) throw new BadLine("not a JSON object");
  const { user, text } = rec as Record<string, unknown>;
  if (typeof user !== "string" || typeof text !== "string")
    throw new BadLine(`user/text must be strings, got ${typeof user}/${typeof text}`);
  return { user, text };
}

const lines = readFileSync(process.argv[2] ?? "chat.jsonl", "utf8").split("\n");
lines.pop(); // the file ends with a newline: drop the empty last piece
lines.forEach((line, i) => {
  try {
    parse(line);
  } catch (e) {
    if (e instanceof BadLine) console.log(`line ${i + 1}: ${e.message}`);
    else throw e;
  }
});
console.log("now without try/catch:");
parse("not json at all");
