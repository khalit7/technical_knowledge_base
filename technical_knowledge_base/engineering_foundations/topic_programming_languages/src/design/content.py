# Content of the Design space tab: founding values, axes, cells, false friends, traces.
# Snippet paths are relative to code/; their outputs are read from outputs/ by gen.py.
LANGS = [("py", "Python"), ("cpp", "C++"), ("rs", "Rust"), ("js", "JavaScript"), ("ts", "TypeScript")]

VALUES = {
 "py": {"lang": "py", "source": "PEP 20, The Zen of Python (Tim Peters)", "url": "https://peps.python.org/pep-0020/", "date": "created 19 Aug 2004; checked 2026-10-05",
        "items": [
   ("py.read", "Readability counts."),
   ("py.explicit", "Explicit is better than implicit."),
   ("py.errors", "Errors should never pass silently."),
   ("py.oneway", "There should be one-- and preferably only one --obvious way to do it."),
 ]},
 "cpp": {"lang": "cpp", "source": "cppreference, Zero-overhead principle (from Stroustrup); Stroustrup's FAQ", "url": "https://en.cppreference.com/w/cpp/language/Zero-overhead_principle.html", "url2": "https://www.stroustrup.com/bs_faq.html", "date": "cppreference checked 2026-10-05; FAQ modified 26 May 2024",
        "items": [
   ("cpp.zero", "You don't pay for what you don't use. What you do use is just as efficient as what you could reasonably write by hand."),
   ("cpp.c", "C++'s C compatibility was a key language design decision rather than a marketing gimmick."),
 ]},
 "rs": {"lang": "rs", "source": "rust-lang.org, \"Why Rust?\"", "url": "https://www.rust-lang.org/", "date": "checked 2026-10-05 (site showing version 1.99.0)",
        "items": [
   ("rs.perf", "Rust is blazingly fast and memory-efficient: with no runtime or garbage collector [...]"),
   ("rs.rel", "Rust's rich type system and ownership model guarantee memory-safety and thread-safety [...] eliminate many classes of bugs at compile-time."),
   ("rs.prod", "[...] a friendly compiler with useful error messages, and top-notch tooling [...]"),
 ]},
 "js": {"lang": "js", "source": "Mathias Bynens (V8), SmooshGate FAQ; W3C TAG, Web Platform Design Principles 1.8", "url": "https://developer.chrome.com/blog/smooshgate", "url2": "https://www.w3.org/TR/design-principles/", "date": "FAQ 2018 (last updated 2018-03-19); W3C Group Note 14 Sep 2026; checked 2026-10-05",
        "items": [
   ("js.web", "“don’t break the Web” is the number one design principle for HTML, CSS, JavaScript, and any other standard that’s widely used on the Web."),
   ("js.web2", "Breaking content harms users, and the benefit of a change has to significantly outweigh that harm to be worth doing."),
 ]},
 "ts": {"lang": "ts", "source": "TypeScript Design Goals (TypeScript wiki)", "url": "https://github.com/microsoft/TypeScript/wiki/TypeScript-Design-Goals", "date": "checked 2026-10-05",
        "items": [
   ("ts.erase", "Use a consistent, fully erasable, structural type system. / Impose no runtime overhead on emitted programs."),
   ("ts.js", "Preserve runtime behavior of all JavaScript code."),
   ("ts.balance", "Non-goal: Apply a sound or \"provably correct\" type system. Instead, strike a balance between correctness and productivity."),
 ]},
}

AXES = [
 ("exec", "Execution model", "What happens between your source file and the CPU?"),
 ("types", "Types", "When are type mistakes caught: before running, while running, or never? By name or by shape?"),
 ("names", "Names, values, mutation", "What does a = b do, and who else sees a change?"),
 ("memory", "Memory and lifetimes", "Who frees memory, and when?"),
 ("null", "Nothingness", "How does the language say \"no value\", and what stops you using it?"),
 ("numbers", "Numbers", "What happens at the edges: overflow, division, precision?"),
 ("text", "Text", "What is a character, and what does length count?"),
 ("errors", "Errors", "How does a failure travel, and what forces you to handle it?"),
 ("poly", "Abstraction and polymorphism", "How does one function work with many types?"),
 ("meta", "Metaprogramming", "Can code write or inspect code, and when does it run?"),
 ("conc", "Concurrency", "Can two things run at once, and what stops them corrupting shared data?"),
 ("safety", "Safety and undefined behaviour", "What happens when you break the rules?"),
 ("evol", "Evolution and governance", "Who changes the language, how often, and may old code break?"),
 ("tooling", "Tooling", "What tells you about a mistake before a user does?"),
 ("interop", "Speed and interop", "How do you reach machine speed, and how do the languages call each other?"),
]

# CELLS[(axis, lang)] = dict(choice, buys, costs, value, why, files, llama)
CELLS = {}
def C(axis, lang, choice, buys, costs, value, why, files, llama=()):
    CELLS[(axis, lang)] = dict(choice=choice, buys=buys, costs=costs, value=value, why=why, files=list(files), llama=list(llama))

C("exec", "py", "CPython compiles your file to bytecode, then a loop written in C interprets it one instruction at a time; one BINARY_OP instruction handles ints, strings and anything else with a +.",
  "Nothing to build: edit and run, a REPL, and any value can flow anywhere.",
  "Every operation looks up types and dispatches at run time, so tight loops run far slower than machine code (see the Benchmark tab); since 3.11 CPython specialises hot instructions (PEP 659), which narrows but does not close the gap.",
  "py.read", "Simplicity first: the interpreter stays small and the language stays dynamic.",
  ["exec/py/bytecode.py"])
C("exec", "cpp", "Compiled ahead of time to machine code for one CPU; add(int, int) becomes a single add instruction.",
  "The fastest possible start and steady speed, no runtime to ship, full control over the instructions.",
  "A build step per platform, long compile times on big projects, and nothing is checked at run time unless you ask.",
  "cpp.zero", "Zero overhead: the compiled code is what you would have written in assembly.",
  ["exec/cpp/machine_code.cpp"], ["cmake"])
C("exec", "rs", "Also compiled ahead of time through LLVM (the same backend clang uses), so the same function becomes the same instruction.",
  "C++-class speed with no garbage collector or interpreter to ship.",
  "Compile times are long (the borrow checker and generics do a lot of work), and you build per target.",
  "rs.perf", "\"No runtime or garbage collector\".",
  ["exec/rs/machine_code.rs"])
