"""
Deep dive: the GPU memory hierarchy, and why nearly every kernel is starving.

The load-bearing idea on the page is arithmetic intensity: FLOPs performed per
byte moved. Everything else on the page is downstream of it, so that is the
spine, and the worked example carried the whole way is a matrix multiply on an
RTX 5090.

The wrong model this replaces: that a slow kernel is doing too much arithmetic.

Every figure comes from "GPU memory hierarchy". Short sentences.
"""

A = "A"
B = "B"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- tension: two numbers and a division ---------------------------------
SCRIPT["open"] = [
    (A, "Here are two numbers off the spec sheet of the card in your machine."),
    (A, "An R T X five thousand ninety does about a hundred and five trillion "
        "floating point operations a second."),
    (A, "And it reads memory at one point seven nine terabytes a second."),
    (A, "Divide one by the other. That is the only arithmetic in this video, "
        "and it decides everything else."),
]

SCRIPT["ridge"] = [
    (A, "You get roughly fifty nine. Fifty nine operations for every single byte "
        "you fetch."),
    (A, "So if your kernel does less than fifty nine operations per byte, "
        "the maths units are sitting idle, waiting."),
    (B, "And how many kernels do less than that?"),
    (A, "Almost all of them. Adding two tensors does one operation "
        "for every twelve bytes. That is not fifty nine. It is a twelfth of one."),
]

# --- the question --------------------------------------------------------
SCRIPT["question"] = [
    (A, "So here is the question worth the next few minutes."),
    (A, "You are looking at a slow kernel. How do you know which it is? "
        "Slow because of the maths. Or slow because of the memory."),
    (A, "There is one number that tells you. "
        "And you can work it out on paper, before you profile anything."),
]

# --- the definition ------------------------------------------------------
SCRIPT["intensity"] = [
    (A, "It is called arithmetic intensity. Operations performed, "
        "divided by bytes moved from memory."),
    (A, "Every kernel has one. Every card has a crossover point. "
        "For this card, in single precision, that point is fifty nine."),
    (A, "Below it, you are memory bound. Above it, you are compute bound. "
        "The picture is called a roofline, and you are about to see why."),
]

SCRIPT["roofline"] = [
    (A, "Watch what happens as intensity rises. The attainable speed climbs "
        "along a slope, because you are limited by bandwidth."),
    (A, "Then it flattens, because you have hit the limit of the maths units."),
    (A, "Now let us put three real kernels on it."),
    (A, "Adding two tensors, or a G E L U. Intensity below one. "
        "Far down the slope, hopelessly memory bound."),
    (A, "A softmax or a layer norm. Intensity of a few. Still on the slope."),
    (A, "And a large matrix multiply, which is the only one that gets near the roof."),
]

# --- the worked example ---------------------------------------------------
SCRIPT["matmul"] = [
    (A, "Let us do that last one properly, because it is the case everything "
        "in machine learning is built around."),
    (A, "Multiply two N by N matrices. The work is two N cubed operations."),
    (A, "The data is three N squared numbers. Two matrices in, one out."),
    (B, "So the intensity is two N cubed over three N squared."),
    (A, "Which is N, times two thirds. It grows with the size of the matrix."),
    (A, "That is the whole reason large matrix multiplies are the only operation "
        "that can saturate a tensor core. And it is why the house style of "
        "modern machine learning is: keep the matrix multiplies big, "
        "and fuse everything around them."),
]

# --- the catch ------------------------------------------------------------
SCRIPT["naive"] = [
    (A, "Except a naive implementation throws all of that away."),
    (A, "Write the obvious kernel. One thread per output element. "
        "Each thread reads a whole row of A and a whole column of B."),
    (A, "Every element of A gets fetched N times. Every element of B gets fetched "
        "N times."),
    (B, "So the intensity collapses back down."),
    (A, "Back to the slope. A matrix multiply, which is intrinsically compute bound, "
        "running at the speed of memory. This is the single commonest kernel bug "
        "there is."),
]

# --- the fix: tiling -------------------------------------------------------
SCRIPT["tiling"] = [
    (A, "The fix is tiling, and it is the same idea as the hierarchy itself."),
    (A, "A block of threads loads one tile of A and one tile of B "
        "into shared memory. Once. Together. Coalesced."),
    (A, "Then every thread in that block computes from the shared copy."),
    (A, "With a thirty two wide tile, you have cut reads from main memory "
        "by a factor of thirty two."),
    (A, "Then you do it again one level down. Each thread keeps a small patch "
        "of the output in registers, and does many operations per value "
        "it reads from shared memory."),
    (B, "So the code mirrors the memory hierarchy."),
    (A, "Exactly. Main memory to shared, shared to registers, registers to "
        "accumulators. And that is not a coincidence. That is the whole design."),
]

# --- the other half: coalescing -------------------------------------------
SCRIPT["coalescing"] = [
    (A, "One more thing decides whether you get the bandwidth you paid for at all."),
    (A, "A group of thirty two threads issues its reads together. "
        "If those thirty two addresses are next to each other, "
        "the hardware serves them in one transaction."),
    (A, "If they are scattered, it serves them in many, and effective bandwidth "
        "falls by ten to thirty times."),
    (A, "In the standard matrix multiply walkthrough, simply swapping which index "
        "maps to the fastest moving thread took the naive kernel "
        "from three hundred gigaflops to two thousand."),
    (B, "From one line."),
    (A, "From one line. Before any tiling at all."),
]

# --- the objection ---------------------------------------------------------
SCRIPT["objection"] = [
    (B, "Is this not what torch dot compile does for me?"),
    (A, "For the easy half, yes. Fusion is exactly this argument: "
        "do not write an intermediate tensor to memory "
        "just to read it straight back."),
    (A, "But a compiler can only fuse what you gave it. "
        "It cannot change an algorithm that moves too much data, "
        "and it will not tell you which roof you are under."),
    (A, "Flash Attention is the proof. It is not a faster attention formula. "
        "It is the same formula that never writes the big matrix to memory."),
]

# --- the take ---------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So the thing to take away is a habit, not a fact."),
    (A, "Before you optimise a kernel, work out its intensity. "
        "Operations over bytes. Compare it to your card's crossover number."),
    (A, "If you are under it, and you almost always are, "
        "then every clever thing you do to the arithmetic is wasted, "
        "and the only question that matters is how to move fewer bytes."),
]

SCRIPT["resources"] = [
    (A, "If you want this properly, the page lists where to go."),
    (A, "Horace He, on first principles. That is the canonical explanation."),
    (A, "Simon Boehm's matmul worklog. Measured numbers at every step."),
    (A, "And chapters five and six of P M P P. The textbook derivation."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:14s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
