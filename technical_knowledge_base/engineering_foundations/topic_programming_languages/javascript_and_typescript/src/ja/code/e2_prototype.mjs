// Under the class syntax: every object has a prototype; a missing property is looked up along the chain.
class Animal { speak() { return `${this.name} makes a sound`; } }
class Dog extends Animal { speak() { return `${this.name} barks`; } }
const d = new Dog(); d.name = "Rex";
console.log(Object.getPrototypeOf(d) === Dog.prototype, Object.getPrototypeOf(Dog.prototype) === Animal.prototype);
console.log(Object.hasOwn(d, "name"), Object.hasOwn(d, "speak"), "speak" in d);
const base = { greet() { return "hello from the prototype"; } };
const child = Object.create(base);              // an object whose prototype is base: no class needed
console.log(child.greet(), Object.keys(child));
Dog.prototype.speak = function () { return "patched at run time"; };   // monkey-patching works on every Dog
console.log(d.speak());
