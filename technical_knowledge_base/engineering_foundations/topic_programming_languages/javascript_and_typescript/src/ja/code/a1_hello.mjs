// hello.mjs: run with  node hello.mjs  (.mjs means "an ES module"; section 6)
const name = "Khalid";                  // const: this name is never rebound
let count = 3;                          // let: a variable you may reassign
count = count + 1;
console.log(`hello ${name}, count is ${count}`);   // backticks: a template string, like an f-string
console.log("typeof count:", typeof count, " typeof name:", typeof name);
console.log("runtime:", process.version, "on", process.platform, process.arch);
