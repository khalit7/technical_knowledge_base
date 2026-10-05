function setKind(e: { kind: "text" | "image" }) { return e.kind; }
const ev = { kind: "text" };
console.log(setKind(ev));
