"""Focused tasks around the program. Same note format as content_program.py."""

ERRORS = {
    "id": "errors",
    "title": "Bad lines as errors",
    "axes": ["errors"],
    "q": "Say why each of the 8 malformed lines fails, then let one failure escape unhandled.",
    "habit": "In Python a function's signature never says it can fail. Rust puts failure in the return type (Result), so ignoring it is a compile error; C++ and TypeScript behave like Python here, and C++23's std::expected (missing from Apple clang 14, present in LLVM clang 23) moves C++ towards Rust.",
    "langs": {
        "python": {"file": "python/errors.py", "outs": ["errors"], "notes": [
            ("class BadLine", "Our own exception type. Subclassing <code>Exception</code> lets callers catch exactly this failure and nothing else."),
            ("def parse(", "<code>raise ... from e</code> chains the original <code>JSONDecodeError</code>, so the traceback shows both. The signature <code>-&gt; tuple[str, str]</code> says nothing about failure."),
            ("with open(", "The caller decides where to handle the error: here, per line, by printing it."),
            ('print("now without', "Uncaught, the exception unwinds the whole program and prints a traceback (exit code 1). Note line 53: the truncated string is reported as an <i>invalid control character</i>, because the newline at the end of the line ended up inside the unterminated string."),
        ]},
        "cpp": {"file": "cpp/errors.cpp", "extra": "cpp/expected.cpp", "outs": ["errors", "expected", "expected23"], "notes": [
            ("// Exception style", "C++ has exceptions much like Python's: <code>throw</code>, <code>try</code>, <code>catch</code>. The signature <code>Message parse(...)</code> does not say it can throw either."),
            ("int main(", "Catch by <code>const&amp;</code> (a reference, so the exception object is not copied or sliced)."),
            ('std::cout << "now without', "An uncaught exception calls <code>std::terminate</code>, which aborts: no traceback, exit code 134 (killed by SIGABRT). The C++23 alternative is <code>std::expected&lt;Message, std::string&gt;</code> (open <code>expected.cpp</code> below): the error is in the return type, like Rust's <code>Result</code>. Apple clang 14, the compiler this Mac ships, does not have the header (second output); LLVM clang 23 compiles it (third output), and calling <code>.value()</code> on an error throws, the C++ cousin of Rust's <code>unwrap</code> panic."),
        ]},
        "rust": {"file": "rust/examples/errors.rs", "outs": ["errors"], "notes": [
            ("// Task", "serde's error messages say which field and which column: the derived parser knows the expected shape."),
            ("// The error is part", "<code>Result&lt;Message, String&gt;</code>: success or an error string. The <code>?</code> operator returns early with the error if there is one; it is the explicit, visible version of an exception propagating."),
            ("fn main()", "<code>if let Err(e)</code> handles only the error arm. <code>.expect(\"...\")</code> means \"crash with this message if this fails\": fine for a tool, a smell in a library."),
            ('println!("now with .unwrap', "<code>.unwrap()</code> on an <code>Err</code> <b>panics</b>: the thread stops with a message and the process exits with code 101. A panic is for bugs, not for expected failures like bad input."),
        ]},
        "ts": {"file": "ts/errors.ts", "outs": ["errors"], "notes": [
            ("interface Message", "Same idea as Python: an <code>Error</code> subclass for our failure."),
            ("// Like Python", "In a <code>catch</code>, the error is typed <code>unknown</code> under <code>strict</code>: anything can be thrown in JavaScript, even a string, so you must narrow it. Note line 1944: <code>typeof null</code> is <code>\"object\"</code>, a decades-old JavaScript quirk."),
            ("const lines", "<code>instanceof</code> narrows to our error type; anything else is re-thrown."),
            ('console.log("now without', "Uncaught, Node prints the throw site and a stack trace, then exits with code 1. The trace points at the compiled <code>.js</code> file, because that is what Node runs (source maps can map it back)."),
        ]},
    },
}

