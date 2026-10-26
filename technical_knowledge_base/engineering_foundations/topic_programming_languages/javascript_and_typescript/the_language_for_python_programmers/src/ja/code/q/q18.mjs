// Microtasks between timers
setTimeout(() => { console.log("t1"); Promise.resolve().then(() => console.log("t1 micro")); }, 0);
setTimeout(() => console.log("t2"), 0);
Promise.resolve().then(() => console.log("p1")).then(() => console.log("p2"));
