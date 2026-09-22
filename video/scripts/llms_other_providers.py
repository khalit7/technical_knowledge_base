"""
Topic overview: the long tail of LLM providers, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this is a list page,
and a list page read aloud is the worst thing this format produces. The page
itself supplies the rescue in its first paragraph. None of these labs is trying
to top a leaderboard, and reading them as failed frontier labs misses the
point: each one optimises a different constraint. Parameters per unit of data
quality. Distribution and billing. Auditability and on-premises deployment.
Memory per token during serving. Or simply being the only artefact of its kind.
So the question is never "how good is it", it is "what does this make cheap, or
possible, that a frontier API does not". That reframing is the episode, and it
is the only thing that makes twenty names watchable.

The outline that survived the revision step:

    ident       what this page is, the date, and the reframing
    map         the four constraints built and parked, with who optimises each
    question    not how good is it, but what does it make possible
    phi         data quality per parameter, and the cost of that bet
    memory      memory per token: Mamba-2 hybrids and the KV cache
    cohere      auditability: grounded citations, a dense 111B on purpose,
                and a 218B model that only translates
    sweep       the fifth group, named once each and not explained
    close       the take, and the caution every number here needs

What the step-4 critique changed:

  - Draft one had a beat per provider and ran eleven minutes. Every beat was
    the same shape and none of them was an argument. Three providers now get
    a beat each because each carries a real idea, and everything else is one
    named sweep with one sentence per name.
  - The sweep was originally sorted by country, which is a filing decision
    rather than an idea. It is now the page's own fifth category, "the only
    artefact of its kind", which is why those particular names are worth
    saying at all: decentralised training, a second fully open lab, a live
    post-training dashboard, a ternary rebuild.
  - Amazon had a beat about Nova Micro through Premier. That is a price
    ladder and it explains nothing, so Amazon survives inside the map, where
    the constraint it optimises (distribution and billing) is the claim.
  - The Phi beat was admiring in draft one. It now carries the cost in the
    same breath as the score, because a model trained on benchmark-shaped
    synthetic text being strong on benchmark-shaped tasks is the whole
    caveat, and saying it two beats later would have been dishonest.
  - The Cohere translation numbers were quoted flat. B now asks who judged
    them, and the answer (Cohere's own evaluation, with another vendor's
    model as judge) is said out loud at the moment the bars are on screen.
  - The take was "the long tail is interesting", which is not a take. It is
    now the caution that binds the episode: almost every number here is
    self-reported by the party it flatters.

Everything traces to the canonical page "Other notable providers", read from
Notion on 22 September 2026. Nothing here is invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"84.8%", "1.76 bits" and "Phi-4" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Other notable providers"
SUBTITLE = "not how good is it, but what does it make cheap or possible"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "data quality per parameter", "tone": "subject",
         "items": ["Microsoft Phi", "SmolLM3", "MiniCPM5"]},
        {"head": "distribution and billing", "tone": "machinery",
         "items": ["Amazon Nova", "Bedrock", "Trainium"]},
        {"head": "auditability, on-prem", "tone": "verified",
         "items": ["Cohere Command", "Cohere North", "IBM Granite 4"]},
        {"head": "memory per token", "tone": "cost",
         "items": ["NVIDIA Nemotron", "Liquid LFM", "AI21 Jamba"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Not \"how good is it\".\n"
                         "What does it make cheap, or possible, that a "
                         "frontier API does not?",
                 "note": "read these as failed frontier labs and every one of "
                         "them looks like a disappointment"},

    "phi": {"kind": "stat", "big": "84.8%", "tone": "number",
            "caption": "Phi-4, 14B parameters, on MMLU",
            "note": "trained on filtered web plus mostly synthetic worked "
                    "examples, which is also exactly why it is weak on "
                    "long-tail knowledge and messy real input"},

    "memory": {"kind": "compare", "focus": "memory per token", "sides": [
        {"head": "a comparable transformer", "tone": "context", "items": [
            "every layer caches keys and values",
            "hundreds of KiB of KV cache per token",
            "memory, not FLOPs, is the serving limit",
            "thousands of long sequences will not fit"]},
        {"head": "Mamba-2 hybrid (Nemotron Nano)", "tone": "subject", "items": [
            "mostly SSM blocks: one fixed-size state",
            "a few attention layers restore exact recall",
            "a few KiB of KV cache per token",
            "selective, and trains as a structured matmul"]},
    ]},

    "cohere": {"kind": "bars",
               "head": "WMT26, 50 languages, on Cohere's own evaluation",
               "bars": [
        {"label": "North Small Translate", "text": "83.6", "value": 83.6,
         "tone": "subject"},
        {"label": "DeepL NextGen", "text": "81.37", "value": 81.37,
         "tone": "context"},
        {"label": "Google Translate", "text": "68.20", "value": 68.20,
         "tone": "context"},
    ]},

    "sweep": {"kind": "points",
              "head": "the fifth group: the only artefact of its kind",
              "items": [
        "Prime Intellect: one model, many clusters, ordinary internet",
        "IFM K2 Horizon: the second fully open lab",
        "Xiaomi MiMo 2.6: a live post-training dashboard, no model",
        "Prism Bonsai 2: Qwen3.8 27B rebuilt at 1.76 bits per weight",
    ]},

    "close": {"kind": "claim",
              "text": "Almost every number on this page\n"
                      "was published by the party it flatters.",
              "note": "Cohere judged by a rival's model, Tencent's own 31.8%, "
                      "IFM's own state of the art: all vendor claims until "
                      "somebody reruns them"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the reframing, before any name is explained
SCRIPT["ident"] = [
    (A, "This is the long tail of language model providers, as the knowledge "
        "base has it on the twenty second of September, twenty twenty six. "
        "Roughly twenty labs that are not OpenAI, Anthropic, Google or "
        "DeepSeek."),
    (A, "And there is one way to read this page that works, and one that "
        "wastes your time. None of these labs is trying to top a leaderboard. "
        "Read them as failed frontier labs and every single one looks like a "
        "disappointment."),
]

# 1. the inventory, organised by constraint rather than by country
SCRIPT["map"] = [
    (A, "So group them by what each one is actually optimising. Data quality "
        "per parameter, which is Microsoft's Phi line and the small models "
        "around it. Distribution and billing, which is Amazon: Nova, Bedrock "
        "and the Trainium accelerator."),
    (A, "Auditability and on-premises deployment, which is Cohere and I B M's "
        "Granite. And memory per token during serving, which is N V I D I A's "
        "Nemotron, Liquid and A I twenty one. Four constraints, and a fifth "
        "we come back to at the end."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "How do you compare labs that are not trying to do the same thing?"),
    (A, "You do not. You ask a different question of each one. Not how good "
        "is it, but what does it make cheap, or possible, that a frontier A P "
        "I does not?"),
    (A, "Three of these carry a real idea, so they get a beat each. Then the "
        "fifth group, quickly."),
]

# 3. data quality per parameter
SCRIPT["phi"] = [
    (A, "Microsoft's Phi is one hypothesis, tested hard. Most of a "
        "pretraining corpus is noise, and a small model trained on a little "
        "extremely high-signal text can match a much larger model trained on "
        "the raw web."),
    (A, "Textbook quality is the label. Concretely: web data filtered by a "
        "classifier that scores documents for reasoning value rather than "
        "fluency, and a corpus that is mostly synthetic, worked solutions "
        "generated by a larger model and built so each one demonstrates a "
        "step rather than states a fact. Phi four, fourteen billion "
        "parameters, eighty four point eight percent on M M L U."),
    (A, "The cost is in the same sentence as the result. A model whose "
        "training distribution is synthesised from benchmark-shaped tasks is "
        "strongest on benchmark-shaped tasks, and weaker on long-tail world "
        "knowledge and messy real input."),
]

# 4. memory per token, which is a serving argument not a quality one
SCRIPT["memory"] = [
    (A, "Second constraint, and the most operationally useful. N V I D I A "
        "gives its models away as demand generation for graphics cards, and "
        "the Nemotron Nano models are the interesting part, because they are "
        "not transformers. They are Mamba two hybrids."),
    (A, "A state space model carries a fixed-size hidden state through the "
        "sequence, so compute and memory per token stay constant however long "
        "the context is. Mamba two makes that recurrence selective, so the "
        "block chooses what to keep, and formulates it as a matrix "
        "multiplication so it trains on the tensor cores."),
    (A, "And the number is on the right. Key-value cache per token drops from "
        "hundreds of kibibytes to a few, because only the attention layers "
        "cache anything at all. For agentic serving, where memory rather than "
        "arithmetic is the limit, that changes the economics far more than a "
        "couple of benchmark points would."),
]

# 5. auditability, and the specialist that follows from it
SCRIPT["cohere"] = [
    (A, "Third, Cohere, who sell to enterprises that will not send data to a "
        "public A P I. Command R was the first model explicitly post-trained "
        "for grounded generation with citations, so an unsupported sentence "
        "becomes visible to a reviewer. Command A is a hundred and eleven "
        "billion parameters and dense on purpose, because a dense model that "
        "size fits two graphics cards with predictable memory."),
    (A, "Then this. North Small Translate is two hundred and eighteen billion "
        "parameters built to do one thing, translate, and it scores eighty "
        "three point six on W M T twenty six against DeepL at eighty one "
        "point three seven and Google Translate at sixty eight point two."),
    (B, "Who ran that evaluation?"),
    (A, "Cohere did, with a rival's model as the judge. Hold it loosely. What "
        "survives the caveat is the shape: a single-task specialist at "
        "mixture-of-experts scale is still economically viable against "
        "generalists."),
]

# 6. the fifth group, named once each and not explained
SCRIPT["sweep"] = [
    (A, "Which leaves the fifth group, and these are here for one reason "
        "each. Prime Intellect train one model across clusters in different "
        "places joined by ordinary internet links, which says frontier "
        "training need not be geographically centralised."),
    (A, "The Institute of Foundation Models is the second lab, after Ai two, "
        "publishing training data and code and not only weights. Xiaomi "
        "streamed a post-training run's metrics live while it was still "
        "going, and released no model, so the dashboard is the artifact. And "
        "Prism rebuilt a twenty seven billion parameter model at one point "
        "seven six bits per weight, which is the current reference for how "
        "far compression goes before quality breaks."),
]

# 7. the take
SCRIPT["close"] = [
    (A, "So the last thing, and it applies to everything you just heard. "
        "Cohere's translation scores were judged by Cohere. Tencent's claim "
        "that its own model won it a thirty one point eight percent "
        "throughput gain is Tencent's. The Institute's state of the art is "
        "the Institute's."),
    (A, "That is not a reason to ignore them. It is the reason the useful "
        "question about a long-tail lab is never how good it is. It is what "
        "it makes cheap, or possible, and that part you can check yourself."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
