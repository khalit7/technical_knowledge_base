"""Deliberate mistakes: the same bug in each language, and what really happens.
verdict: compile (rejected before it runs), check (rejected by an optional checker;
the code still runs), crash (stops at run time with an error), silent (runs, wrong
or undefined result, no error), fine (not a bug in this language), na (cannot be written)."""

VERDICTS = {
    "compile": "Rejected by the compiler",
    "check": "Rejected by the type checker",
    "crash": "Crashes when that line runs",
    "silent": "Runs; wrong answer, no error",
    "fine": "Not a bug here",
    "na": "Cannot be written",
}

MISTAKES = [
    {
        "id": "typo", "title": "Misspelled field", "axes": ["types"],
        "q": "<code>m.usr</code> instead of <code>m.user</code>.",
        "habit": "Python finds this only when the line runs, possibly hours into a job; a type checker (mypy, pyright, ty) finds it in seconds if your code has hints.",
        "cells": {
            "python": {"file": "python/mistakes/typo.py", "outs": ["m_typo", "m_typo_mypy"], "verdict": "crash", "also": "check",
                       "note": "Runs until the line executes, then <code>AttributeError</code> (3.14 even suggests the fix). mypy with <code>--strict</code> rejects it without running anything; it is optional and separate from Python."},
            "cpp": {"file": "cpp/mistakes/typo.cpp", "outs": ["m_typo"], "verdict": "compile",
                    "note": "No executable is produced. The compiler knows every member of <code>Message</code>."},
            "rust": {"file": "rust/mistakes/typo.rs", "outs": ["m_typo"], "verdict": "compile",
                     "note": "Error code E0609, with a suggested fix. <code>rustc --explain E0609</code> prints a full explanation."},
            "ts": {"file": "ts/mistakes/typo.ts", "outs": ["m_typo"], "verdict": "check",
                   "note": "<code>tsc</code> reports TS2551. The checker is separate from running: tools that only strip types (Node's type stripping, esbuild) would run it and print <code>undefined</code>."},
        },
    },
    {
        "id": "missing", "title": "A user not in the map yet", "axes": ["nothingness", "types"],
        "q": "Read the count for a new user and add to it, forgetting that the key may be missing.",
        "habit": "<code>dict.get</code> returns None for a missing key, and None + 5 fails only at run time. Rust and TypeScript put the maybe-missing in the type (Option, number | undefined); C++'s operator[] quietly invents a 0.",
        "cells": {
            "python": {"file": "python/mistakes/missing.py", "outs": ["m_missing", "m_missing_mypy"], "verdict": "crash", "also": "check",
                       "note": "<code>TypeError</code> on the first new user. mypy sees <code>int | None</code> and refuses the addition."},
            "cpp": {"file": "cpp/mistakes/missing.cpp", "outs": ["m_missing"], "verdict": "silent",
                    "note": "<code>per_user[\"u0777\"]</code> on a missing key <b>inserts</b> it with value 0: no error, and the map grew from 1 to 2 entries just by reading. <code>.at()</code> throws instead; <code>.find()</code> or C++20 <code>.contains()</code> asks first."},
            "rust": {"file": "rust/mistakes/missing.rs", "outs": ["m_missing"], "verdict": "compile",
                     "note": "<code>get</code> returns <code>Option&lt;&amp;u64&gt;</code>, which cannot be added to a number: you must say what a missing key means (<code>.unwrap_or(&amp;0)</code>, <code>match</code>, or <code>entry().or_insert(0)</code> as in the program)."},
            "ts": {"file": "ts/mistakes/missing.ts", "outs": ["m_missing"], "verdict": "check",
                   "note": "With <code>strict</code> (which turns on <code>strictNullChecks</code>), <code>Map.get</code> returns <code>number | undefined</code>. Without <code>strict</code> this compiles and stores <code>NaN</code> (<code>undefined + 5</code>)."},
        },
    },
    {
        "id": "dangling", "title": "Reference into a growing list", "axes": ["memory"],
        "q": "Keep a reference to the first element, append 1000 more, then read the reference.",
        "habit": "In Python this is always safe: the list holds pointers, and the element object never moves. In C++ the vector's buffer is reallocated as it grows, and your reference now points into freed memory.",
        "cells": {
            "python": {"file": "python/mistakes/dangling.py", "outs": ["m_dangling"], "verdict": "fine",
                       "note": "The list's pointer array is reallocated as it grows, but <code>first</code> points at the tuple object, which stays where it is, kept alive by reference counting."},
            "cpp": {"file": "cpp/mistakes/dangling.cpp", "outs": ["m_dangling", "m_dangling_asan"], "verdict": "silent",
                    "note": "Compiles without a warning even with <code>-Wall</code>, and prints garbage (<code>^E 0</code>: a control byte and 0 instead of <code>u0029 9491</code>). This is <b>undefined behaviour</b>: it might print the right answer, garbage, or crash. AddressSanitizer (a debug build mode) catches it at run time: heap-use-after-free, freed by the <code>push_back</code> on line 10, read on line 11."},
            "rust": {"file": "rust/mistakes/dangling.rs", "outs": ["m_dangling"], "verdict": "compile",
                     "note": "The <b>borrow checker</b>: while a shared borrow (<code>&amp;top[0]</code>) is alive, nobody may mutate <code>top</code>. Same bug as C++, refused at compile time. The fix is to copy what you need (<code>top[0].clone()</code>) or take the reference after the loop."},
            "ts": {"file": "ts/mistakes/dangling.ts", "outs": ["m_dangling", "m_dangling_run"], "verdict": "fine",
                   "note": "Like Python: arrays hold references and the garbage collector keeps the inner array alive. <code>tsc</code> is happy, and Node 22 runs the <code>.ts</code> file directly by stripping the types."},
        },
    },
    {
        "id": "moved", "title": "Using a value after giving it away", "axes": ["values", "memory"],
        "q": "Pass a Message into a function that stores it, then keep using it.",
        "habit": "Python passes a reference and keeps sharing, so the old name still works. Rust moves ownership into the function; C++ copies unless you std::move, and a moved-from object is still readable but emptied.",
        "cells": {
            "python": {"file": None, "outs": [], "verdict": "fine",
                       "note": "Both names refer to one shared object (see <b>A message type</b>: <code>a is b</code>). No error, but changes through one name show through the other."},
            "cpp": {"file": "cpp/message.cpp", "outs": ["message"], "verdict": "silent",
                    "note": "After <code>Message c = std::move(a);</code>, reading <code>a.text</code> compiles and prints an empty string (the <code>[]</code> in the output): \"valid but unspecified\"."},
            "rust": {"file": "rust/mistakes/moved.rs", "outs": ["m_moved"], "verdict": "compile",
                     "note": "E0382: <code>m</code> was moved into <code>store</code>. The compiler suggests two fixes: borrow instead (<code>&amp;Message</code>) or clone."},
            "ts": {"file": None, "outs": [], "verdict": "fine",
                   "note": "As in Python: objects are shared references, nothing is moved."},
        },
    },
    {
        "id": "race", "title": "Four threads, one counter, no lock", "axes": ["concurrency"],
        "q": "Four threads each add 1 to the same map entry 200,000 times. Expected: 800,000.",
        "habit": "<code>counts[k] += 1</code> looks like one step but is read, add, write. With the GIL it usually comes out right; on free-threaded Python 3.14t it loses most of the updates.",
        "cells": {
            "python": {"file": "python/mistakes/race.py", "outs": ["m_race", "m_race_ft"], "verdict": "silent",
                       "note": "Default build (GIL): 800,000 on this run, but the language does not promise it: the GIL can switch threads between the read and the write. Free-threaded 3.14t: about a third of the updates survive, different every run. Fix: a <code>threading.Lock</code>, or one Counter per thread as in <b>Four threads</b>."},
            "cpp": {"file": "cpp/mistakes/race.cpp", "outs": ["m_race", "m_race_tsan"], "verdict": "silent",
                    "note": "Compiles, runs, wrong total: a data race is undefined behaviour in C++. ThreadSanitizer (another debug build mode) names the two racing writes and the line. Fix: <code>std::mutex</code>, <code>std::atomic</code>, or one map per thread."},
            "rust": {"file": "rust/mistakes/race.rs", "outs": ["m_race", "m_race_fixed"], "verdict": "compile",
                     "note": "E0499: two closures may not hold <code>&amp;mut counts</code> at once. Rust's thread safety is the same borrow rule as for one thread. Wrapping the map in a <code>Mutex</code> (second output) compiles and gives exactly 800,000."},
            "ts": {"file": None, "outs": [], "verdict": "na",
                   "note": "Workers share no ordinary objects (each gets a copy), so this race cannot be written. Shared memory exists only as raw bytes (<code>SharedArrayBuffer</code>, with <code>Atomics</code> for safe updates)."},
        },
    },
    {
        "id": "order", "title": "Sorting things with no order", "axes": ["types", "abstraction"],
        "q": "Call a generic top_k on values that have no total order: floats with NaN, or a struct with no comparison.",
        "habit": "Python and JavaScript sort lists containing NaN without complaint and return a wrong order. Rust's Ord trait is only for types with a total order, which f64 is not.",
        "cells": {
            "python": {"file": "python/generic.py", "outs": ["generic"], "verdict": "silent",
                       "note": "Last line of the output: <code>[0.5, nan]</code>; 2.0, the largest, is missing. A Message without <code>__lt__</code> would raise <code>TypeError</code> when sorted."},
            "cpp": {"file": "cpp/mistakes/order.cpp", "outs": ["m_order"], "verdict": "compile",
                    "note": "The C++20 concept <code>std::totally_ordered</code> rejects <code>Message</code> and explains why, step by step. But <code>double</code> passes the concept (concepts check syntax, not NaN), and sorting NaNs with <code>&lt;</code> is undefined behaviour."},
            "rust": {"file": "rust/mistakes/order.rs", "outs": ["m_order"], "verdict": "compile",
                     "note": "E0277: <code>f64</code> does not implement <code>Ord</code>. You must choose: <code>f64::total_cmp</code> (a defined total order over every float, NaN included) or filter NaN out first."},
            "ts": {"file": "ts/generic.ts", "outs": ["generic"], "verdict": "silent",
                   "note": "<code>[ 0.5, NaN ]</code>: the comparator returns NaN, and the sort quietly gives the wrong answer, as in Python."},
        },
    },
]
