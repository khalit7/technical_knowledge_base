// run: always
type Cat = { meow(): string };
type Dog = { bark(): string };
function isCat(a: Cat | Dog): a is Cat { return true; }   // the predicate is not checked
const d: Cat | Dog = { bark: () => "woof" };
if (isCat(d)) console.log(d.meow());
