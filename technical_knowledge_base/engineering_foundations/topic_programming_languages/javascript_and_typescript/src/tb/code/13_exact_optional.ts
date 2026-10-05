// run: no
interface Options { model: string; temperature?: number }
const a: Options = { model: "m" };
const b: Options = { model: "m", temperature: undefined };
console.log(a, b);