MESSAGE = {
    "id": "message",
    "title": "A message type",
    "axes": ["values", "memory", "types"],
    "q": "Define a Message with a method; assign it to a second name, change it, and see who else changed.",
    "habit": "In Python, b = a never copies: both names point at one object. C++ copies on b = a; Rust moves (a becomes unusable) unless you ask for .clone(); TypeScript behaves like Python.",
    "langs": {
        "python": {"file": "python/message.py", "outs": ["message"], "notes": [
            ('"""Task', "<code>@dataclass</code> writes <code>__init__</code>, <code>__repr__</code> and <code>__eq__</code> from the annotated fields."),
            ("a = Message(", "<code>b = a</code> binds a second name to the same object, so changing <code>b.text</code> changes what <code>a</code> sees. <code>a is b</code> is <code>True</code>."),
            ("c = replace(", "<code>dataclasses.replace</code> makes a new object. (It is a shallow copy: fields that are lists would still be shared.)"),
        ]},
        "cpp": {"file": "cpp/message.cpp", "outs": ["message"], "notes": [
            ("struct Message", "A <code>struct</code> is a class whose members are public by default. The two strings live <b>inside</b> the Message (each a small header pointing to its characters), not behind a pointer to a separate object. <code>const</code> after the method means it does not modify the Message."),
            ("Message a{", "<code>Message b = a;</code> <b>copies</b>: b gets its own strings. This is C++'s default for every type; copying a big vector by accident is a classic slowdown."),
            ("Message& r = a;", "A reference (<code>&amp;</code>) is a second name for an existing object: the C++ way to get Python's sharing, and you must ask for it."),
            ("Message c = std::move(a);", "<code>std::move</code> lets <code>c</code> take a's string buffers instead of copying them. Unlike Rust, <code>a</code> is still usable afterwards: \"valid but unspecified\" (here, empty, as the <code>[]</code> shows). The compiler does not stop you reading it."),
        ]},
        "rust": {"file": "rust/examples/message.rs", "outs": ["message"], "notes": [
            ("#[derive(Debug, Clone)]", "Rust has no classes: a <code>struct</code> holds data, an <code>impl</code> block adds methods, and <code>derive</code> generates <code>Debug</code> (printing with <code>{:?}</code>) and <code>Clone</code> (explicit copying)."),
            ("impl Message", "<code>&amp;self</code>: the method borrows the Message read-only. Py: <code>self</code>, but with the promise not to change it checked by the compiler."),
            ("let a = Message", "<code>a.clone()</code> is an explicit deep copy; Rust never copies a heap-owning value silently."),
            ("let c = a;", "<code>let c = a;</code> <b>moves</b>: the Message now belongs to <code>c</code>, and any later use of <code>a</code> is a compile error (see the use-after-move mistake below). No copy, no shared object, no garbage collector needed to know who frees it."),
        ]},
        "ts": {"file": "ts/message.ts", "outs": ["message"], "notes": [
            ("class Message", "<code>public user: string</code> in the constructor declares and assigns the field in one go (a TypeScript shorthand)."),
            ("const a = new", "Objects are always handled by reference, as in Python: <code>b</code> and <code>a</code> are one object. <code>const</code> only stops re-binding the name; the object stays mutable."),
            ("const c = Object.assign(", "A shallow copy. Node prints class instances with their class name."),
        ]},
    },
}

CLOSURE = {
    "id": "closure",
    "title": "Closures",
    "axes": ["values", "memory"],
    "q": "A tally function that remembers per-user counts between calls; then three functions made in a loop.",
    "habit": "Python closures capture variables, not values, so lambdas made in a loop all see the loop's last value. C++ makes you choose per variable ([i] copies, [&j] refers); Rust's move closures copy or take ownership; TypeScript's let gives each iteration its own variable, var does not.",
    "langs": {
        "python": {"file": "python/closure.py", "outs": ["closure"], "notes": [
            ("def make_tally()", "<code>add</code> keeps a reference to <code>counts</code>, which lives on after <code>make_tally</code> returns: the garbage collector keeps it alive as long as <code>add</code> exists."),
            ("add = make_tally()", "Each call updates the same captured dict."),
            ("fns = [lambda: i", "All three lambdas read the variable <code>i</code> when called, after the loop ended: <code>[2, 2, 2]</code>. The default-argument trick evaluates <code>i</code> at creation time."),
        ]},
        "cpp": {"file": "cpp/closure.cpp", "outs": ["closure"], "notes": [
            ("std::function<long", "<code>std::function</code> holds any callable with that signature. The capture list <code>[counts]</code> copies the map into the lambda; <code>mutable</code> allows changing that copy. Capturing <code>[&amp;counts]</code> here would compile and leave a reference to a local that dies when <code>make_tally</code> returns: undefined behaviour."),
            ("auto add = make_tally();", "Same result as Python: 12 and 3."),
            ("std::vector<std::function<int()>> by_value", "You choose per variable: <code>[i]</code> copies (0 1 2), <code>[&amp;j]</code> refers to j, which is 3 by the time the lambdas run (3 3 3)."),
        ]},
        "rust": {"file": "rust/examples/closure.rs", "outs": ["closure"], "notes": [
            ("fn make_tally()", "<code>impl FnMut(&amp;str, u64) -&gt; u64</code>: \"some closure that may mutate its captured state\". <code>move</code> transfers ownership of <code>counts</code> into the closure, so the compiler knows it outlives the function. Without <code>move</code>, it would refuse to compile."),
            ("let mut add = make_tally();", "<code>add</code> must be <code>mut</code> because calling it changes its state: the type system tracks even that."),
            ("let fns:", "<code>move || i</code> copies each <code>i</code> (integers are <code>Copy</code>): 0 1 2. <code>Box&lt;dyn Fn() -&gt; i32&gt;</code> puts closures of different concrete types behind one pointer type so they fit in one Vec."),
        ]},
        "ts": {"file": "ts/closure.ts", "outs": ["closure"], "notes": [
            ("function makeTally()", "Same as Python: the arrow function captures <code>counts</code> by reference and the garbage collector keeps it alive."),
            ("const add = makeTally();", "The parameter types of the returned arrow are inferred from the declared return type."),
            ("const withLet", "<code>let</code> in a <code>for</code> loop creates a fresh binding per iteration (0 1 2); the older <code>var</code> has one binding for the whole function (3 3 3). Prefer <code>let</code> and <code>const</code>."),
        ]},
    },
}

