"""
Topic overview: CUDA and GPU programming, as of 22 September 2026.

Source: the canonical Notion page "Topic: cuda-and-gpu-programming", read
from Notion directly and byte-identical to the repo mirror at the time of
writing. Every figure and name below is on that page. Nothing is imported
from the six deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A mental model, not a comparison. Nobody
chooses between cuBLAS and Triton the way they choose between database
engines: the page is one stack with layers, and the organising question is
what the layers are for. The skill names this axis outright, and the cut of
this episode cleared in 74326b3 had found it independently: what the machine
is, where you are allowed to write, and what you call instead of writing
anything at all. That axis is kept, because it is the hard-won part.
Everything else is written fresh, since that cut was outlined against a spine
that no longer exists and ran to twelve beats.

The page's own sentence, "nearly all kernel optimisation is memory
optimisation", is the organising question. It is what turns the map from an
inventory into an argument, and it is why the tour visits the machine before
it visits anything you can type.

The outline that survived the revision step:

    ident     what CUDA is, that it is three layers rather than a product
              list, and the date
    map       all three layers named in full, nothing explained. Parked as
              the home frame
    question  bytes moved, not operations issued: the sentence the rest of
              the topic is downstream of
    memory    the hierarchy, and the single idea every optimisation turns
              out to be
    where     the levels you may write at, what you think in at each, and
              what each one costs you
    rust      the two CUDA Rust tracks, which reproduce that table in a
              second language
    call      the layer most people should live in, and the profiler order
    close     the ladder, climbed down rather than up, and what would redraw
              it

What the critique step changed:

  - Draft one ran to 1,253 words, about eight and a half minutes, which is
    past the rung where the encode gives up 1080p and close to where the
    render fails outright. The cut that bought most of it was a whole beat on
    the tensor-core instruction vocabulary; see below for why that one and
    what it costs.
  - Draft one gave profiling a beat of its own. The useful part is two
    sentences, the order rather than the metrics, so it moved into `call`,
    where Nsight already sits on the map. The rest is a child page.
  - Draft one opened `map` on "Here is the whole board". A beat's reveals are
    spread across its whole length, so a first line cannot point at its own
    panel. The deixis came out, and the pointing line moved to the end, where
    it lands as the map morphs into the corner.
  - Draft one's memory beat named all four levels inside one sentence, forty
    seconds before the fourth was drawn. The naming is now one level per
    line, with `reserve` pulling the reveals forward to meet them.
  - `where` first narrated CUDA C++ and Triton back to back, because the
    contrast is the argument, while the table drew its rows in a different
    order. A table reveals top to bottom, so the narration follows the rows
    and B's question carries the contrast instead.
  - The take was the ladder plus a summary sentence. The summary went. What
    replaced it is what a viewer can use on Monday: which rung to start on,
    and the failure mode of starting at the bottom.
  - A trim pass turned commas into full stops rather than cutting words,
    which is the lever the skill says actually works on pace.

Lit state of the map, decided per beat rather than left to inherit:
`memory` lights the machine, `where` lights where you write, `rust` inherits
that rather than re-lighting it (the map is already correct and a redundant
focus costs about a second of panel delay for no change on screen), `call`
lights what you call, and `close` lights all three, which is how this
vocabulary says "no emphasis". `question` inherits the fully lit map the
build leaves behind, for the same reason.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for exactly that reason. No resources card either, which is a deep
dive's obligation; the take points at the page, and the page carries PMPP,
GPU MODE, the CUDA C++ Programming Guide, the Modal GPU Glossary and Simon
Boehm's matmul worklog.

What was cut from a 2,225-word page, so the next person can see it rather
than rediscover it:

  - The tensor-core instruction vocabulary: wgmma, TMA, tcgen05 and TMEM,
    and with it the RTX 5090 catch (sm_120 exposes TMA and clusters and none
    of the rest, so Hopper tutorials do not literally run on it). This is the
    omission that hurts most, because the catch is parent-page material and
    costs somebody an afternoon. It went because the page itself says those
    names are defined a page down, under CUTLASS and tensor cores, and
    because a vocabulary list is the beat a tour of three layers can most
    afford to lose. "Tensor cores" stays named on the map, and the `question`
    beat points at them as the reason the arithmetic outruns the memory, so
    the map item is not left unsaid.
  - The megakernel result (Cohere, Sep 9 2026: 292 tokens per second at batch
    size one, 62% of speed-of-light, 1.58x vLLM). The one number on the page
    that pushes the other way, launch overhead rather than bytes moved. The
    page itself says the full treatment is on Topic: inference-and-serving.
  - The whole AMD section: ROCm 10.0, the ROCm CLI, Hyperloom, and AMD Skills
    as the first vendor-shipped skill library. That is a second episode, and
    an interesting one, because its argument is about how operational
    knowledge reaches an engineer rather than about kernels. Triton's ROCm
    backend went with it, which is the one line of that section this episode
    would otherwise have kept.
  - The recommended learning path, seven steps, which is a page to work
    through rather than a thing to watch.
  - Dream-RSI and Phi-Bench's 5.4% on Hardware and Edge, which belong to the
    "can models write kernels" story rather than to this map.
  - CUDA on RISC-V hosts, CUPTI, the driver and runtime API split, and PTX
    versus SASS.

Two things this episode says that the page did not, and which were back-ported
to Notion in the same session, because the page is the thing that lasts: why
memory dominates (the card can do far more arithmetic per second than it can
fetch operands for) and the ladder as a decision order rather than a list of
options.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, and A does something different after each

Names are spelled the way they should be said. Text to speech reads "CUDA",
"nvcc", "cuBLAS", "HBM" and "mistral.rs" badly, so acronyms are spaced out
and anything that could not be said cleanly was kept off the spoken line.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: cuda-and-gpu-programming"
SUBTITLE = "three layers of one stack, and why it is nearly always memory"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of C U D A and G P U programming. C U D A is "
        "N Vidia's platform for using a graphics card as a general purpose "
        "computer. A C plus plus extension, a compiler stack, tuned "
        "libraries, profilers."),
    (A, "It is usually handed to you as a product list. That is the wrong "
        "shape. It is three layers, and most of the time people lose here is "
        "lost on the wrong one. Current as of the twenty second of "
        "September, twenty twenty six."),
]

# -- the inventory, named before anything is explained ---------------------
SCRIPT["map"] = [
    (A, "Three layers, then. Everything named, nothing explained yet."),
    (A, "First, the machine. Threads gathered into warps, into blocks, into a "
        "grid. Registers, shared memory, L two, and H B M. And the tensor "
        "cores."),
    (A, "Second, where you are allowed to write. C U D A C plus plus, through "
        "N V C C. CUTLASS, and its layout algebra Cute. Triton, and its lower "
        "dialect Gluon. And this month, Rust, in two projects: cuda oxide and "
        "cutile R S."),
    (A, "Third, what you call instead of writing anything. Cu BLAS. Cu BLAS "
        "L T. Cu D N N. N C C L, Thrust and CUB. And the profilers, N sight "
        "Systems and N sight Compute."),
    (A, "That is the whole board. It goes in the corner now, and it stays "
        "there."),
]

# -- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "Before touring any of it, the sentence the rest of the topic is "
        "downstream of. Nearly all kernel optimisation is memory "
        "optimisation."),
    (A, "Not arithmetic. The tensor cores can do far more arithmetic per "
        "second than the card can fetch operands for. So the constraint is "
        "almost never how many operations. It is how many bytes you moved."),
    (B, "Which is strange, for a machine that gets sold on teraflops."),
    (A, "It is. And it is why nearly every optimisation here is the same "
        "optimisation under a different name."),
]

# -- layer one: the machine ------------------------------------------------
SCRIPT["memory"] = [
    (A, "So, the machine. What actually costs you is where a number is "
        "allowed to sit."),
    (A, "Registers are the fastest, and there are very few of them. A "
        "register belongs to one thread."),
    (A, "Shared memory is one step out. A block of threads shares it, and it "
        "is still fast. Then L two, for the whole device."),
    (A, "Then H B M, high bandwidth memory. Enormous. Slow. And where you "
        "spend your time waiting."),
    (A, "Every optimisation you read about is one idea. Get the data up that "
        "list once, and do all the work you can while it is up there. Tiling. "
        "Coalescing. Fusion. Flash Attention composes those same ideas, for "
        "attention."),
]

# -- layer two: where you are allowed to write -----------------------------
SCRIPT["where"] = [
    (A, "Layer two. This is the choice that actually faces you. Where do you "
        "write?"),
    (A, "At the bottom, C U D A C plus plus. You think in threads. You write "
        "roughly ten times the code."),
    (A, "Above it, CUTLASS and Cute. You think in layouts and tiles instead "
        "of threads. The price is template work."),
    (A, "Then Triton. You write whole blocks, and the compiler decides the "
        "thread mapping and the shared memory staging. A tenth of the code, "
        "and usually within zero to twenty percent of the C U D A version. "
        "It is also what torch dot compile emits."),
    (B, "So why would anybody still write the C U D A version?"),
    (A, "For that last twenty percent, when it is worth money. Gluon is the "
        "road in between: inside Triton, handing back the layouts Triton hid."),
]

# -- the same table, in a second language ----------------------------------
SCRIPT["rust"] = [
    (A, "Which is why the Rust announcement this month is more than a "
        "language note. N Vidia shipped two projects, not one, and they "
        "reproduce that table in a second language."),
    (A, "Cuda oxide is the thread track. A rustc backend that emits P T X "
        "from Rust's mid level representation. You still think in threads. "
        "Aliasing between concurrent threads becomes a compile error, not a "
        "race you hunt for in a profiler. Early alpha."),
    (A, "Cutile R S is the tile track. You write tiles, the compiler maps "
        "them onto the architecture and compiles through C U D A Tile I R. "
        "Exclusive access falls out of ordinary Rust ownership. Already in "
        "production, in Hugging Face's Grout engine and in mistral dot R S."),
    (A, "Same example, two safety arguments, and no performance numbers "
        "either way."),
]

# -- layer three: what you call instead ------------------------------------
SCRIPT["call"] = [
    (A, "Layer three. The layer most people should live in, and the one that "
        "gets skipped."),
    (A, "Cu BLAS is the general matrix multiply that torch dot matmul "
        "actually calls. Cu BLAS L T is the layer above it, adding kernel "
        "search and epilogue fusion. Cu D N N is the deep learning library: "
        "convolutions, normalisations, and now fused attention."),
    (A, "And CUTLASS four ships Python domain specific languages, so a peak "
        "performance kernel can be prototyped from Python rather than fought "
        "through C plus plus templates."),
    (B, "And when I do not know which layer my problem is on?"),
    (A, "Then you profile, and the order matters. N sight Systems is the "
        "timeline: where the wall clock went. N sight Compute is the "
        "microscope on one kernel. Timeline first, always. Otherwise you "
        "spend a week speeding up a kernel that was never why you were "
        "waiting."),
]

# -- the take --------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? It is a ladder, and you climb down it, not "
        "up."),
    (A, "Call the library first, and most of the time you stop there. If that "
        "is not enough, write Triton. A tenth of the code, most of the speed. "
        "If the compiler's heuristics cost you, reach for Gluon. And drop to "
        "C plus plus only when a profiler tells you to."),
    (A, "The commonest way a week disappears here is starting on the bottom "
        "rung. Hand optimising arithmetic, on a machine that was waiting for "
        "memory."),
    (A, "And what to watch is the top of that ladder getting taller. CUTLASS "
        "four puts peak kernels in Python. The tile track of C U D A Rust "
        "makes the same bet in a second language."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: three layers of one stack, not a field of
    # competitors. Three columns rather than four, because the pill width is
    # derived from the column count and a fourth takes the labels below what
    # the delivery encode can show. Items are kept near twenty characters for
    # the same reason.
    #
    # Tones. Machinery for the machine, which is literally what it is:
    # hardware the narration points at but never asks you to change. Subject
    # for where you write, because that column is the choice the video is
    # about. Verified for what you call, libraries already written and already
    # tuned. None of the three is toned `context`, so every one of them has
    # somewhere to brighten from when a later beat lights it.
    #
    # `reserve` is what makes the last line true. Without it the three columns
    # finish drawing on the final word, and the park animation then runs after
    # the line has stopped. At 7 seconds the map is complete just as the
    # closing line starts, and morphs into the corner while it is spoken.
    "map": {"kind": "columns", "park": True, "reserve": 7.0, "columns": [
        {"head": "the machine", "tone": "machinery", "items": [
            "threads, warps, blocks",
            "registers, shared, L2",
            "HBM",
            "tensor cores"]},
        {"head": "where you write", "tone": "subject", "items": [
            "CUDA C++",
            "CUTLASS and CuTe",
            "Triton and Gluon",
            "cuda-oxide, cutile-rs"]},
        {"head": "what you call", "tone": "verified", "items": [
            "cuBLAS, cuBLASLt",
            "cuDNN",
            "NCCL, Thrust, CUB",
            "Nsight Systems",
            "Nsight Compute"]},
    ]},

    # The card is the spine of the spoken line, not the line. The page's own
    # sentence, "nearly all kernel optimisation is memory optimisation", is
    # said aloud and deliberately kept off the screen, so nothing on screen is
    # read out verbatim.
    #
    # No focus: the map was built one beat ago with every column lit, which is
    # the state this beat wants.
    "question": {"kind": "claim", "reserve": 8.0,
                 "text": "How many bytes,\nnot how many operations.",
                 "note": "arithmetic is cheap; fetching the operands is not"},

    # A stack, because the vertical order IS the argument: everything else in
    # the topic is about moving data up it and keeping it there. Reserved
    # heavily, because the four levels are named one per line across the beat
    # and each has to be drawn by the time it is said.
    "memory": {"kind": "stack", "tone": "machinery", "focus": "the machine",
               "reserve": 20.0, "layers": [
                   ("registers", "one thread, very few"),
                   ("shared memory", "a block of threads, still fast"),
                   ("L2", "the whole device"),
                   ("HBM", "enormous, slow, and where you wait"),
               ]},

    # The grid is the content: three things vary together across four levels,
    # which is what a table is for. Rows draw top to bottom, so the narration
    # walks them in that order rather than pairing CUDA against Triton.
    "where": {"kind": "table", "focus": "where you write", "reserve": 20.0,
              "head": ["level", "you think in", "what it costs"],
              "rows": [
                  ["CUDA C++", "threads", "10x the code"],
                  ["CUTLASS / CuTe", "layouts, tiles", "template work"],
                  ["Triton", "blocks", "0-20% off CUDA"],
                  ["Gluon", "blocks + layouts", "the layouts again"],
              ]},

    # Two positions side by side, because the claim is that these are the two
    # ends of the table above, rebuilt in one language. No focus: the map is
    # already lit on where you write, which is where both of these live.
    # Items stay near twenty-two characters, which is what a compare side has
    # room for beside a parked map.
    #
    # Tones. The first draft drew cuda-oxide in the cost colour, because it is
    # the early-alpha one, and the frame then said the tile track is the right
    # answer and the thread track is a mistake. NVidia shipped both, published
    # no performance numbers, and the page calls them two ambitions rather
    # than a winner and a loser. Machinery is what cuda-oxide actually is, a
    # compiler backend, and the colour then carries the distinction without
    # the judgement.
    "rust": {"kind": "compare", "reserve": 22.0, "sides": [
        {"head": "cuda-oxide", "tone": "machinery", "items": [
            "the thread track",
            "rustc backend, to PTX",
            "aliasing: compile error",
            "early alpha"]},
        {"head": "cutile-rs", "tone": "verified", "items": [
            "the tile track",
            "compiles via Tile IR",
            "Rust ownership rules",
            "Grout, mistral.rs"]},
    ]},

    # A points list rather than a second table: these do not vary along shared
    # axes, they are five things with five jobs. The heading renders in the
    # subject colour whatever the tone says, which is a known limitation of
    # this panel kind.
    "call": {"kind": "points", "tone": "verified", "focus": "what you call",
             "reserve": 26.0,
             "head": "the layer to live in", "items": [
                 "cuBLAS: the GEMM torch calls",
                 "cuBLASLt: search and fusion",
                 "cuDNN: conv, norms, attention",
                 "CUTLASS 4: kernels from Python",
                 "Nsight: timeline, then kernel",
             ]},

    # Reserve values across this episode were set from the rendered beat
    # lengths rather than guessed, after `check_references` pulled a frame of
    # "Above it, CUTLASS and Cute" showing only the CUDA C++ row. Reveals are
    # spread evenly over what is left of the line, so a beat that names four
    # things in its first half draws the fourth one in its second half unless
    # the tail is held back. The tail that remains is the beat's closing
    # argument spoken over a finished panel, which is what it should be.

    # The take, as the one thing a viewer can use tomorrow. A stack again, and
    # deliberately: it is the same three layers, reordered into the order you
    # should try them in. Every column lit, which is how this vocabulary says
    # no emphasis.
    "close": {"kind": "stack", "tone": "subject", "reserve": 26.0,
              "focus": ["the machine", "where you write", "what you call"],
              "layers": [
                  ("call the library", "start here, often stop here"),
                  ("write Triton", "a tenth of the code"),
                  ("reach for Gluon", "when heuristics cost you"),
                  ("drop to CUDA C++", "when the profiler says so"),
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 150:.1f} minutes at 150 words per minute")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:12s} {w:3d} words  ~{w / 150 * 60:4.0f}s")
