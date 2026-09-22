"""
Deep dive: the LLM Architecture Gallery, and the one number on a model card
that decides whether long context is affordable.

The load-bearing idea on the page is a single instruction: read the KV-cache
figure first, because two models with the same parameter count can differ on
it by an order of magnitude, and that difference, not the parameter count,
decides whether long context is affordable. So the worked example carried the
whole way is that one formula, 2 x layers x kv_heads x head_dim x bytes, and
every architectural delta in the episode is shown as a change to it: grouped
query attention divides it by eight, latent attention by about ten, trained
sparse attention takes it to about two percent of plain attention, and
DeepSeek V4.1-Flash lands at 890 bytes per token.

The wrong model this replaces: that architecture diagrams are a matter of
modelling power. Almost every change since the GPT-2 decoder is about memory
and compute, and the gallery is a memory-budget tool wearing a diagram.

The outline that survived the revision step:

    ident       what the gallery is, and what it is a lookup for
    question    two models, one parameter count, one affordable
    contract    the number, the places it changes, the two new stack shapes
    formula     the arithmetic, built one factor at a time
    places      attention, norm and position, the stack shape: parked
    gqa_mla     grouped-query against latent attention
    cache_bars  the whole cache story as one chart
    norm_pos    QK-norm, post-norm, YaRN, NoPE, and what each buys
    stack_shape recurrent depth, and the encoder-decoder return
    payoff      890 bytes per token
    objection   this is micro-optimisation, surely quality is the thing
    take        how to read a new card in thirty seconds
    resources   the page's own resource block

What the step-4 critique changed:

  - Draft one listed the four sections of the page as four sections of the
    video, which is a table of contents read aloud and is the exact failure
    the deep-dive format warns about. Rebuilt around the KV-cache formula, so
    each delta arrives as a change to a number the viewer is already holding.
  - Draft one had recurrent depth as an efficiency footnote. It is the third
    way to spend a test-time budget and the one that leaves no trace, so the
    monitorability cost is now said out loud, in the same beat as the
    encoder-decoder, because both are the same surprise: the stack is no
    longer one decoder run once per token.
  - Draft one drew the cache reductions as four separate stats across four
    beats. They compound, so they became one bar chart, and the narration
    does the division out loud rather than asserting the result.
  - Draft one spent a beat on MoE configuration. That is the mixture of
    experts episode, and repeating it here made this one eight minutes long.
    It is now one sentence pointing at that page.
  - B was agreeing in draft one. B now has three turns, each one the
    question the viewer is forming: what latent attention costs, what the
    linear-attention lines do instead of a cache, and whether any of this
    matters next to model quality.

Every figure comes from the canonical page "LLM Architecture Gallery (rasbt)
and the architectural deltas that matter", read from Notion on 22 September
2026. The title card uses the short form of that title, because the full one
is also the strip that sits in the corner for the whole episode.

Numbers are spelled the way they are said, because text to speech reads
"2 x layers x kv_heads" and "890B" badly.
"""

A = "A"
B = "B"

