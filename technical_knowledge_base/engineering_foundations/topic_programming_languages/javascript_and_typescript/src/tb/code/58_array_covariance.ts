// run: always
class Animal { name = "animal" }
class Dog extends Animal { bark() { return "woof"; } }
const dogs: Dog[] = [new Dog()];
const animals: Animal[] = dogs;              // accepted: arrays are covariant
animals.push(new Animal());                  // a plain Animal enters dogs
console.log(dogs.map(d => d.bark()));
