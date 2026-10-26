function parse(x: string): number;
function parse(x: string[]): number[];
function parse(x: string | string[]): number | number[] {
  return Array.isArray(x) ? x.map(Number) : Number(x);
}
const one = parse("3");        // number
const many = parse(["1", "2"]); // number[]
console.log(one + 1, many.length);
