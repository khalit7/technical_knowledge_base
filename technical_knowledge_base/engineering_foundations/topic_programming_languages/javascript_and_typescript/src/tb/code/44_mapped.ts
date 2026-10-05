// run: no
interface Msg { id: number; role: "user" | "assistant"; text: string }
type Show<T> = {} & { [K in keyof T]: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
declare const a: Show<Nullable<Msg>>; a satisfies never;
declare const b: Show<Getters<Msg>>;  b satisfies never;
declare const c: Show<Mutable<Readonly<Msg>>>; c satisfies never;
