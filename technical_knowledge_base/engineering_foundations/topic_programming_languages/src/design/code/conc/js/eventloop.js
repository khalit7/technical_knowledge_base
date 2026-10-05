setTimeout(() => console.log("4 timer"), 0);
Promise.resolve().then(() => console.log("3 microtask"));
console.log("1 sync");
const t = Date.now();
while (Date.now() - t < 50) {}         // one thread: this blocks everything
console.log("2 still sync, 50 ms later");
