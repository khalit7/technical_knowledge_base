"""
Provider overview: Meta, Llama and Meta Superintelligence Labs, as of
22 September 2026.

The load-bearing idea is that open weights were never Meta's principle, they
were Meta's position. Meta's stated argument for giving frontier weights away
was that commoditising the model layer was worth more to it than owning one,
and that argument only holds while you are the one setting the standard. Llama
2 and 3 set it. Llama 4's reception collapsed, the lab was reorganised, and the
frontier line went closed. This page earns a video because it is the only
provider in the set whose story is a strategy failing under pressure rather
than a technique succeeding, and because the thing the closed lab then shipped,
the Muse agent's security architecture, is genuinely novel work that would not
have existed under the old strategy.

Every figure comes from the canonical page "Meta: Llama and Meta
Superintelligence Labs", read from Notion on 22 September 2026, because the
local mirror is behind. Nothing was invented for narrative shape.

The outline that survived the revision step:

    ident      name the lab, name the two eras, say why this one is a warning
    map        the arc as five rows. Parked as the home frame; every later
               beat focuses one row
    question   what happens to an open-weights strategy under pressure
    open_era   what the bet bought: overtraining, a usable licence, 405B open
    four       where it turned: the MoE pivot, iRoPE, the checkpoint that
               was not the one that shipped, Behemoth never shipping
    closed     the reorg, and Muse Spark 1.3 back in the frontier band
    agent      the one piece of new work worth the time: an agent architecture
               built on the assumption that the model will be fooled
    cost       where a rival is plainly ahead, on private code
    take       a position is something you give up when it stops paying

What the step-4 critique caught, and what changed:

  - Draft one gave the Llama 3 training report a beat of its own: FSDP, 4D
    parallelism, annealing, DPO, the hardware failure rates. It is the best
    material on the page and it is not what this episode is about. This is an
    episode about a strategy, not a recipe, so it is one sentence now.
  - Draft one's opening said Meta abandoned open weights. The page is more
    careful and more interesting: it is a retreat from the *open frontier*
    only, and Llama 4 is still widely served. Fixed in the opening and again
    in the take, where the incumbency argument now closes the episode.
  - The Muse agent sat after the objection in draft one, which made it read as
    an appendix. It moved ahead of the objection, because otherwise the closed
    era is only a surrender and the video has nothing to say about what the
    surrender bought.
  - iRoPE had three sentences, two of which explained rotary position
    embeddings. This episode does not need them. One sentence left.
  - B agreed twice. B now asks whether the open question still matters once
    Meta is back in the band, which forces the max-tier caveat out, and asks
    whether the security architecture is actually verified, which is what
    makes the bounty-instead-of-metrics answer land.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"405B", "$1.25" and "23.8%" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Meta: Llama and Meta Superintelligence Labs"
SUBTITLE = "what competitive pressure does to an open-weights strategy"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. A stack, because the rows are a sequence in time and the
    # argument is that each one is caused by the one above it.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("Llama 1 and 2", "a leak, then a licence people could build on"),
        ("Llama 3", "open weights at GPT-4 class"),
        ("Llama 4", "the mixture-of-experts pivot that misfired"),
        ("the reorg", "Meta Superintelligence Labs, mid 2025"),
        ("Muse Spark", "frontier again, and closed"),
    ]},

    "question": {"kind": "claim",
                 "text": "What happens to an open-weights strategy "
                         "when the lab running it falls behind?",
                 "note": "Meta's case for giving the weights away was never "
                         "charity: commoditise the layer rather than own it"},

    "open_era": {"kind": "points", "focus": "Llama 3",
                 "head": "what the open bet bought", "items": [
        "overtrain past Chinchilla: inference is the bill that repeats",
        "Llama 2's licence let a fine-tuning industry form",
        "405B dense, 15T tokens, GPT-4 class, in the open",
        "16K GPUs, and honest hardware-failure numbers",
    ]},

    "four": {"kind": "table", "focus": "Llama 4",
             "head": ["model", "shape", "what happened"], "rows": [
        ["Scout", "109B total / 17B active", "10M-token context claim, iRoPE"],
        ["Maverick", "400B total / 17B active", "coding lagged the numbers"],
        ["Behemoth", "~2T teacher", "never shipped"],
    ]},

    "closed": {"kind": "points", "focus": "Muse Spark",
               "head": "Muse Spark 1.3, 2 September 2026", "items": [
        "61 on the Artificial Analysis index, third among labs",
        "1M context; text, image and video in",
        "$1.25 and $4.25 per million, $0.55 per task",
        "~20% fewer tool calls than 1.2 for the same work",
        "closed weights, no technical report, top tier in preview",
    ]},

    "agent": {"kind": "flow", "tone": "machinery", "steps": [
        "agent, in its own VM",
        "request leaves the cell",
        "Sentinel swaps in the real token",
        "the site sees a valid call",
    ]},

    "cost": {"kind": "bars", "head": "Real-SWE: private enterprise codebases",
             "bars": [
        {"label": "Claude Fable 5.1", "text": "38.8%", "value": 38.8,
         "tone": "verified"},
        {"label": "Muse Spark 1.3", "text": "23.8%", "value": 23.8,
         "tone": "cost"},
        {"label": "Grok 4.6", "text": "23.8%", "value": 23.8, "tone": "cost"},
    ]},

    "take": {"kind": "claim",
             "text": "A principle you drop under pressure was a position.",
             "note": "and the only thing Meta still owns here is incumbency: "
                     "Llama 3.1 and 3.3 as everybody's default base"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is Meta's language model programme. The Llama family, and the "
        "lab that replaced it, Meta Superintelligence Labs. For three years "
        "Meta published frontier model weights for anyone to download, and "
        "that was the whole strategy."),
    (A, "It earns an episode because it is the cautionary story of this era. "
        "The open weights leader stopped leading, and then stopped being "
        "open. Current to the twenty second of September, twenty twenty "
        "six."),
]

# --- the arc, before any explanation --------------------------------------
SCRIPT["map"] = [
    (A, "The whole arc first. Nothing explained yet. Llama one and two: a "
        "research release whose weights leaked, then the first licence a "
        "company could build a product on."),
    (A, "Llama three, open weights at G P T four class. Llama four, the "
        "pivot that misfired. The reorganisation. Then Muse Spark, which put "
        "Meta back at the frontier, closed."),
    (A, "That column stays up. Every beat after this is one row of it."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "Here is the question the whole arc answers. What happens to an open "
        "weights strategy when the lab running it falls behind?"),
    (A, "Meta's case for giving the models away was never charity. It was "
        "that commoditising the model layer was worth more than owning one. "
        "Watch what that argument does under pressure."),
]

# --- what the bet bought --------------------------------------------------
SCRIPT["open_era"] = [
    (A, "Start with what the bet bought. Llama one took the Chinchilla "
        "result, about twenty training tokens per parameter, and "
        "deliberately overshot it. Train smaller models on far more tokens, "
        "because inference is paid on every request forever and training is "
        "paid once."),
    (A, "Llama two added a commercial licence, and a fine tuning industry "
        "formed around it. Llama three reached four hundred and five billion "
        "parameters on fifteen trillion tokens, dense rather than sparse, "
        "and landed in G P T four class in the open."),
    (B, "The training report is the part people still cite."),
    (A, "It is. Sixteen thousand cards, and honest numbers on how often the "
        "hardware failed underneath them."),
]

# --- where it turned ------------------------------------------------------
SCRIPT["four"] = [
    (A, "Llama four is where it turns, and the table has the shapes. Scout, "
        "one hundred and nine billion parameters, about seventeen billion "
        "active per token. Maverick, four hundred billion total, the same "
        "seventeen billion active."),
    (A, "The ten million token context claim rests on interleaving: the "
        "layers between the ordinary rotary ones carry no positional "
        "encoding at all, so they are length agnostic."),
    (A, "The reception collapsed anyway, for the two reasons in the last "
        "column. A chat tuned variant produced the headline arena score "
        "while a different checkpoint shipped, and coding quality lagged the "
        "published numbers. Behemoth never shipped at all."),
]

# --- the reorg, and the closed frontier -----------------------------------
SCRIPT["closed"] = [
    (A, "What came next was not a model. It was a reorganisation. Meta "
        "Superintelligence Labs formed in mid twenty twenty five under "
        "Alexandr Wang, founder of the data labelling company Scale A I, "
        "after a reported fourteen billion dollar talent raid. The open "
        "roadmap stalled behind it."),
    (A, "Muse Spark arrived in April, closed. Version one point three "
        "scores sixty one on the Artificial Analysis index, third among "
        "labs."),
    (B, "So they are back. Does the open question still matter?"),
    (A, "They are back in the band. But read the bottom two lines. The top "
        "figures come from a maximum tier developers cannot broadly use, and "
        "there is no technical report at all."),
]

# --- the one piece of genuinely new work ----------------------------------
SCRIPT["agent"] = [
    (A, "The most substantive thing the new lab has shipped is the Meta Muse "
        "agent, and the interesting part is not the assistant. It is this "
        "architecture, built on the assumption that the model gets fooled."),
    (A, "Follow the arrows. The agent never sees credentials. A service "
        "outside the runtime cell holds them, and a separate agent called "
        "Sentinel swaps in the real token as the request leaves the virtual "
        "machine. Approvals arrive as system dialogs, so injected text "
        "cannot manufacture consent."),
    (B, "And how well does that actually work?"),
    (A, "They have published no classifier accuracy. What they have "
        "published is a price. Three hundred thousand dollars for a valid "
        "report, one hundred and thirty thousand for a successful prompt "
        "injection."),
]

# --- the objection --------------------------------------------------------
SCRIPT["cost"] = [
    (A, "Now the part the index rank hides. These bars are Real S W E, run "
        "against private enterprise codebases rather than public "
        "benchmarks."),
    (A, "Muse Spark one point three resolves twenty three point eight "
        "percent, level with Grok four point six, and well behind Claude "
        "Fable five point one at thirty eight point eight. Third on a "
        "composite index and third on somebody's actual repository are "
        "different questions."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So, the take. Open weights were never Meta's principle. They were "
        "Meta's position, and a position is something you give up when it "
        "stops paying."),
    (A, "And note what the retreat is not. Llama three point one and three "
        "point three are still the default base in a lot of fine tuning "
        "stacks, purely through incumbency: tooling, adapters, quantised "
        "builds. That inertia outlives the quality argument, and it is the "
        "last thing Meta owns here."),
    (A, "What to watch is Avocado and Mango, and whether any variant of "
        "either ships open at all."),
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
