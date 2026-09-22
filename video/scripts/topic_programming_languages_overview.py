"""
Topic overview: programming languages, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: five complete
zero-to-expert curricula is a syllabus, not a plan, and nobody climbs five
ladders. What makes the page usable is that the five sit at different depths
of one stack and you meet each for a different reason. So the inventory is the
languages, and the organising question is what each one is actually for in an
AI engineer's work. That axis is the whole difference between this and a
"which language should I learn" video.

The outline that survived the revision step:

    ident       what this is, and how current
    map         the five tracks and the two companion pages, parked
    question    not how to learn five, but what each one is for
    ladder      the shared five stages, and the stage-3 refresher trick
    python      the working language: the parts you can miss for years
    systems     C++ and Rust answering one question in opposite ways
    js_ts       the harness layer, as four surprises with one rule each
    mojo        the adjacent thing, open sourced in August
    gpu_rust    the new thing: GPU kernels in Rust, in two tracks
    close       the take: one language you work in, one you read the machine in

What the step-4 critique changed:

  - Draft one gave C++ and Rust a beat each, and they said the same thing
    twice, because both pages are organised around object lifetime. Merged
    into one comparison, which is also the only beat where the two ladders
    can be seen to disagree.
  - Draft one opened the Rust beat on the ecosystem list (uv, ruff, polars).
    That is a reason to care, not the idea, so it moved to the end of the
    beat where it lands as "you already run this" rather than as a list.
  - The GPU-kernel material was in the middle of draft one, next to Rust. It
    is the one genuinely new thing on the page this month and it is a better
    ending than a summary, so it moved to the last beat before the take.
  - Three figures were doing no work in speech (the per-track reading times,
    the C++26 paper names, the TS 7.0 release date) and were cut.
  - B had five turns in draft one and two of them were agreement. Three now,
    each one the question the viewer is forming.

Every figure comes from the canonical page "Topic: programming-languages".
If this video names something the page does not, the page is the defect.

Names are spelled the way they are said, because text to speech reads
"C++", "PyO3" and "cutile-rs" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: programming-languages"
SUBTITLE = "five ladders, and what each language is actually for"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "Python", "tone": "subject",
         "items": ["the object model", "asyncio", "3.12 to 3.15"]},
        {"head": "C++", "tone": "cost",
         "items": ["object lifetime", "undefined behaviour", "C++20 / 23 / 26"]},
        {"head": "Rust", "tone": "verified",
         "items": ["ownership", "unsafe and Miri", "GPU kernels"]},
        {"head": "JS and TS", "tone": "machinery",
         "items": ["the event loop", "types, then erased", "TS 7.0"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Not how to learn five languages.\n"
                         "What is each one actually for?",
                 "note": "all five are written zero to expert, and nobody "
                         "climbs five ladders"},

    "ladder": {"kind": "stack", "layers": [
        ("0. setup", "the one idea the language is organised around"),
        ("1. foundations", "correct small programs"),
        ("2. proficiency", "idiomatic code others can maintain"),
        ("3. advanced", "concurrency, memory, metaprogramming, failure modes"),
        ("4. expert", "explain it from the spec, and teach it"),
    ]},

    "python": {"kind": "points", "focus": "Python",
               "head": "the parts you can miss for years",
               "items": [
        "the data model: every built-in operation dispatches through a dunder",
        "descriptors: the protocol behind property and bound methods",
        "asyncio: cooperative, single-threaded, right for IO and wrong for CPU",
        "PEP 659: hot bytecode specialises itself while the program runs",
    ]},

    "systems": {"kind": "compare", "focus": "C++", "sides": [
        {"head": "C++: the lifetime is yours", "tone": "cost", "items": [
            "RAII ties release to a destructor",
            "UB is not a wrong answer",
            "it is a program with no defined meaning"]},
        {"head": "Rust: the compiler's", "tone": "verified", "items": [
            "one owner per value, and it is tracked",
            "proved before the program runs",
            "unsafe is where you take the obligation back"]},
    ]},

    "js_ts": {"kind": "table", "focus": "JS and TS",
              "head": ["the surprise", "the actual rule"],
              "rows": [
                  ["the loop-variable bug", "closures capture variables, not values"],
                  ["a callback loses `this`", "`this` is bound by the call site"],
                  ["one call stalls everything", "one thread, draining a task queue"],
                  ["TypeScript did not catch it", "types are erased before anything runs"],
              ]},

    "mojo": {"kind": "stat", "big": "1.0",
             "caption": "Mojo, open sourced under Apache 2.0 on 18 August 2026",
             "note": "Python-like syntax, static types, ownership, compiled "
                     "through MLIR so one file targets CPU and GPU. Modular's "
                     "acquisition by Qualcomm closed in late July"},

    "gpu_rust": {"kind": "table", "focus": "Rust",
                 "head": ["track", "you write", "status"],
                 "rows": [
                     ["cutile-rs", "a tile", "in production: HF Grout, mistral.rs"],
                     ["cuda-oxide", "a thread", "early alpha"],
                 ]},

    "close": {"kind": "claim",
              "text": "One language you work in.\n"
                      "One you can read the machine in.",
              "note": "and the second slot is being contested right now"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of programming languages, as this knowledge base "
        "treats them. Five of them, each written from zero to expert, and what "
        "each one is for in the work of an artificial intelligence engineer."),
    (A, "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Here is the whole board. Five tracks, and nothing explained yet."),
    (A, "Python, organised around the object model, asyncio and the interpreter "
        "itself, with a companion page tracking three point twelve to three "
        "point fifteen."),
    (A, "C plus plus, organised around object lifetime and undefined "
        "behaviour, with a second companion page for the standards. Rust, "
        "organised around ownership, and since this month, G P U kernels."),
    (A, "And JavaScript and TypeScript together, because TypeScript is a type "
        "language over JavaScript rather than a separate one."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Five complete curricula. Nobody is doing all of that."),
    (A, "No, and the page does not ask you to. The useful question is the one "
        "on the screen. What is each of these actually for?"),
    (A, "Because they are not alternatives. They sit at different depths of "
        "one stack, and you meet each of them for a different reason."),
]

SCRIPT["ladder"] = [
    (A, "First, the thing that makes them comparable. Every one of these pages "
        "uses the same five stages, so progress means the same thing across "
        "all of them."),
    (A, "Setup and the mental model. Foundations. Working proficiency. "
        "Advanced. Expert. And each stage ends in a gate: a question you "
        "should be able to answer cold before you move on."),
    (A, "Which gives you the refresher trick. Read the stage three gate first. "
        "If you can answer it, you only need stage four and the traps list. If "
        "you cannot, the gap is usually one stage down, not at the beginning."),
]

# --- the working language -------------------------------------------------
SCRIPT["python"] = [
    (A, "Python first, because it is the working language. Which means the "
        "ladder is aimed at the parts you can use daily for years without ever "
        "meeting."),
    (A, "The data model is the set of dunder protocols that every built in "
        "operation dispatches through. Descriptors are the get and set "
        "protocol behind property, classmethod, and bound methods themselves, "
        "and they are what makes framework magic explicable rather than "
        "mysterious."),
    (A, "Asyncio is cooperative, single threaded concurrency, which makes it "
        "right for high concurrency input output and wrong for C P U work."),
    (A, "And P E P six five nine, the specialising adaptive interpreter, "
        "rewrites hot bytecode into type specialised forms while the program "
        "runs. Which is why a loop over stable types gets faster on its own, "
        "and why breaking type stability costs more than it looks."),
]

# --- the two systems languages, on one axis -------------------------------
SCRIPT["systems"] = [
    (A, "Underneath Python, two languages answer the same question in opposite "
        "ways. Who owns the lifetime of an object?"),
    (A, "C plus plus hands it to you. R A I I ties a resource's release to a "
        "destructor that runs at the end of scope, and that is the language's "
        "entire answer. Which is why dangling references are the "
        "characteristic C plus plus bug rather than an incidental one."),
    (A, "And undefined behaviour is the second fact on that side. The "
        "optimiser is allowed to assume your program never invokes it. So a "
        "U B bug does not give you a wrong answer. It gives you a program with "
        "no defined meaning at all."),
    (B, "And Rust simply refuses to compile that?"),
    (A, "Every value has exactly one owner, the compiler tracks it, and data "
        "race freedom is proved before the program runs rather than tested for "
        "afterwards. Unsafe is where you take the obligation back, and Miri is "
        "the interpreter that detects undefined behaviour inside it. C plus "
        "plus has no real equivalent."),
    (A, "And you already run Rust daily. U V, Ruff, Ty, tokenizers, polars, "
        "pydantic core. Py O three is how they all reach Python."),
]

# --- the harness layer ----------------------------------------------------
SCRIPT["js_ts"] = [
    (A, "Then JavaScript and TypeScript, which you need because the agent "
        "harnesses, the M C P servers and the dev tooling live there."),
    (A, "Read the table as surprises with one rule each. The loop variable bug "
        "happens because closures capture variables rather than values. A "
        "callback loses this because this is bound by the call site rather "
        "than by the definition."),
    (A, "One synchronous call stalls the whole process because the event loop "
        "is a single thread draining a task queue."),
    (A, "And TypeScript did not catch it because types are erased entirely "
        "before anything runs. It never changes behaviour, and it never "
        "validates data arriving from a network. Version seven is the compiler "
        "rewritten as a native Go binary: a port rather than a redesign, and "
        "roughly ten times faster."),
]

# --- the adjacent one -----------------------------------------------------
SCRIPT["mojo"] = [
    (A, "One adjacent thing that is not a track. Mojo, Modular's systems "
        "language for accelerators."),
    (A, "Python like syntax with static types, ownership and compile time "
        "metaprogramming, compiled through M L I R so one source file targets "
        "both C P U and G P U."),
    (A, "It aims squarely at the slot currently filled by writing kernels in "
        "C plus plus and calling them from Python. One language instead of "
        "two. And the number on the screen is why it is worth watching now: "
        "open source at one point zero, under Apache two point zero, on the "
        "eighteenth of August."),
]

# --- the new thing --------------------------------------------------------
SCRIPT["gpu_rust"] = [
    (A, "Which brings us to the one genuinely new thing on this page, and it "
        "is the right place to finish. Since September, Rust writes G P U "
        "kernels. In two N Vidia tracks, which are on the table."),
    (A, "Cutile R S is the tile track. You write tiles, it is compiled through "
        "CUDA Tile I R, and it is already in production, in Hugging Face's "
        "Grout inference engine and in Mistral dot R S."),
    (A, "Cuda oxide is the thread track, and it is still early alpha. It "
        "extends the claim that a data race is a type error across the host "
        "device boundary, into a setting where the race is between thousands "
        "of threads inside one kernel launch. That is the first time the "
        "ownership model has been asked to carry that."),
    (B, "And the tile track sidesteps the question entirely."),
    (A, "Which is the interesting half. Keep ordinary ownership, change the "
        "unit of work, and the question does not arise."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is this map for? Not for learning five languages, because you "
        "will not."),
    (A, "Python is the one you work in. One systems language is the one you "
        "read the machine in, and which one that is has been a settled "
        "question for thirty years. JavaScript and TypeScript you learn "
        "because the harnesses live there, not because you chose to."),
    (A, "And that second slot is being contested right now. G P U kernels in "
        "Rust was the top Hacker News story of the week, at nine hundred and "
        "sixty eight points."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
