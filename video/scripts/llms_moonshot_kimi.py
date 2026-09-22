"""
Provider overview: Moonshot AI's Kimi line, as of 22 September 2026.

The load-bearing idea is that Moonshot's edge is a willingness to reopen the
two things almost every other lab inherits without question: the optimizer and
the attention layer. AdamW and softmax attention are settled everywhere else;
Moonshot has replaced both in shipped models at trillion scale, and published
how. The episode's middle is the attention story, because it is the one that
ends in a reversal: they built a linear-attention layer good enough to carry
three quarters of the depth, and then deliberately kept one layer in four on
full attention, because a fixed-size state cannot hold exact recall and exact
recall is what agents do all day. This page earns a video because that shape,
a research result and the limit of the research result published together, is
rare and is the thing a benchmark table cannot show.

Every figure comes from the canonical page "Moonshot AI: Kimi", read from
Notion on 22 September 2026. Nothing was invented for narrative shape.

The outline that survived the revision step:

    ident      name the lab, say what it is, say why it earns the time
    map        the four things they refused to inherit. Parked as the home
               frame; later beats focus rows of it
    question   what do you get for changing what everyone treats as settled?
    muon       AdamW rescales each parameter alone; Muon orthogonalises the
               momentum matrix, and why a flat spectrum helps
    qkclip     what Muon broke, and the fix that acts on the weights rather
               than on the forward pass. The result is an absence: no spikes
    linear     the recurrence, and the capacity problem that killed it before
    hybrid     KDA's delta write and per-channel gate, then the reversal:
               1 layer in 4 stays full attention
    shipping   4 bits as a release format, not a post-processing step
    numbers    the index lead, and the two benchmarks where it is behind
    take       the mechanism is the thing, and theirs is published

What the step-4 critique caught, and what changed:

  - Draft one called K3 "the strongest open model" and left it there. The page
    does not say that: it says highest-placed on the aggregate indices, and
    then gives two benchmarks where K3 is behind, Real-SWE against GLM-5.3 and
    Phi-Bench against Claude Opus 5. B now says the unscoped version out loud
    so that A has to correct it, with the table on screen.
  - The post-training beat (manufactured agentic data, rubric self-critique)
    was cut whole rather than shrunk, and its row left off the map with it.
    It is real and it is on the page, but the episode already had two research
    reversals to carry and a fifth row nothing focused was a row on screen
    doing nothing.
  - Draft one explained Muon and qk-clip as one beat. They are cause and
    consequence, and running them together hid the only interesting thing
    about qk-clip, which is that it fixes damage the previous decision did.
  - The MuonClip result was written as "15.5 trillion tokens with no loss
    spikes", a fact. It is better as an absence: the headline number is zero,
    and what zero is worth at that scale is weeks of restarts not lost.
  - Cognition SWE-2's benchmark version skew was a fourth caveat in draft one.
    Cut to the one clause that carries the argument the take needs, which is
    that a third party took the weights and productised them.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"15.5T" and "MXFP4" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Moonshot AI: Kimi"
SUBTITLE = "what you get for changing the parts everyone else inherits"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Not a product line: the list of inherited components
    # this lab declined to inherit, which is what the episode is about.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("the optimizer", "Muon, plus qk-clip"),
        ("the attention layer", "Kimi Delta Attention, hybridised"),
        ("the expert layer", "Stable LatentMoE, 16 of 896"),
        ("the release format", "shipped natively at 4 bits"),
    ]},

    "question": {"kind": "claim",
                 "text": "What do you get for changing\nwhat everyone else treats as settled?",
                 "note": "and can you ship it before the architecture moves again?"},

    "muon": {"kind": "compare", "focus": "the optimizer", "sides": [
        {"head": "AdamW", "tone": "context", "items": [
            "every parameter rescaled on its own",
            "by its own running second moment",
            "two moment buffers per parameter"]},
        {"head": "Muon", "tone": "subject", "items": [
            "the momentum buffer treated as a matrix",
            "orthogonalised, a few Newton-Schulz steps",
            "momentum only: less state to shard"]},
    ]},

    "qkclip": {"kind": "stat", "focus": "the optimizer", "big": "0",
               "caption": "loss spikes, 15.5T tokens, 1T parameters",
               "tone": "verified",
               "note": "qk-clip watches the largest attention logit per head "
                       "and rescales that head's Q and K weights after the "
                       "optimizer step, so nothing is added to the forward path"},

    "linear": {"kind": "points", "focus": "the attention layer",
               "head": "linear attention: the trade", "items": [
        "drop the softmax and the layer becomes a recurrence",
        "a fixed-size state, written by each token, read by each query",
        "memory per token constant instead of growing",
        "but a fixed state holds finitely many associations",
        "writes superimpose, so recall of something far back degrades",
    ]},

    "hybrid": {"kind": "compare", "sides": [
        {"head": "what KDA fixes", "tone": "verified", "items": [
            "delta rule: replace the association, don't stack it",
            "a decay gate, per channel not per token",
            "~75% smaller KV cache, several-fold faster decode at 1M"]},
        {"head": "what stays full attention", "tone": "cost", "items": [
            "1 layer in 4, and not fewer",
            "exact recall needs a lossless path",
            "retrieval and copying are what agents do"]},
    ]},

    "shipping": {"kind": "bars", "focus": "the release format",
                 "head": "2.8T parameters, as shipped", "bars": [
        {"label": "BF16", "text": "about 5.6 TB", "value": 5.6, "tone": "cost"},
        {"label": "4-bit (MXFP4)", "text": "about 1.4 TB", "value": 1.4,
         "tone": "verified"},
    ]},

    "numbers": {"kind": "table",
                "head": ["measured on", "Kimi K3", "ahead of it"], "rows": [
        ["aggregate indices (AA v4.2)", "top open model",
         "Anthropic, OpenAI, Meta, SpaceXAI"],
        ["Real-SWE, private codebases", "18.8%", "GLM-5.3, at 28.8%"],
        ["Phi-Bench, infrastructure", "28.12%", "Claude Opus 5, at 36.53%"],
    ]},

    "take": {"kind": "claim",
             "text": "Watch the mechanism, not the index.",
             "note": "a third party took these weights and productised them, "
                     "which is the evidence an index cannot give you"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is Kimi, from Moonshot A I. A Chinese lab whose current "
        "flagship is the highest placed open weight model on the aggregate "
        "intelligence indices."),
    (A, "It earns an episode because of what they are willing to change. Most "
        "labs inherit the optimiser and the attention layer. Moonshot "
        "replaced both, in production, at trillion scale. Current as of the "
        "twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The map here is not a product line. It is the list of things they "
        "refused to inherit."),
    (A, "The optimiser: Muon, and a fix called q k clip."),
    (A, "The attention layer: Kimi Delta Attention, hybridised with ordinary "
        "full attention."),
    (A, "The expert layer: sixteen active experts of eight hundred and ninety "
        "six. A hundred and four billion active, out of two point eight "
        "trillion."),
    (A, "And the release format: shipped natively at four bits. That column "
        "stays up, one row per beat."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So, the question. What do you actually get for changing the parts "
        "everybody else treats as settled?"),
    (A, "The other half of the bet is speed. Kimi Linear went from paper in "
        "October twenty twenty five to flagship backbone in July, fast for a "
        "change that touches every kernel in the stack."),
]

# --- row one: the optimizer -----------------------------------------------
SCRIPT["muon"] = [
    (A, "Start with the optimiser. AdamW, on the left, rescales each "
        "parameter on its own, by its own running second moment."),
    (A, "Muon treats the momentum buffer as a matrix and approximately "
        "orthogonalises it before applying it. It also carries less state: "
        "momentum only, against AdamW's two buffers per parameter."),
    (A, "Here is why that helps. A raw gradient matrix is dominated by a few "
        "large directions, so most of an AdamW step goes into those. "
        "Flattening the spectrum makes the update push everywhere at "
        "comparable scale."),
]

# --- what Muon broke ------------------------------------------------------
SCRIPT["qkclip"] = [
    (A, "But those larger, better conditioned updates broke something. At "
        "scale, attention logits grow without bound, the softmax saturates, "
        "and the loss spikes."),
    (A, "The usual mitigation normalises queries and keys inside the forward "
        "pass, changing the model's own computation. Q k clip acts on the "
        "weights after the optimiser step instead: when a head's largest "
        "logit goes over, scale that head's query and key weights down."),
    (A, "And the headline result is the number on the screen, which is an "
        "absence. Fifteen point five trillion tokens, a trillion parameters, "
        "no loss spikes at all. At that scale a spike means weeks of "
        "restarts."),
]

# --- row two: the attention layer -----------------------------------------
SCRIPT["linear"] = [
    (A, "Now the attention layer, which is worth the middle of the episode, "
        "because it ends in a reversal."),
    (A, "Linear attention drops the softmax, so the layer becomes a "
        "recurrence over a fixed size state. Each token writes its key value "
        "outer product in, the query reads it out, and memory per token is "
        "constant."),
    (A, "The catch is the last two lines. A fixed state holds finitely many "
        "associations, writes superimpose, and recall of something far back "
        "degrades."),
]

SCRIPT["hybrid"] = [
    (A, "Kimi Delta Attention fixes the write. Subtract what the state "
        "already returns for that key, so the association is replaced rather "
        "than stacked. Then a decay gate, controlled per channel rather than "
        "one scalar per token, so old content fades."),
    (A, "Against a full attention baseline that reports a key value cache "
        "about seventy five percent smaller, and several times faster decode "
        "at a million tokens."),
    (B, "So why keep any full attention at all?"),
    (A, "That is the reversal. One layer in four is still full attention, "
        "because retrieval and copying are what agents do all day, and those "
        "need a lossless path."),
]

# --- row three: the release format ----------------------------------------
SCRIPT["shipping"] = [
    (A, "Row four is the release format, and they treat it as a strategic "
        "choice. Two point eight trillion parameters at B F sixteen is about five "
        "point six terabytes of weights. At four bits, about one point four. "
        "Look at the two bars. That is the difference between a model a few "
        "labs can run and one a well equipped team can serve."),
    (A, "K two Thinking used four bit quantisation aware training, so the "
        "weights adapt to the coarse grid rather than being rounded onto it "
        "afterwards. K three ships as microscaling four bit floating point."),
]

# --- the scoreboard, with its scope ---------------------------------------
SCRIPT["numbers"] = [
    (A, "So, the scoreboard, and this is where scope matters. On the "
        "aggregate indices, K three is the highest placed open weight model, "
        "behind only Anthropic, OpenAI, Meta and SpaceX A I."),
    (B, "So it is the strongest open model."),
    (A, "On an index. Look at the other two rows. On Real S W E, which runs "
        "on private codebases, K three resolves eighteen point eight percent "
        "against G L M five point three's twenty eight point eight. On Phi "
        "Bench, twenty eight against Claude Opus five's thirty six and a "
        "half."),
    (B, "So which open model leads depends on the benchmark."),
    (A, "It is now a question about the benchmark, not about the models."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So the take. Moonshot's edge is not data and not distribution. It is "
        "a willingness to reopen the optimiser and the attention layer, and "
        "ship the result inside a year."),
    (A, "And the clearest evidence the weights matter is that somebody else "
        "productised them. Cognition reinforcement learned K three into a "
        "coding agent reporting fifty percent on Frontier Code, against "
        "Claude Fable five point one's fifty point nine, at a claimed "
        "sixty four percent lower cost."),
    (A, "So watch the mechanism, not the index. Theirs is published."),
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
