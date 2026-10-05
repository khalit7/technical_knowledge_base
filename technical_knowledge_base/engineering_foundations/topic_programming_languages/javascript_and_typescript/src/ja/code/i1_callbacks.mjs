// Before promises: callbacks. The function returns at once; your callback runs later, from the event loop.
import { readFile } from "node:fs";
console.log("1. ask for the file");
readFile("i1_callbacks.mjs", "utf8", (err, text) => {        // Node's convention: error first, then the result
  if (err) return console.log("failed:", err.code);
  console.log("3. got", text.length, "characters");
  readFile("no_such_file.txt", "utf8", (err2) => {             // the next step nests inside: "callback hell"
    console.log("4. second read failed with", err2.code);
  });
});
console.log("2. readFile has already returned; nothing has been read yet");
