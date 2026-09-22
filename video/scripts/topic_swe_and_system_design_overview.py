"""
Topic overview: SWE and system design, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: on its face this is the
least interesting topic in the knowledge base, because every one of its nouns
(testing, API design, distributed systems, operating systems) has a thousand
better-known treatments. What makes it worth six minutes is the sentence the
page puts at the top: it is the substrate under an *ML* service, and the three
pillars compose in one direction, fundamentals bounding design bounding craft.
So the beats that earn their place are the ones where ML breaks ordinary
engineering: a service whose latency is set by a model rather than a query,
capacity quantised in GPUs rather than fluid vCPUs, correctness that is
statistical, and a reviewer reading code an agent wrote. Everything else on the
page is a pointer to a better book and is left as one.

The outline that survived the revision step:

    ident       what this is, and the one reason it is not a generic SWE video
    map         three pillars, built and parked, with the direction of
                dependency stated
    question    what does a model service do that a CRUD service does not?
    different   the four answers, side by side against ordinary serving
    bottlenecks the four bottlenecks you are expected to be able to name
    ostep       why the OS book is on this page: its three-way split lands on
                GPU serving almost directly
    testing     testing an ML system is testing three different things
    walk        the worked example: serve an LLM feature to 10k tenants, which
                is also the interview
    review      reviewing code an agent wrote, which raises the bar
    close       the take

What the step-4 critique changed:

  - Draft one spent a beat on CAP and consistency models. That is the page
    pointing at DDIA, and a video of it would be a worse DDIA. Cut outright,
    and the room went to the walk and to the review beat.
  - Draft one had "testing" and "CI" as separate beats. They are one story
    (three things to test, and the gate that runs them), so they merged.
  - The four bottlenecks were prose in draft one and did not land, because
    four definitions in a row sound identical. They became a table, and the
    narration now points at the "what it caps" column, which is the part that
    does the work.
  - Draft one ended on "and that walk is the interview", which is the page's
    line but is an anticlimax: it tells a viewer what to say, not what is
    true. The ending is now the review beat's point, that LLM-authored code
    raises the review bar rather than lowering it.
  - B was decorative in draft one. B now interrupts four times: to ask why any
    of this belongs in an ML knowledge base, to name the mistake in the
    caching answer, to say which of the three kinds of test actually breaks,
    and to make the argument for merging agent code so A has to answer it.

Everything traces to the canonical page "Topic: swe-and-system-design": the
three pillars and their direction, the four properties that make model serving
different, the four named bottlenecks, the OSTEP mapping, the three kinds of
testing, and the ten-thousand-tenant walk. The code-review material (the review
priority order, small PRs, and LLM-authored code raising the bar) comes from
that page's own deep dive "API and Code Design", which the topic page lists and
describes as "code review taste". The topic map itself still glosses that box
as "review taste, abstraction economics", which is now behind its own child.

Numbers and names are spelled the way they are said, because text to speech
reads "10k", "p99" and "OSTEP" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: swe-and-system-design"
SUBTITLE = "the engineering substrate under an ML service, and where ML breaks it"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "systems fundamentals", "tone": "verified",
         "items": ["OS: OSTEP", "networking", "databases"]},
        {"head": "system design", "tone": "subject",
         "items": ["distributed systems", "the ML serving layer", "the interview"]},
        {"head": "software craft", "tone": "machinery",
         "items": ["testing", "API design", "code review"]},
    ]},

    "question": {"kind": "claim",
                 "text": "What does a model service do\nthat a CRUD service does not?",
                 "note": "everything else on this page has a better book about it"},

    "different": {"kind": "compare", "focus": "system design", "sides": [
        {"head": "a CRUD service", "tone": "context", "items": [
            "short, cheap requests",
            "capacity is fluid vCPUs",
            "deterministic output",
            "cost per request rounds to nothing"]},
        {"head": "a model service", "tone": "subject", "items": [
            "seconds of GPU time, streamed",
            "capacity quantised in GPUs",
            "nondeterministic: correctness is statistical",
            "cost drives caching, routing, quota"]},
    ]},

    "bottlenecks": {"kind": "table", "focus": "systems fundamentals",
                    "head": ["", "what it is", "what it caps"],
                    "rows": [
                        ["fsync latency", "~1 ms to stable storage",
                         "writes per transaction"],
                        ["TCP slow start", "the window ramps from small",
                         "short-lived connections"],
                        ["page cache", "file pages held in RAM",
                         "why a 'disk read' is often free"],
                        ["GPU memory bandwidth", "one token reads every weight",
                         "decode throughput"],
                    ]},

    "ostep": {"kind": "points", "head": "why the OS book is on this page",
              "items": [
        "OSTEP: virtualisation, concurrency, persistence",
        "address spaces and paging become KV cache blocks",
        "scheduling becomes continuous batching",
        "free, from Wisconsin",
    ]},

    "testing": {"kind": "columns", "focus": "software craft", "columns": [
        {"head": "code", "tone": "verified",
         "items": ["deterministic", "unit tests", "Hypothesis"]},
        {"head": "data", "tone": "number",
         "items": ["schema checks", "distribution checks"]},
        {"head": "model behaviour", "tone": "cost",
         "items": ["regression suites", "LLM contract tests"]},
    ]},

    "walk": {"kind": "flow", "tone": "machinery",
             "steps": ["the physics", "the traffic", "the model", "staying alive"]},

    "review": {"kind": "points", "head": "reviewing code an agent wrote",
               "tone": "cost", "items": [
        "the failure mode is plausible code with wrong edge behaviour",
        "so review the tests first",
        "make the author, human or agent, explain the invariants",
        "and ask what eval covers this, not just what test",
    ]},

    "close": {"kind": "claim",
              "text": "The fundamentals bound what the design can promise.\n"
                      "The craft decides whether it survives.",
              "note": "and the only part of this topic that is not already in a "
                      "better book is where the model breaks the ordinary answer"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of software engineering and system design, and it is "
        "the engineering substrate under every M L service. Three pillars. "
        "Systems fundamentals, system design, and software craft. Current as of "
        "the twenty second of September, twenty twenty six."),
    (A, "And there is one reason this is not a generic software engineering "
        "video. It is written for somebody who builds M L systems rather than "
        "web apps, so the interesting parts are the places where a model breaks "
        "the ordinary answer."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first, and the order on the screen is the argument, "
        "because these three compose in one direction."),
    (A, "Systems fundamentals at the bottom. The operating system, which here "
        "means O S TEP. Networking. Databases. Those bound what any design is "
        "allowed to promise."),
    (A, "System design above them. Classic distributed systems, plus the M L "
        "serving layer on top of it, plus the interview structure. And software "
        "craft on the right. Testing, A P I design, code review. That is what "
        "decides whether the thing survives contact with production."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Most of that is just software engineering, though. Why is it in a "
        "machine learning knowledge base at all?"),
    (A, "Because of one question, and it is the only one on this page that a "
        "better book does not already answer. What does a model service do that "
        "an ordinary C R U D service does not?"),
    (A, "Everything worth the time here is downstream of that. So hold the "
        "question on the screen, and watch which of the three pillars keeps "
        "having to bend."),
]

# --- the four differences --------------------------------------------------
SCRIPT["different"] = [
    (A, "The page gives four answers, and they are worth taking one at a time "
        "against the ordinary case on the left."),
    (A, "Requests are expensive and long lived. Seconds of G P U time, and a "
        "streamed response rather than a single reply. Capacity is quantised in "
        "G P Us, not fluid virtual C P Us, so you cannot add ten percent more "
        "of it."),
    (A, "Outputs are nondeterministic, which means correctness is statistical "
        "rather than binary. And the cost per request is high enough that "
        "caching, routing and quota design stop being optimisations and start "
        "being the architecture."),
    (B, "That last one is the one people get wrong. They design the service "
        "first and bolt the cache on afterwards."),
]

# --- the fundamentals, and what they are for ------------------------------
SCRIPT["bottlenecks"] = [
    (A, "Down to the fundamentals row, because the page is blunt about what "
        "they are for. You defend a design by naming the bottleneck, rather "
        "than by pattern matching to something you read."),
    (A, "Four worth being able to name, and read the right hand column, "
        "because that is the one doing the work. F sync latency, roughly a "
        "millisecond, is what a durable write costs when it must actually "
        "reach stable storage. T C P slow start is why short lived connections "
        "underuse the link."),
    (A, "The page cache is why a disk read is often free. And G P U memory "
        "bandwidth caps decode throughput, because generating one token reads "
        "the whole weight set once. That is the physical fact underneath "
        "continuous batching, K V cache design and quantisation."),
]

SCRIPT["ostep"] = [
    (A, "Which is also why an operating systems textbook is sitting on a "
        "machine learning page at all. O S TEP is Operating Systems, Three Easy "
        "Pieces, the free Wisconsin book, and it is organised around "
        "virtualisation, concurrency and persistence."),
    (A, "And that three way split lands on G P U serving almost directly. "
        "Address spaces and paging map onto K V cache block management. "
        "Scheduling maps onto continuous batching."),
    (A, "So it is not background reading you get to eventually. It is the same "
        "three problems, one layer down, with different names on them."),
]

# --- the craft row ---------------------------------------------------------
SCRIPT["testing"] = [
    (A, "Over to the craft pillar, and the first thing that breaks. Testing an "
        "M L system is testing three different things, and they need three "
        "different kinds of test."),
    (A, "Code is the easy one. It is deterministic and unit testable, and "
        "property based testing with Hypothesis is the upgrade worth making. "
        "Data is schema checks and distribution checks, because the shape being "
        "right does not mean the contents are."),
    (B, "And the third one is the one that actually breaks."),
    (A, "It is. Model behaviour. Regression suites and contract tests on the "
        "outputs, because there is no assertion that a generated answer is "
        "correct. Only that it still does what the last checkpoint did."),
]

# --- the worked example ----------------------------------------------------
SCRIPT["walk"] = [
    (A, "Here is how the three pillars actually compose, on the page's own "
        "worked example. Serve an L L M feature to ten thousand tenants."),
    (A, "The physics first. One seventy billion parameter replica needs so many "
        "G P Us, holds so many concurrent K V caches, and cold starts in "
        "minutes rather than milliseconds. That bounds every promise that "
        "follows."),
    (A, "Then the traffic. A gateway, a queue with backpressure, retries with "
        "jitter and idempotency keys, per tenant rate limits, and separate "
        "stores for state and for usage."),
    (A, "Then the model. Routing across model tiers, semantic and prefix "
        "caching, shadow deployment for a new checkpoint, and a degradation "
        "ladder for when the G P U pool saturates. Then craft keeps it alive. "
        "That walk is also, almost verbatim, the M L system design interview."),
]

# --- where the craft row has just changed ---------------------------------
SCRIPT["review"] = [
    (A, "One last thing on the craft pillar, because it is the part that moved "
        "most recently. Code review, when the code was written by an agent."),
    (A, "The line worth taking away is that L L M authored code raises the "
        "review bar rather than lowering it. The failure mode is plausible "
        "looking code with subtly wrong edge behaviour, which is precisely the "
        "kind a quick read approves."),
    (B, "But the tests pass. That is usually the argument for merging it."),
    (A, "Which is why the advice is to review the tests first, and to demand "
        "that the author, human or agent, explain the invariants. And to ask "
        "what eval covers this, the way you would ask what test covers this."),
]

# --- the take --------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is this map for? Two sentences, and they are on the screen. "
        "The fundamentals bound what a design is allowed to promise. The craft "
        "decides whether it survives."),
    (A, "And the honest thing to say about the middle pillar is that most of it "
        "is in a better book. What is not in any of those books is the bit "
        "where the model breaks the ordinary answer. Quantised capacity. "
        "Statistical correctness. A reviewer who cannot assume the author "
        "understood the code."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
