// cmd: tsc --target esnext --module nodenext --outDir js erase.ts && cat js/erase.js
interface Point { x: number; y: number }
function norm(p: Point): number {
  return Math.hypot(p.x, p.y);
}
console.log(norm({ x: 3, y: 4 }));
