function first<T>(xs: T[]): T | undefined { return xs[0]; }
function pluck<T, K extends keyof T>(rows: T[], key: K): T[K][] {
  return rows.map(r => r[key]);
}
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
interface Page<T> { items: T[]; next: string | null }   // a generic type
const rows = [{ user: "ana", tokens: 12 }, { user: "bo", tokens: 7 }];
const page: Page<string> = { items: ["a"], next: null };
console.log(first([3, 1]), pluck(rows, "tokens"), longest("ab", "abc"), longest([1], [2, 3]), page.items);