FORMAT = "deep dive"
TITLE = "LLM Architecture Gallery"
SUBTITLE = "the architectural deltas that matter, and the number that decides them"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "question": {"kind": "claim",
                 "text": "Two models, the same parameter count.\n"
                         "One is affordable at a million tokens.\n"
                         "The other is not.",
                 "note": "and the field that tells them apart is not the one "
                         "the announcement leads with"},

    "contract": {"kind": "flow", "tone": "machinery", "steps": [
        "the one number", "the places it changes", "two new stack shapes"]},

    "formula": {"kind": "flow", "tone": "number", "steps": [
        "2 x layers", "x KV heads", "x head dim", "x bytes each"]},

    # The home frame: where a modern architecture is allowed to differ. Every
    # later beat lights up the row it is working on.
    "places": {"kind": "stack", "park": True, "tone": "subject", "layers": [
        ("attention", "how it is computed and cached"),
        ("norm and position", "where it sits, how it is encoded"),
        ("the stack shape", "run once per token, or looped"),
    ]},

    "gqa_mla": {"kind": "compare", "focus": "attention", "sides": [
        {"head": "grouped-query attention", "tone": "subject", "items": [
            "query heads share one KV head",
            "8-way grouping, 8x less cache",
            "costs expressivity inside a group"]},
        {"head": "multi-head latent attention", "tone": "verified", "items": [
            "cache one low-rank latent instead",
            "about an order of magnitude smaller",
            "quality at or above MHA at equal cache",
            "costs two projections, and fussier kernels"]},
    ]},

    "cache_bars": {"kind": "bars",
                   "head": "KV cache per token, against plain multi-head attention",
                   "bars": [
        {"label": "plain MHA", "text": "100%", "value": 100, "tone": "cost"},
        {"label": "8-way GQA", "text": "12.5%", "value": 12.5},
        {"label": "MLA", "text": "about a tenth", "value": 10},
        {"label": "V4 sparse attention", "text": "about 2%", "value": 2,
         "tone": "verified"},
    ]},

    "norm_pos": {"kind": "table", "focus": "norm and position",
                 "head": ["delta", "what it is", "what it buys"],
                 "rows": [
        ["QK-norm", "RMSNorm on Q and K", "no bf16 logit blow-up"],
        ["post-norm", "normalise the output", "steadier loss"],
        ["YaRN", "stretch RoPE per band", "context extension"],
        ["NoPE layers", "no rotation at all", "extrapolation past training"],
    ]},

    "stack_shape": {"kind": "compare", "focus": "the stack shape", "sides": [
        {"head": "recurrent depth", "tone": "cost", "items": [
            "loop activations back through the blocks",
            "serial depth without parameters",
            "the state must persist between requests",
            "and shorter visible traces to monitor"]},
        {"head": "encoder-decoder, at 552B", "tone": "verified", "items": [
            "a 20-layer encoder, a 20-layer decoder",
            "the prompt encoded once",
            "8B active in prefill, 16B in decode"]},
    ]},

    "payoff": {"kind": "stat", "big": "890 bytes",
               "caption": "of KV cache per token, DeepSeek V4.1-Flash",
               "note": "a quarter of V4-Flash's HBM footprint and an eighth of "
                       "its SSD footprint. The argument was never T5's quality "
                       "argument: it was this number"},

    "objection": {"kind": "points", "tone": "cost",
                  "head": "none of it is free", "items": [
        "grouped heads lose independent key subspaces",
        "a sparse indexer can miss the token that mattered",
        "a fixed-size linear state is a lossy summary",
        "and sparse attention has to be trained in, not bolted on",
    ]},

    "take": {"kind": "claim",
             "text": "Read the KV cache per token first.\n"
                     "Then the ratio. Then the licence.",
             "note": "and stop assuming the active count is one number: an "
                     "encoder-decoder has two"},

    "resources": {"kind": "resources", "items": [
        {"name": "The LLM Architecture Gallery",
         "gloss": "45 min for a first pass, then a lookup whenever a model "
                  "drops. Diagram plus fact sheet, 70+ models"},
        {"name": "The Big LLM Architecture Comparison",
         "gloss": "1h, the written walkthrough of the same material"},
        {"name": "The rasbt/llm-architecture-gallery repo",
         "gloss": "15 min, the models.yml behind it, Apache 2.0"},
    ]},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is.
SCRIPT["ident"] = [
    (A, "This is a deep dive on the L L M Architecture Gallery, and on the "
        "architectural differences it exists to show you."),
    (A, "What it is: Sebastian Raschka's side by side reference of more than "
        "seventy open model architectures. A diagram per model plus a fact "
        "sheet, with total and active parameters, the attention mechanism, "
        "context length, licence, and key value cache bytes per token."),
    (A, "It earns a video because one of those fields decides far more than the "
        "rest, and it is not the parameter count."),
]

# 1. the tension and the question.
SCRIPT["question"] = [
    (A, "Here is the situation the gallery exists for. Two models with the same "
        "parameter count can differ by an order of magnitude on whether long "
        "context is affordable to serve."),
    (A, "So which number tells you that, before you deploy anything? It is not "
        "the parameter count, and it is not the advertised context length."),
]

# 2. the contract.
SCRIPT["contract"] = [
    (A, "Three parts. The number itself, which is one line of arithmetic. Then "
        "the places a modern architecture differs, each of which moves that "
        "number. Then two releases from this month that changed something all "
        "of them quietly assumed. It gets harder as it goes."),
]

# 3. the arithmetic, derived on screen rather than asserted.
SCRIPT["formula"] = [
    (A, "The number is key value cache bytes per token, and it is built like "
        "this. Two, for the key and the value. Times the layer count. Times the "
        "number of key value heads. Times the head dimension. Times the bytes "
        "each element takes."),
    (A, "Multiply by your target context and your concurrency, and you have the "
        "memory your serving fleet needs, in gigabytes. One line, folding the "
        "attention variant, the layer count and the storage precision into a "
        "single figure."),
]

# 4. the home frame: where an architecture is allowed to differ.
SCRIPT["places"] = [
    (A, "Almost every change since the G P T two decoder is about memory and "
        "compute rather than modelling power, and they concentrate in the three "
        "places on the screen. Attention. Normalisation and position. And the "
        "shape of the stack itself."),
    (A, "There is a fourth, how the feed forward network is made sparse, and "
        "that is a whole episode of its own on mixture of experts, so I will "
        "point at it rather than redo it here."),
]

# 5. attention, where most of the number lives.
SCRIPT["gqa_mla"] = [
    (A, "Attention first, because most of the number lives there. Grouped query "
        "attention divides the query heads into groups and gives each group one "
        "shared key value head. The cache is sized by key value heads, so eight "
        "way grouping cuts it by eight. It costs expressivity, because heads in "
        "a group can no longer attend along independent subspaces."),
    (A, "Latent attention does something else. Project keys and values jointly "
        "into one low rank latent, cache only that, and up project inside the "
        "attention call. About an order of magnitude smaller, and DeepSeek's "
        "ablations report quality at or slightly above plain attention at equal "
        "cache size, which is the unusual part."),
    (B, "What does that cost?"),
    (A, "Two extra projections every call, trading arithmetic for memory "
        "traffic, which is the right way round during decode. And rotary "
        "position cannot be applied to the compressed latent, so it carries a "
        "separate key dimension alongside."),
]

