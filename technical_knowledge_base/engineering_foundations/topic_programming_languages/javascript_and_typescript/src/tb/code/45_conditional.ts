// run: no
type ElementOf<T> = T extends (infer E)[] ? E : T;          // infer pulls a type out
type Unwrap<T> = T extends Promise<infer V> ? Unwrap<V> : T; // recursive
type ToArray<T> = T extends unknown ? T[] : never;          // distributes over a union
type ToArrayNoDist<T> = [T] extends [unknown] ? T[] : never;  // brackets switch it off
type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;
declare const a: ElementOf<string[]>;           a satisfies never;
declare const b: Unwrap<Promise<Promise<number>>>; b satisfies never;
declare const c: ToArray<string | number>;      c satisfies never;
declare const d: ToArrayNoDist<string | number>; d satisfies never;
declare const e: FirstArg<(url: URL, retries: number) => void>; e satisfies never;
