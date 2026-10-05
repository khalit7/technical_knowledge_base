// run: always
interface Named { name: string }
class Dog { name = "Rex"; bark() {} }
const n: Named = new Dog();          // structural: Dog has a name, so it fits

const xs: string[] = ["a"];
const ys: (string | number)[] = xs;  // accepted: arrays are treated as covariant
ys.push(42);                         // xs now holds a number
console.log(n.name, xs[1].toUpperCase()); // the checker said string