C("exec", "js", "V8 parses to bytecode and interprets it, watches which functions are hot and what types they see, then recompiles them to machine code (here TurboFan); it throws that code away if the types change.",
  "Starts like an interpreter, approaches compiled speed on hot, type-stable code, ships as source.",
  "Speed depends on staying predictable: a function that sees many shapes gets deoptimised; warm-up time and memory for the JIT.",
  "js.web", "Pages ship as source text that must run on every browser: the engine, not the author, has to make it fast.",
  ["exec/js/jit.js"])
C("exec", "ts", "TypeScript never runs: tsc (or Node, Bun, Deno, esbuild) deletes the types and the JavaScript that remains is what V8 executes.",
  "Zero runtime cost; any JavaScript engine runs the output; Node 22.22 runs .ts files directly by stripping types.",
  "Nothing the types say exists at run time: no type checks, no type-based dispatch.",
  "ts.erase", "\"Fully erasable\" and \"no runtime overhead\".",
  ["exec/ts/erase.ts"])

C("types", "py", "Dynamic at run time, with optional hints that a separate checker (ty, mypy, pyright) reads; CPython ignores the hints.",
  "Start loose, add hints where they pay; the checker finds the bug before running.",
  "Nothing forces you to run the checker; an unchecked call fails at run time, deep inside the function.",
  "py.read", "Hints were added without changing what Python does at run time (PEP 484).",
  ["types/py/gradual.py"])
C("types", "cpp", "Static and nominal: every variable has one declared type, and the compiler rejects calls that do not match (allowing some implicit numeric conversions inherited from C).",
  "Mistakes caught before running; the compiler knows exact sizes, so code is fast.",
  "Verbose declarations, template error messages that can run to pages, and C's implicit conversions (int to bool, double to int) still allowed.",
  "cpp.c", "Static types give zero-overhead code; C's implicit conversions stay for compatibility.",
  ["types/cpp/static.cpp"])
C("types", "rs", "Static, nominal and strict: no implicit conversions at all, even from i32 to i64; local types are inferred.",
  "Whole classes of mistakes become compile errors, with a suggested fix in the message.",
  "You write conversions (.into(), as) by hand, and fight the compiler more at first.",
  "rs.rel", "Bugs eliminated \"at compile-time\".",
  ["types/rs/static.rs"])
C("types", "js", "Dynamic and weakly typed: operators convert their operands (\"21\" * 2 is 42) instead of failing.",
  "Code keeps running on messy input, which suited web pages.",
  "A wrong type becomes a wrong value (NaN, \"[object Object]\") far from the cause.",
  "js.web", "Early behaviour cannot be changed without breaking pages that rely on it.",
  ["types/js/dynamic.js"])
C("types", "ts", "Static, structural (a value fits a type if it has the right shape) and deliberately unsound: some wrong programs pass the checker.",
  "Fits how JavaScript code is actually written; checks most mistakes with little ceremony.",
  "Holes such as covariant arrays, any and casts let wrong types through, and nothing checks at run time.",
  "ts.balance", "The non-goal: not \"a sound or provably correct type system\".",
  ["types/ts/unsound.ts"])

C("names", "py", "A name is a label on an object; a = b adds a second label to the same object, so a change through one name is seen through the other.",
  "Cheap assignment and passing (no copying), one simple rule for every type.",
  "Aliasing surprises: a function can change the caller's list; you copy explicitly when you need independence.",
  "py.read", "One uniform rule, easy to state.",
  ["names/py/alias.py"])
C("names", "cpp", "A variable is the object itself: b = a copies every element (value semantics); you ask for a reference (&) or a pointer (*) explicitly.",
  "No hidden sharing, objects can live on the stack, and the cost of each copy is visible in the code.",
  "Accidental expensive copies (passing a vector by value), and references and pointers that can outlive what they point to.",
  "cpp.c", "C's value semantics, extended to classes; nothing is shared unless you say so.",
  ["names/cpp/copy.cpp"])
C("names", "rs", "b = a moves ownership: a can no longer be used. You clone to copy or borrow (&a) to share, and mutation needs mut.",
  "Exactly one owner, so the compiler knows when to free, and shared data cannot change under you.",
  "The \"value moved\" error is every Python programmer's first wall; more explicit .clone() and &.",
  "rs.rel", "Ownership is what lets the compiler prove memory safety.",
  ["names/rs/move.rs", "names/rs/move_fixed.rs"])
C("names", "js", "Objects and arrays are shared by reference, as in Python; const only stops rebinding the name, it does not freeze the value.",
  "Same mental model as Python for objects; spread ([...a]) makes shallow copies.",
  "const is read as \"constant\" by newcomers; deep copies need structuredClone.",
  "js.web", "Reference semantics for objects, unchanged since the first versions.",
  ["names/js/refs.js"])
C("names", "ts", "Same runtime rules as JavaScript, plus readonly types that the checker enforces and a cast can bypass.",
  "Documents and checks \"do not mutate\" at no runtime cost.",
  "readonly is a promise to the checker only; the array is ordinary at run time.",
  "ts.erase", "Type-only immutability: erasable, no runtime overhead.",
  ["names/ts/readonly.ts"])

C("memory", "py", "Every object carries a reference count and is freed the moment it reaches zero; a cycle collector finds groups of objects that only point at each other.",
  "You never free anything, and most objects are freed promptly and predictably.",
  "Every object has a header and a count to update (memory and time), and cycles wait for the collector.",
  "py.read", "Memory management is not your problem.",
  ["memory/py/refcount.py"])
C("memory", "cpp", "You decide where objects live (stack, heap, a memory-mapped file) and when they die; RAII ties freeing to scope: the destructor runs when the owner goes out of scope.",
  "Exact control of layout and lifetime: structs pack like the hardware wants, and nothing runs that you did not write.",
  "Using memory after it is freed compiles and runs, printing whatever is there: undefined behaviour.",
  "cpp.zero", "No collector to pay for; RAII makes cleanup free and automatic.",
  ["memory/cpp/raii.cpp", "memory/cpp/layout.cpp", "memory/cpp/uaf.cpp"], ["block_q4_0", "tensor", "tensor_data", "mmap", "deleters", "unique_ptr"])