# 6. the whole cache story as one chart, with the division done out loud.
SCRIPT["cache_bars"] = [
    (A, "Worth seeing as one chart, because the reductions compound. Plain multi "
        "head attention is the baseline. Divide by eight for eight way grouping "
        "and you are at twelve and a half percent. Latent attention, about a "
        "tenth."),
    (A, "Trained sparse attention goes further. A learned indexer scores blocks "
        "of keys per query, and full attention runs only over the selected ones, "
        "so cost per token is roughly linear in the selected count instead of "
        "quadratic in the context. DeepSeek V four's compressed version drops "
        "the cache to about two percent. That is what made million token "
        "contexts economical this year."),
    (B, "And the linear attention lines have no cache at all."),
    (A, "They replace it with a fixed size recurrent state, which is a lossy "
        "summary, so pure linear models are measurably worse at exact recall. "
        "That is why everyone hybridises: about one full attention layer in "
        "four buys it back."),
]

# 7. the smaller deltas, as a grid, because the grid is the content.
SCRIPT["norm_pos"] = [
    (A, "The other two places move the number less, and are worth knowing "
        "because you will see them on every card. Each one is on the screen "
        "with what it buys."),
    (A, "Q K norm bounds the attention logits, which otherwise grow through "
        "training and produce the classic sixteen bit overflow and loss spike. "
        "Post norm damps what each block injects into the residual stream. YaRN "
        "stretches the rotary frequencies per band, so a model trained at one "
        "context length works at another. And some layers now carry no "
        "positional encoding at all, which extrapolates past the trained length "
        "far more gracefully."),
]

# 8. the two releases that changed what the rest assumed.
SCRIPT["stack_shape"] = [
    (A, "Now the part that changed this month, because everything so far assumes "
        "a model is one causal decoder stack, run once per token. Two September "
        "releases broke that in opposite directions."),
    (A, "Recurrent depth reuses layers instead of adding them: activations loop "
        "back through the same blocks, so serial depth per token stops being "
        "tied to parameter count. G P T six Astra is assumed to work this way. "
        "It buys compute without parameter memory. It costs a recurrent state "
        "the serving stack has to carry between requests, and shorter visible "
        "reasoning traces, which is a real loss to monitorability."),
    (A, "The other direction is DeepSeek V four point one Flash: five hundred "
        "and fifty two billion parameters, split into a twenty layer causal "
        "encoder and a twenty layer decoder, with the prompt encoded once."),
]

# 9. the payoff number the whole episode was built toward.
SCRIPT["payoff"] = [
    (A, "And the argument for it is not T five's quality argument. It is the "
        "number on the screen. Eight hundred and ninety bytes of key value cache "
        "per token."),
    (A, "A quarter of the high bandwidth memory footprint of the model it "
        "replaces, and an eighth of its footprint on disk, bought with cross "
        "layer sparse attention, index reuse and four bit cache storage. A "
        "frontier lab reversed the decoder only consensus on serving economics."),
]

# 10. the objection.
SCRIPT["objection"] = [
    (A, "The objection here is that this is all micro optimisation, and quality "
        "is what actually matters. Two answers."),
    (A, "The first is that almost none of it is free, and the costs are on the "
        "screen. Grouped heads give up independent key subspaces. A sparse "
        "indexer makes a hard selection that can miss the token that mattered. "
        "A fixed size linear state is lossy. And sparse attention has to be "
        "trained in, so it is not something you apply later."),
    (B, "And the second?"),
    (A, "That the quality frontier is crowded and close, so what decides whether "
        "you can run a model at all is this number, not its score."),
]

# 11. the take.
SCRIPT["take"] = [
    (A, "So, the take, and it is how to read a new card in thirty seconds. Key "
        "value cache per token first, multiplied by your target context and "
        "concurrency. That answers whether long context actually fits, in "
        "gigabytes."),
    (A, "Then the total over active ratio, which is the memory floor against the "
        "latency. Then the licence, and whether base weights shipped or only "
        "instruct, because that decides whether you can post train at all. And "
        "stop assuming the active count is one number. An encoder decoder has "
        "two."),
]

# 12. where to go properly.
SCRIPT["resources"] = [
    (A, "The page has all of it with the links, and the gallery itself is the "
        "first place to go: about forty five minutes for a first pass over the "
        "models you care about, and a lookup every time a new one drops."),
    (A, "The Big L L M Architecture Comparison is the written walkthrough of the "
        "same material, about an hour. And the repository behind it is the "
        "models file itself, Apache two point zero, fifteen minutes."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 148 * 60:.0f} seconds at 148 words per minute")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:13s} {len(beat)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
