// run: no
interface Msg { id: number; role: "user" | "assistant"; text: string; tokens?: number }
async function fetchMsg(id: number, verbose = false): Promise<Msg> { return { id, role: "user", text: "" }; }
type Show<T> = {} & { [K in keyof T]: T[K] };  // makes tsc print the members, not the alias name
declare const a: Show<Partial<Msg>>;                  a satisfies never;
declare const b: Show<Required<Msg>>;                 b satisfies never;
declare const c: Show<Readonly<Pick<Msg, "id" | "text">>>; c satisfies never;
declare const d: Show<Omit<Msg, "tokens" | "id">>;    d satisfies never;
declare const e: Show<Record<"user" | "assistant", number>>; e satisfies never;
declare const f: Exclude<Msg["role"], "assistant">;   f satisfies never;
declare const g: NonNullable<string | null | undefined>; g satisfies never;
declare const h: ReturnType<typeof fetchMsg>;         h satisfies never;
declare const i: Parameters<typeof fetchMsg>;         i satisfies never;
declare const j: Awaited<ReturnType<typeof fetchMsg>>; j satisfies never;