C("memory", "rs", "Each value has one owner and is freed when the owner goes out of scope (RAII, as in C++); the borrow checker proves at compile time that no reference outlives its value.",
  "C++-style control and speed, with use-after-free and dangling references made compile errors.",
  "You must structure code so lifetimes are provable (graphs and caches need Rc, Arc or indices); a learning curve of weeks.",
  "rs.rel", "\"Ownership model guarantee[s] memory-safety\".",
  ["memory/rs/dangling.rs"])
C("memory", "js", "A tracing garbage collector: V8 periodically finds objects no longer reachable from your variables and frees them.",
  "No counts to maintain and cycles are free; you never think about freeing.",
  "You cannot say when memory is freed, collection pauses, and memory grows with what you keep reachable.",
  "js.web", "Scripts on a page must never crash the browser: memory safety by collection.",
  ["memory/js/gc.js"])
C("memory", "ts", "Same garbage collector; TypeScript adds using declarations (explicit resource management) to close files and connections at the end of a block.",
  "Deterministic cleanup of resources, like Python's with or C++'s destructors, checked by the compiler.",
  "Needs a recent target or downlevelling (here tsc rewrote it for ES2022); memory itself is still collected whenever V8 decides.",
  "ts.js", "Follows the ECMAScript proposal rather than inventing its own feature.",
  ["memory/ts/using.ts"])

C("null", "py", "One None value; a missing dict key raises KeyError and .get() returns None; checkers track Optional types.",
  "One nothing, and a missing key fails loudly right where it happens.",
  "Any variable can be None at run time unless a checker proves otherwise.",
  "py.errors", "\"Errors should never pass silently\": a missing key raises.",
  ["null/py/none.py"])
C("null", "cpp", "Raw pointers can be nullptr and dereferencing one is undefined behaviour; std::optional (C++17) is the explicit \"maybe a value\".",
  "Pointers cost nothing extra; optional makes \"maybe\" visible in a signature.",
  "Nothing forces you to check, and a null dereference is a crash at best.",
  "cpp.zero", "No hidden null checks on every dereference.",
  ["null/cpp/optional.cpp"])
C("null", "rs", "There is no null: absence is Option<T> (Some or None), and you must handle None before you can use the value.",
  "The \"null pointer\" class of crash cannot happen in safe Rust.",
  "Explicit unwrapping everywhere (match, ?, unwrap_or), noisier code at first.",
  "rs.rel", "A whole class of bugs removed at compile time.",
  ["null/rs/option.rs"])
C("null", "js", "Two nothings: undefined (missing) and null (deliberately empty); reading a missing property gives undefined instead of an error.",
  "Lenient code that keeps running; ?. and ?? make defaults short.",
  "The mistake surfaces later, when undefined is used; typeof null is \"object\".",
  "js.web", "Both values and their quirks are frozen by web compatibility.",
  ["null/js/undef.js"])
C("null", "ts", "With strictNullChecks (part of --strict), undefined and null are separate types, and using a possibly-undefined value is a compile error.",
  "Most \"cannot read properties of undefined\" crashes caught before running.",
  "Only as good as the types: a cast or any brings them back; the code still runs if you ignore the error.",
  "ts.balance", "Strictness you opt into, balancing correctness and productivity.",
  ["null/ts/strictnull.ts"])

C("numbers", "py", "int has unlimited size, / always gives a float, // floors toward minus infinity, and float is a 64-bit IEEE 754 double.",
  "No overflow bugs, and integer arithmetic that matches maths.",
  "Every int is a heap object: slow and large next to a machine integer (why NumPy and PyTorch exist).",
  "py.read", "Numbers behave like numbers; correctness over speed.",
  ["numbers/py/ints.py"])
C("numbers", "cpp", "Fixed-size machine integers; signed overflow is undefined behaviour, unsigned wraps around, division truncates toward zero.",
  "Arithmetic is one instruction, and the optimiser may assume overflow never happens.",
  "The same code gives different answers at -O0 and -O2, silently.",
  "cpp.zero", "No overflow check on every add; UB lets the optimiser assume x + 1 > x.",
  ["numbers/cpp/overflow_ub.cpp", "numbers/cpp/overflow_ub_O0.cpp"], ["dot_generic"])
C("numbers", "rs", "Fixed-size integers whose overflow is a bug: a debug build panics, a release build wraps; checked_, wrapping_ and saturating_ methods say what you want.",
  "Overflow is never undefined, and is caught while testing.",
  "Release builds wrap silently unless you enable overflow-checks; explicit conversions between integer types.",
  "rs.rel", "Defined behaviour always, with checks in debug where they are cheap to pay.",
  ["numbers/rs/overflow.rs", "numbers/rs/overflow_release.rs"])
C("numbers", "js", "Every number is a 64-bit double: integers are exact only up to 2^53; BigInt (2n) is a separate exact type.",
  "One number type, no overflow exceptions, 7 / 2 is 3.5.",
  "Large ids lose digits silently (JSON.parse included); % keeps the sign of the dividend.",
  "js.web", "The original single number type cannot change; BigInt was added beside it.",
  ["numbers/js/doubles.js"])
C("numbers", "ts", "Same runtime numbers; the checker keeps number and bigint apart, as the runtime does.",
  "Mixing them is caught before running instead of as a TypeError.",
  "No integer type: number is still a double.",
  "ts.js", "Types describe JavaScript's runtime; they do not add an int.",
  ["numbers/ts/bigint.ts"])

C("text", "py", "str is a sequence of Unicode code points: len counts code points, s[i] is one code point, and bytes are a separate type.",
  "Indexing and slicing never split a character; emoji count as one.",
  "len is not the byte size on the wire, and still not what a reader sees as one symbol (a skin-toned emoji is 2 code points).",
  "py.read", "Text that behaves as text (since Python 3 split str from bytes).",
  ["text/py/codepoints.py"])
C("text", "cpp", "std::string is a sequence of bytes with no encoding; UTF-8 text is just bytes in it.",
  "Zero-cost: the bytes as they arrive, any encoding.",
  "size() counts bytes and s[1] can be half a character; Unicode needs a library.",
  "cpp.c", "C's char arrays, wrapped; nothing you did not ask for.",
  ["text/cpp/bytes.cpp"])
