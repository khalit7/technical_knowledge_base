"""
Provider overview: MiniMax, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: MiniMax is not a
product line, it is a running experiment with a published result. One question
drives every model: how much of a transformer's quadratic softmax attention can
be replaced by something cheaper before quality goes. They took the strongest
position available (linear attention at production scale), shipped it, found
the regime where it breaks, and then publicly reversed it. A lab changing its
mind about its own thesis, in the open, is worth more than any of its
checkpoints, because the reversal is evidence and a launch claim is not.

The outline that survived the revision step:

    ident       what this is, the date, and the one running experiment
    map         the three eras built and parked, plus what funds them
    question    what must attention do exactly, and what can be summarised
    linear      what removing the softmax buys: the N-by-N object disappears
    hybrid      what it costs, and the 7:1 compromise that shipped
    reversal    M2 drops linear entirely, and why: exact-recall workloads
    sparse      M3's third route, and the kernel trick that makes it pay
    arc         the three approaches on one axis, which is the lesson
    close       the take: the reversal is the contribution

What the step-4 critique changed:

  - Draft one ran the lineage in date order and buried the reversal at minute
    five, as one release among several. The reversal IS the episode, so the
    map now names the three eras as eras rather than as products, and the
    question beat promises the reversal before it arrives.
  - The linear-attention beat explained the associativity trick and then
    asserted the cost. It now derives the cost from the trick: a fixed d-by-d
    state is a lossy summary, therefore exact recall of a specific earlier
    token degrades, therefore perplexity will not show it. Three steps, and
    the viewer can do the third one themselves.
  - Lightning attention had a beat about SRAM tiling. That is real kernel
    engineering and it is not this episode's argument, so it is now one
    sentence inside the linear beat: a linear FLOP count only becomes linear
    wall-clock time if somebody breaks the sequential cumulative sum.
  - CISPO had a beat. It is a genuinely good idea and it belongs to a
    different story (RL on long reasoning traces), so it is gone. Naming it
    without explaining it would have been worse than either.
  - The M3 beat listed DSA and MoBA as neighbours and then explained neither.
    They are now one clause that says what they have in common with MSA and
    where MSA claims to differ, which is the only part a viewer can use.
  - B nodded in draft one. B now asks whether "no KV cache" can possibly be
    true, and then forces the honest answer about whose account the reversal
    is, and A changes course both times.

Everything traces to the canonical page "MiniMax", read from Notion on
22 September 2026. Nothing here is invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"QK^T", "7:1" and "MiniMax-01" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "MiniMax"
SUBTITLE = "the lab that changed its mind about its own thesis, in public"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the linear era", "tone": "subject",
         "items": ["MiniMax-01 (Jan 2025)", "M1 (Jun 2025)", "456B / 45.9B active"]},
        {"head": "the reversal", "tone": "cost",
         "items": ["M2 (Oct 2025)", "plain GQA", "230B / 10B active"]},
        {"head": "the sparse era", "tone": "verified",
         "items": ["M3 (Jun 2026)", "GQA plus MSA", "428B / 22B active"]},
        {"head": "what pays for it", "tone": "machinery",
         "items": ["Talkie", "Hailuo video"]},
    ]},

    "question": {"kind": "claim",
                 "text": "What does attention have to do exactly,\n"
                         "and what can it get away with summarising?",
                 "note": "MiniMax has answered this three different ways in "
                         "eighteen months, and published every answer"},

    "linear": {"kind": "compare", "focus": "the linear era", "sides": [
        {"head": "softmax attention", "tone": "machinery", "items": [
            "softmax sits between the two matrix products",
            "the N-by-N score matrix must be materialised",
            "cost grows with the square of the sequence",
            "the KV cache grows with every token"]},
        {"head": "linear attention", "tone": "subject", "items": [
            "no softmax, so the product reassociates",
            "the N-by-N object disappears",
            "a fixed d-by-d state matrix instead",
            "no KV cache growing with context at all"]},
    ]},

    "hybrid": {"kind": "stat", "big": "7 : 1", "tone": "number",
               "caption": "lightning-attention layers per full softmax layer, "
                          "in MiniMax-01",
               "note": "the linear layers do the cheap bulk mixing; one layer "
                       "in eight restores exact addressing, and keeps the "
                       "quadratic term affordable"},

    "reversal": {"kind": "points", "focus": "the reversal",
                 "head": "M2: linear attention dropped entirely", "items": [
        "back to plain grouped-query attention",
        "the gap widens on long reasoning chains",
        "and in agentic loops full of tool output",
        "both are exact-recall work, and that is where a state loses",
    ]},

    "sparse": {"kind": "points", "focus": "the sparse era",
               "head": "MSA: keep exact lookup, skip most of the pairs",
               "items": [
        "the softmax stays, so nothing is compressed away",
        "cost scales with selected blocks, not with the square",
        "the hard parts move into selection and into kernels",
        "\"KV outer, gather Q\": load the tile once, reuse it",
    ]},

    "arc": {"kind": "table",
            "head": ["approach", "what it does to history", "what it costs"],
            "rows": [
                ["linear (lightning)", "compresses it into a fixed state",
                 "exact recall"],
                ["sparse (MSA)", "selects which of it to attend to",
                 "selection and kernels"],
                ["full (GQA)", "keeps all of it, attends to all of it",
                 "the quadratic term"],
            ]},

    "close": {"kind": "claim",
              "text": "The reversal is the contribution.\n"
                      "Nobody else publishes the regime where their own idea broke.",
              "note": "which is why the tech reports are worth more here than "
                      "the checkpoints are"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the one experiment. Before any mechanism.
SCRIPT["ident"] = [
    (A, "This is MiniMax, as the knowledge base has it on the twenty second "
        "of September, twenty twenty six. A Shanghai lab, funded mostly by "
        "consumer products: the Talkie companion app, and the Hailuo video "
        "models."),
    (A, "Its model line is really one running experiment. How much of a "
        "transformer's attention can you replace with something cheaper "
        "before the quality goes? They have answered that three times, and "
        "contradicted themselves once, in public."),
]

# 1. the inventory: eras, not products
SCRIPT["map"] = [
    (A, "So the map is three eras rather than a product list. The linear era: "
        "MiniMax zero one and M one, four hundred and fifty six billion "
        "parameters with about forty six billion active."),
    (A, "Then the reversal, M two, back to ordinary attention at two hundred "
        "and thirty billion. Then the sparse era, M three, four hundred and "
        "twenty eight billion with roughly twenty two active. And on the "
        "right, the consumer products that pay for all of it."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "Why does one lab's attention choice matter to anyone else?"),
    (A, "Because this is the question everybody serving long contexts is "
        "guessing at. What does attention have to do exactly, and what can it "
        "get away with summarising?"),
    (A, "So: what removing the softmax buys, what it costs, why they undid "
        "it, and what they do now instead."),
]

# 3. the mechanism, concrete first
SCRIPT["linear"] = [
    (A, "Standard attention computes softmax of Q K transpose, times V. The "
        "softmax sits between those two matrix products, and that is the "
        "whole problem. It forces the N by N score matrix to actually exist, "
        "so cost grows with the square of the sequence."),
    (A, "Take the softmax out, apply a feature map to Q and K separately, and "
        "the product becomes associative. The N by N object on the left of "
        "the screen disappears, and a fixed d by d state matrix takes its "
        "place."),
    (B, "The right-hand column says no key-value cache growing with context "
        "at all. Is that literally true?"),
    (A, "Literally. Decoding becomes a recurrence: each new token updates that "
        "fixed state and reads from it. Memory per sequence is the same "
        "whether the context is eight thousand tokens or four million."),
]

# 4. what the compression costs, and the compromise that shipped
SCRIPT["hybrid"] = [
    (A, "So why is everyone not doing this? Because a fixed state is a lossy "
        "summary of everything seen so far. Anything needing exact recall of "
        "one specific earlier token degrades, and perplexity will not show "
        "you that."),
    (A, "MiniMax zero one therefore shipped a compromise, and it is on the "
        "screen. Seven lightning-attention layers, then one full softmax "
        "layer, repeating. The linear layers do the cheap bulk mixing, and "
        "one layer in eight restores exact addressing."),
]

# 5. the reversal, which is the episode
SCRIPT["reversal"] = [
    (A, "Then in October twenty twenty five, M two dropped linear attention "
        "entirely. Straight back to grouped-query attention, the ordinary "
        "kind. This is the single most useful data point the lab has "
        "produced."),
    (A, "Their own account: the gap widens exactly where the product had "
        "gone. Long reasoning chains, where the model must refer back to its "
        "own earlier steps. And agentic loops, where the context fills with "
        "tool output that has to be quoted exactly."),
    (B, "Both of those are the same failure, aren't they."),
    (A, "They are. Both are exact-recall work, and exact recall is precisely "
        "what a compressed state is worst at. Paying the quadratic cost had "
        "become the cheaper trade."),
]

# 6. the third route
SCRIPT["sparse"] = [
    (A, "Which brings us to M three, and a third answer. Sparse attention "
        "keeps the softmax and keeps exact token-to-token lookup, but only "
        "computes a selected subset of the pairs. Nothing is compressed away. "
        "If the right block is selected, the retrieval is exact."),
    (A, "The difficulty just moves, into choosing which blocks matter and "
        "into making an irregular set of them fast on hardware that hates "
        "irregular memory access."),
    (A, "Their answer is the line at the bottom. Instead of walking queries "
        "and gathering the blocks each one picked, the kernel walks the "
        "key-value blocks and gathers the queries that picked them. The tile "
        "loads once and is reused. DeepSeek and Moonshot build the same kind "
        "of thing; MiniMax claims theirs selects more finely."),
]

# 7. the three answers on one axis
SCRIPT["arc"] = [
    (A, "So here are all three on one axis, which is the thing to take away. "
        "Compressing history into a fixed state buys the most and costs you "
        "exact recall. Selecting which history to attend to buys less and "
        "keeps exactness. Full attention keeps everything and pays for it."),
    (A, "M three sits on the middle row: a one million token context at a "
        "serving cost far below a dense model of the same size."),
]

# 8. the take
SCRIPT["close"] = [
    (A, "And the take is not about M three at all. Every lab publishes the "
        "launch claim. This one published the regime where its own founding "
        "idea broke, and then shipped a model that abandoned it."),
    (A, "That is why the tech reports here are worth more than the "
        "checkpoints. If you are deciding what to serve, a reversal is "
        "evidence, and a launch claim is an advertisement."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
