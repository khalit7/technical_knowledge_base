// run: no
type Point = { readonly x: number; y: number };
const p: Point = { x: 0, y: 1 };
p.x = 5;
const xs: readonly number[] = [1, 2];
xs.push(3);