C("text", "rs", "String is guaranteed valid UTF-8; len() is bytes, you cannot index by integer, and slicing inside a character panics.",
  "Never invalid text, no hidden cost: the API makes the byte/character difference explicit.",
  "s[0] does not compile; you iterate .chars() or .bytes() instead.",
  "rs.rel", "Valid UTF-8 always; indexing that could split a character is refused.",
  ["text/rs/utf8.rs", "text/rs/index.rs"])
C("text", "js", "Strings are sequences of UTF-16 code units: an emoji is 2 units, so length, indexing and split(\"\") can cut it in half.",
  "Fast indexing, the same model as Java and the browser's DOM.",
  "length is neither bytes nor characters; use [...s] for code points and Intl.Segmenter for what users see.",
  "js.web", "UTF-16 strings date from the start and every web page depends on them.",
  ["text/js/utf16.js"])
C("text", "ts", "Same UTF-16 strings; the type string says nothing about encoding.",
  "Nothing to learn beyond JavaScript; Intl.Segmenter counts user-visible characters.",
  "The checker cannot catch any of the length mistakes.",
  "ts.js", "Preserves JavaScript's runtime behaviour.",
  ["text/ts/graphemes.ts"])

C("errors", "py", "Exceptions: a failure raises, travels up the call stack until an except catches it, and stops the program with a traceback if none does.",
  "Errors cannot be ignored by accident, and the happy path stays clean.",
  "A signature does not say what it can raise; you learn by reading code or failing.",
  "py.errors", "\"Errors should never pass silently.\"",
  ["errors/py/exceptions.py"])
C("errors", "cpp", "Exceptions as in Python, plus C-style return codes, plus std::expected (C++23) carrying either a value or an error; many codebases (and -fno-exceptions builds) avoid exceptions.",
  "Choice: exceptions cost nothing until thrown; expected makes failure part of the type.",
  "Three styles in one language, and nothing forces a caller to check a return code.",
  "cpp.zero", "cppreference names exceptions and RTTI as the two features that break zero overhead, which is why compilers can switch them off.",
  ["errors/cpp/expected.cpp"], ["mmap"])
C("errors", "rs", "No exceptions: failure is a value, Result<T, E>, that you must handle; ? passes it to the caller; panics are for bugs and end the thread.",
  "Every fallible call is visible in the code and its signature; ignoring a Result is a warning.",
  "More code at each call (though ? keeps it short), and error types to design.",
  "rs.rel", "Failure paths checked by the compiler.",
  ["errors/rs/result.rs"])
C("errors", "js", "Exceptions, but many APIs return a special value instead (parseInt gives 4 for \"4x2\", Number gives NaN), and anything, even a string, can be thrown.",
  "Lenient parsing keeps pages running.",
  "Silent wrong values; you cannot rely on a caught value having a message or stack.",
  "js.web", "Lenient early APIs are kept forever.",
  ["errors/js/throw.js"])
C("errors", "ts", "Same exceptions; with --strict a caught value has type unknown, so you must check what it is before using it.",
  "Honest about JavaScript's \"anything can be thrown\".",
  "No checked exceptions: signatures cannot declare what they throw.",
  "ts.js", "Describes JavaScript's behaviour instead of changing it.",
  ["errors/ts/unknown.ts"])

C("poly", "py", "Duck typing: anything with a speak method works; typing.Protocol lets a checker verify the shape without inheritance.",
  "Flexible code with no declarations; Protocols add checking without coupling.",
  "Without a checker, the mismatch is found only when the method is called.",
  "py.read", "Write the obvious code; types describe it afterwards.",
  ["poly/py/protocol.py"])
C("poly", "cpp", "Templates generate a separate compiled copy per type (monomorphisation); C++20 concepts state the requirements; virtual functions give run-time dispatch when wanted.",
  "Generic code as fast as hand-written code for each type.",
  "Bigger binaries, slow compiles, and error messages from deep inside templates (concepts shorten them).",
  "cpp.zero", "Templates are the zero-overhead abstraction; virtual dispatch only if you ask.",
  ["poly/cpp/concepts.cpp"], ["template_dup"])
C("poly", "rs", "Traits declare behaviour; generics with trait bounds are monomorphised like templates, and dyn Trait gives run-time dispatch through a vtable.",
  "Checked at the definition, not at each use, so errors are short; you choose static or dynamic dispatch.",
  "No inheritance; you must implement traits explicitly for each type.",
  "rs.perf", "Zero-cost generics by default, dynamic dispatch by choice.",
  ["poly/rs/traits.rs"])
C("poly", "js", "Duck typing plus prototypes: a class is a function whose prototype object holds the methods; any object with the method works.",
  "Very flexible: objects can be built ad hoc.",
  "Nothing states or checks an interface.",
  "js.web", "Prototypes are the original object model; classes (2015) are a layer over them.",
  ["poly/js/duck.js"])
C("poly", "ts", "Structural interfaces: a class or object literal satisfies an interface if it has the right members, without saying implements; generics are checked and then erased.",
  "Typed duck typing: it matches how JavaScript is written.",
  "Accidental matches (two types with the same shape are interchangeable); no run-time dispatch on types.",
  "ts.erase", "Structural and fully erasable.",
  ["poly/ts/structural.ts"])

C("meta", "py", "Everything happens at run time: decorators are functions that wrap functions, classes can be built and inspected while running.",
  "Powerful frameworks with little code (FastAPI, pytest, dataclasses, torch.compile all read your functions at run time).",
  "Magic that a reader and a checker cannot see; the cost is paid every run.",
  "py.read", "One mechanism (functions and objects) for everything.",
  ["meta/py/decorator.py"])
C("meta", "cpp", "Compile time: templates and constexpr functions run inside the compiler; the preprocessor (#define) still pastes text as in C.",
  "Work moved to compile time costs nothing at run time; static_assert checks facts about your code.",
  "Template metaprogramming is notoriously hard to read; macros ignore scope and types.",
  "cpp.zero", "Compute once in the compiler instead of every run.",
  ["meta/cpp/constexpr.cpp"], ["block_q4_0"])
