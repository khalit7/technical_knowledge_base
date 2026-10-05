// let and const are block scoped; var is function scoped and hoisted. Never use var.
if (true) { var v = "var leaks"; let l = "let stays"; }
console.log(v);
try { console.log(l); } catch (e) { console.log(e.name + ": " + e.message); }
try { console.log(early); let early = 1; } catch (e) { console.log(e.name + ": " + e.message); }  // the "temporal dead zone"
const cfg = { debug: false };
cfg.debug = true;                               // const stops rebinding, not mutation
console.log(cfg);
try { cfg = {}; } catch (e) { console.log(e.name + ": " + e.message); }
console.log(Object.isFrozen(Object.freeze({ a: 1 })));
