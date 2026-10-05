// cfg: {"erasableSyntaxOnly": true}
// run: no
enum Role { User, Assistant }
class Point { constructor(public x: number) {} }
const Role2 = { User: "user", Assistant: "assistant" } as const;
type Role2 = (typeof Role2)[keyof typeof Role2];
const r: Role2 = "user";
console.log(Role.User, new Point(1).x, r);
