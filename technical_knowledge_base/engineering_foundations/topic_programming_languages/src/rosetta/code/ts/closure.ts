// Task: closures. A tally that remembers state, and loop capture.
function makeTally(): (user: string, n: number) => number {
  const counts = new Map<string, number>(); // captured by reference, lives on with the closure
  return (user, n) => {
    const v = (counts.get(user) ?? 0) + n;
    counts.set(user, v);
    return v;
  };
}

const add = makeTally();
add("u0029", 5);
console.log(add("u0029", 7), add("u0005", 3));

const withLet: Array<() => number> = [];
for (let i = 0; i < 3; i++) withLet.push(() => i); // `let`: a fresh i per iteration
const withVar: Array<() => number> = [];
for (var j = 0; j < 3; j++) withVar.push(() => j); // `var`: one j for the whole loop
console.log(withLet.map((f) => f()), withVar.map((f) => f()));