C("meta", "rs", "Macros that work on syntax trees (macro_rules!) and procedural macros such as #[derive] generate code at compile time.",
  "Boilerplate (Debug, Clone, serde's Serialize) generated and type-checked; macros respect expression boundaries.",
  "Slower compiles, and procedural macros are hard to debug.",
  "rs.prod", "Productivity without runtime cost.",
  ["meta/rs/macros.rs"])
C("meta", "js", "Run time, like Python: objects can be inspected and changed while running, and a Proxy intercepts every property access.",
  "Very dynamic libraries (ORMs, mocks, reactive UI frameworks).",
  "Hard to follow and slows down V8's optimisations.",
  "js.web", "Everything stays dynamic because existing code depends on it.",
  ["meta/js/proxy.js"])
C("meta", "ts", "The type system itself is programmable: conditional types and template literal types compute new types inside the checker.",
  "Very precise types for libraries (routes, SQL builders, zod schemas) with no runtime code.",
  "Type-level code can be hard to read and slow to check.",
  "ts.erase", "All of it vanishes at run time.",
  ["meta/ts/typelevel.ts"])

C("conc", "py", "Threads exist, but the global interpreter lock (GIL) lets one run Python bytecode at a time; 3.14 ships an officially supported free-threaded build (python3.14t) without it; asyncio interleaves tasks on one thread.",
  "With the GIL: simple, thread-safe interpreter internals; free-threaded: real parallel threads.",
  "With the GIL, no CPU parallelism in threads; without it, races your code got away with become real (below: all 800,000 increments with the GIL, far fewer without it).",
  "py.read", "The GIL kept the interpreter simple; PEP 703 made it optional and PEP 779 (3.14) made the free-threaded build supported.",
  ["conc/py/threads.py", "conc/py/threads_ft.py"])
C("conc", "cpp", "OS threads with shared memory; a data race (two threads touching the same variable, one writing, unsynchronised) is undefined behaviour; you add mutexes and atomics.",
  "Full control: any parallel algorithm, no runtime in the way.",
  "Races compile and run, giving wrong answers that change from run to run.",
  "cpp.zero", "No hidden locks; synchronisation only where you write it.",
  ["conc/cpp/race.cpp"], ["threads", "ith_nth"])
C("conc", "rs", "OS threads like C++, but the type system (the Send and Sync traits plus borrowing) rejects data races at compile time; async with an executor such as tokio for I/O.",
  "\"Fearless concurrency\": if it compiles, there is no data race.",
  "Shared state needs Arc, Mutex or atomics spelled out; async Rust has its own learning curve.",
  "rs.rel", "\"Thread-safety\" guaranteed by the type system.",
  ["conc/rs/race.rs", "conc/rs/atomic.rs"])
C("conc", "js", "One thread per program running an event loop: synchronous code first, then promise callbacks (microtasks), then timers and I/O; workers for real parallelism.",
  "No data races in normal code; very good at waiting on many network calls at once.",
  "One long computation blocks everything, including every other request on a server.",
  "js.web", "A page has one main thread driving the UI.",
  ["conc/js/eventloop.js"])
C("conc", "ts", "Same event loop; types track Promise<T>, so forgetting await is usually a compile error.",
  "Typed async code: the checker knows which values are still pending.",
  "Unawaited promises that are not used in an expression slip through (a linter rule catches them).",
  "ts.js", "Describes JavaScript's async model as it is.",
  ["conc/ts/await.ts"])

C("safety", "py", "Memory safe: every access is checked and failures raise exceptions; only extension modules and ctypes can corrupt memory.",
  "A bug gives a traceback, never silent corruption.",
  "Checks on every access cost speed; C extensions are a hole you rely on daily (NumPy, PyTorch).",
  "py.errors", "Errors never pass silently.",
  ["safety/py/ctypes_crash.py"])
C("safety", "cpp", "Many errors are undefined behaviour: the standard places no requirement on what happens, and the optimiser may assume they never occur; checked alternatives (at(), sanitizers) are opt-in.",
  "Nothing is checked unless you ask, which is part of why C++ is fast.",
  "Out-of-bounds reads and uninitialised values compile and run, printing plausible garbage; sanitizers find some, not all.",
  "cpp.zero", "No bounds check you did not ask for.",
  ["safety/cpp/oob.cpp", "safety/cpp/ff_uninit.cpp"], ["dot_generic"])
C("safety", "rs", "Safe Rust has no undefined behaviour: indexing is bounds-checked (panic), and anything the compiler cannot verify must be inside an unsafe block.",
  "The dangerous lines are marked and few, so review focuses there.",
  "Bounds checks cost a little (often optimised away); unsafe code still needs C-like care.",
  "rs.rel", "Memory safety by default, with an explicit escape hatch.",
  ["safety/rs/bounds.rs"])
C("safety", "js", "Memory safe and fully specified: even odd operations ([] + {}, \"b\" - 1) have a defined result.",
  "No crashes or memory corruption from script code.",
  "Defined does not mean sensible: odd results flow on silently.",
  "js.web", "Every behaviour is specified so all browsers agree.",
  ["safety/js/defined.js"])
C("safety", "ts", "As safe as JavaScript at run time; for types, any and as are escape hatches that switch checking off without any warning at the use site.",
  "A gradual path: type a codebase a piece at a time.",
  "One any can leak wrong types far through a program; validate data that comes from outside (zod).",
  "ts.balance", "Productivity over soundness.",
  ["safety/ts/escape.ts"])

C("evol", "py", "Changes go through PEPs decided by the elected Steering Council; a new version every October (PEP 602), and old features are deprecated, then removed.",
  "The language and standard library keep getting cleaned up (PEP 594 removed 19 \"dead batteries\" in 3.13).",
  "Upgrades can break code: here import cgi fails on 3.14.",
  "py.oneway", "Removing old ways keeps one obvious way.",
  ["evol/py/removed.py"])
C("evol", "cpp", "An ISO committee (WG21) publishes a new standard every three years (C++11, 14, 17, 20, 23; C++26 next); compilers implement features at their own pace.",
  "Very strong backward compatibility: decades-old code still compiles.",
  "Slow, committee-driven change, and old features can almost never be removed; compiler support lags the standard.",
  "cpp.c", "Compatibility, with C and with older C++, outranks cleanup.",
  ["evol/cpp/standards.cpp"])
