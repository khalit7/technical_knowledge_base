"""
Provider overview: Zhipu's GLM family, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: almost every other lab
on this map sells a benchmark position. Zhipu sells a price. Frontier-class
weights under MIT, an agentic-coding subscription at about three dollars a
month, and a flash tier at a tenth of its own flagship. Everything on the page
is downstream of that one decision, including the architecture, which exists to
make the price servable rather than to win anything. And the page's most
interesting artifact is what the strategy bought: a production serving system
for GLM-5.3-Flash, stood up in thirteen days, largely written by the model it
now serves, published with the lab's own insistence that it is not recursive
self improvement.

The outline that survived the revision step:

    ident       what this is, the date, and the bet in one sentence
    map         the line built and parked: flagship, flash, cheap tier,
                and the one thing that is not a model
    question    what do you optimise if not the leaderboard, plus the route
    arc         the ARC design brief, and what a unified model gives up
    price       what it costs, including cost per index point
    how         the architecture that makes that price servable
    lead        where they still lead: Real-SWE on private codebases
    stack       the inference stack, and the 3.22x
    feedback    the transferable finding, which is about feedback not about
                self improvement
    close       the take: permissive weights make the base infrastructure

What the step-4 critique changed:

  - Draft one opened on "the model built the thing that serves it". That is
    the best story on the page and the worst opening, because the viewer has
    not been told which lab, which model, or why any of it matters. It moved
    to beat eight, where the pricing strategy has already explained why a lab
    would spend thirteen days of its own model's time on serving throughput.
  - The Ox Alpha stealth-evaluation episode had a beat. It is a good pattern
    and it is not this lab's bet, so it survives as one clause of caution in
    the lead beat, where a selected-after-the-fact number belongs.
  - Lineage was a beat and is now gone. A video that walks GLM-4 to 4.5 to 4.6
    to 5 to 5.2 to 5.3 is a changelog read aloud. The two versions that carry
    an argument, 5.3 and 5.3-Flash, are named where the argument needs them.
  - The ARC beat asserted that the three capabilities conflict. It now says
    how each one pulls, because "they conflict" is a claim the viewer cannot
    check and "reasoning wants deliberation, agents want short decisive tool
    calls" is one they can.
  - Muon, MTP and dense-first blocks were four architecture facts competing
    for one beat. Only the ones that make the price possible survived, which
    is the through-line: experts per token, the attention stack, IndexPool.
  - B nodded twice in draft one. B now asks the cheapness question, challenges
    the benchmark claim and pushes back on the self-improvement framing, and A
    changes course each time.

Everything traces to the canonical page "Zhipu: GLM", read from Notion on
22 September 2026. Nothing here is invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"3.22x", "MIT" and "GLM-5.3-Flash" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Zhipu: GLM"
SUBTITLE = "the lab that sells a price instead of a benchmark position"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the open flagship", "tone": "subject",
         "items": ["GLM-5.3", "GLM-5.2", "744B total / 40B active"]},
        {"head": "the flash tier", "tone": "number",
         "items": ["GLM-5.3-Flash", "320B / 18B active", "image + video in"]},
        {"head": "the cheap tier", "tone": "machinery",
         "items": ["GLM-4.7-Air class", "~100B, self-hostable"]},
        {"head": "not a model", "tone": "verified",
         "items": ["GLM Coding Plan", "slime (RL training)"]},
    ]},

    "question": {"kind": "claim",
                 "text": "If you are not optimising the leaderboard,\n"
                         "what are you optimising?",
                 "note": "Zhipu's answer has been the same for a year, and it "
                         "is not capability per parameter"},

    "arc": {"kind": "points", "focus": "the open flagship",
            "head": "ARC: three things that pull apart", "items": [
        "agentic: short decisive tool calls, hundreds of steps",
        "reasoning: deliberate before answering, and pay the latency",
        "coding: exact, formatted, non-chatty output",
        "one set of weights, hybrid thinking modes in the prompt template",
    ]},

    "price": {"kind": "table",
              "head": ["what", "what it is", "what it costs"],
              "rows": [
                  ["GLM Coding Plan", "Claude Code-compatible endpoint",
                   "~$3 / month"],
                  ["GLM-5.3-Flash", "multimodal, 1M ctx, MIT",
                   "$0.15 / $0.50 per Mtok"],
                  ["cost per task", "at index 57, Flash vs a closed peer",
                   "$0.09 vs $2.03"],
              ]},

    "how": {"kind": "points", "focus": "the flash tier",
            "head": "what makes that price servable", "items": [
        "8 of 288 experts active per token",
        "hybrid linear + sparse attention: ~1/3 the attention compute",
        "IndexPool averages every 4 lookup vectors before selection",
        "KV cache under a quarter of its size at 1M context",
    ]},

    "lead": {"kind": "bars",
             "head": "Real-SWE: private enterprise codebases, tasks resolved",
             "bars": [
        {"label": "GLM-5.3", "text": "28.8%", "value": 28.8, "tone": "verified"},
        {"label": "Kimi K3", "text": "18.8%", "value": 18.8, "tone": "context"},
    ]},

    "stack": {"kind": "stat", "big": "3.22x", "tone": "number",
              "caption": "end-to-end throughput, baseline to launch, in 13 days",
              "note": "a production serving system for GLM-5.3-Flash on more "
                      "than 100,000 Chinese-made accelerators, largely written "
                      "by GLM-5.3"},

    "feedback": {"kind": "points",
                 "head": "what actually unblocked it: local verifiable feedback",
                 "items": [
        "correctness: compare numbers across execution paths",
        "system behaviour: timeline analysis of the live system",
        "performance: layered tests show which constraint binds",
        "found: a TF32 precision bug, and a 20% loss to the GIL",
    ]},

    "close": {"kind": "claim",
              "text": "Give the weights away and the base model\n"
                      "stops being a product and becomes infrastructure.",
              "note": "Atria Dawn Preview: a national laboratory reached 744B "
                      "by post-training GLM-5.2, and announced nothing"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the bet. Twenty seconds, before any tension.
SCRIPT["ident"] = [
    (A, "This is Zhipu's G L M family, as the knowledge base has it on the "
        "twenty second of September, twenty twenty six. Zhipu is the Tsinghua "
        "University spinoff behind G L M, and it publishes its flagship "
        "weights under M I T, the most permissive licence in common use."),
    (A, "It earns the time for one reason. Most labs here sell a leaderboard "
        "position. Zhipu sells a price, and the page ends with what that "
        "bought them."),
]

# 1. the inventory, named before anything is explained
SCRIPT["map"] = [
    (A, "The line, with nothing explained yet. The open flagship is G L M "
        "five point three, with five point two underneath it. Seven hundred "
        "and forty four billion parameters, about forty billion active per "
        "token, a one million token window."),
    (A, "Beside it, G L M five point three Flash: three hundred and twenty "
        "billion total, eighteen billion active, natively multimodal. Then a "
        "cheap self-hostable tier around a hundred billion, and two things "
        "that are not models at all."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "If they are not chasing the leaderboard, what are they optimising?"),
    (A, "That question is the whole family, and the answer is cost per unit "
        "of useful work on agentic coding, with the weights given away."),
    (A, "So: the design brief, then what it costs, then how that price is "
        "even servable, then where they genuinely lead, and then the "
        "strangest thing on the page."),
]

# 3. the design brief, and what it concedes
SCRIPT["arc"] = [
    (A, "A R C is Zhipu's name for the brief: agentic behaviour, reasoning "
        "and coding, in one set of weights. Those three pull apart in "
        "post-training, which is what makes it a commitment and not a "
        "slogan."),
    (A, "Reasoning teaches a model to deliberate before answering, and you "
        "pay for that in latency. Agentic training rewards short decisive "
        "tool calls instead. Coding wants exact formatted output with no chat "
        "around it."),
    (A, "The industry answer is separate specialised checkpoints. G L M "
        "instead ships hybrid thinking modes, picked in the prompt template "
        "rather than by loading another model, and gives up a little at the "
        "top of each one."),
]

# 4. the number that is the product
SCRIPT["price"] = [
    (A, "Now the prices, because here the pricing is the product. The Coding "
        "Plan is about three dollars a month, and its endpoint is compatible "
        "with Claude Code, so an existing setup moves across by changing a "
        "base U R L and a key."),
    (A, "Flash lists at fifteen cents per million input tokens and fifty per "
        "million output, roughly a tenth of their own flagship. Keep the "
        "bottom row: at fifty seven on the Artificial Analysis index, Flash "
        "costs about nine cents a task, against about two dollars and three "
        "cents for a comparably placed closed model."),
]

# 5. why the price is not only a loss leader
SCRIPT["how"] = [
    (B, "That is a twenty-fold gap. Is that a real cost, or is somebody "
        "eating the difference to buy market share?"),
    (A, "Both, and the architecture is the part you can check. Flash routes "
        "eight of two hundred and eighty eight experts per token, and its "
        "attention stack is hybrid linear plus sparse, cutting attention "
        "compute to roughly a third."),
    (A, "Then IndexPool averages every four lookup vectors before selection, "
        "dropping the key-value cache under a quarter of its size at a "
        "million tokens. That is what makes the advertised window affordable "
        "to serve rather than merely available."),
]

# 6. the honest beat: what they lead, and what they lost
SCRIPT["lead"] = [
    (A, "So where does that leave quality? They topped the aggregate "
        "open-weight index at release, and that lead has since passed to "
        "Moonshot's Kimi K three. What G L M still leads on is narrower and "
        "more useful, and it is on the screen."),
    (A, "Real S W E runs against private enterprise codebases rather than "
        "public repositories. G L M five point three resolves twenty eight "
        "point eight percent of its tasks, the best open-weight result. Kimi "
        "K three resolves eighteen point eight."),
    (A, "Be careful with the arena scores, though. Flash sat on evaluation "
        "platforms the week before launch as an unattributed model called Ox "
        "Alpha, and was claimed once the numbers came in."),
]

# 7. the artifact the whole strategy was for
SCRIPT["stack"] = [
    (A, "Which brings us to the strangest document in this knowledge base. In "
        "September, Zhipu published an account of building the serving system "
        "that runs Flash in production. Thirteen days. More than a hundred "
        "thousand Chinese-made accelerators. Three point two two times the "
        "throughput they started with. And the code was largely written by G "
        "L M five point three, the model it was being built to serve."),
    (B, "That is the recursive self-improvement headline, surely."),
    (A, "Zhipu says plainly that it is not, and that humans kept control of "
        "the objectives and the boundaries. That disclaimer is what makes the "
        "post worth reading rather than discounting."),
]

# 8. the finding that actually transfers
SCRIPT["feedback"] = [
    (A, "Because the finding that transfers is about feedback, not about self "
        "improvement. The bottleneck was never the model. It was the "
        "environment the model was graded in."),
    (A, "They replaced one sparse signal, the test failed, with three local "
        "verifiable ones. Correctness, by comparing numbers across execution "
        "paths. System behaviour, by timeline analysis. Performance, by "
        "layered tests showing which constraint binds."),
    (A, "That caught a T F thirty two precision bug visible only under "
        "certain parallelism strategies, and a twenty percent slowdown traced "
        "to Python's global interpreter lock. Neither would ever have "
        "surfaced from an end-to-end metric."),
]

# 9. the take
SCRIPT["close"] = [
    (A, "So what does giving the weights away buy? Look at Atria Dawn "
        "Preview. A Shanghai national laboratory reached seven hundred and "
        "forty four billion parameters by post-training on the G L M five "
        "point two base rather than training from scratch, and shipped it "
        "with no announcement at all."),
    (A, "That is what the hosted margin was traded for. A permissive licence "
        "at the frontier stops the base model being a product and makes it "
        "infrastructure other people build on."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
