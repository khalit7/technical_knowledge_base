// cfg: {"noEmit": null, "allowImportingTsExtensions": null, "declaration": true, "emitDeclarationOnly": true, "outDir": "out"}
// check: no
// cmd: npx tsc --pretty false && cat out/infer.d.ts
export let model = "claude";          // let: widened to string
export const role = "user";           // const: the literal "user"
export const temps = [0, 0.7, 1];     // number[]
export const pair = ["ana", 3];       // (string | number)[], not a tuple
export const fixed = ["ana", 3] as const;  // readonly tuple of literals
export const msg = { role: "user", text: "hi" };  // properties widen
export function avg(xs: number[]) {   // return type inferred
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}
export const lengths = ["a", "bb"].map(s => s.length);
