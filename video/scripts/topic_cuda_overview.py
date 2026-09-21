"""
Topic overview: CUDA and GPU programming, as of 21 September 2026.

The same overview shape as the llms map, but this topic is a stack rather than
a field of competitors, so the inventory is the layers: what the machine is,
where you are allowed to write, and what you call instead of writing anything.

Every figure comes from the canonical page "Topic: cuda-and-gpu-programming".
Short sentences: pace comes from the writing.
"""

A = "A"
B = "B"

FORMAT = "overview"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of C U D A and G P U programming."),
    (A, "What the machine is. Where you can write code. "
        "And what to call instead of writing any."),
    (A, "Current as of the twenty first of September, twenty twenty six."),
]

# --- the inventory --------------------------------------------------------
SCRIPT["map_machine"] = [
    (A, "The whole board first. Nothing explained yet."),
    (A, "The machine itself. Threads, grouped into warps, grouped into blocks, "
        "grouped into a grid. That is the execution model."),
    (A, "Then the memory. Registers, shared memory, L two cache, "
        "and high bandwidth memory. Each one is slower and larger than the last."),
    (A, "And the tensor cores, which are the units that actually do the matrix "
        "multiply. They have their own instruction vocabulary. "
        "W G M M A, T M A, and on the newest parts, T C gen oh five."),
]

SCRIPT["map_write"] = [
    (A, "Next, where you are allowed to write."),
    (A, "C U D A C plus plus is the bottom. You think in threads. "
        "CUTLASS sits above it, with a Python interface now, called Cute."),
    (A, "Triton is the one most people should reach for. "
        "You write a block at a time, in Python, and the compiler decides "
        "the thread mapping."),
    (A, "And there is now Rust, in two tracks, which we will come back to, "
        "because the two tracks are the whole argument of this page in miniature."),
]

SCRIPT["map_call"] = [
    (A, "And finally, the things you call instead of writing a kernel at all."),
    (A, "Cu BLAS is the matrix multiply that torch dot matmul actually calls. "
        "Cu D N N is the one that attention dispatches to."),
    (A, "Plus the tools you look through. N sight Systems for the whole timeline. "
        "N sight Compute for one kernel under a microscope."),
    (B, "And that is the whole stack, from a thread to a library call."),
]

# --- the organising question ---------------------------------------------
SCRIPT["question"] = [
    (A, "So here is the sentence this entire topic rests on."),
    (A, "Nearly all kernel optimisation is memory optimisation."),
    (A, "Not arithmetic. Your graphics card can do far more maths per second "
        "than it can fetch numbers to do the maths on. "
        "So the question is almost never how many operations. "
        "It is how many bytes you moved."),
]

# --- the memory story -----------------------------------------------------
SCRIPT["memory"] = [
    (A, "Look at the hierarchy on the screen. Registers are fastest and tiny. "
        "Shared memory is per block and still fast. "
        "Then L two, then high bandwidth memory, which is enormous and slow."),
    (A, "Every optimisation you will read about is one idea. "
        "Move the data up this pyramid once, and do as much work as possible "
        "while it is up there."),
    (A, "Tiling is that. Coalescing is that. Fusion is that."),
    (B, "And Flash Attention?"),
    (A, "Flash Attention is exactly that, applied to attention. "
        "It never writes the big attention matrix to memory at all. "
        "It computes it in tiles, in fast memory, and throws it away."),
]

# --- where to write -------------------------------------------------------
SCRIPT["where_to_write"] = [
    (A, "Which brings us to the choice everyone actually faces. "
        "At which level do you write?"),
    (A, "A Triton kernel is roughly a tenth the length of the C U D A equivalent. "
        "And it usually lands within zero to twenty percent of its performance."),
    (B, "So why would anyone write the C U D A version?"),
    (A, "For that last twenty percent, when it is worth it. "
        "And for the things the compiler hides from you."),
    (A, "There is even a dialect called Gluon that lives inside Triton "
        "and hands back the hidden parts. Explicit layouts, "
        "asynchronous copies, barriers, warp specialisation."),
    (A, "And note where torch dot compile sits. It emits Triton. "
        "So most people are already shipping Triton kernels without writing one."),
]

# --- tensor cores ---------------------------------------------------------
SCRIPT["tensor_cores"] = [
    (A, "Now the vocabulary that makes N Vidia's documentation readable, "
        "because without it none of the kernel code makes sense."),
    (A, "W G M M A is Hopper's asynchronous matrix multiply, "
        "issued by four cooperating warps, reading straight from shared memory."),
    (A, "T M A is a copy engine. It moves tiles between global and shared memory "
        "from a descriptor, and does the swizzling in hardware. "
        "That is what lets a kernel split into warps that only fetch data "
        "and warps that only do maths."),
    (A, "T C gen oh five is the Blackwell datacentre successor, "
        "where the tensor core becomes a per unit engine issued by a single thread, "
        "keeping its accumulators in its own memory."),
    (B, "And on a consumer card? A five thousand ninety, say."),
    (A, "This is the catch worth knowing. A five thousand ninety exposes "
        "T M A and clusters, but none of W G M M A, T C gen oh five, "
        "or that tensor memory. So Hopper tutorials do not literally run on it."),
]

# --- the two Rust tracks and the other direction ---------------------------
SCRIPT["rust_tracks"] = [
    (A, "Back to Rust, because it reproduces this whole page in miniature."),
    (A, "Cuda oxide is the thread level track. You still think in threads. "
        "Aliasing between them becomes a compile error. "
        "Not a race you find later in a profiler. It is early alpha."),
    (A, "Cutile R S is the tile track. You write tiles. "
        "The compiler decides how they map onto the hardware. "
        "And it is already in production, in Hugging Face's engine, "
        "and in Mistral dot R S."),
    (A, "Same example, same result, two different safety arguments. "
        "It is the cleanest way to see the trade this whole topic is about."),
]

SCRIPT["other_direction"] = [
    (A, "One more, because it pushes the opposite way."),
    (A, "A megakernel fuses an entire decode step into one kernel launch. "
        "Cohere reported two hundred and ninety two tokens per second "
        "at batch size one, one point five eight times faster than V L L M."),
    (A, "That is not about bytes moved. That is about launch overhead. "
        "When your batch is tiny, the cost is the scheduling, not the memory."),
    (A, "And on the other vendor, ROCm ten point zero shipped in August. "
        "Triton's ROCm backend is how most PyTorch kernels reach AMD at all."),
]

# --- profiling ------------------------------------------------------------
SCRIPT["profiling"] = [
    (A, "Last layer. How you find out which of these is your problem."),
    (A, "N sight Systems is the timeline. Where did the wall clock go, "
        "which gaps are the C P U's fault, did the collectives overlap compute."),
    (A, "N sight Compute is the microscope. It replays one kernel "
        "with hardware counters to tell you why that kernel is slow."),
    (B, "And the order matters, presumably."),
    (A, "Always. Timeline first. Otherwise you spend a week "
        "making a kernel faster that was never the reason you were waiting."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is this map for?"),
    (A, "It is a ladder, and you start at the top. Call the library. "
        "If that is not enough, write Triton. "
        "If that is not enough, and the profiler says so, go down to C plus plus."),
    (A, "Most people skip to the bottom and optimise arithmetic "
        "on a machine that was waiting for memory."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
