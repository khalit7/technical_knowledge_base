// run: no
const a: any = JSON.parse('{"n": 1}');
a.foo.bar();                 // any: every operation is allowed
const b: unknown = JSON.parse('{"n": 1}');
b.foo;                       // unknown: nothing is allowed until you narrow
if (typeof b === "object" && b !== null && "n" in b && typeof b.n === "number") {
  console.log(b.n + 1);      // narrowed: fine
}
function fail(msg: string): never { throw new Error(msg); }
const x: string = fail("never returns");   // never fits everywhere
