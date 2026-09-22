"""
Provider overview: OpenAI's GPT family, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: OpenAI sells an answer
and keeps the machine. Every decision on the page is the same decision, made
again at a new layer. The o-series hid the chain of thought and billed it.
GPT-5 hid the choice of how much to think behind a router. GPT-6 Astra hides
part of the thinking itself, inside the activations, where no transcript can
show it. And the ARC Prize result makes the consequence measurable: the same
weights score 62.7% or 99.9% depending only on whose scaffold runs them. That
is one spine, and the tiers, the prices and the open models all hang off it.

The outline that survived the revision step:

    ident       what this is, the date, and the bet in one sentence
    map         the whole line built and parked: flagship, tiers, agent
                surface, the one open window
    question    who decides how much the model thinks, and can anyone see it,
                plus where the tour goes
    router      the o-series, hidden reasoning tokens, and the router as
                architecture
    recurrent   what Astra added: recurrent depth, spent in latent space
    harness     the number that belongs to the harness, 62.7 against 99.9
    tiers       what it costs: Astra, then Sol, Terra and Luna
    oss         gpt-oss, the only architecture window, and how ordinary it is
    rivals      where a rival is ahead: Real-SWE, and the index
    close       the take: the harness is moving inside the API

What the step-4 critique changed:

  - Draft one opened on the 37-point benchmark gap. That is the best number on
    the page and therefore the worst thing to open on, because the viewer has
    not yet been told which lab or which model it belongs to. It moved to beat
    six, behind the router and recurrent depth, which are what explain it.
  - Recurrent depth and the harness result were two beats making one argument
    in draft one. They still are two beats, but the recurrent beat now ends on
    the two consequences (a harness cannot rebuild the state, a serving stack
    must persist it) so the chart in the next beat is already explained.
  - Astra for Law had a beat of its own. It is a fine story and it is not this
    lab's bet, so it shrank to one clause inside the map.
  - Four numbers were doing no work in speech and were cut rather than
    shrunk: FrontierMath Tier 4, OSWorld 2.0, Terminal-Bench 4.0, GPQA
    Diamond. The card's own scores are not the point; the gap is.
  - B was nodding along in draft one. B now interrupts four times and each
    interruption changes what A says next.

Everything traces to the canonical page "OpenAI: GPT family", read from Notion
on 22 September 2026. Nothing here is invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"3.66x" and "gpt-oss" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "OpenAI: GPT family"
SUBTITLE = "who decides how much the model thinks, and who can see it"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the flagship", "tone": "subject",
         "items": ["GPT-6 Astra", "Astra for Law", "GPT-Live-1"]},
        {"head": "the tiered line", "tone": "number",
         "items": ["GPT-5.6 Sol", "GPT-5.6 Terra", "GPT-5.6 Luna"]},
        {"head": "the agent surface", "tone": "machinery",
         "items": ["Codex line", "Agents API"]},
        {"head": "the one open window", "tone": "verified",
         "items": ["gpt-oss-120b", "gpt-oss-20b"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Who decides how much the model thinks,\n"
                         "and can anyone else see the decision?",
                 "note": "OpenAI answers the second half the same way every "
                         "time, and that is the bet"},

    "router": {"kind": "points", "focus": "the tiered line",
               "head": "the router as architecture", "items": [
        "o-series: RL on problems a program can check",
        "the chain of thought is hidden, and billed as reasoning tokens",
        "GPT-5: a router picks the budget per request",
        "GPT-5.1 split it back out as Instant and Thinking",
    ]},

    "recurrent": {"kind": "compare", "focus": "the flagship", "sides": [
        {"head": "chain of thought", "tone": "machinery", "items": [
            "deliberation comes out as text",
            "a harness can read the working state",
            "you are billed for every token of it"]},
        {"head": "recurrent depth", "tone": "cost", "items": [
            "activations loop back through the layers",
            "spent in latent space, never text",
            "the serving stack has to hold the state"]},
    ]},

    "harness": {"kind": "bars",
                "head": "GPT-6 Astra on ARC-AGI-3: same weights, two harnesses",
                "bars": [
        {"label": "provider-agnostic harness", "text": "62.7%, $26,098",
         "value": 62.7, "tone": "cost"},
        {"label": "ARC Provider Adapter", "text": "99.9%, $18,817",
         "value": 99.9, "tone": "verified"},
    ]},

    "tiers": {"kind": "table",
              "head": ["model", "for", "$ per 1M in / out"],
              "rows": [
                  ["GPT-6 Astra", "flagship; Fast mode doubles both", "$10 / $50"],
                  ["GPT-5.6 Sol", "hardest work, best coding", "$5 / $30"],
                  ["GPT-5.6 Terra", "balanced default", "$2.50 / $15"],
                  ["GPT-5.6 Luna", "fast and cheap", "$1 / $6"],
              ]},

    "oss": {"kind": "points", "focus": "the one open window",
            "head": "gpt-oss: the only architecture shown since GPT-2", "items": [
        "117B total, ~5.1B active per token; 21B and 3.6B",
        "MXFP4-native, so 120b fits one 80GB card",
        "GQA, RoPE with YaRN, alternating sliding-window layers",
        "learned attention sinks, and no QK-norm",
    ]},

    "rivals": {"kind": "stat", "big": "33.8%", "tone": "cost",
               "caption": "of Real-SWE resolved, on private enterprise codebases",
               "note": "Claude Fable 5.1 resolves 38.8%. Astra is second on "
                       "Artificial Analysis' reranked v4.2 index, about 85 Elo "
                       "above GPT-5.6 Sol"},

    "close": {"kind": "claim",
              "text": "The harness is moving inside the API.\n"
                      "The numbers are moving in with it.",
              "note": "Provider Adapter, Agents API, GPT-Live-1: the parts "
                      "that most change behaviour, now the vendor's"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the bet. Not a title card's job.
SCRIPT["ident"] = [
    (A, "This is OpenAI's model family, as the knowledge base has it on the "
        "twenty second of September, twenty twenty six. Every model they sell, "
        "and what each one is for."),
    (A, "One sentence carries the whole thing. OpenAI sells you an answer and "
        "keeps the machine. It decides how hard to think about your request, "
        "it bills you for the thinking, and in the new flagship some of that "
        "thinking never becomes words at all."),
]

# 1. the inventory, before any explanation
SCRIPT["map"] = [
    (A, "Here is the line, nothing explained yet. At the top, G P T six Astra, "
        "the flagship since September. Two things sit beside it on the same "
        "weights. Astra for Law, which adds an index of American case law and "
        "no new weights. And G P T Live one, full duplex voice, five cents a "
        "minute."),
    (A, "Underneath, the tiered line. G P T five point six, in three named "
        "tiers. Sol takes the hardest work and is their best coding model. "
        "Terra is the balanced default. Luna is fast and cheap. All three "
        "share a one point zero five million token context window."),
    (A, "Then the agent surface, the Codex line and the Agents A P I. And one "
        "open window, G P T O S S."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "That is a lot of surface for one lab. What ties it together?"),
    (A, "One question, asked at four different layers. Who decides how much "
        "the model thinks, and can anyone else see the decision?"),
    (A, "So: the router, then what Astra put underneath it, then the number "
        "that belongs to the harness rather than the weights, then the prices, "
        "then where a rival is ahead."),
]

# 3. decision one, and the oldest one
SCRIPT["router"] = [
    (A, "It starts with the o series, in twenty twenty four. Train with "
        "reinforcement learning on problems a program can check, and the model "
        "learns something that looks like search. A long internal chain of "
        "thought that backtracks and reframes."),
    (A, "Two things followed. The chain is hidden from you and billed as "
        "reasoning tokens, so accuracy became something you buy per request. "
        "And accuracy rises with the budget, so somebody has to set it."),
    (A, "G P T five made that architectural. A fast model, a reasoning model, "
        "and a router choosing per request. People objected to not knowing "
        "which they got, so five point one split them out as Instant and "
        "Thinking. The tiers lighting up on the map are the same idea, sold as "
        "price bands."),
]

# 4. decision two, and the new one
SCRIPT["recurrent"] = [
    (A, "Astra adds a third way to spend that budget, and it is the genuinely "
        "new thing here. Recurrent depth, also called opaque recurrence. "
        "Instead of emitting its deliberation as chain of thought tokens, the "
        "model loops activations back through its own layers. Part of the "
        "budget is spent in latent space, and never becomes text."),
    (B, "So there is nothing to read. Not hidden from me. Absent."),
    (A, "Which gives you the two consequences on the screen. An evaluation "
        "harness cannot rebuild the working state from a transcript. And a "
        "serving stack has to hold that recurrent state between calls, or the "
        "model starts from nothing every turn."),
]

# 5. the number, and it is not a number about the model
SCRIPT["harness"] = [
    (A, "Which brings us to the most quoted number about Astra. It is not a "
        "fact about the model. Same weights, two harnesses, two bars."),
    (A, "A R C Prize ran Astra through its standard provider agnostic harness. "
        "Sixty two point seven percent on A R C A G I three, for twenty six "
        "thousand and ninety eight dollars."),
    (A, "Then the same weights through a new Provider Adapter, which preserves "
        "that opaque reasoning state between requests and compacts long "
        "conversations. Ninety nine point nine percent, for eighteen thousand "
        "eight hundred and seventeen dollars. Three point six six times "
        "faster, on forty nine percent fewer tokens."),
    (B, "A thirty seven point gap, and the cheaper run is the higher one."),
    (A, "That is this page in one chart. The benchmark number now belongs to "
        "the scaffold as much as to the weights."),
]

# 6. what it costs
SCRIPT["tiers"] = [
    (A, "Prices. Astra is ten dollars per million input tokens and fifty per "
        "million output, with a Fast mode at double the price for double the "
        "speed. It trained on more than a hundred thousand G P Us at Stargate "
        "in Texas, and OpenAI published no parameter count, no architecture "
        "and no context window."),
    (A, "The tiers are cheap beside it. Sol at five and thirty. Terra at two "
        "dollars fifty and fifteen. Luna at one and six. Sol's developer price "
        "was cut by more than twenty percent in August, days after OpenRouter "
        "halved its own."),
]

# 7. the only architecture window there is
SCRIPT["oss"] = [
    (A, "The flagship weights are closed, so the one place an OpenAI design "
        "decision is visible is G P T O S S, released last August under Apache "
        "two point zero. Their first open weights since G P T two."),
    (A, "The big one holds a hundred and seventeen billion parameters and "
        "activates about five point one billion per token. It ships in M X F P "
        "four, a four bit format the expert weights were trained in rather "
        "than squeezed into afterwards, which is why it fits on a single "
        "eighty gigabyte card."),
    (B, "And the attention stack? Anything strange in there?"),
    (A, "Almost nothing, and that is the signal. Grouped query attention. "
        "Rotary embeddings stretched with Yarn. Alternating sliding window and "
        "full attention layers. Learned attention sinks, no Q K norm. Whatever "
        "the flagships do differently is in data, reinforcement learning and "
        "scale, not in the blocks."),
]

# 8. where a rival is ahead
SCRIPT["rivals"] = [
    (A, "The honest part, because the flagship is not first at everything. "
        "Real S W E runs against private enterprise codebases rather than "
        "public repositories. Astra resolves thirty three point eight percent "
        "of its tasks. Claude Fable five point one resolves thirty eight point "
        "eight, and leads the reranked index too."),
    (A, "Where OpenAI is genuinely alone is consumer reach, and in one safety "
        "category. Astra is the first model they classify as Critical for "
        "cyber capability. A hundred percent on ExploitBench, against seventy "
        "eight and a half for the model before it."),
]

# 9. the take
SCRIPT["close"] = [
    (A, "So what does the bet predict? Look at what shipped alongside Astra. A "
        "Provider Adapter that holds reasoning state. An Agents A P I that "
        "moves the agent loop onto OpenAI's own infrastructure. A voice model "
        "that owns the turn taking."),
    (A, "Those are one move: the parts of the harness that most change "
        "behaviour, migrating behind the A P I. Expect more of it, and expect "
        "the consequence. The more scaffold OpenAI owns, the fewer of its "
        "numbers anyone outside can reproduce."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
