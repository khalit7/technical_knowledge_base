"""
Provider overview: DeepSeek, as of 22 September 2026.

The load-bearing idea is that DeepSeek is one question asked at five different
layers of the stack: what does it cost to *serve* a frontier-quality model.
Multi-head latent attention, aux-loss-free load balancing, FP8 training on
bandwidth-starved cards and, since September, a frontier-scale encoder-decoder
are all the same move made one layer further out. This page earns a video
because almost nothing on it is a product announcement: every entry in the
lineage is a published mechanism, and the last one reverses a consensus the
whole field shared, which is a story that a list of model names cannot tell.

Every figure comes from the canonical page "DeepSeek", read from Notion on
22 September 2026. Nothing was invented for narrative shape.

The outline that survived the revision step:

    ident      name the lab, say what it is, say why it earns the time
    map        the five layers the same question gets asked at. Parked as the
               home frame; every later beat focuses one row of it
    question   what does it cost to serve this?
    mla        row one: the KV cache is the serving bill. GQA shares and pays
               in quality, MLA compresses and does not
    sparse     the same question one step along: selection, then compression,
               to about 2% of a vanilla cache at 1M context
    moe        row two: the decision that is most theirs. Balancing as a
               control loop outside the loss, not a second objective
    systems    row three: the H800 interconnect was the binding constraint, so
               FP8, DualPipe, DeepEP, and a $5.6M final run
    line       the family as it stands, and the scope of "strongest"
    flash      the closing turn: a 552B encoder-decoder at 890 bytes per token
    objection  the approximation, the concession, and the API surprise
    take       serving arithmetic is what actually moves this field

What the step-4 critique caught, and what changed:

  - Draft one gave GRPO and R1 a beat of their own. They are the most famous
    thing DeepSeek has done and the least characteristic of it, and the beat
    was four facts with no through-line to the cost question. Cut whole. The
    map beat now says out loud that the episode walks past that row and why,
    rather than leaving a named row on screen and never returning to it.
  - Draft one opened on the 890 bytes figure. That is opening on a surprising
    number about a subject nobody has been told is the subject. It is now the
    penultimate beat, which is where it belongs structurally anyway: it is the
    first beat's idea, four layers further out.
  - "The strongest open-weight model" stood unscoped in draft one. It is a
    SWE-bench verified result. B now says so while the table is on screen,
    rather than it arriving in a caveat list at the end.
  - The attention material was three beats (MLA, DSA, compressed attention).
    The last two are one story and one chart, so they merged, and the
    distinction that survived is the one that pays: selection still needs the
    whole cache resident, compression shrinks what is resident.
  - The FP8 recipe was four sentences of detail. Cut to the one thing that
    explains the rest, per-tile scaling, because one outlier must not be
    allowed to poison a whole matrix.
  - B was agreeing in draft one. B now scopes the benchmark claim, questions
    what the $5.6M actually covers, and supplies the T5 objection that sets up
    the take.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"890B" and "V4.1-Flash" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "DeepSeek"
SUBTITLE = "one question, asked at every layer of the stack"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. A stack, because the rows are depths in one system and
    # the episode walks down them in order.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("attention", "MLA, then sparse, then compressed"),
        ("the expert layer", "fine-grained MoE, balancing with no loss"),
        ("numerics and parallelism", "FP8, DualPipe, DeepEP"),
        ("the training loop", "GRPO, R1, hybrid thinking"),
        ("the shape of the network", "encoder-decoder, September 2026"),
    ]},

    "question": {"kind": "claim",
                 "text": "What does it cost to serve this?",
                 "note": "not to train it: to serve it, every token, forever"},

    "mla": {"kind": "compare", "focus": "attention", "sides": [
        {"head": "GQA: share the heads", "tone": "cost", "items": [
            "one K/V pair per group of query heads",
            "the cache shrinks with the sharing factor",
            "heads lose independent memory, so quality degrades"]},
        {"head": "MLA: compress, don't share", "tone": "verified", "items": [
            "one low-rank latent vector cached per token",
            "each head's K and V rebuilt on the way in",
            "~10x off the cache, and quality holds"]},
    ]},

    "sparse": {"kind": "bars", "head": "KV cache at 1M-token context",
               "bars": [
        {"label": "vanilla transformer", "text": "100%", "value": 100,
         "tone": "cost"},
        {"label": "V4 compressed attention", "text": "about 2%", "value": 2,
         "tone": "verified"},
    ]},

    "moe": {"kind": "compare", "focus": "the expert layer", "sides": [
        {"head": "an auxiliary balancing loss", "tone": "cost", "items": [
            "a second objective, fighting the first",
            "pushes a token off its best expert",
            "buys uniformity with quality"]},
        {"head": "a bias, nudged between steps", "tone": "verified", "items": [
            "each expert's routing logits biased up or down",
            "a control loop outside the loss",
            "costs nothing in the objective"]},
    ]},

    "systems": {"kind": "points", "focus": "numerics and parallelism",
                "head": "trained on the cut-down card", "items": [
        "H800s: interconnect cut, so communication was the binding limit",
        "FP8 end to end, scaled per tile so one outlier can't poison a matrix",
        "DualPipe: expert traffic hidden behind another micro-batch's compute",
        "DeepEP: their own dispatch and combine kernels for MoE traffic",
        "2,048 cards, $5.6M final run",
    ]},

    "line": {"kind": "table",
             "head": ["model", "params", "what it is"], "rows": [
        ["V4.1-Flash", "552B / 8B prefill, 16B decode",
         "encoder-decoder, 1M context, vision"],
        ["V4 Pro", "1.6T / 49B active", "80.6% on SWE-bench verified"],
        ["V4 Flash", "284B / 13B active", "price-performance, agentic browsing"],
    ]},

    "flash": {"kind": "stat", "focus": "the shape of the network",
              "big": "890 bytes", "caption": "per token, V4.1-Flash",
              "note": "a quarter of V4 Flash's footprint in HBM, an eighth of "
                      "its footprint on SSD. 40 layers, split 20 encoder and "
                      "20 decoder"},

    "objection": {"kind": "points", "tone": "cost",
                  "head": "read every claim with its scope on", "items": [
        "the V4 Pro lead is SWE-bench verified, not open coding in general",
        "sparse attention is an approximation; MLA was exact to its bottleneck",
        "DeepSeek concede V4.1-Flash is weaker on the longest agent loops",
        "`deepseek-v4-pro` now answers as V4.1-Flash, at Flash pricing",
    ]},

    "take": {"kind": "claim",
             "text": "Serving arithmetic is what moves this field.",
             "note": "T5 argued the encoder-decoder case on quality years ago "
                     "and nobody moved. Bytes per token moved them in one release"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is DeepSeek. A Chinese lab, spun out of a quantitative hedge "
        "fund called High Flyer, that publishes frontier model weights and "
        "unusually complete technical reports about how it built them."),
    (A, "It earns an episode because almost nothing here is a product "
        "announcement. Every release is the same engineering question asked "
        "one layer further down, and the answers became the design most open "
        "models now copy. Current as of the twenty second of September, "
        "twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole stack first. Nothing explained yet."),
    (A, "Attention. Multi head latent attention, then sparse attention, "
        "then compressed attention."),
    (A, "The expert layer. Fine grained mixture of experts, and load "
        "balancing with no balancing loss in it."),
    (A, "Numerics and parallelism. Eight bit floating point training, "
        "DualPipe, DeepEP."),
    (A, "The training loop, which produced R one, and which we are going to "
        "walk straight past, because it is the one row of this everybody "
        "already knows."),
    (A, "And then, since September, the shape of the network itself. "
        "That column stays on screen, because every beat after this one is a "
        "row of it."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "Here is the question all five rows answer, and it is the same "
        "question every time. What does it cost to serve this?"),
    (A, "Not what it costs to train. What it costs to serve, per token, "
        "forever. These are people who pay for their own graphics cards, and "
        "you can read that off every decision they have made."),
]

# --- row one: attention ---------------------------------------------------
SCRIPT["mla"] = [
    (A, "Start at the top of the column. Attention caches a key and a value "
        "for every head, for every token. Decoding reads that whole cache "
        "back one token at a time, so the size of the key value cache is "
        "the serving bill."),
    (A, "The standard fix is on the left. Grouped query attention shares one "
        "key value pair across a group of query heads. The cache shrinks with "
        "the sharing factor, and the heads genuinely lose independent memory, "
        "so quality degrades as you push the ratio."),
    (A, "Multi head latent attention, on the right, refuses that trade. It "
        "caches one low rank latent vector per token and rebuilds each head's "
        "keys and values on the way into attention. Nothing is shared. "
        "About an order of magnitude off the cache, and the quality holds."),
]

SCRIPT["sparse"] = [
    (A, "Now the same question one step along. Even a small cache gets read "
        "in full by every token you decode, so the cost still grows with "
        "context length."),
    (A, "Sparse attention scores the cache cheaply and reads only the top "
        "entries. Compressed attention goes further and changes what is "
        "stored: groups of four tokens summarised into one entry for nearby "
        "detail, groups of a hundred and twenty eight for distant history."),
    (A, "Look at the two bars. At a million tokens of context, that "
        "combination holds the key value cache near two percent of a plain "
        "transformer's."),
]

# --- row two: the experts -------------------------------------------------
SCRIPT["moe"] = [
    (A, "Row two. Their mixture of experts routes eight of two hundred and "
        "fifty six narrow experts per token, plus one shared expert that "
        "every token passes through, where the earlier design routed two of "
        "eight fat ones."),
    (A, "But the decision I would point at is the balancing. Left alone, "
        "routers collapse. Tokens pile onto a few popular experts, and under "
        "expert parallelism the busiest card sets the step time for everyone."),
    (A, "The usual answer is on the left. An auxiliary loss, which is a "
        "second objective fighting the first, pushing a token away from the "
        "expert that would have modelled it best."),
    (A, "DeepSeek put a bias on each expert's routing logits instead, and "
        "nudge it up or down between steps. Balancing becomes a control loop "
        "outside the loss. It costs nothing in the objective, and it is close "
        "to standard practice now."),
]

# --- row three: numerics and parallelism ----------------------------------
SCRIPT["systems"] = [
    (A, "Row three is where the constraint was physical. They trained on "
        "H eight hundreds, whose interconnect bandwidth is cut relative to an "
        "H one hundred, so communication rather than arithmetic was the "
        "binding limit."),
    (A, "So, eight bit floating point training end to end, with scale factors "
        "per tile so a single outlier cannot poison a whole matrix. DualPipe, "
        "which hides expert communication behind another micro batch's "
        "compute. And their own dispatch and combine kernels, because a "
        "generic collective is not shaped like mixture of experts traffic."),
    (B, "And the five point six million dollars is the whole thing?"),
    (A, "No. That is the final run, on two thousand and forty eight cards. "
        "It is still the number that shook the industry."),
]

# --- the line as it stands ------------------------------------------------
SCRIPT["line"] = [
    (A, "That is the machinery. Here is the family it produced."),
    (A, "V four Pro. One point six trillion parameters, forty nine billion "
        "active, and the strongest open weight model on S W E bench verified, "
        "at about eighty point six percent."),
    (A, "V four Flash, at two hundred and eighty four billion, is the cheap "
        "agentic one. And V four point one Flash, five hundred and fifty two "
        "billion, is the one that broke the pattern."),
    (B, "Strongest open weights on one benchmark, though. That is not the "
        "same as strongest at coding."),
    (A, "It is not, and the distinction matters. On S W E bench verified "
        "specifically. Hold onto that, because it comes back."),
]

# --- the closing turn -----------------------------------------------------
SCRIPT["flash"] = [
    (A, "Because V four point one Flash is not a decoder only transformer. "
        "Forty layers, split into a twenty layer causal encoder and a twenty "
        "layer decoder."),
    (A, "The prompt gets encoded once into a shared representation, rather "
        "than carried as a per layer cache through one causal stack. Add "
        "cross layer sparse attention with index reuse, hierarchical "
        "retrieval, and a four bit cache."),
    (A, "Eight hundred and ninety bytes per token. That is a quarter of V four "
        "Flash's footprint in card memory, and an eighth of its footprint on "
        "disk, which is the difference between a long agent loop being "
        "possible and being affordable."),
    (A, "It is the first frontier scale open model to abandon the decoder "
        "only consensus, and the reason they give is not quality. It is the "
        "cache."),
]

# --- the objection --------------------------------------------------------
SCRIPT["objection"] = [
    (B, "The encoder decoder case was argued years ago, though. T five made "
        "it on quality grounds and nobody moved."),
    (A, "Nobody moved. Serving arithmetic moved them. Which is the pattern of "
        "the whole lab, and it is also the reason to read each of these "
        "claims with its scope attached."),
    (A, "Sparse attention is an approximation, where latent attention was "
        "exact up to its bottleneck. DeepSeek themselves concede that V four "
        "point one Flash holds up better on shorter agent loops than on the "
        "longest horizon evaluations."),
    (A, "And one operational detail that decides whether anything you pinned "
        "still behaves. Since the fourteenth of September, a request naming "
        "V four Pro is answered by V four point one Flash, at Flash pricing, "
        "until V four point one Pro ships."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So the take. This lab has one idea, it has now applied it at five "
        "different depths of the same stack, and it keeps working."),
    (A, "Make a frontier model cheap enough to serve, and questions the rest "
        "of the field treats as settled come back open. An old argument about "
        "encoder decoders got reversed this month, not because anybody proved "
        "it was better, but because somebody counted bytes per token."),
    (A, "The thing worth watching is whether the others follow them out of "
        "the attention layer and into the shape of the network."),
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
