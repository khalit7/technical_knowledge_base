// run: no
type Provider = "anthropic" | "openai";
type Size = "small" | "large";
type ModelId = `${Provider}/${Size}`;                 // every combination
type EventName<T extends string> = `on${Capitalize<T>}`;
type Route = "/users/:id/messages/:msgId";
type Params<R> = R extends `${string}:${infer P}/${infer Rest}` ? P | Params<`/${Rest}`>
               : R extends `${string}:${infer P}` ? P : never;
declare const a: ModelId;                 a satisfies never;
declare const b: EventName<"delta" | "done">; b satisfies never;
declare const c: Params<Route>;           c satisfies never;
const ok: ModelId = "openai/small";
const bad: ModelId = "openai/medium";
