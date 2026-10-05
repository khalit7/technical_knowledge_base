class Dog { speak() { return "woof"; } }
const robot = { speak() { return "beep"; } };      // no class needed
for (const x of [new Dog(), robot]) console.log(x.speak());
console.log(typeof Dog, Object.getPrototypeOf(new Dog()) === Dog.prototype);
// a class is a function plus a prototype object that instances look methods up in
