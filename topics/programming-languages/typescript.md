# TypeScript: zero to expert

⏱ 17 min read · +34h 45m resources

TypeScript is a **type layer over JavaScript, erased at compile time**. Nothing here changes runtime behaviour. Do [JavaScript: zero to expert](javascript.md) Stages 1 and 2 first, or you will attribute JavaScript problems to the type system.

The one framing that makes the language click: TypeScript's type system is a **separate, Turing-complete language that runs at compile time** and describes the shape of values. Learning it well means learning to program in that second language.

### Best resources (1 min)

- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) (docs, ~4h): official, and better than its reputation. Read "Everyday Types", "Narrowing", and "Type Manipulation" in order.
- [Type Challenges](https://github.com/type-challenges/type-challenges) (exercises, ~15h to work through the easy and medium sets): graded puzzles for the type system itself. The single most effective Stage 3 exercise.
- **Total TypeScript** (Matt Pocock) free tutorials and his [Twitter/YouTube tips](https://www.totaltypescript.com/) (~6h for the free tutorials): the best modern intermediate-to-advanced material.
- [Effective TypeScript](https://effectivetypescript.com/) (book, ~8h): Vanderkam; item-per-idea, closest thing to a canon.
- [ts-reset](https://github.com/total-typescript/ts-reset) (repo, ~15 min for the README) and the [tsconfig reference](https://www.typescriptlang.org/tsconfig) (reference, ~1h) for configuration you will otherwise cargo-cult.
- [The TypeScript release notes](https://devblogs.microsoft.com/typescript/) (blog, ~30 min per release): version-by-version, short, and the fastest way to stay current.

### State of TypeScript (1 min)

**TypeScript 7.0 shipped on 2026-07-08**: the compiler and language service are now a native Go binary (Project Corsa), a port rather than a redesign, so type-checking semantics are unchanged. Microsoft reports full builds typically 8-12x faster; their headline benchmark took the VS Code codebase from 125.7s to 10.6s. Two consequences that matter in practice:

- **7.0 ships without a stable programmatic API** (expected in 7.1), so tooling that consumes the compiler API (typescript-eslint, Vue, Angular template checking, Svelte, Astro) lagged the release. Check your toolchain before upgrading.
- **7.0 hardens the 6.0 deprecations into errors and adopts strict defaults**, so it is a migration rather than a version bump.

### Stage 0: setup and mental model (1 min)

- `tsc --init`, then set `"strict": true` and never turn it off. Every option under `strict` exists because a class of bug was common enough to warrant it. Add `noUncheckedIndexedAccess` too; it is the one genuinely valuable option outside `strict`.
- Know your three execution paths: `tsc` for type-checking and emit, a bundler (esbuild, Vite, tsup) or `tsx` for running, and Node 24+ type stripping or Bun/Deno for running `.ts` directly. Type stripping does **not** type-check; keep `tsc --noEmit` in CI.
- Mental model: **types are erased**. There is no runtime type information, `instanceof` works only on classes, and validating external data is your job.
**Gate**: you can set up a project that type-checks in CI and runs without a build step in development.

### Package management (read now, revisit at Stage 2) (3 min)

TypeScript uses the JavaScript ecosystem's package managers unchanged (npm, Yarn, pnpm, Bun: see [JavaScript: zero to expert](javascript.md) for what each one is and why it exists). What follows is only what differs once types are involved.

- **Install ****`typescript`**** as a devDependency, never globally.** The compiler version is part of your build, and a global install means your machine and CI disagree about what compiles. `npx tsc` runs the local one.
- **Pin the TypeScript version tightly.** TypeScript does not follow semver in the usual sense: a minor release can introduce new errors in code that previously compiled, because better inference finds real bugs. Use a tilde range such as `~7.0` rather than a caret, and treat a TypeScript upgrade as a task with its own pull request.
- **`@types/*`**** packages come from DefinitelyTyped**, a single enormous community repository that publishes type declarations for libraries written in plain JavaScript. If a package ships its own types (most modern ones do, via a `types` or `exports` field), you need nothing; if not, `npm i -D @types/thatpackage`. A `@types` package version tracks the library's major and minor, not its patch.
- **`skipLibCheck: true`** stops the compiler type-checking every `.d.ts` in `node_modules`. Leave it on: without it, one badly typed transitive dependency fails your build for no benefit.
- **Publishing a typed package**: ship `.d.ts` files, point at them from `exports` (with separate `types` conditions for ESM and CJS if you publish both), and make sure you do not leak internal types into the public surface. Getting `exports` wrong is the most common reason consumers see `any` or a module-resolution error.
- **`peerDependencies`**** on ****`typescript`** is how compiler plugins and tools such as typescript-eslint express which versions they support. It is also why a major TypeScript release temporarily breaks parts of the toolchain, exactly as happened with 7.0 and its missing programmatic API.
- **Type-only dependencies**: `import type` is erased entirely, and `verbatimModuleSyntax` makes that explicit so bundlers do not keep a runtime import you never wanted.

### Stage 1: foundations (2 min)

- Annotating variables, parameters, and return types; when to let inference do the work (usually: annotate parameters and public return types, infer the rest).
- Primitives, arrays, tuples, `object`, literal types, unions and intersections.
- `any` versus `unknown` versus `never`: `any` disables checking and spreads silently, `unknown` forces narrowing, `never` means unreachable. Ban `any` in review.
- `interface` versus `type` (interfaces merge and extend, type aliases can express unions and mapped types; pick one convention and move on).
- Optional and readonly properties, index signatures, `Record<K, V>`.
- Functions: overloads, optional parameters, `this` typing, and why arrow properties avoid `this` problems.
- Enums (prefer union of string literals or `as const` objects) and why `const enum` is discouraged.
- Structural typing: compatibility is by shape, not by name. This is the deepest difference from Java or C#.
What to build: port a small JavaScript project of yours to strict TypeScript with zero `any`.

**Gate**: you can explain why a function accepting `{a: number}` accepts an object with extra properties from a variable but not from an object literal (excess property checking).

### Stage 2: working proficiency (3 min)

- **Narrowing**, which is where TypeScript's value actually lives: `typeof`, `instanceof`, `in`, truthiness, equality, discriminated unions with a literal `kind` field, exhaustiveness checking with `never` in the `default` branch.
- **User-defined type guards**: `x is Foo`, and `asserts x is Foo`. Prefer `satisfies` over `as` for checking an object against a type without widening it.
- Generics: type parameters on functions, classes, and types; constraints with `extends`; defaults; and the rule that a generic parameter used only once is usually not doing anything.
- Utility types and what they do: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`.
- Async typing: `Promise<T>`, `Awaited<T>`, typing an async iterator, and the fact that `catch` gives you `unknown`.
- Modules and declaration files: `.d.ts`, `declare module`, `@types/*` from DefinitelyTyped, and `skipLibCheck` (leave it on).
- **Validating the boundary**: TypeScript cannot check data arriving from a network, file, or environment variable. Use zod (or valibot, or arktype) at every input boundary and infer the static type from the schema, so runtime and compile-time agree by construction.
- tsconfig options that actually matter: `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "bundler"` or `"nodenext"`, `target`, `isolatedModules`, `verbatimModuleSyntax`.
What to build: a typed API client where the response types are inferred from zod schemas and the whole surface is `any`-free.

**Gate**: you can model a state machine as a discriminated union such that an invalid state does not compile, and get exhaustiveness errors when a case is added.

### Stage 3: advanced (3 min)

This is programming in the type language.

- **Conditional types**: `T extends U ? X : Y`, `infer` for destructuring types, and distributivity over unions (and how to switch it off with `[T] extends [U]`).
- **Mapped types**: `{ [K in keyof T]: ... }`, key remapping with `as`, modifiers `+`/`-` on `readonly` and `?`.
- **Template literal types**: building string types, and combining them with mapped types to derive event-handler or route types from data.
- Recursive types and the depth limits; tuple manipulation as a type-level list.
- **Variance**: covariance and contravariance in parameter and return positions, `strictFunctionTypes`, method-versus-property declaration differences, and why arrays are unsoundly covariant.
- Deliberate unsoundness: know the escape hatches TypeScript chose on purpose (bivariant method parameters, `any`, type assertions, index signature access) so you can predict where the type system will not save you.
- Branded and nominal types (`type UserId = string & { __brand: "UserId" }`) when structural typing is too permissive.
- Declaration merging, module augmentation, and typing a library you do not control.
- **Compile-time performance**: type instantiation depth, why a clever recursive type can make the editor unusable, `tsc --generateTrace` for diagnosis, and project references for large repos.
What to build: solve Type Challenges through medium, then write a typed event emitter where handler signatures are derived from a single event-map type.

**Gate**: you can write a type that transforms one object shape into another (keys and value types both), and explain why it distributes the way it does.

### Stage 4: expert (2 min)

- **Read the compiler's behaviour**: the checker's assignability rules, why an error message says what it says, and how to reduce a confusing error to a minimal reproduction. Understanding `tsc --explainFiles` and trace output is part of this.
- **Author declaration files for the ecosystem**: contribute to DefinitelyTyped, or ship a library with correct `exports`, dual ESM/CJS types, and no leaked internal types.
- **Design APIs that make illegal states unrepresentable** without becoming unreadable. The expert judgement is knowing when to stop: a type that takes ten minutes to understand is worse than a runtime check plus a comment.
- **Track the language**: release notes each version, and the TypeScript issue tracker for design discussions. Know what will not be added (nominal typing, exact types, full runtime reflection) and why.
- **Understand the 7.0 port**: what changed (implementation language, performance, API availability), what did not (semantics), and the migration matrix for API-consuming tooling.
**Gate**: you can take a confusing type error in unfamiliar code, reduce it to a minimal case, and explain it from assignability rules rather than by trial and error.

### Traps that catch experienced people (1 min)

- `as` used to silence an error rather than to assert a genuinely known fact; it is a lie the compiler believes.
- Trusting `JSON.parse`, `process.env`, or an API response to match its declared type without validating.
- `any` leaking through a dependency's types and disabling checks far away from where it entered.
- Non-null assertion `!` in a codebase where it is sometimes wrong.
- Array index access assumed to be defined without `noUncheckedIndexedAccess`.
- Enums in library public APIs (they are nominal and awkward across module boundaries).
- Type-level cleverness that compiles slowly and cannot be maintained by anyone else.
- Assuming types affect runtime; they never do.

### Cross-links (1 min)

- The runtime underneath: [JavaScript: zero to expert](javascript.md)
- Harnesses and MCP servers written in TypeScript: [Topic: agentic-harnesses](../agentic-harnesses/summary.md), [Model Context Protocol (MCP)](../protocols/mcp.md)
