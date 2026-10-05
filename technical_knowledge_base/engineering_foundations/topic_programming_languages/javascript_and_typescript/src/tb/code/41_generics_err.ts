// run: no
function pluck<T, K extends keyof T>(rows: T[], key: K): T[K][] {
  return rows.map(r => r[key]);
}
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
const rows = [{ user: "ana", tokens: 12 }];
pluck(rows, "token");
longest(10, 20);
