type Cat = { meow(): string };
type Dog = { bark(): string };
function isCat(a: Cat | Dog): a is Cat { return "meow" in a; }   // a type predicate
function assertString(v: unknown, what: string): asserts v is string {
  if (typeof v !== "string") throw new TypeError(`${what} must be a string, got ${typeof v}`);
}
const pets: (Cat | Dog)[] = [{ meow: () => "meow" }, { bark: () => "woof" }];
console.log(pets.map(p => (isCat(p) ? p.meow() : p.bark())).join(" "));
const cats = pets.filter(isCat);       // Cat[]
console.log(cats.length);
const raw: unknown = JSON.parse('{"key": 42}').key;
try { assertString(raw, "key"); console.log(raw.toUpperCase()); }
catch (e) { console.log(e instanceof Error ? e.message : e); }
