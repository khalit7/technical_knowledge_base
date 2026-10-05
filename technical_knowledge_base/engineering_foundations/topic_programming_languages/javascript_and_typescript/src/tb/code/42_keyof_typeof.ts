// run: no
const DEFAULTS = { model: "claude-x", temperature: 0.7, maxTokens: 1024 };
type Config = typeof DEFAULTS;            // a type read off a value
type Key = keyof Config;                  // the union of its keys
type Temp = Config["temperature"];        // indexed access
const MODELS = ["small", "medium", "large"] as const;
type Model = (typeof MODELS)[number];     // the union of the array's elements
type Show<T> = {} & { [K in keyof T]: T[K] };
declare const c: Show<Config>; c satisfies never;
declare const k: Key;   k satisfies never;
declare const t: Temp;  t satisfies never;
declare const m: Model; m satisfies never;
