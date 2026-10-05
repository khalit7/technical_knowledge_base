// await inside forEach
const out = [];
[3, 1, 2].forEach(async n => { await new Promise(r => setTimeout(r, n * 10)); out.push(n); });
console.log("after forEach:", out);
setTimeout(() => console.log("50 ms later:", out), 50);
