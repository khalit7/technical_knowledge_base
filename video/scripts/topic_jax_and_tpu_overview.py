"""
Topic overview: JAX and TPU, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this is the only topic
in the knowledge base with a "why would I use this at all" question hanging
over it, because the reader already has PyTorch and PyTorch already trains on
thousands of GPUs. So the episode is built as a single trade rather than as a
tour. The price is the functional model: functions must be pure, and state, the
parameters, the optimiser and the RNG, is threaded explicitly. What the price
buys is a compiler that can take a single-device program plus layout
annotations and shard it across a pod. Everything else the page carries, the
TPU hardware, the sharding model and the training stack, is downstream of that
one sentence and is introduced as such.

The outline that survived the revision step:

    ident       what this is, the PyTorch-to-JAX framing, and the goal state
    map         the four groups, built and parked as the home frame
    question    the trade, stated flat: what you give up, what you get
    price       the price in detail: purity, explicit state, and the three
                transformations it makes possible
    sharding    the payoff: Mesh, NamedSharding, GSPMD, and DP/FSDP/TP as
                nothing but different PartitionSpecs
    chip        what the annotations are actually talking to: the MXU
    pod         and the fabric: ICI, the torus, and what a pod is
    nn_layer    the neural-net layer, and which of the four to use
    plumbing    optax, orbax, grain: the three that exist because runs get
                preempted
    codebases   what to read, since the page's real advice is to read code
    close       the take: when the trade pays, and when it does not

What the step-4 critique changed:

  - Draft one opened on the taxonomy and put the trade at minute four. That is
    the wrong way round for the one topic where the viewer is deciding whether
    to bother at all, so the trade moved to beat three and everything after it
    is explicitly an instalment on it.
  - Draft one had a single "TPU" beat carrying the MXU, HBM, VMEM, ICI, the
    torus, pods, Pallas and four hardware generations. That is a page read
    aloud. Split into the chip and the fabric, and the generations became a
    single clause because the list does no work in speech.
  - The RL trainer definitions (PPO, GRPO, GSPO) were a beat in draft one.
    They are excellent on the page and off-axis in this video, which is about
    a compiler and a torus. GRPO survives as one clause inside the codebases
    beat because Tunix is the reason to open that repo; PPO and GSPO are cut.
  - Draft one said "pmap is legacy" twice, once as inventory and once as
    advice. Once is enough.
  - B was agreeing in draft one. B now interrupts three times: to ask the
    question the whole episode exists for, to catch that the FSDP claim sounds
    too easy, and to ask what happens when the compiler is not enough.

Everything traces to the canonical page "Topic: jax-and-tpu": the
transformations and the purity price, GSPMD and the Mesh/NamedSharding model,
the MXU dimensions, the HBM/VMEM/ICI description and what a pod is, the four
neural-net libraries and their status, optax/orbax/grain, Pallas and Mosaic,
the four codebases, and the recommended learning path including cheap TPU
access.

Numbers and names are spelled the way they are said, because text to speech
reads "128x128", "v6e", "shard_map" and "jnp" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: jax-and-tpu"
SUBTITLE = "purity is the price; a compiler that shards across a pod is what it buys"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the transformations", "tone": "subject",
         "items": ["jit", "grad", "vmap", "shard_map"]},
        {"head": "sharding", "tone": "number",
         "items": ["Mesh", "NamedSharding", "GSPMD"]},
        {"head": "the training stack", "tone": "machinery",
         "items": ["Flax NNX", "optax", "orbax", "grain"]},
        {"head": "the TPU", "tone": "verified",
         "items": ["MXU", "HBM and VMEM", "ICI torus", "Pallas"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Give up mutable state.\n"
                         "Get a compiler that shards one program across a pod.",
                 "note": "that is the whole trade; everything else follows from it"},

    "price": {"kind": "points", "focus": "the transformations",
              "head": "the price: every function must be pure", "items": [
        "params, optimiser state and RNG are threaded by hand",
        "jit traces the function into a jaxpr, then XLA compiles it",
        "grad returns gradients shaped like the parameter pytree",
        "vmap vectorises; shard_map hands you the per-device body",
    ]},

    "sharding": {"kind": "compare", "focus": "sharding", "sides": [
        {"head": "what you write", "tone": "subject", "items": [
            "a single-device program",
            "a device Mesh",
            "a NamedSharding on each array"]},
        {"head": "what GSPMD inserts", "tone": "machinery", "items": [
            "collectives, wherever two annotations disagree",
            "DP, FSDP and TP are different PartitionSpecs",
            "shard_map when you want to write them yourself"]},
    ]},

    "chip": {"kind": "stat", "big": "128x128",
             "caption": "the MXU systolic array",
             "note": "256x256 on some generations. HBM is staged through VMEM, "
                     "a scratchpad the software manages rather than a cache"},

    "pod": {"kind": "points", "focus": "the TPU",
            "head": "ICI: no switches in the path", "items": [
        "each chip wired straight to its neighbours",
        "a 2-D or 3-D torus",
        "ring and torus collectives are cheap",
        "distant point-to-point traffic is multi-hop",
        "a pod: hundreds to thousands of chips, one machine",
    ]},

    "nn_layer": {"kind": "table", "focus": "the training stack",
                 "head": ["", "status"],
                 "rows": [
                     ["Flax NNX", "recommended: stateful modules, close to nn.Module"],
                     ["Flax Linen", "maintained: the older functional API, most code"],
                     ["Equinox", "research: models are pytrees"],
                     ["Haiku", "legacy: DeepMind moved to Flax"],
                 ]},

    "plumbing": {"kind": "columns", "columns": [
        {"head": "optax", "tone": "subject",
         "items": ["optimisers as a chain", "clipping, EMA, masks", "Lion, Muon"]},
        {"head": "orbax", "tone": "verified",
         "items": ["async, sharded", "multi-host", "a whole pod slice"]},
        {"head": "grain", "tone": "machinery",
         "items": ["deterministic input", "checkpointable", "resume mid-epoch"]},
    ]},

    "codebases": {"kind": "columns", "columns": [
        {"head": "MaxText", "tone": "subject", "items": ["pretraining reference"]},
        {"head": "Tunix", "tone": "number", "items": ["post-training", "fine-tuning, GRPO"]},
        {"head": "big_vision", "tone": "context", "items": ["the ViT lineage", "Linen"]},
        {"head": "levanter", "tone": "verified", "items": ["Stanford, Equinox", "bitwise reproducible"]},
    ]},

    "close": {"kind": "claim",
              "text": "You pay in purity, once.\nYou get paid back per device.",
              "note": "so the trade closes when the program is large and "
                      "regular; on one accelerator it is all price and no payoff"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of JAX and T P Us. The Google side stack. JAX itself, "
        "which is functional array programming compiled through X L A, the "
        "neural net libraries on top of it, and the hardware it targets. "
        "Current as of the twenty second of September, twenty twenty six."),
    (A, "The page frames it as a translation track from PyTorch, where "
        "everything has an equivalent, usually more explicit. And it has a goal "
        "state. Port a small PyTorch language model to Flax N N X and train it "
        "on a T P U."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first, in four groups. Nothing explained yet."),
    (A, "The transformations. Jit, grad, vmap, and shard map. Those are JAX. "
        "Then sharding, which is a Mesh, a NamedSharding, and a partitioner "
        "called G S P M D."),
    (A, "Then the training stack. Flax N N X, optax, orbax, grain. And the "
        "hardware. The M X U, high bandwidth memory staged through a scratchpad "
        "called V mem, the interchip interconnect, and Pallas for when you "
        "write a kernel yourself."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Before any of that. PyTorch already trains models on thousands of "
        "G P Us. What is actually missing?"),
    (A, "That is the right question, and this is the one topic where it hangs "
        "over everything. So here is the answer flat, on the screen, and the "
        "rest of the video is instalments on it."),
    (A, "You give up mutable state. You get a compiler that can take one "
        "single device program and shard it across a pod. That is the trade. "
        "Everything else on this map follows from it."),
]

# --- the price -------------------------------------------------------------
SCRIPT["price"] = [
    (A, "The price first, because it is what makes people bounce off. Every "
        "function has to be pure. So the parameters, the optimiser state and "
        "the random number keys are all threaded through your code by hand."),
    (A, "In exchange, the transformations compose freely over anything you "
        "write. Jit traces your function into an intermediate form called a "
        "jaxpr, and hands it to X L A, the accelerated linear algebra "
        "compiler."),
    (A, "Grad is reverse mode automatic differentiation of a pure function, so "
        "gradients come back with the same pytree shape as your parameters. "
        "Vmap vectorises automatically. And shard map is the one where the body "
        "sees only this device's shard."),
]

# --- the payoff ------------------------------------------------------------
SCRIPT["sharding"] = [
    (A, "Now the payoff, and it is the reason the whole trade exists. Look at "
        "the two sides."),
    (A, "On the left, what you write. A single device program. A device Mesh, "
        "your chips arranged into named axes. And a NamedSharding on each "
        "array, which is that Mesh plus a PartitionSpec saying which axis the "
        "array is split along."),
    (A, "On the right, what G S P M D does with it. It inserts the collectives, "
        "wherever two of your annotations disagree. You never write an all "
        "reduce."),
    (B, "So data parallel and F S D P and tensor parallel are the same code?"),
    (A, "Different PartitionSpecs on the same program. That is the claim, and "
        "it is the strongest argument this topic has. And shard map is the "
        "escape hatch when you do want them by hand."),
]

# --- what the annotations are talking to ----------------------------------
SCRIPT["chip"] = [
    (A, "Which raises the obvious question. What are those annotations actually "
        "talking to?"),
    (A, "At the centre of a T P U is the M X U, a systolic array. One hundred "
        "and twenty eight by one hundred and twenty eight, as the screen says, "
        "or two hundred and fifty six square on some generations. That is the "
        "shape your matrix multiplies get cut into."),
    (A, "High bandwidth memory feeds it through V mem, a scratchpad the "
        "software manages rather than a cache that guesses. Generations run v "
        "five e, v five p, Trillium, and Ironwood."),
]

SCRIPT["pod"] = [
    (A, "And then the part that makes the sharding story real. The interchip "
        "interconnect. Each chip is wired straight to its neighbours in a two "
        "or three dimensional torus, with no switches anywhere in the path."),
    (A, "Read the consequences down the list. Ring and torus collectives are "
        "cheap, because they are the shape of the wiring. Distant point to "
        "point traffic is multi hop. And a pod is the resulting fabric. "
        "Hundreds to thousands of chips that one job treats as a single "
        "machine."),
    (B, "And when the compiler is not good enough for some kernel?"),
    (A, "Then Pallas, the Triton analogue for T P Us and G P Us, lowering "
        "through Mosaic, the T P U backend compiler."),
]

# --- the training stack ----------------------------------------------------
SCRIPT["nn_layer"] = [
    (A, "Up a level, to the neural net layer, where the useful column is status "
        "rather than the names."),
    (A, "Flax N N X is the recommended one now. Pythonic, stateful modules, "
        "close to a PyTorch module. Linen is the older functional A P I, still "
        "maintained, and it is what most code you will read is written in."),
    (A, "Equinox is the minimal research option, where models are just pytrees. "
        "Haiku is legacy, worth reading only for old DeepMind repositories, "
        "since DeepMind moved to Flax."),
]

SCRIPT["plumbing"] = [
    (A, "Three more pieces, and notice what they have in common. They all exist "
        "because long runs get interrupted."),
    (A, "Optax expresses optimisers as chainable pure gradient transformations. "
        "So clipping, exponential moving average, accumulation, per parameter "
        "masks, Lion and Muon are links in a chain rather than subclasses of "
        "an optimiser."),
    (A, "Orbax does asynchronous, sharded, multi host checkpointing, which is "
        "what makes checkpointing a whole pod slice practical rather than "
        "heroic. And grain gives deterministic, checkpointable input pipelines, "
        "so a preempted run resumes mid epoch."),
]

# --- what to read ----------------------------------------------------------
SCRIPT["codebases"] = [
    (A, "The page's real advice, once you can read the syntax, is to go and "
        "read code. Four repositories, each here for a different reason."),
    (A, "MaxText is Google's pure JAX pretraining stack, and the reference for "
        "what good sharded JAX looks like. Tunix is the post training "
        "counterpart, covering fine tuning, distillation and the reinforcement "
        "learning trainers, including G R P O."),
    (A, "Big vision is the vision transformer lineage in Linen, the cleanest "
        "example of the older style. And levanter is Stanford's non Google "
        "perspective, on Equinox, where training resumes bitwise identically "
        "after preemption."),
]

# --- the take --------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is this map for? For deciding one thing, and the two lines on "
        "the screen are the whole of it. You pay in purity, once, up front. You "
        "get paid back per device."),
    (A, "Which tells you when the trade closes. A large, regular program on a "
        "pod is where it pays. On a single accelerator it is all price and no "
        "payoff, and you should stay where you are."),
    (A, "And the cheap route to finding out is on the page. A v five e on "
        "Colab, a v five e eight on Kaggle, then the T P U Research Cloud."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
