// Prototype pollution: a naive deep merge of untrusted JSON can write to Object.prototype, changing EVERY object.
function merge(dst, src) {
  for (const k in src) {
    if (typeof src[k] === "object" && src[k] !== null) { dst[k] ??= {}; merge(dst[k], src[k]); }
    else dst[k] = src[k];
  }
  return dst;
}
const body = JSON.parse('{"theme": "dark", "__proto__": {"isAdmin": true}}');   // JSON.parse makes "__proto__" an ordinary key
merge({}, body);
const user = {};
console.log("a brand-new object says isAdmin =", user.isAdmin);
delete Object.prototype.isAdmin;
function safeMerge(dst, src) {                                      // fix: skip the dangerous keys (or merge into Object.create(null) / a Map)
  for (const k of Object.keys(src)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof src[k] === "object" && src[k] !== null) { dst[k] ??= {}; safeMerge(dst[k], src[k]); } else dst[k] = src[k];
  }
  return dst;
}
safeMerge({}, body);
console.log("after safeMerge, isAdmin =", ({}).isAdmin);
