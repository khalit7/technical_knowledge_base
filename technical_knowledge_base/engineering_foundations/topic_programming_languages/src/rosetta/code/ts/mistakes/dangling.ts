const top: Array<[string, number]> = [["u0029", 9491], ["u0005", 4816]];
const first = top[0]!; // a reference to the inner array object
for (let i = 0; i < 1000; i++) top.push([`x${i}`, i]);
console.log(first, top.length); // fine: garbage collection keeps it alive
