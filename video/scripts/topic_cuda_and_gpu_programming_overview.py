"""
Topic overview: CUDA and GPU programming, as of 22 September 2026.

The load-bearing idea, inherited from the hand-written `topic_cuda_overview`
and kept deliberately: this topic's inventory is not a list of competitors, it
is three layers of one stack. What the machine is, where you are allowed to
write, and what you call instead of writing anything at all. That axis is the
hard-won part of the old episode and the skill calls it out by name, so this
rewrite keeps it exactly and changes only the shape around it. The page's own
sentence, "nearly all kernel optimisation is memory optimisation", is the
organising question that turns the map into an argument.

What is new since the old script, and why this is a fresh episode rather than
an edit: the canonical page moved the tensor-core instruction vocabulary
(wgmma, TMA, tcgen05, TMEM) down to the CUTLASS child and the profiler
descriptions down to the Profiling child, keeping only the names and a
pointer. The video does the same: it names the four instructions and says
where they are defined, instead of defining them at the depth the old cut did.
The old episode is retired, not edited.

The outline that survived the revision step:

    ident        what CUDA is, the three layers, and the date
    map          the three layers named in full, parked as the home frame
    question     nearly all kernel optimisation is memory optimisation
    memory       the hierarchy, and the one idea every optimisation is
    where        the table of levels you may write at, and what each costs
    rust         the two Rust tracks, which are this page in miniature
    call         what you call instead: cuBLAS, cuBLASLt, cuDNN, CUTLASS 4
    tensor_cores the four names, where they are defined, and the 5090 catch
    megakernel   the one result that pushes the other way: launch overhead
    profiling    timeline before microscope, and why that order is the rule
    ladder       the map as a ladder, climbed from the top
    close        the take, and what would redraw the map

What the step-4 critique caught, and what changed:

  - Draft one followed the page's taxonomy diagram, which put profiling
    between libraries and DSLs and made the episode a tour of a tree. Reordered
    so that every beat after the question answers it, and profiling moved to
    the end where it is the answer to "which of these is my problem".
  - Draft one still defined wgmma, TMA and tcgen05 at the old script's depth,
    three sentences each. That is now a child page. Cut to one line each, with
    the pointer said out loud, and the room spent on the RTX 5090 catch, which
    is the part the parent page still carries and the part that costs somebody
    an afternoon.
  - The ROCm section was a beat of its own in draft one and it was a version
    note. Reduced to the sentence that matters: Triton's ROCm backend is how
    most PyTorch kernels reach AMD at all.
  - The take was a summary. Replaced with the ladder, because the ladder is a
    thing the viewer can use on Monday and a summary is not.
  - B was asking for clarification. B now asks the three questions that make A
    change direction: why the machine is sold on the wrong number, why anyone
    would still write CUDA C++, and what a consumer card actually exposes.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Every figure comes from the canonical page "Topic: cuda-and-gpu-programming".
Numbers and names are spelled the way they should be said.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: cuda-and-gpu-programming"
SUBTITLE = "three layers of one stack, and why nearly all of it is memory"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The map is the axis, and the axis is a stack rather than a field of
    # competitors. Three columns, not four: a fourth pushes the pill text below
    # the size the delivered file can carry.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the machine", "tone": "context", "items": [
            "threads, warps, blocks, grids",
            "registers, shared, L2, HBM",
            "tensor cores"]},
        {"head": "where you write", "tone": "subject", "items": [
            "CUDA C++ and nvcc",
            "CUTLASS and CuTe",
            "Triton, and Gluon",
            "cuda-oxide, cutile-rs"]},
        {"head": "what you call", "tone": "verified", "items": [
            "cuBLAS, cuBLASLt",
            "cuDNN",
            "NCCL, Thrust, CUB",
            "Nsight Systems",
            "Nsight Compute"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Nearly all kernel optimisation\nis memory optimisation.",
                 "note": "the card does far more arithmetic than it can fetch numbers for"},

    "memory": {"kind": "points", "focus": "the machine",
               "head": "the hierarchy, fastest first", "items": [
        "registers: per thread, tiny",
        "shared memory: per block, still fast",
        "L2: per device",
        "HBM: enormous, and what you wait on",
        "tiling, coalescing, fusion: one idea",
    ]},

    "where": {"kind": "table", "focus": "where you write",
              "head": ["level", "you think in", "what it costs you"],
              "rows": [
                  ["CUDA C++", "threads", "about ten times the code"],
                  ["CUTLASS / CuTe", "layouts and tiles", "template work, now Python too"],
                  ["Triton", "blocks", "0-20% off the CUDA version"],
                  ["Gluon", "blocks, plus what Triton hid", "you own the layouts again"],
              ]},

    "rust": {"kind": "compare", "focus": "where you write", "sides": [
        {"head": "cuda-oxide", "tone": "cost", "items": [
            "the thread track",
            "a rustc backend: MIR to PTX",
            "aliasing becomes a compile error",
            "early alpha, pinned nightly"]},
        {"head": "cutile-rs", "tone": "verified", "items": [
            "the tile track",
            "JIT through CUDA Tile IR",
            "ownership, plus tensor partitioning",
            "in production: Grout, mistral.rs"]},
    ]},

    "call": {"kind": "points", "focus": "what you call", "tone": "verified",
             "head": "what you call instead", "items": [
        "cuBLAS: the GEMM torch.matmul reaches",
        "cuBLASLt: kernel search, epilogue fusion",
        "cuDNN: convolutions, norms, fused attention",
        "CUTLASS 4: peak kernels, from Python",
    ]},

    "tensor_cores": {"kind": "points", "focus": "the machine",
                     "head": "the tensor-core vocabulary", "items": [
        "wgmma: Hopper's async warpgroup matmul",
        "TMA: a DMA engine for tiled copies",
        "tcgen05 and TMEM: datacenter Blackwell",
        "RTX 5090: TMA and clusters, none of the rest",
    ]},

    "megakernel": {"kind": "stat", "big": "292 tok/s", "tone": "machinery",
                   "caption": "one fused decode kernel, at batch size 1",
                   "note": "Cohere, Sept 2026: 62% of speed-of-light, 1.58x faster than vLLM"},

    "profiling": {"kind": "compare", "focus": "Nsight Systems", "sides": [
        {"head": "Nsight Systems", "tone": "subject", "items": [
            "the whole-program timeline",
            "where the wall clock went",
            "which gaps are the CPU's fault",
            "did the collectives overlap"]},
        {"head": "Nsight Compute", "tone": "number", "items": [
            "one kernel, replayed",
            "hardware counters",
            "why that kernel is slow",
            "read Speed of Light first"]},
    ]},

    "ladder": {"kind": "stack", "tone": "subject", "layers": [
        ("call the library", "cuBLAS, cuDNN, and stop"),
        ("write Triton", "a tenth the code, most of the speed"),
        ("reach for Gluon", "when the heuristics cost you"),
        ("go down to CUDA C++", "only when the profiler says so"),
    ]},

    "close": {"kind": "claim",
              "text": "The card is rarely waiting on arithmetic.\nIt is waiting on memory.",
              "note": "a compiler that makes the bottom rung unnecessary would redraw this"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is
    "ident": [
        (A, "This is the map of C U D A and G P U programming. C U D A is "
            "N Vidia's platform for using a graphics card as a general purpose "
            "computer: a language extension, a compiler stack, tuned libraries, "
            "profiling tools."),
        (A, "But the useful way to hold it is not as a product list. It is "
            "three layers, and the whole video hangs off them. Current as of "
            "the twenty second of September, twenty twenty six."),
    ],

    # 2. the inventory, before any explanation
    "map": [
        (A, "The whole board first. Nothing explained yet."),
        (A, "The machine. Threads grouped into warps, into blocks, into a grid. "
            "A memory hierarchy: registers, shared memory, L two, high "
            "bandwidth memory. And the tensor cores."),
        (A, "Where you write. C U D A C plus plus at the bottom, through "
            "N V C C. CUTLASS and its layout algebra, Cute. Triton, and its "
            "lower level dialect Gluon. And this month, Rust, in two tracks."),
        (A, "And what you call instead. Cu BLAS, Cu D N N, N C C L, Thrust, "
            "CUB. Plus the two tools you look through, N sight Systems and "
            "N sight Compute."),
    ],

    # 3. the organising question
    "question": [
        (A, "And here is the sentence the whole topic rests on. Nearly all "
            "kernel optimisation is memory optimisation."),
        (A, "Not arithmetic. Your card can do far more maths per second than it "
            "can fetch numbers to do the maths on. So the question is almost "
            "never how many operations. It is how many bytes you moved."),
        (B, "Which is strange for a machine sold on teraflops."),
        (A, "It is. And it is why nearly every optimisation here turns out to "
            "be the same optimisation under a different name."),
    ],

    # 4. the hierarchy, and the one idea
    "memory": [
        (A, "Look at the list. Registers are fastest and tiny, private to a "
            "thread. Shared memory is per block, still fast. Then L two. Then "
            "high bandwidth memory, enormous and slow."),
        (A, "Every optimisation you will read about is one idea: move the data "
            "up this list once, and do as much work as you can while it is up "
            "there. Tiling, coalescing and fusion are all that."),
        (A, "Flash Attention is that, applied to attention. It never writes the "
            "big attention matrix to memory at all. It builds it in tiles, in "
            "fast memory, and throws each tile away."),
    ],

    # 5. where you are allowed to write
    "where": [
        (A, "So where do you write? This is the choice everyone actually "
            "faces."),
        (A, "A Triton kernel is roughly a tenth the length of the C U D A "
            "equivalent, and usually lands within zero to twenty percent of its "
            "performance. You write a block at a time, and the compiler decides "
            "the threads."),
        (B, "Then why would anyone write the C U D A version?"),
        (A, "For that last twenty percent, when it is worth money. Gluon is the "
            "middle road: inside Triton, handing back what Triton deliberately "
            "hid. And note where torch dot compile sits. It emits Triton, and "
            "Triton's ROCm backend is how most PyTorch kernels reach A M D at "
            "all."),
    ],

    # 6. the two Rust tracks: the page in miniature
    "rust": [
        (A, "Which is why the Rust announcement this month is worth more than a "
            "language note. N Vidia shipped two projects, not one, and the pair "
            "reproduces this page in miniature."),
        (A, "Cuda oxide is the thread track: a rustc backend emitting P T X "
            "from Rust's mid level representation. You still think in threads, "
            "and aliasing between concurrent threads becomes a compile error "
            "rather than a race you find in a profiler. Early alpha."),
        (A, "Cutile R S is the tile track. You write tiles, the compiler maps "
            "them, and exclusive access falls out of Rust ownership. Already in "
            "production, in Hugging Face's Grout engine and in mistral dot R S. "
            "Same example, two safety arguments."),
    ],

    # 7. what you call instead of writing anything
    "call": [
        (A, "Now the layer most people should be living in, and the one that "
            "gets skipped."),
        (A, "Cu BLAS is the general matrix multiply that torch dot matmul "
            "actually calls. Cu BLAS L T is the layer above it, adding "
            "heuristic kernel search and epilogue fusion. Cu D N N is the deep "
            "learning library: convolutions, normalisations, fused attention."),
        (A, "And CUTLASS four ships Python domain specific languages, the Cute "
            "D S L, so a peak performance kernel can be prototyped from Python "
            "rather than fought through C plus plus templates. That is how "
            "N Vidia's example kernels ship now."),
    ],

    # 8. the vocabulary, named rather than defined
    "tensor_cores": [
        (A, "There is one piece of vocabulary without which N Vidia's "
            "documentation is unreadable. It is defined a page down, under "
            "CUTLASS and tensor cores, but know the four names."),
        (A, "W G M M A is Hopper's asynchronous warpgroup matrix multiply. "
            "T M A, the tensor memory accelerator, is a copy engine for bulk "
            "tiled transfers. T C gen oh five and its tensor memory, T MEM, "
            "are the datacentre Blackwell versions."),
        (B, "And on a five thousand ninety? That is the card most people have."),
        (A, "That is the catch. It exposes T M A and clusters, and none of "
            "W G M M A, T C gen oh five or T MEM. So a Hopper tutorial does "
            "not run on it."),
    ],

    # 9. the result that pushes the other way
    "megakernel": [
        (A, "One result this month pushes the opposite way to everything I have "
            "said. The far end of fusion is a megakernel: a whole decode step "
            "fused into one kernel launch."),
        (A, "Cohere's reaches two hundred and ninety two tokens a second at "
            "batch size one, sixty two percent of speed of light, one point "
            "five eight times faster than V L L M. That is not bytes moved. "
            "That is launch overhead, dominant when your batch is one."),
    ],

    # 10. how you find out which of these is your problem
    "profiling": [
        (A, "Which raises the question the whole map is really for. How do you "
            "find out which of these is actually your problem?"),
        (A, "N sight Systems is the timeline: where the wall clock went, which "
            "gaps are the processor's fault, whether the collectives overlapped "
            "compute. N sight Compute is the microscope. It replays one kernel "
            "with hardware counters and says why that kernel is slow."),
        (B, "And the order matters, presumably."),
        (A, "Always. Timeline first. Otherwise you spend a week making a kernel "
            "faster that was never the reason you were waiting."),
    ],

    # 11. the map as a ladder
    "ladder": [
        (A, "So here is the map as a ladder, and the important part is that you "
            "start at the top."),
        (A, "Call the library. If that is not enough, write Triton: a tenth of "
            "the code and most of the speed. If the compiler's heuristics are "
            "costing you, reach for Gluon. And only then, and only if the "
            "profiler says so, go down to C plus plus."),
    ],

    # 12. the take
    "close": [
        (A, "Most people skip to the bottom rung, and optimise arithmetic on a "
            "machine that was waiting for memory. That is the commonest way a "
            "week disappears here."),
        (A, "So what would redraw this map? Not a faster card. A compiler good "
            "enough that the bottom rung stops being worth climbing down to. "
            "Cutile R S and the Cute D S L are both arguments that it is "
            "coming."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words, "
          f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, spoken in SCRIPT.items():
        w = sum(len(line.split()) for _, line in spoken)
        print(f"  {key:14s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