C("evol", "rs", "RFCs decide changes, a release ships every six weeks, and editions (2015, 2018, 2021, 2024) let the language change keywords without breaking old crates: each crate picks its edition.",
  "Fast evolution without breaking the ecosystem; crates of different editions link together.",
  "Many features to keep up with, and the edition is one more thing to know.",
  "rs.prod", "Stability without stagnation.",
  ["evol/rs/edition2015.rs", "evol/rs/edition2024.rs"])
C("evol", "js", "TC39 advances proposals through stages 0 to 4 and ECMAScript gets a new edition every year, but nothing that existing web pages use is ever removed or changed.",
  "Code from the 1990s still runs today.",
  "Mistakes are permanent (typeof null, ==, var); new names avoid clashes with old libraries (flat, not flatten).",
  "js.web", "\"Don't break the Web.\"",
  ["evol/js/compat.js"])
C("evol", "ts", "Microsoft ships a release every few months; the checker gets stricter between versions, and TypeScript 7 (the compiler ported to Go) removed old options such as the ES5 target.",
  "Fast improvement of the checker; runtime behaviour never changes because it is JavaScript's.",
  "Upgrades can produce new type errors or removed options, though never different program output.",
  "ts.balance", "Types may change; JavaScript semantics may not.",
  ["evol/ts/removed.ts"])

C("tooling", "py", "Separate tools, now mostly written in Rust: uv (packages and Python versions), ruff (lint and format), ty, mypy or pyright (types), pytest.",
  "Fast, modern tools; each optional.",
  "Many tools to choose and configure; nothing runs them unless you set it up.",
  "py.oneway", "The community converged on fewer, faster tools (see the Toolchain atlas).",
  ["tooling/py/lint.py"])
C("tooling", "cpp", "The compiler is the first linter (-Wall -Wextra), plus CMake for builds, sanitizers for run-time checks, clang-tidy; no standard package manager.",
  "Warnings catch classic mistakes; huge choice of tools.",
  "Build systems and dependencies are the hardest part of C++; every project is set up differently.",
  "cpp.c", "C's separate-compilation model and toolchains, inherited.",
  ["tooling/cpp/warnings.cpp"], ["cmake"])
C("tooling", "rs", "One official toolchain: cargo builds, tests, fetches crates and runs clippy (hundreds of lints) and rustfmt.",
  "Every Rust project builds the same way with one command.",
  "Long compile times; cargo is opinionated.",
  "rs.prod", "\"Top-notch tooling\" is part of the pitch.",
  ["tooling/rs/clippy.rs"])
C("tooling", "js", "No compile step, so nothing checks a function until it runs; linters (ESLint, Biome) and TypeScript fill the gap; npm, pnpm or bun install packages.",
  "Edit and reload.",
  "Typos in untested paths ship.",
  "js.web", "Browsers run source text as given.",
  ["tooling/js/nocheck.js"])
C("tooling", "ts", "tsc is the checker: the same typo is a compile error; most projects pair it with a bundler or run .ts directly (Node, Bun, Deno).",
  "Editor support (autocomplete, rename) that plain JavaScript cannot have.",
  "A config file (tsconfig.json) with dozens of options to get right.",
  "ts.erase", "The checker is a separate step that leaves the JavaScript unchanged.",
  ["tooling/ts/check.ts"])

C("interop", "py", "Python calls compiled code through the C ABI: ctypes and cffi for plain C functions, PyO3/maturin for Rust and pybind11/nanobind for C++ extension modules.",
  "Write the hot loop in Rust or C++ and keep Python for the rest; how NumPy, PyTorch, tokenizers and uv-era tools work.",
  "Crossing the boundary has a cost per call, and a bug in the native side crashes the interpreter.",
  "py.read", "Python stays simple because speed lives in extensions.",
  ["interop/py/ctypes_rust.py"])
C("interop", "cpp", "C++ calls C directly and exposes a C interface with extern \"C\"; SIMD intrinsics and CUDA reach the hardware.",
  "No glue to talk to C, operating systems or GPU drivers; every other language can call a C interface.",
  "The C ABI is the lowest common denominator: raw pointers and sizes, no ownership information.",
  "cpp.c", "Compatibility with C is the interop story.",
  ["interop/cpp/c_abi.cpp", "interop/cpp/simd.cpp"], ["extern_c", "simd"])
C("interop", "rs", "Rust calls C through extern \"C\" blocks inside unsafe, and exports C functions the same way; it also compiles to WebAssembly.",
  "Drop-in replacement for C libraries; one language for Python extensions, services and the browser.",
  "Every foreign call is unsafe: the compiler cannot check the other side.",
  "rs.perf", "\"Easily integrate with other languages.\"",
  ["interop/rs/ffi.rs"])
C("interop", "js", "Native speed comes from WebAssembly modules (compiled from Rust, C or C++) or Node native addons; the engine itself is C++.",
  "Run compiled code in the browser and Node, sandboxed.",
  "Copying data across the boundary, and WebAssembly's i32 wraps on overflow where JavaScript numbers do not.",
  "js.web", "A new, sandboxed binary format added beside JavaScript, not a change to it.",
  ["interop/js/wasm.mjs"])
C("interop", "ts", "The same WebAssembly and native addons; the types you give their exports are claims the checker cannot verify.",
  "Typed wrappers make foreign code pleasant to call.",
  "A wrong declaration type-checks and lies.",
  "ts.erase", "Types describe, they do not check, what crosses the boundary.",
  ["interop/ts/wasm.mts"])

# False friends: what a Python programmer writes, what the other language does.
FFS = []
def F(fid, axis, langs, title, py, other, lesson, rosetta=None):
    FFS.append(dict(id=fid, axis=axis, langs=langs, title=title, py=py, other=other, lesson=lesson, rosetta=rosetta))

F("move", "names", ["rs"], "b = a moves in Rust", ["names/py/alias.py"], ["names/rs/move.rs"],
  "In Rust, assigning a heap value moves it; the old name is dead. Clone to copy, & to borrow.", ("moved", "the Rosetta mistake \"moved\""))
F("copyvec", "names", ["cpp"], "b = a copies a whole vector in C++", ["names/py/alias.py"], ["names/cpp/copy.cpp"],
  "C++ copies the elements; a change to b does not reach a. Write & to share.")
F("passvec", "names", ["cpp"], "Passing a list to a function: C++ passes a copy", ["names/py/ff_pass_list.py"], ["names/cpp/ff_pass_vector.cpp"],
  "A C++ parameter without & receives a copy, and the caller never sees the change (and pays for the copy).")
