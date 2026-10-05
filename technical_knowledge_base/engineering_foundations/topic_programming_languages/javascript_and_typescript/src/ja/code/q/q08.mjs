// Two async functions interleave at each await
async function a() { console.log("a1"); await null; console.log("a2"); await null; console.log("a3"); }
async function b() { console.log("b1"); await null; console.log("b2"); }
a(); b(); console.log("main");
