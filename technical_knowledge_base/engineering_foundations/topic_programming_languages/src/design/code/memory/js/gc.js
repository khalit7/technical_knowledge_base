// cmd: node --expose-gc gc.js
let obj = { payload: new Array(1e6).fill(0) };
const ref = new WeakRef(obj);
obj = null;                     // drop the only strong reference
setTimeout(() => {
  globalThis.gc();              // force a full collection (normally V8 decides)
  console.log(ref.deref());     // undefined: the object was collected
}, 0);