F("const", "names", ["js", "rs"], "const is not frozen; Rust's let is", ["names/py/ff_final.py"], ["names/js/ff_const.js", "names/rs/ff_immutable.rs"],
  "JavaScript const and Python Final stop rebinding only; Rust without mut forbids changing the value itself.")
F("eqeq", "types", ["js"], "== converts before comparing", ["types/py/ff_eq.py"], ["types/js/ff_eq.js"],
  "Use === in JavaScript (and !==); == applies conversion rules.")
F("truthy", "types", ["js", "rs"], "An empty list is falsy only in Python", ["types/py/ff_truthy.py"], ["types/js/ff_truthy.js", "types/rs/ff_truthy.rs"],
  "if (xs) is always true for an array in JavaScript; Rust refuses non-bool conditions. Test the length.")
F("sort", "types", ["js"], "sort() on numbers sorts them as strings", ["types/py/ff_sort.py"], ["types/js/ff_sort.js"],
  "Array.prototype.sort compares string forms unless you pass a comparator. (NaN in sorts: see the Rosetta mistake \"order\".)", ("order", "the Rosetta mistake \"order\""))
F("arreq", "types", ["js"], "Two equal lists are not ===", ["types/py/ff_listeq.py"], ["types/js/ff_arreq.js"],
  "JavaScript compares objects and arrays by identity; a Set of arrays never finds an equal array.")
F("keys", "types", ["js"], "Object keys are always strings", ["types/py/ff_dictkeys.py"], ["types/js/ff_objkeys.js"],
  "1 and \"1\" are the same object key; use a Map for real keys of any type.")
F("vanish", "types", ["ts"], "TypeScript types vanish at run time", ["types/py/ff_hint.py"], ["types/ts/ff_vanish.ts"],
  "A number parameter can receive a string from JSON; nothing checks, and + concatenates. Python at least raises TypeError.")
F("llmjson", "types", ["ts"], "JSON from an LLM needs a run-time check", ["types/py/ff_json.py"], ["types/ts/ff_zod.ts"],
  "A cast (as) and a TypedDict are both unchecked; validate with a schema library such as zod (TypeScript) or pydantic (Python).")
F("overflow", "numbers", ["rs"], "Integers overflow: Rust panics in debug, wraps in release", ["numbers/py/ints.py"], ["numbers/rs/overflow.rs", "numbers/rs/overflow_release.rs"],
  "Python ints never overflow; Rust's i32 does, and the result depends on the build profile.")
F("ub", "numbers", ["cpp"], "Signed overflow is undefined in C++", ["numbers/py/ints.py"], ["numbers/cpp/overflow_ub_O0.cpp", "numbers/cpp/overflow_ub.cpp"],
  "The same source prints 0 at -O0 and 1 at -O2: the optimiser assumed overflow cannot happen.")
F("bigid", "numbers", ["js"], "Large integers lose digits in JavaScript", ["numbers/py/ff_bigint.py"], ["numbers/js/ff_bigid.js"],
  "Integers above 2^53 are rounded, including 64-bit ids inside JSON. Keep ids as strings or use BigInt.")
F("div", "numbers", ["cpp", "js"], "Integer division and % on negatives", ["numbers/py/ff_div.py"], ["numbers/cpp/ff_div.cpp", "numbers/js/doubles.js"],
  "C++ and Rust truncate toward zero (-7 / 2 is -3, -7 % 2 is -1); Python floors (-4 and 1); JavaScript / never truncates.")
F("mix", "numbers", ["rs"], "Rust will not add an i32 to an i64", ["numbers/py/ff_mix.py"], ["numbers/rs/ff_mix.rs"],
  "Every integer conversion is written out (i64::from(a) or a as i64).")
F("strlen", "text", ["rs", "js"], "len of a string with an emoji", ["text/py/codepoints.py"], ["text/rs/utf8.rs", "text/js/utf16.js"],
  "Python counts code points (6), Rust bytes (10), JavaScript UTF-16 units (7).")
F("strindex", "text", ["rs"], "s[0] does not compile in Rust", ["text/py/codepoints.py"], ["text/rs/index.rs"],
  "Use s.chars().nth(i) (a walk, O(n)) or byte slices on known boundaries.")
F("concat", "text", ["rs", "cpp"], "\"a\" + \"b\" fails in Rust and C++", ["text/py/ff_concat.py"], ["text/rs/ff_concat.rs", "text/cpp/ff_concat.cpp"],
  "String literals are borrowed &str in Rust and char arrays in C++; build an owned String / std::string first.")
F("default", "names", ["js"], "Mutable default arguments: Python is the odd one out", ["names/py/ff_default.py"], ["names/js/ff_default.js"],
  "A Python default is created once, when def runs; JavaScript evaluates it on every call. The false friend runs in reverse.")
F("closure", "names", ["js", "rs"], "Closures in a loop", ["names/py/ff_closure.py"], ["names/js/ff_closure.js", "names/rs/ff_closure.rs"],
  "Python closures see the variable (all print 2); JavaScript let makes a fresh binding per iteration, var does not; Rust move copies the value.", ("closure", "the Rosetta task \"closure\""))
F("missing", "null", ["js"], "A missing key is not an error in JavaScript", ["null/py/ff_key.py"], ["null/js/undef.js"],
  "obj.missing is undefined, and the crash comes later where it is used. Python raises KeyError at the lookup.", ("missing", "the Rosetta mistake \"missing\""))
F("scope", "names", ["rs", "js"], "Blocks create scopes (and Rust lets you shadow)", ["names/py/ff_scope.py"], ["names/rs/ff_shadow.rs", "names/js/ff_blockscope.js"],
  "Python has function scope only: an if or for does not create a new variable. Rust and JavaScript (let) scope to the block; Rust's let x = ... again creates a new x, even of a new type.")
F("forin", "names", ["js"], "for...in loops over keys, as strings", ["names/py/ff_forin.py"], ["names/js/ff_forin.js"],
  "The Python for x in xs is JavaScript's for...of.")
F("index", "safety", ["cpp", "rs", "js"], "Reading past the end of a list", ["safety/py/ff_index.py"], ["safety/cpp/oob.cpp", "safety/rs/bounds.rs", "safety/js/defined.js"],
  "Python raises, Rust panics, JavaScript returns undefined, C++ operator[] reads whatever memory is there.")
