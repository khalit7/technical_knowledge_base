type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };
function area(s: Shape) {
  if (s.kind === "circle") return Math.PI * s.r ** 2;
  return s.r * s.r;
}
console.log(area({ kind: "square", side: 2 }));
