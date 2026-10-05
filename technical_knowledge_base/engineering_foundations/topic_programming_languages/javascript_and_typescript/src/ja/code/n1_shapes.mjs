// Run with: node --allow-natives-syntax n1_shapes.mjs  (the % functions are V8 internals, for learning only)
// V8 gives every object a hidden class ("map"): its property names in insertion order. Same order, same map.
const a = { x: 1, y: 2 }, b = { x: 5, y: 6 }, c = { y: 2, x: 1 };
console.log("a and b share a hidden class:", %HaveSameMap(a, b));
console.log("a and c (same keys, other order):", %HaveSameMap(a, c));
const d = { x: 1, y: 2 }; d.z = 3;
console.log("a and d after adding z:", %HaveSameMap(a, d));
const e = { x: 1, y: 2, z: 3 }; delete e.z;
console.log("after delete, e is in dictionary mode:", !%HasFastProperties(e));
