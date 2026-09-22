"""
Topic overview: the PyTorch ecosystem, as of 22 September 2026.

The load-bearing idea is that this map has a direction of travel, which most
stack diagrams do not. The bottom of it, the dispatcher and DTensor, is what
everything else is expressed in terms of and is the safest thing anyone can
learn. The top of it churns: FSDP1 was formally deprecated in 2.11, torchtune
is discontinued, torchforge is paused, and in September the ownership of the
layer above changed hands when Nvidia confirmed it is buying Hugging Face. So
the episode is not "here are the boxes". It is "here is where to put weight,
and here is what is moving under you".

The outline that survived the revision step:

    ident       what the ecosystem is, the current release, and that it moves
    map         the four layers a tensor meets, named, nothing explained
    question    which parts can you build on, and which are moving under you
    walk        core: the dispatcher is the extension point, and it is stable
                -> compilation: the three stages, and which one fails
                -> distributed: DTensor is why the layer composes at all
                -> what is dead or dying, in a table
                -> performance: the opt-in layer
                -> Helion, and the gap between compile and hand-written Triton
                -> ownership of the layer above changed in September
    take        build on the bottom, recheck the top every quarter

What the step-4 critique caught, and what changed:

  - Draft one put the release table on screen as a beat, five rows of version
    headlines. That is a changelog read aloud, and it is the "narrating a list"
    failure. The one release fact that survived is FSDP1's deprecation in 2.11,
    which belongs in the table of things that are dying, and the cadence, which
    belongs in the take because it is what makes the take actionable.
  - The map had five columns in draft one, with the training frameworks as the
    fifth. Cut to four: the frameworks are the thing the episode is arguing
    about, so putting them in the parked inventory spent the surprise early and
    made the map's text too small to read once it was fitted to the frame.
  - Draft one explained AOTInductor, ExecuTorch, ONNX and vLLM in a deployment
    beat. None of them was doing work in this argument; deployment is now one
    clause inside the compilation beat, where torch.export earns it.
  - The Nvidia acquisition was three sentences of speculation in draft one.
    Reduced to what the page states: the date, the price, what it means
    structurally, and Huang's commitment labelled as a promise rather than a
    property.
  - B was asking for definitions. B now asks the three questions that actually
    decide something: is the churn knowable in advance, is torchtune a dead
    branch, and does the acquisition change anything today.

Every figure traces to the canonical page "Topic: pytorch-ecosystem", except
the Nvidia and Hugging Face acquisition, which is on that page's own child,
"The layer above core: HF stack and training frameworks". That is a page
defect worth fixing: the topic page has a "Governance and repo shuffle worth
knowing" section and this is the largest governance change of the year.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: pytorch-ecosystem"
SUBTITLE = "the stack, and which parts are moving under you"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "core", "tone": "subject", "items": [
            "ATen",
            "the dispatcher",
            "autograd",
            "CUDA / ROCm / MPS / XPU",
        ]},
        {"head": "compilation", "tone": "machinery", "items": [
            "TorchDynamo",
            "AOTAutograd",
            "TorchInductor",
            "torch.export",
        ]},
        {"head": "distributed", "tone": "verified", "items": [
            "c10d",
            "DTensor",
            "FSDP2",
            "pipelining",
        ]},
        {"head": "performance", "tone": "number", "items": [
            "SDPA backends",
            "FlexAttention",
            "torchao",
            "profiler",
        ]},
    ]},

    "question": {"kind": "claim",
                 "text": "Which parts of this can you build on for three years,\n"
                         "and which are moving under you?",
                 "note": "four layers, and they are not equally settled"},

    "core": {"kind": "points", "focus": "the dispatcher",
             "head": "the dispatcher: the extension point", "items": [
        "picks by device, dtype, autograd state",
        "every backend hooks in here",
        "every custom op and tensor subclass hooks in here",
        "torchao and DTensor are ordinary users of it",
    ]},

    "compile": {"kind": "flow", "focus": "TorchInductor", "tone": "machinery",
                "steps": [
        "Dynamo: bytecode + guards",
        "AOTAutograd: joint fwd/bwd",
        "Inductor: Triton + C++",
    ]},

    "distributed": {"kind": "points", "focus": "DTensor",
                    "head": "DTensor: a mesh and a placement", "items": [
        "FSDP2 is expressed in it",
        "tensor parallel is expressed in it",
        "pipelining and checkpointing too",
        "which is why they compose, and compose with compile",
    ]},

    "moving": {"kind": "table", "focus": "FSDP2", "tone": "cost",
               "head": ["if you reach for", "status", "reach for"],
               "rows": [
                   ["FSDP1", "deprecated in 2.11", "fully_shard"],
                   ["torchtune", "discontinued", "torchtitan"],
                   ["torchforge", "paused", "torchtitan"],
               ]},

    "perf": {"kind": "points", "focus": "torchao",
             "head": "the opt-in layer", "items": [
        "SDPA picks the attention backend, FlashAttention-4 included",
        "FlexAttention: your own mask, still a fused kernel",
        "torchao: quantization, fp8, sparsity",
        "profiler and memory snapshot, to find out which you needed",
    ]},

    "helion": {"kind": "compare", "sides": [
        {"head": "torch.compile", "tone": "machinery", "items": [
            "decides everything for you",
            "occasionally decides badly",
        ]},
        {"head": "hand-written Triton", "tone": "cost", "items": [
            "decides nothing for you",
            "you commit to the tiling by hand",
        ]},
    ]},

    "ownership": {"kind": "stat", "big": "$12.93bn", "tone": "cost",
                  "caption": "Nvidia buying Hugging Face, confirmed 3 September 2026",
                  "note": "the default distribution point for open weights now sits "
                          "inside the company that sells the hardware they run on"},

    "close": {"kind": "claim",
              "text": "Build on the dispatcher and DTensor.\nRecheck the layer above every quarter.",
              "note": "roughly one minor release per quarter, and the deprecations "
                      "are announced before they bite"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is, and that it moves
    "ident": [
        (A, "This is the PyTorch ecosystem. Not PyTorch the library, but the whole "
            "stack that has grown around it. A compiler, a distributed layer, a "
            "performance layer, and the frameworks people actually train with."),
        (A, "Current stable release is two point thirteen, from July twenty twenty "
            "six, and this page was verified today."),
        (A, "And unlike most stack diagrams, this one has a direction of travel. Some "
            "of it will still be here in three years. Some of it is being deprecated "
            "underneath you right now."),
    ],

    # 2. the inventory, in the order a tensor meets it
    "map": [
        (A, "Here is the board, in the order a tensor meets it. Nothing explained yet."),
        (A, "Core is the eager runtime. A Ten is the C plus plus tensor library every "
            "operator is implemented against. The dispatcher. Autograd. And the "
            "device backends, CUDA, ROCm, Apple's M P S and X P U."),
        (A, "Compilation replaces running operations one at a time with generated "
            "code. Torch Dynamo, A O T Autograd, Torch Inductor, and torch dot "
            "export."),
        (A, "Distributed is c ten d, the process group layer, and D Tensor, with "
            "F S D P two and pipelining above them."),
        (A, "Performance is attention and precision. S D P A backends, Flex "
            "Attention, torch A O, and the profiler."),
        (A, "Above those four sit the training frameworks and the deployment edge. We "
            "come back to those, because that is where the story is."),
    ],

    # 3. the organising question
    "question": [
        (A, "Which makes the question for a stack this size fairly blunt. Which parts "
            "of it can you build on for three years, and which parts are moving under "
            "you?"),
        (B, "And is that knowable in advance, or do I find out when something breaks?"),
        (A, "It is knowable, and this page is mostly the answer. Deprecations are "
            "announced a release ahead, and ownership changes are public. Four "
            "layers, and they are not equally settled."),
    ],

    # 4. the stable bottom
    "core": [
        (A, "Start at the bottom, because the bottom is the part that does not move."),
        (A, "The dispatcher is the piece worth understanding properly. For any "
            "operator, it picks which implementation to call, based on the device, "
            "the data type, and whether autograd is recording."),
        (A, "That sounds like plumbing. It is actually the extension point that every "
            "backend, every custom operator and every tensor subclass hooks into."),
        (A, "And that is the thing to hold on to, because once you have seen it, torch "
            "A O and D Tensor stop looking like magic. They are not special cases "
            "bolted onto the framework. They are ordinary users of the dispatcher."),
    ],

    # 5. the compiler, in three stages
    "compile": [
        (A, "Compilation is three stages, and it helps enormously to know which one "
            "is failing when it fails."),
        (A, "Torch Dynamo captures Python bytecode into a graph, plus guards. The "
            "guards are the conditions under which that capture stays valid, and when "
            "one breaks you get a graph break."),
        (A, "A O T Autograd takes that and builds one joint forward and backward "
            "graph, so the backward pass is compiled too, not just the forward."),
        (A, "Torch Inductor then emits fused kernels. Triton on the graphics card, "
            "C plus plus with OpenMP on the processor."),
        (A, "And torch dot export is the strict version of that first step. Full "
            "graph, no breaks. That is what deployment builds on, because A O T "
            "Inductor turns an exported graph into a standalone shared library with "
            "no Python in the loop."),
    ],

    # 6. why the distributed layer composes
    "distributed": [
        (A, "The distributed layer is where the design got much better, and D Tensor "
            "is the reason."),
        (A, "Underneath it is c ten d, the process group layer sitting on the N C C L "
            "and Gloo collective libraries. That part is old and fine."),
        (A, "D Tensor is the newer idea, and it is a small one. A tensor that carries "
            "a device mesh and a placement for each of its dimensions. That is all "
            "it is."),
        (A, "But F S D P two, tensor parallel, pipelining and distributed "
            "checkpointing are all expressed in terms of it. Which is precisely why "
            "they compose, with each other and with torch dot compile. That "
            "composition is the whole payoff, and it is why the older interface is "
            "going away."),
    ],

    # 7. what is dead or dying
    "moving": [
        (A, "Which brings us to the table you actually need, because three things on "
            "this map are dead or dying and none of them looks dead from outside."),
        (A, "F S D P one was formally deprecated in two point eleven, in March. The "
            "replacement is the fully shard interface, which is F S D P two."),
        (A, "Torch tune, Meta's fine tuning recipes, was discontinued in twenty "
            "twenty five. Torch forge, the reinforcement learning successor that was "
            "meant to replace it, is paused."),
        (B, "So anything I start today on torch tune is a dead branch."),
        (A, "A dead branch. PyTorch native training now means torch titan plus the "
            "core interfaces, and nothing else from that family."),
    ],

    # 8. the performance layer
    "perf": [
        (A, "The performance layer changes fastest and breaks least, because almost "
            "all of it is opt in."),
        (A, "S D P A picks an attention backend for you, and Flash Attention four is "
            "one of those backends on Hopper and Blackwell now. Flex Attention lets "
            "you write your own mask or score modification and still get a fused "
            "kernel."),
        (A, "Torch A O is quantization, float eight and sparsity. And the profiler, "
            "with the memory snapshot, is how you find out which of those you "
            "actually needed rather than guessing."),
    ],

    # 9. the gap between the two bad options
    "helion": [
        (A, "There is a newer piece between two of those, and the gap it fills is a "
            "real one."),
        (B, "Why not just write Triton?"),
        (A, "Because Triton makes you commit, by hand, to the tiling, the memory "
            "layout and the pipelining. And torch dot compile makes none of those "
            "choices yours, which is fine right up until it chooses badly."),
        (A, "Helion sits in between. You write roughly a tiled loop nest in Python, "
            "and the compiler autotunes the parts Triton made you fix. It compiles "
            "down to Triton, to Cute D S L and to Pallas, so one source targets "
            "N Vidia, A M D and T P U. And it is hosted by the PyTorch Foundation "
            "rather than by any one vendor."),
    ],

    # 10. who owns the layer above
    "ownership": [
        (A, "Which matters more this month than last, because of the number on the "
            "screen."),
        (A, "On the third of September, N Vidia confirmed it is buying Hugging Face "
            "for twelve point nine three billion dollars."),
        (A, "Transformers version five is now the model definition source for v L L M "
            "and S G Lang as well as for training. One implementation, many runtimes. "
            "So that hub, and every training and inference integration layered on it, "
            "now sits inside the company that sells the hardware those weights run "
            "on."),
        (B, "Does that change anything today, or is it just a logo?"),
        (A, "Today, nothing. Jensen Huang's stated commitment is that the platform "
            "stays open and that N Vidia compute will not be required to use it. "
            "That is a promise to date and recheck, not a property of the stack."),
    ],

    # 11. the take
    "close": [
        (A, "So what is this map for?"),
        (A, "It tells you where to put weight. The bottom, the dispatcher and "
            "D Tensor, is what everything else is expressed in terms of. It is the "
            "safest thing here to learn and the best place to debug from."),
        (A, "The frameworks above it are the opposite. They churn, they get "
            "discontinued, and this month the ownership of the biggest one changed "
            "hands."),
        (A, "Cadence is about one minor release a quarter. So the habit that keeps "
            "this map true is not reading more of it. It is rechecking the top of it "
            "every quarter, and never the bottom."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:16s} {len(beat)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
