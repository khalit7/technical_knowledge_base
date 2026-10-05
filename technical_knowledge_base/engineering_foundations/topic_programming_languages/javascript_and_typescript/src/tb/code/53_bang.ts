// run: always
const users = new Map<string, { name: string }>([["u1", { name: "Ana" }]]);
console.log(users.get("u1")!.name);
console.log(users.get("u2")!.name);               // ! says "trust me, not undefined"
