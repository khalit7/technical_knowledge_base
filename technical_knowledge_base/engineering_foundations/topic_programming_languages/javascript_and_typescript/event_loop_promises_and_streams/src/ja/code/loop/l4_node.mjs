import fs from "node:fs";
fs.readFile(import.meta.filename, () => {
  setTimeout(() => console.log("setTimeout"), 0);
  setImmediate(() => console.log("setImmediate"));
  Promise.resolve().then(() => console.log("promise"));
  process.nextTick(() => console.log("nextTick"));
  console.log("I/O callback");
});
