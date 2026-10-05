// run: no
const n = "42" as number;                           // too far: tsc refuses
const m = "42" as unknown as number;                // the double cast always works
