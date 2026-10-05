type Chunk = { delta: string };
async function* fakeStream(text: string): AsyncGenerator<Chunk> {
  for (const w of text.split(" ")) { await new Promise(r => setTimeout(r, 5)); yield { delta: w + " " }; }
}
async function collect(stream: AsyncIterable<Chunk>): Promise<string> {
  let out = "";
  for await (const c of stream) out += c.delta;
  return out.trim();
}
async function main() {
  const text = await collect(fakeStream("tokens arrive one at a time"));
  console.log(text);
  try { JSON.parse("{oops"); }
  catch (e) {                                    // e: unknown (useUnknownInCatchVariables)
    console.log(e instanceof SyntaxError ? `SyntaxError: ${e.message}` : String(e));
  }
}
await main();
