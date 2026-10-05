function setKind(e: { kind: "text" | "image" }) { return e.kind; }
const ev = { kind: "text" } as const;
console.log(setKind(ev));
