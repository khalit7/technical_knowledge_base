interface Options { model: string }
function call(o: Options) { return o.model; }
const opts = { model: "m", temprature: 0.2 };
console.log(call(opts));