F("uninit", "safety", ["cpp", "rs"], "A variable assigned only on one branch", ["safety/py/ff_unbound.py"], ["safety/cpp/ff_uninit.cpp", "safety/rs/ff_uninit.rs"],
  "C++ warns and runs with garbage; Rust refuses to compile; Python raises UnboundLocalError.")
F("parse", "errors", ["js", "rs"], "Parsing \"4x2\" as a number", ["errors/py/exceptions.py"], ["errors/js/throw.js", "errors/rs/result.rs"],
  "parseInt stops at the first bad character and returns 4; Rust returns an Err you must handle.", ("errors", "the Rosetta task \"errors\""))
F("this", "poly", ["js"], "A method taken off its object forgets this", ["poly/py/ff_bound.py"], ["poly/js/ff_this.js"],
  "Python's bound methods remember self; in JavaScript use an arrow function or .bind.")
F("await", "conc", ["ts"], "Forgetting await", ["conc/py/ff_await.py"], ["conc/ts/await.ts"],
  "Both give you an unfinished task object; TypeScript's checker usually catches it when you use the value.")
F("gil", "conc", ["cpp", "rs"], "n += 1 from several threads", ["conc/py/threads.py", "conc/py/threads_ft.py"], ["conc/cpp/race.cpp", "conc/rs/race.rs"],
  "Under the GIL this run happened to give the right total (not guaranteed); free-threaded Python and C++ lose updates; Rust refuses to compile it.", ("race", "the Rosetta mistake \"race\""))

# One sentence per founding value for the Trace view; the cells come from each cell's "value".
TRACE_NOTES = {
 "py.read": "Python keeps the language simple and the same at run time for every type, and pays for it in speed: interpretation, boxed ints, the GIL, speed moved into C and Rust extensions.",
 "py.explicit": "Explicit over implicit shows up as no implicit type conversions (\"1\" == 1 is False, str + int raises).",
 "py.errors": "Failures raise where they happen: KeyError, IndexError, ValueError, instead of a special value flowing on.",
 "py.oneway": "Python removes old ways (PEP 594's dead batteries) and the tooling converges, at the price of upgrade breakage.",
 "cpp.zero": "One rule explains a family of C++ choices: no bounds checks by default, signed overflow is undefined, no garbage collector, no null checks, races not prevented, templates compiled per type. Each check you did not ask for would be overhead. Exceptions are the admitted exception.",
 "cpp.c": "Compatibility with C explains value semantics, bytes-as-strings, implicit conversions, the preprocessor, the build model, and why almost nothing can be removed.",
 "rs.perf": "No runtime or collector: monomorphised generics, compiled code identical to C++, and C-ABI interop.",
 "rs.rel": "Ownership and the type system turn C++'s run-time disasters into compile errors: moves, borrows, Option instead of null, Result instead of exceptions, Send/Sync against data races, valid UTF-8, no undefined behaviour outside unsafe.",
 "rs.prod": "A friendly compiler and one toolchain: cargo, clippy, editions, derive macros.",
 "js.web": "Nothing a page relies on can change: == coercion, undefined and null, doubles only, UTF-16 strings, lenient parsing, typeof null, and new names chosen to dodge old libraries.",
 "js.web2": "",
 "ts.erase": "Types are deleted before running: no runtime overhead, but also no runtime checks, so data from outside (JSON, LLM output) must be validated by a library such as zod.",
 "ts.js": "TypeScript describes JavaScript's runtime as it is: same numbers, strings, event loop, exceptions.",
 "ts.balance": "TypeScript is unsound on purpose: covariant arrays, any, casts and gradual strictness trade correctness for productivity.",
}

FF_VALUES = {"eqeq": "py.explicit", "truthy": "py.explicit", "mix": "py.explicit", "vanish": "ts.erase", "llmjson": "ts.erase",
             "ub": "cpp.zero", "index": "cpp.zero", "uninit": "cpp.zero", "move": "rs.rel", "strindex": "rs.rel",
             "sort": "js.web", "keys": "js.web", "bigid": "js.web", "missing": "js.web", "parse": "py.errors"}

# Short labels for the overview matrix, per axis in LANGS order (py, cpp, rs, js, ts).
TAGS = {
 "exec": ["bytecode, interpreted", "machine code, ahead of time", "machine code via LLVM", "interpreter + JIT", "types erased to JS"],
 "types": ["dynamic + optional hints", "static, nominal", "static, strict, no casts", "dynamic, coercing", "structural, unsound"],
 "names": ["names share objects", "copy by default", "move by default", "objects shared", "readonly in types only"],
 "memory": ["ref counting + cycle GC", "manual + RAII", "ownership + borrows", "tracing GC", "GC + using"],
 "null": ["None, KeyError", "nullptr (UB), optional", "Option, no null", "undefined and null", "strictNullChecks"],
 "numbers": ["big ints, floor //", "overflow is UB", "panic or wrap", "doubles + BigInt", "number vs bigint"],
 "text": ["code points", "bytes", "UTF-8, no indexing", "UTF-16 units", "UTF-16 units"],
 "errors": ["exceptions", "exceptions, codes, expected", "Result and ?", "exceptions, odd values", "catch is unknown"],
 "poly": ["duck typing, Protocol", "templates, concepts", "traits, generics, dyn", "prototypes, duck", "structural interfaces"],
 "meta": ["decorators, run time", "constexpr, templates", "macros, derive", "Proxy, run time", "type-level code"],
 "conc": ["GIL; free-threaded 3.14t", "threads, races are UB", "races are compile errors", "one thread, event loop", "typed promises"],
 "safety": ["safe, raises", "many errors are UB", "safe unless unsafe", "safe, all defined", "any and as"],
 "evol": ["PEPs, yearly, removes", "ISO every 3 years", "RFCs, 6 weeks, editions", "TC39, never breaks", "frequent, stricter"],
 "tooling": ["uv, ruff, ty, pytest", "-Wall, CMake", "cargo, clippy", "linters only", "tsc checks"],
 "interop": ["ctypes, PyO3, pybind11", "calls C, SIMD", "extern C, unsafe", "WebAssembly", "typed claims"],
}
