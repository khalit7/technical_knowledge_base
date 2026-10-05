function describe(x: string | number | string[] | null) {
  if (x === null) return "nothing";             // x: null
  if (typeof x === "string") return x.toUpperCase(); // x: string
  if (typeof x === "number") return x.toFixed(1);    // x: number
  return x.join("+");                           // x: string[]
}
console.log(describe(null), describe("hi"), describe(2), describe(["a", "b"]));
