"""
Provider overview: Alibaba's Qwen line, as of 22 September 2026.

The load-bearing idea is that Qwen's breadth is a strategy rather than a
catalogue. Where DeepSeek optimises cost per served token and Moonshot
optimises capability per training run, Qwen optimises coverage: a full ladder
of sizes and modalities at every generation, almost all Apache 2.0, which is
why Qwen bases became the default thing everybody else fine-tunes, including
DeepSeek's own R1 distillations. This page earns a video because that position
is invisible on a leaderboard and is the actual product, and because the
mechanism that makes it affordable, distilling the small models from the large
ones instead of running the full pipeline nine times, is a real engineering
answer to an obvious objection.

Every figure comes from the canonical page "Alibaba: Qwen", read from Notion on
22 September 2026. Nothing was invented for narrative shape.

The outline that survived the revision step:

    ident      name the line, say what it is, say why it earns the time
    ladder     the board: flagship tier, efficiency line, long tail. Parked
               as the home frame
    question   is this a strategy or a catalogue?
    moat       why breadth compounds, and the distillation that pays for it
    budgets    decision one: hybrid thinking with a caller-set budget, and
               the 2507 split that admits what it costs
    moe        decision two: no shared expert, against DeepSeek's shared one
    deltanet   decision three: Gated DeltaNet, and why the ratio is 3 to 1
    qsa        the Qwen4 preview, and where 21x sparsity actually sits
    caveats    Arena is preference, one model left Apache, Max is snapshots
    take       breadth is distribution, and a second research licence is what
               would change it

What the step-4 critique caught, and what changed:

  - Draft one had a beat per generation, which is the lineage read aloud and
    the "narrating a list" failure exactly. Replaced with three decisions that
    are genuinely Qwen's, each with the number attached.
  - The distillation mechanism was a footnote in draft one and is now the
    answer to the objection the viewer is actually forming, which is that
    nobody can run a full reasoning pipeline at nine sizes at once. Moved next
    to the breadth claim it explains.
  - A standalone sparsity beat and a standalone QSA beat were the same beat:
    the ratio only means anything against the rivals' ratios, so they merged
    into one chart.
  - Draft one said 21x was the most aggressive ratio in the open frontier. The
    page says the open flash tier, and names DeepSeek at 33x and Kimi at 27x
    above it. Corrected, and the correction became the chart.
  - The Qwen-Image-2.1 licence change was in the opening in draft one, where it
    read as the story. It is one model and the page says so: it belongs in the
    caveats, and in the take as the thing to watch.
  - B was narrating in draft one. B now asks the catalogue question that the
    whole episode answers, and flags the shared-expert disagreement.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"235B-A22B" and "3.8" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Alibaba: Qwen"
SUBTITLE = "why shipping everything at every size is a strategy"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Columns rather than a stack: the board is three tiers
    # that exist side by side, not an order of operations.
    "ladder": {"kind": "columns", "park": True, "columns": [
        {"head": "the flagship tier", "tone": "subject", "items": [
            "Qwen3.8-Max, 2.4T / 95B", "Qwen3.5-397B"]},
        {"head": "the efficiency line", "tone": "machinery", "items": [
            "Qwen3-Next, 80B / 3B", "Qwen3.8-Flash-Next, 125B / 6B"]},
        {"head": "the long tail", "tone": "verified", "items": [
            "Qwen3.8-27B dense", "the 0.6B-235B ladder", "Coder, VL, Audio, Math"]},
    ]},

    "question": {"kind": "claim",
                 "text": "A strategy, or just a catalogue?",
                 "note": "DeepSeek optimises cost per token, Moonshot capability "
                         "per run. Qwen optimises coverage"},

    "moat": {"kind": "points", "head": "why breadth compounds", "items": [
        "Apache 2.0: commercial use and redistribution, near enough no conditions",
        "so a base exists at whatever size and licence a project needs",
        "the default start for open research and distillation, R1's included",
        "and the small models are distilled from the large ones, not retrained",
        "the same weights are the paid tier on Alibaba Cloud Model Studio",
    ]},

    "budgets": {"kind": "compare", "sides": [
        {"head": "one checkpoint, two modes", "tone": "verified", "items": [
            "think or don't, chosen in the chat template",
            "a thinking budget the caller sets",
            "trained to wrap up, not to be cut off"]},
        {"head": "then split back apart", "tone": "cost", "items": [
            "the 2507 refresh shipped Instruct and Thinking separately",
            "one set of weights left quality on the table",
            "simplicity against peak quality, and they chose again"]},
    ]},

    "moe": {"kind": "compare", "sides": [
        {"head": "Qwen: 8 of 128, no shared expert", "tone": "subject", "items": [
            "235B total, 22B active",
            "the router handles everything",
            "no fixed unconditional cost per token"]},
        {"head": "DeepSeek: 8 of 256, plus a shared one", "tone": "context", "items": [
            "finer-grained experts",
            "a shared expert absorbs the common work",
            "routed capacity freed to specialise"]},
    ]},

    "deltanet": {"kind": "points", "focus": "the efficiency line",
                 "head": "Gated DeltaNet, and why the ratio is 3 to 1", "items": [
        "linear attention: a fixed-size state, not a cache that grows",
        "the delta rule: replace the association, don't pile onto it",
        "a learned gate, so the state can forget",
        "3 layers in 4 linear, 1 in 4 full, because linear recall is lossy",
    ]},

    "qsa": {"kind": "bars", "head": "total parameters per active parameter",
            "bars": [
        {"label": "Qwen3.8-Flash-Next", "text": "about 21x", "value": 21,
         "tone": "subject"},
        {"label": "Kimi K3", "text": "about 27x", "value": 27, "tone": "context"},
        {"label": "DeepSeek V4 Pro", "text": "about 33x", "value": 33,
         "tone": "context"},
    ]},

    "caveats": {"kind": "points", "tone": "cost",
                "head": "three things to keep an eye on", "items": [
        "Arena placings are human preference, not task completion",
        "Qwen-Image-2.1 shipped research-licence only, not Apache 2.0",
        "Max now ships dated snapshots: pin the id or it is not reproducible",
    ]},

    "take": {"kind": "claim",
             "text": "Breadth is distribution, and distribution is the product.",
             "note": "the thing that would change it is a second research "
                     "licence, not the next flagship score"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is Qwen, Alibaba's model line. It is the widest catalogue of "
        "open weight models any lab publishes, from sub billion models that "
        "run on a phone up to a two point four trillion parameter flagship."),
    (A, "It earns an episode because that breadth is a strategy, not a "
        "product list. Current as of the twenty second of September, "
        "twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["ladder"] = [
    (A, "The board first. Nothing explained yet."),
    (A, "The flagship tier. Qwen three point eight Max: two point four "
        "trillion parameters, ninety five billion active, open weighted since "
        "August. Below it, Qwen three point five, at three hundred and "
        "ninety seven billion."),
    (A, "The efficiency line. Qwen three Next, and Qwen three point eight "
        "Flash Next: a hundred and twenty five billion, six billion active."),
    (A, "And the long tail. A dense twenty seven billion, the whole ladder "
        "down to nought point six, and Coder, vision language, Audio and "
        "Math variants of most of it."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "That is a lot of models. Is that a strategy, or just a catalogue?"),
    (A, "That is what the rest of this answers. DeepSeek optimise cost per "
        "served token. Moonshot optimise capability per training run. Qwen "
        "optimise coverage."),
]

# --- why breadth compounds ------------------------------------------------
SCRIPT["moat"] = [
    (A, "Almost all of it is Apache two point zero. Commercial use, "
        "redistribution, essentially no conditions. So whatever size and "
        "licence your project needs, a Qwen base already exists."),
    (A, "And that compounds. Qwen bases became the default start for open "
        "research and for distillation, including DeepSeek's own R one "
        "distillations."),
    (B, "But nobody runs a full reasoning pipeline at nine sizes at once."),
    (A, "They do not. The small ones are distilled from the large ones, "
        "trained on the teacher's output distribution rather than on hard "
        "labels. That is what lets the whole ladder ship in one day."),
]

# --- decision one: the thinking budget ------------------------------------
SCRIPT["budgets"] = [
    (A, "Now the decisions that are genuinely theirs. From Qwen three onward, "
        "one checkpoint serves both a fast answer and a long chain of "
        "thought, picked by the caller in the chat template."),
    (A, "And the caller caps it. The thinking budget sets how many tokens it "
        "may spend deliberating, and it is trained to wrap up when that runs "
        "out rather than be cut off mid thought. Reasoning depth becomes a "
        "runtime dial."),
    (A, "The cost is on the right. The twenty five oh seven refresh split the "
        "line back into separate Instruct and Thinking checkpoints, because "
        "one set of weights serving both modes left quality on the table."),
]

# --- decision two: no shared expert ---------------------------------------
SCRIPT["moe"] = [
    (A, "Decision two is one of the more informative disagreements in open "
        "mixture of experts design. Qwen's flagship routes eight of a hundred "
        "and twenty eight experts, with no shared expert at all."),
    (A, "DeepSeek, on the right, route eight of two hundred and fifty six "
        "finer grained ones, plus a shared expert every token passes through."),
    (A, "Qwen let the router handle everything instead. Simpler, and no fixed "
        "cost per token, at the risk that routed experts each relearn general "
        "behaviour. Both of them work."),
]

# --- decision three: the attention hybrid ---------------------------------
SCRIPT["deltanet"] = [
    (A, "Decision three lives in the efficiency line, which is where the "
        "architecture gets tested before a flagship adopts it. Three quarters "
        "of Qwen three Next's layers run Gated DeltaNet."),
    (A, "Linear attention keeps a fixed size state instead of a cache that "
        "grows. The delta rule is what makes it usable: before writing a key, "
        "subtract what the state already returns for it, so the association "
        "is replaced rather than piled on."),
    (A, "And the ratio is the honest part. Three layers in four linear, one "
        "in four full, because recall through the linear layers is lossy and "
        "agents depend on exact retrieval."),
]

# --- the Qwen4 preview, and where the ratio sits --------------------------
SCRIPT["qsa"] = [
    (A, "In August, Flash Next swapped the other half of that hybrid for "
        "Qwen Sparse Attention, which selects context by micro block rather "
        "than by token, because blocks map onto how a card reads memory."),
    (A, "It also pushes sparsity to about twenty one to one, the most "
        "aggressive ratio in the open flash tier."),
    (B, "In the flash tier. Not the open frontier."),
    (A, "Not the frontier. Look at the bars. Kimi K three sits near twenty "
        "seven, DeepSeek V four Pro near thirty three. And the ratio is not "
        "really the point. What six billion active buys is the absolute "
        "figure, because that is what it costs to decode."),
]

# --- the caveats ----------------------------------------------------------
SCRIPT["caveats"] = [
    (A, "Three things to read carefully. Arena placings are human preference "
        "leaderboards: they measure which answer people preferred, not "
        "whether a task was completed."),
    (A, "Second, the Apache default may be softening. Qwen Image two point "
        "one shipped in September under a research licence, non commercial "
        "only. One model does not settle it. A second would."),
    (A, "And third, Max now ships dated snapshots rather than version "
        "numbers, so any result you want to reproduce has to pin the "
        "snapshot id."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So the take. Breadth here is not generosity, and it is not a "
        "catalogue. It is distribution, and it works because distillation "
        "makes the ladder cheap to produce."),
    (A, "Being the base model everybody else fine tunes is a position no "
        "benchmark win takes away, and underneath it sits a paid cloud tier "
        "selling the same weights."),
    (A, "So the thing to watch is not the next flagship score. It is whether "
        "a second model ships without the Apache licence."),
]


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
        print(f"  {key:12s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