GENERIC = {
    "id": "generic",
    "title": "A generic top_k",
    "axes": ["types", "abstraction"],
    "q": "One top_k function that works for (user, count) pairs and for words, ranked by a key function.",
    "habit": "Python sorts anything that has <, and floats with NaN sort silently wrong. Rust's sort needs Ord, which f64 does not have (NaN is unordered), so the same call does not compile; C++ concepts and TypeScript generics check the key's type before running.",
    "langs": {
        "python": {"file": "python/generic.py", "outs": ["generic"], "notes": [
            ("def top_k[T]", "Python 3.12 syntax for a generic function (PEP 695): <code>T</code> is a type variable. Only type checkers use it; at run time this is an ordinary function that accepts anything."),
            ("counts = [", "Same function, two element types."),
            ("print(top_k([0.5", "The hint says the key returns <code>int</code>; Python runs the float call anyway, and NaN breaks the ordering silently: 2.0 should be first and is missing."),
        ]},
        "cpp": {"file": "cpp/generic.cpp", "outs": ["generic"], "notes": [
            ("// A template", "A <b>template</b>: the compiler stamps out a separate, fully typed copy of <code>top_k</code> for each combination of <code>T</code> and <code>Key</code> it is called with (monomorphisation), so there is no run-time cost. The <code>requires</code> clause (a C++20 <b>concept</b>) says the key's result must be totally ordered; without it, mistakes surface as long errors from deep inside <code>std::sort</code>."),
            ("int main()", "<code>items</code> is taken by value (a copy we can sort freely). Each call instantiates a different <code>top_k</code>."),
        ]},
        "rust": {"file": "rust/examples/generic.rs", "outs": ["generic"], "notes": [
            ("fn top_k<", "<code>T: Clone, K: Ord</code> are <b>trait bounds</b>: the function may only use what those traits promise. <code>impl Fn(&amp;T) -&gt; K</code> accepts any closure of that shape. Like C++, Rust generates a separate copy per type (monomorphisation), but checks the body once, against the bounds, instead of at each use."),
            ("fn main()", "<code>|kv| kv.1</code> is a closure; <code>kv.1</code> is the second tuple field."),
        ]},
        "ts": {"file": "ts/generic.ts", "outs": ["generic"], "notes": [
            ("function topK<T>", "Type parameter <code>&lt;T&gt;</code>, checked by <code>tsc</code> and then erased: one JavaScript function at run time. <code>readonly T[]</code> promises not to change the input."),
            ("const counts", "<code>T</code> is inferred from the argument at each call."),
            ("console.log(topK([0.5", "<code>number</code> includes NaN, the comparator returns NaN, and the sort quietly gives the wrong answer, as in Python."),
        ]},
    },
}

