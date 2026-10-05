interface HasLength { length: number }
function size(x: HasLength) { return x.length; }
class Batch { length = 3; flush() {} }
console.log(size("abc"), size([1, 2]), size(new Batch()), size({ length: 7 }));
type UserId = string & { readonly __brand: "UserId" };   // a "brand": nominal on purpose
const asUserId = (s: string) => s as UserId;
function getUser(id: UserId) { return id; }
console.log(getUser(asUserId("u1")));
