// A promise executor runs at once
console.log("before");
const p = new Promise(resolve => { console.log("inside executor"); resolve("value"); console.log("still inside"); });
p.then(v => console.log("then:", v));
console.log("after");
