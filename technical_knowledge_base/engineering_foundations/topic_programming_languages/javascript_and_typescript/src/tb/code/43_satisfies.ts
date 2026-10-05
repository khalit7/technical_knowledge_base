// run: no
type Route = { path: string; auth: boolean };
const a: Record<string, Route> = { home: { path: "/", auth: false } };
const b = { home: { path: "/", auth: false } } satisfies Record<string, Route>;
const c = { home: { path: "/", auth: "no" } } satisfies Record<string, Route>;
a.hom.path;      // annotation: any string key is allowed; the typo is only "possibly undefined"
b.hom.path;      // satisfies: checked, and the literal keys are kept
