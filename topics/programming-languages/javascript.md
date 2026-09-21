# JavaScript: zero to expert

⏱ 16 min read · +47h 30m resources

*Created 2026-08-31.* A zero-to-expert path for the language itself. TypeScript sits on top of this and has its own page; learn enough JavaScript to be dangerous before adding types, because every TypeScript bug that is not a type error is a JavaScript bug.

**Why this track matters for you specifically**: agent harnesses, MCP servers, dev tooling, and evaluation dashboards are overwhelmingly TS/JS. Claude Code, OpenCode, and most MCP reference implementations are TypeScript. You do not need front-end depth, but you do need the runtime model.

### Best resources (2 min)

- [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (reference, ~1h for the JS guide, then lookup): the reference. Better than any book for looking things up.
- [javascript.info](https://javascript.info/) (course, ~25h for the full course; individual chapters ~15 min): the best free structured course, modern and thorough.
- **You Don't Know JS Yet** (Simpson, free on GitHub) (books, ~8h for volumes 1 and 2): the deep-dive series on scope, closures, `this`, and types. Volumes 1 and 2 are the valuable ones.
- **Eloquent JavaScript** (Haverbeke, free online) (book, ~10h with the exercises) for the fundamentals with real exercises.
- [Jake Archibald, In the Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0) (video, ~35 min): the clearest explanation of the event loop, tasks, and microtasks that exists.
- [What the heck is the event loop anyway?](https://www.youtube.com/watch?v=8aGhZQkoFbQ) (video, ~27 min) (Philip Roberts) as the gentler first pass.
- [Node.js docs](https://nodejs.org/docs/latest/api/) (docs, ~2h for the core modules) and the [TC39 proposals repo](https://github.com/tc39/proposals) (repo, ~30 min to browse) for where the language is going.

### Stage 0: setup and mental model (1 min)

- Runtime first: install Node (24 is Active LTS as of Aug 2026; 26 is Current and becomes LTS in Oct 2026). Know that Bun and Deno exist and are compatible enough to matter; see the ecosystem section.
- The two mental models to hold from the start:
  1. **Single-threaded with an event loop.** Your code never runs concurrently with itself. Nothing blocks except what you make block, and blocking is a bug.
  2. **Objects are property bags with a prototype chain.** Classes are syntax over that, not a separate system.
- Use ES modules (`import`/`export`, `"type": "module"`), not CommonJS `require`, for anything new.
**Gate**: you can run a script, add a dependency, and explain why `console.log` after a `setTimeout(fn, 0)` prints first.

### Stage 1: foundations (2 min)

- Types: `number` (IEEE 754 double, so `0.1 + 0.2 !== 0.3` and integers are exact only to 2^53), `bigint`, `string`, `boolean`, `null`, `undefined`, `symbol`, and objects. `typeof null === "object"` is a permanent bug in the language.
- **Coercion**: `==` versus `===` (use `===` always), truthy/falsy values, `+` overloading between strings and numbers, `NaN !== NaN`. Learn the rules well enough to avoid them.
- Variables: `const` by default, `let` when reassigned, never `var`. Block scoping and the temporal dead zone.
- Functions: declarations versus expressions, arrow functions, default and rest parameters, spread.
- Objects and arrays: literals, destructuring with defaults and renaming, shorthand properties, optional chaining `?.`, nullish coalescing `??`.
- Arrays as the workhorse: `map`, `filter`, `reduce`, `find`, `some`, `every`, `flatMap`, and knowing which mutate (`sort`, `reverse`, `splice`) versus which return new arrays.
- Control flow, template literals, `for...of` versus `for...in` (the latter iterates keys and is almost never what you want).
- Errors: `throw`, `try/catch/finally`, `Error` subclasses, and the fact that you can throw anything (but should throw `Error`).
What to build: a CLI that reads JSON, transforms it, and writes output, using only Node built-ins.

**Gate**: you can predict the output of a snippet mixing `==`, truthiness, and array methods, and explain each step.

### Stage 2: working proficiency (4 min)

The theme is **closures, ****`this`****, and asynchrony**, which are the three things that separate people who write JavaScript from people who understand it.

- **Scope and closures**: lexical scope, closures capturing variables (not values), the classic loop-variable trap and why `let` fixes it, module pattern, and closures as the basis of nearly every callback API.
- **`this`**: determined by *call site*, not definition. The four binding rules (default, implicit via method call, explicit via `call`/`apply`/`bind`, `new`), and arrow functions capturing `this` lexically instead. Losing `this` by passing a method as a callback is the most common bug in the language.
- **Prototypes**: `__proto__` versus `prototype`, the lookup chain, `Object.create`, and how `class`, `extends`, and `super` desugar. Understand it once and framework magic stops being magic.
- **Asynchrony properly**:
  - Callbacks, then promises: states, `then`/`catch`/`finally`, chaining, and that a promise is eager (it starts when created).
  - `async`/`await` as syntax over promises; `await` in a loop serialises, `Promise.all` parallelises; `Promise.allSettled`, `race`, `any`.
  - **The event loop in detail**: call stack, task queue (macrotasks: timers, IO), microtask queue (promise callbacks, drained completely between tasks), and why a microtask loop can starve the loop entirely.
  - Error handling across async boundaries: unhandled rejections, `try/catch` around `await`, and why a rejected promise inside a non-awaited call disappears.
- Iteration protocols: iterables, iterators, generators (`function*`, `yield`), async iterators and `for await...of`.
- Modules in depth: static imports and hoisting, dynamic `import()`, tree shaking, and the ESM/CommonJS interop rules that still cause pain in Node.
- Standard library worth knowing: `Map`/`Set` (and when to use them over objects), `JSON`, `Date` (bad) versus `Temporal` (good, enabled by default in Node 26), `Intl`, `structuredClone`, `fetch`, `AbortController`.
- Tooling: a package manager (npm, pnpm), ESLint, Prettier, and Vitest or `node:test` for tests.
What to build: a small HTTP service or MCP-style server with async IO throughout, graceful shutdown, and tests. Then a script that fans out 100 concurrent requests with a concurrency limit.

**Gate**: you can explain, given a snippet with `setTimeout`, a resolved promise, and synchronous code, the exact print order and why.

### Stage 3: advanced (3 min)

- **The runtime, concretely**: V8 parses to bytecode (Ignition), optimises hot functions (TurboFan/Maglev), and deoptimises when assumptions break. Hidden classes and inline caches mean that objects with consistent shapes are fast and objects built by adding properties in varying order are slow.
- **Memory**: generational garbage collection, why closures retain more than you think, detached DOM nodes and listener leaks, `WeakMap`/`WeakRef`/`FinalizationRegistry` and when they are legitimate.
- **Performance**: measure with the profiler rather than guessing; avoid megamorphic call sites; understand that `Array` is not always a contiguous array (holes and dictionary mode); string concatenation is fine, `delete` is not.
- **Real concurrency**: worker threads (Node) and Web Workers, `SharedArrayBuffer` plus `Atomics`, transferables and structured clone. Single-threaded is the default, not a limit.
- **Streams and backpressure**: Node streams and Web Streams, piping, and why reading a large file into memory is the mistake everyone makes once.
- Metaprogramming: getters and setters, `Object.defineProperty`, `Proxy` and `Reflect` (the basis of Vue reactivity and most mocking libraries), symbols and well-known symbols (`Symbol.iterator`, `Symbol.asyncIterator`).
- Robustness: immutability discipline, structural sharing, `Object.freeze`, defensive copying at boundaries, and why deep equality is not built in.
- Security basics for anything that touches user input: prototype pollution, `eval` and its relatives, ReDoS from a careless regex, and supply-chain risk in a dependency tree that is routinely thousands of packages deep.
What to build: take an IO-heavy script and rewrite it with streams and a concurrency limiter; profile before and after.

**Gate**: you can explain what deoptimises a hot function in V8, and why adding a property to an object after construction can slow a loop down.

### Stage 4: expert (2 min)

- **Read the spec**: [tc39.es/ecma262](https://tc39.es/ecma262/) (spec, reference; look up a section as needed rather than reading through). Abstract operations, `ToPrimitive`, property descriptors, realms, and the job queue. The spec is readable once you accept its style, and it settles every argument.
- **Follow TC39**: proposal stages 0 to 4, the champion process, and why proposals such as decorators took a decade. Reading a stage-2 proposal's design notes is where the language's reasoning lives.
- **Engine internals**: V8 blog posts, `--print-opt-code` and `%GetOptimizationStatus` under `--allow-natives-syntax`, and how JavaScriptCore (Bun) and SpiderMonkey differ.
- **Author for the ecosystem**: publish a dual ESM/CJS package with correct `exports` maps and types, and understand semver, peer dependencies, and why the `exports` field breaks bundlers when you get it wrong.
- **Know the runtimes as a systems choice**: Node (universal default, 30-month LTS, OpenJS Foundation governance), Bun (JavaScriptCore, all-in-one runtime plus package manager plus bundler plus test runner, fastest, single-company governance, reported to be acquired by Anthropic in early 2026 and used in Claude Code's CLI), Deno (secure by default with an explicit permission model, native TypeScript, Node compatibility since Deno 2). Pick per job, not per fashion.
**Gate**: you can settle a disagreement about language behaviour by finding and reading the relevant spec section.

### Traps that catch experienced people (1 min)

- `this` lost when a method is passed as a callback.
- Closures capturing a loop variable declared with `var`.
- `await` inside a `forEach` (it does nothing useful); use `for...of` or `Promise.all`.
- Floating-point money arithmetic; `parseInt` without a radix; `sort()` comparing as strings by default.
- Mutating an array or object that someone else holds a reference to.
- Unhandled promise rejections in fire-and-forget calls.
- Assuming `JSON.parse(JSON.stringify(x))` is a safe deep clone (it loses dates, undefined, functions, and cycles); use `structuredClone`.
- Blocking the event loop with synchronous file or crypto work in a server.

### Cross-links (1 min)

- The type layer on top of all of this: [TypeScript: zero to expert](typescript.md)
- Agent harnesses written in TS/JS: [Topic: agentic-harnesses](../agentic-harnesses/summary.md)
- MCP servers and clients: [Model Context Protocol (MCP)](../protocols/mcp.md)