THREADS = {
    "id": "threads",
    "title": "Four threads",
    "axes": ["concurrency"],
    "q": "Split the lines into 4 chunks, count each chunk on its own thread, merge the per-user maps. Same totals as the program.",
    "habit": "Python threads share every object, and the GIL hid races in practice. Free-threaded Python 3.14t, C++ and Rust really run threads in parallel; Rust refuses to compile unsynchronised sharing, C++ compiles it and corrupts data (see the race mistake). Giving each thread its own map, as here, avoids the question.",
    "langs": {
        "python": {"file": "python/threads.py", "outs": ["threads", "threads_ft"], "notes": [
            ("from count_tokens import tokens", "Reuse the tokenizer from the program."),
            ("def count_chunk(", "Each thread builds its own <code>Counter</code>: nothing is shared while counting."),
            ("lines = open(", "<code>ThreadPoolExecutor</code> runs <code>count_chunk</code> on 4 OS threads. On the default build the GIL (global interpreter lock) lets only one thread run Python bytecode at a time, so this is correct but not faster; on the free-threaded 3.14t build (second output) the threads run in parallel. Timings are on the [[Benchmark|t-bench]] tab."),
        ]},
        "cpp": {"file": "cpp/threads.cpp", "outs": ["threads"], "notes": [
            ("int main(", "Read all lines into a vector first; the threads only read it."),
            ("std::vector<std::unordered_map", "One map per thread. The lambda captures <code>lines</code> and <code>parts</code> by reference (<code>&amp;</code>) and <code>t</code> by value. Thread <code>t</code> writes only <code>parts[t]</code>, so there is no race, but nothing in the language checks that: it is your reasoning."),
            ("for (auto& th : threads)", "<code>join</code> waits for each thread. Destroying a <code>std::thread</code> that was neither joined nor detached calls <code>std::terminate</code> (C++20's <code>std::jthread</code> joins automatically)."),
        ]},
        "rust": {"file": "rust/examples/threads.rs", "outs": ["threads"], "notes": [
            ("fn main()", "<code>chunks</code> are slices: borrowed views into <code>lines</code>, no copying."),
            ("// Scoped threads", "<code>thread::scope</code> guarantees every thread is joined before the scope ends, so threads may borrow local data. The compiler checks that each closure only shares what is safe to share (types marked <code>Send</code>/<code>Sync</code>); each thread returns its own map by value."),
            ("let mut total", "Merge, then pick the top user with the same tie-break as the program."),
        ]},
        "ts": {"file": "ts/threads.ts", "outs": ["threads"], "notes": [
            ("// Task", "JavaScript has no shared-memory threads for ordinary objects. Async code (Promises, <code>await</code>) gives concurrency for I/O on one thread; CPU work in parallel needs <b>workers</b>, separate JavaScript instances that exchange copied messages."),
            ("if (isMainThread)", "The same file runs as main thread and as worker. Each worker gets its chunk as <code>workerData</code>, a copy made by the structured-clone algorithm; <code>Promise.all</code> waits for the four replies."),
            ("} else {", "Inside a worker: count and post the Map back (copied again). Copying is the price of never sharing."),
        ]},
    },
}

MEMORY = {
    "id": "memory",
    "title": "Where the numbers live",
    "axes": ["memory"],
    "q": "Eight timestamps from the log in a list or vector: print the real addresses of the slots and of the values.",
    "habit": "A Python list of numbers is a list of pointers to separate int objects. NumPy arrays, C++ vectors and Rust Vecs store the numbers themselves, side by side; the animation below draws these exact addresses.",
    "langs": {
        "python": {"file": "python/memory.py", "outs": ["memory"], "notes": [
            ("ts = [", "Each <code>1759650000 + 7 * i</code> creates a new int object on the heap (CPython caches only -5 to 256)."),
            ("buf = ctypes", "Peeking at CPython internals with <code>ctypes</code>: the list object holds a pointer (<code>ob_item</code>, 24 bytes into the object on a 64-bit build) to a separate array of 8-byte pointers. <code>id(x)</code> is the object's address in CPython. Each int object is 32 bytes (reference count, type pointer, a size-and-sign tag, and two 30-bit digits)."),
            ("for i, x in", "Slots are 8 bytes apart; the objects they point to are wherever the allocator put them."),
            ("order = [", "Reordering the list (as sorting by user would) moves only pointers; the objects stay put, so walking the list now jumps around memory."),
        ]},
        "cpp": {"file": "cpp/memory.cpp", "outs": ["memory"], "notes": [
            ("std::vector<std::int64_t> ts;", "The vector object (on the stack: three pointers) owns one heap buffer holding the numbers themselves, 8 bytes each, contiguous. <code>ts.data()</code> is that buffer."),
            ("for (int i = 0;", "Consecutive elements are exactly 8 bytes apart: one 64-byte cache line holds 8 of them."),
        ]},
        "rust": {"file": "rust/examples/memory.rs", "outs": ["memory"], "notes": [
            ("let ts: Vec<i64>", "<code>Vec&lt;i64&gt;</code> has the same layout as the C++ vector: pointer, capacity, length, and one contiguous buffer. <code>{:p}</code> prints an address."),
        ]},
        "ts": {"file": "ts/memory.js", "outs": ["memory"], "notes": [
            ("// Task", "JavaScript does not expose addresses. V8's internal <code>%DebugPrint</code> (allowed by a flag, not part of the language) shows the array's <b>elements kind</b>: <code>PACKED_SMI_ELEMENTS</code> means the small integers are stored directly in one contiguous backing store, not as separate boxes. Arrays with fractions switch to unboxed doubles; mixed arrays fall back to pointers. See V8's \"Elements kinds\" post."),
        ]},
    },
}

TASKS = [ERRORS, MESSAGE, CLOSURE, GENERIC, THREADS, MEMORY]
