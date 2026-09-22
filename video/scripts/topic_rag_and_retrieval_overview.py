"""
Topic overview: RAG and retrieval, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this is the topic where
the field's own story about itself has moved. Retrieval used to be a pipeline
you built, and the page now records the turn to retrieval as something a
long-context agent does for itself, as a tool it calls in a loop. So the
episode is built on that tension rather than on the chunking-to-reranking
pipeline alone, and the map's first two columns are the two sides of it.

What the page says actually decides it is not the architecture, and that is the
landing. Two things decide it. The corpus, because the Astra measurement puts
fifteen points on the same model purely from the index, and a curated corpus of
a regulated domain is the one part nobody reproduces by scraping. And the shape
of the question, because a loop earns its 3-10x cost on multi-hop work and
wastes it on a lookup, which is a routing decision. Then the newest result on
the page moves the open variable again: for a long-horizon agent the problem is
when to retrieve, not what.

The outline that survived the revision step:

    ident     what this is, and the story that moved
    map       three columns, built and parked: what you build, what the agent
              does, how you know
    question  pipeline, or hand it to the model
    pipeline  the 2026 production default, in four boxes
    corpus    the corpus is the product: 54% against 38.7%, same weights
    ladder    naive, advanced, agentic, read as who decides what to retrieve
    cost      what the loop costs, and where it is wasted
    timing    the reframe: when to retrieve, not what
    eval      split the system, and triage on one bit
    caveat    a number with no named index carries no information
    close     the take

What the step-4 critique caught, and what changed:

  - Draft one walked the pipeline in three beats (chunking, hybrid search,
    reranking) and only reached the agentic question at six minutes. That is
    the page as it was written two years ago, not as it reads now, so the
    pipeline collapsed into one beat and the tension moved to the top.
  - Draft one listed the five components and the embedding and index layer as
    separate beats. Neither carries an argument at this altitude, so the five
    components went entirely and the index layer survives as one line on the
    map.
  - The Astra apparatus (26 partner plugins, ethical walls, zero data
    retention) was in draft one. It is genuinely the enterprise-retrieval
    checklist and it is a list, so only the governance idea survives in the
    corpus beat, as a clause: access control applied to the retrieval layer.
  - Draft one closed on "it depends on your corpus", which is true and is not
    a take. The close now names both deciders and then hands the viewer the
    open variable, which is timing.
  - B was agreeing in draft one. B now interrupts three times: to name the
    fight in one line, to ask why reminding at every step is not better, and
    to catch that recall is measured against something somebody chose.

Every figure, product name and claim comes from the canonical page
"Topic: rag-and-retrieval", read from Notion on 22 September 2026. Nothing was
invented for shape.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers and names are spelled the way they should be said, because text to
speech reads "recall@k", "BM25" and "38.7%" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: rag-and-retrieval"
SUBTITLE = "a pipeline you build, or something the agent does for itself"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. The first two columns are deliberately the two sides of
    # the episode's tension, so every later beat that focuses one of them is
    # also placing itself on one side of the argument.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "what you build", "tone": "machinery", "items": [
            "chunking",
            "hybrid search and RRF",
            "rerankers",
            "embeddings and the index",
            "the corpus itself"]},
        {"head": "what the agent does", "tone": "subject", "items": [
            "retrieval as a tool",
            "GraphRAG",
            "long context",
            "memory, and timing"]},
        {"head": "how you know", "tone": "number", "items": [
            "recall@k",
            "faithfulness",
            "golden sets"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Build a retrieval pipeline,\n"
                         "or hand retrieval to the model?",
                 "note": "the pipeline first, because it is the half with "
                         "measurements"},

    "pipeline": {"kind": "flow", "focus": "chunking", "tone": "machinery",
                 "steps": ["chunk", "BM25 + dense", "RRF fusion",
                           "cross-encoder rerank"]},

    "corpus": {"kind": "bars", "focus": "the corpus itself",
               "head": "Vals AI Legal Research Bench, one model", "bars": [
        {"label": "with the legal index", "text": "54% correct", "value": 54,
         "tone": "verified"},
        {"label": "with web search", "text": "38.7% correct", "value": 38.7,
         "tone": "context"},
    ]},

    "ladder": {"kind": "stack", "focus": "retrieval as a tool",
               "tone": "subject", "layers": [
        ("naive", "retrieve once, with the raw query"),
        ("advanced", "a fixed graph: rewrite, filter, rerank"),
        ("agentic", "the model queries until it judges it has enough"),
    ]},

    "cost": {"kind": "points", "focus": "long context", "tone": "cost",
             "head": "what the loop costs", "items": [
        "3-10x the latency and the tokens",
        "earned on multi-hop and exploratory questions",
        "wasted on a factoid lookup",
        "which is why routers exist",
        "long context took the small-corpus end outright",
    ]},

    "timing": {"kind": "stat", "big": "45.9%", "tone": "verified",
               "caption": "Terminal-Bench 2.0, up from 37.6%",
               "note": "a second model deciding when to remind the worker, "
                       "with no retraining of the worker at all"},

    "eval": {"kind": "compare", "focus": "recall@k", "sides": [
        {"head": "the retrieval half", "tone": "machinery", "items": [
            "recall@k: did it enter the prompt",
            "nDCG@k for comparing rerankers",
            "nothing downstream recovers a miss"]},
        {"head": "the generation half", "tone": "number", "items": [
            "faithfulness: claims entailed by context",
            "low faithfulness is hallucination anyway",
            "answer relevance"]},
    ]},

    "caveat": {"kind": "points", "tone": "cost",
               "head": "numbers that carry no information", "items": [
        "a retrieval-sensitive result with no named index",
        "MTEB: a prior, not a verdict",
        "models are tuned against it",
        "a legal or code corpus reorders the table",
        "and the Astra figures are the vendor's own",
    ]},

    "close": {"kind": "claim",
              "text": "Not pipeline against agent.\n"
                      "The corpus, and the shape of the question.",
              "note": "and for a long-horizon agent the open variable is "
                      "when to retrieve, not what"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of retrieval augmented generation. Everything between "
        "a user's question and an answer grounded in your own documents that "
        "can cite them."),
    (A, "It earns an episode because the field's story about itself has moved. "
        "This was a pipeline you built. The argument now is whether a long "
        "context agent should just do it for itself. Current as of the twenty "
        "second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. Three columns, and the first "
        "two are the tension."),
    (A, "What you build. Chunking, how a document gets cut into retrievable "
        "units. Hybrid search, and the fusion that combines two rankings. "
        "Rerankers. Embeddings and the index. The corpus itself."),
    (A, "What the agent does instead. Retrieval as a tool it calls in a loop. "
        "Graph R A G. Long context. Memory, and timing."),
    (A, "And the third column, how you know either of them worked. Recall at k. "
        "Faithfulness. A golden set of hand labelled queries."),
    (B, "The first column is a system. The second one is a prompt."),
    (A, "That is the whole fight, yes."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So the question the map is arranged to answer. Do you build a "
        "retrieval pipeline, or hand retrieval to the model and let it work it "
        "out?"),
    (A, "We do the pipeline first, because it is the half with measurements, "
        "and then the case against it."),
]

# --- the pipeline, in one beat --------------------------------------------
SCRIPT["pipeline"] = [
    (A, "The production default is the four boxes on screen, and the first is "
        "the highest leverage decision in the stack. Chunking moves quality more "
        "than which embedding model you pick, because a chunk that has lost its "
        "document context cannot be matched by a query that assumes it."),
    (A, "Then hybrid search. B M twenty five, a keyword method, for the exact "
        "identifiers and rare names dense vectors miss, dense vectors for the "
        "paraphrases it misses, and the two lists fused on rank rather than "
        "score, because their scales are not comparable."),
    (A, "Then a cross encoder reranker over the top fifty to a hundred and "
        "fifty. Thirty to three hundred milliseconds, and the highest leverage "
        "thing you can add to a stack that works."),
]

# --- the corpus is the product --------------------------------------------
SCRIPT["corpus"] = [
    (A, "But the page's real claim about that column is that at the top of the "
        "market the corpus is what is being sold, not the model. OpenAI's Astra "
        "for Law pairs one model with a proprietary legal index of over two "
        "hundred and thirty million documents, claimed to cover almost all "
        "published United States precedential case law."),
    (A, "On a legal research benchmark it passes correctness checks on fifty "
        "four percent of questions. The same model on ordinary web search gets "
        "thirty eight point seven. Look at the gap. Same weights, fifteen "
        "points, all of it the retrieval layer. Generic web search is an index "
        "too. Just a bad one for that job."),
]

# --- the second column ----------------------------------------------------
SCRIPT["ladder"] = [
    (A, "Now the other side. Naive, advanced, agentic gets called a maturity "
        "ladder, and it is more useful read as a ladder of who decides what to "
        "retrieve."),
    (A, "Naive retrieves once, with the raw query. Advanced wraps that in a "
        "fixed graph of rewriting, filtering and reranking, designed by a "
        "human. Agentic hands retrieval to the model as a tool it may call "
        "repeatedly, writing its own queries until it judges the context "
        "sufficient."),
    (A, "So the decision moves from you at design time to the model at run "
        "time. A different kind of system, not a bigger version of the same "
        "one."),
]

# --- what it costs --------------------------------------------------------
SCRIPT["cost"] = [
    (A, "It is also not free. A loop costs three to ten times the latency and "
        "the tokens. It earns that on multi hop questions, where you cannot "
        "write the right query until you have seen the last answer, and wastes "
        "it on a factoid lookup. Which is why routers exist."),
    (A, "Graph R A G sits in the same place. It exists for the corpus wide "
        "question no single chunk contains, and the lazy and light variants get "
        "most of it far cheaper. And long context has genuinely taken "
        "territory: at the small corpus end, building an index is pure "
        "overhead."),
]

# --- the reframe ----------------------------------------------------------
SCRIPT["timing"] = [
    (A, "Which brings us to the newest result here, and it moves the argument "
        "sideways. For a long horizon agent the open variable is not what to "
        "retrieve. It is when. Meta put a second model beside an acting agent, "
        "whose only job is to decide at each step whether to remind it of "
        "something it already knows. That lifted a terminal benchmark from "
        "thirty seven point six to forty five point nine percent, without "
        "retraining the worker."),
    (B, "Why does reminding it at every step not do better?"),
    (A, "Because a reminder consumes context and competes with the live task "
        "state, so the memory model's job is discrimination rather than "
        "ranking. Retrieval has always treated timing as fixed and ranking as "
        "the whole problem. For long horizon agents it is the other way "
        "round."),
]

# --- how you know ---------------------------------------------------------
SCRIPT["eval"] = [
    (A, "Third column, briefly, because it settles the argument in your own "
        "stack. Split the system and measure each half. Recall at k dominates "
        "the retrieval side, because nothing downstream can recover an answer "
        "that never entered the prompt. On the generation side a judge model "
        "scores faithfulness, the fraction of the answer's claims entailed by "
        "the retrieved context."),
    (A, "And the triage is one bit. For every wrong answer, was the right chunk "
        "in the prompt? That assigns the bug to one half or the other, and it "
        "is worth more than any dashboard."),
]

# --- the objection --------------------------------------------------------
SCRIPT["caveat"] = [
    (B, "All of those are measured against a set of queries somebody chose."),
    (A, "Which is the rule this page leads with. A retrieval sensitive number "
        "reported without a named index carries no information at all."),
    (A, "Same for the public embedding scoreboard. A high row is a prior, not "
        "a verdict: models are tuned against it, and a legal or code corpus "
        "reorders the table. And the Astra figures I quoted are the vendor's "
        "own, on a validation set."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So does the pipeline survive the agent? The page's answer is that the "
        "question is the wrong one. Two things decide it, and neither is "
        "architecture. The corpus, because that is where the fifteen points "
        "came from, and a curated corpus of a regulated domain is the one piece "
        "nobody reproduces by scraping. And the shape of the question, because "
        "a loop earns its cost on multi hop work and wastes it on a lookup. "
        "That is a routing decision, not a philosophy."),
    (A, "And if you are building for long horizon agents, the genuinely open "
        "variable is not the ranking. It is the timing."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {words} words ({b_turns} for B), "
          f"about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:14s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
