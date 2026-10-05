// Two "nothing" values. undefined: "never set". null: "set to nothing on purpose". Python has only None.
let a;                                        // declared, never assigned
const obj = { x: 1 };
console.log(a, obj.y, [1, 2][5]);             // missing things are undefined, not errors
console.log(typeof undefined, typeof null);   // typeof null is "object": a bug kept since 1995 for compatibility
console.log(null == undefined, null === undefined);
function f(x) { return x; }
console.log(f(), f(null));                    // a missing argument is undefined, not a TypeError
console.log(obj.y ?? "default", 0 ?? "default", 0 || "default");  // ?? replaces only null/undefined; || replaces any falsy
const user = { profile: null };
console.log(user.profile?.name, user.settings?.theme?.dark);       // ?. stops at null/undefined
try { console.log(user.profile.name); } catch (e) { console.log(e.constructor.name + ": " + e.message); }
