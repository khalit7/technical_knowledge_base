// run: no
async function save(x: string): Promise<number> { return x.length; }
async function main() {
  const n = save("a");          // forgot await
  console.log(n + 1);
  if (save("b")) console.log("always true");
  save("c");                    // a floating promise: tsc says nothing
}
