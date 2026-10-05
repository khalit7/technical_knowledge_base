// Destructuring and spread: Python's unpacking, *args and **kwargs, for arrays and objects.
const [first, second = "default", ...rest] = [1, undefined, 3, 4];
console.log(first, second, rest);
const { role, text: body, meta = {}, ...others } = { role: "user", text: "hi", ts: 17, id: 9 };
console.log(role, body, meta, others);
const base = { model: "small", temperature: 0.7 };
const req = { ...base, temperature: 0, stream: true };      // later keys win, like {**base, "temperature": 0}
console.log(req, [...[1, 2], ...[3]]);
function call({ model, max_tokens = 256 } = {}) { return `${model} ${max_tokens}`; }   // keyword-style arguments
console.log(call({ model: "big" }), call());
let a = 1, b = 2; [a, b] = [b, a]; console.log(a, b);
