// A closure: a function that keeps the variables of the scope it was created in.
function makeCounter() {
  let n = 0;                                    // private: nothing outside can reach n
  return { inc: () => ++n, get: () => n };
}
const c1 = makeCounter(), c2 = makeCounter();
c1.inc(); c1.inc(); c2.inc();
console.log(c1.get(), c2.get());
const withVar = [], withLet = [];
for (var i = 0; i < 3; i++) withVar.push(() => i);   // one i shared by all three closures
for (let j = 0; j < 3; j++) withLet.push(() => j);   // a fresh j per iteration
console.log(withVar.map(f => f()), withLet.map(f => f()));
