// run: no
interface Options { model: string; temperature?: number }
function call(o: Options) { return o.model; }
call({ model: "m", temprature: 0.2 });   // typo in a fresh object literal: caught
const opts = { model: "m", temprature: 0.2 };
call(opts);                               // same typo through a variable: accepted
