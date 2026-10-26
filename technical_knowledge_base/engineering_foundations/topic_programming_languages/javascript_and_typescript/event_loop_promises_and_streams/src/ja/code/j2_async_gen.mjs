// async function* : an async generator (Python's async def with yield). Consume it with for await...of.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function* fakeModel(prompt) {
  try {
    for (const tok of ["The", " answer", " is", " 42", "."]) { await sleep(10); yield tok; }
  } finally {
    console.log("  (generator cleanup: close the HTTP connection here)");   // runs on break, return or throw too
  }
}
let text = "";
for await (const tok of fakeModel("q")) { text += tok; console.log("  token", JSON.stringify(tok)); }
console.log("full text:", JSON.stringify(text));
for await (const tok of fakeModel("q")) { if (tok === " is") break; }       // stop early, e.g. the user pressed Stop
console.log("stopped early; Array.fromAsync collects a whole stream:", await Array.fromAsync(fakeModel("q")));
