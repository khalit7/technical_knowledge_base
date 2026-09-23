"""
Topic overview: RAG and retrieval, as of 22 September 2026.

Source: the canonical Notion page "Topic: rag-and-retrieval", read from Notion
directly on 23 September 2026 rather than from the repo mirror, and every name,
figure and claim below is on that page. Nothing is imported from the four deep
dives underneath it, and nothing is invented for shape. The page prints no date
in its own text, so the date on the title card is Notion's
`page_last_edited_at`, 22 September 2026.

Which kind of overview this is. A comparison, and the field being compared is
not a set of rivals: it is the layers of a retrieval stack, the way the CUDA
map is layers rather than competitors. The page's own "Map of the space" is
five layers (embedding + index, corpus, pipeline, architecture, evaluation) and
its taxonomy diagram is four branches. Four columns is what the vocabulary can
actually draw, so the map is four, and the corpus sits at the top of the first
column rather than getting a column of its own. That is a defensible reading
rather than a compromise: the corpus layer is a claim about what you index,
which is exactly what column one asks.

The organising question, and why it is the page's and not the video's. The page
states it outright: "The 2026 twist: retrieval is increasingly a tool an agent
calls rather than a fixed pipeline." So the question beat asks whether you
build the pipeline or hand retrieval to the model, and the tour answers it in
the page's own order: the pipeline first, because that is the half with
measurements, then the corpus, then the ladder, then the newest result, then
how you would settle it in your own stack.

The cut cleared in 74326b3 found that same tension and built its map on it
directly: three columns reading "what you build", "what the agent does", "how
you know". That axis is deliberately not kept. It is a good argument and it is
the episode's argument rather than the page's inventory, and putting it in the
map makes the map take a side before anything has been explained. The map here
is the page's layers; the tension is stated in the `question` beat, where it
belongs, and the map stays a map. Three things from that cut are kept, because
they were right: the corpus beat as the page's biggest claim, the ladder read
as who decides what to retrieve, and closing on timing rather than on "it
depends on your corpus", which is true and is not a take.

The outline that survived the revision step:

    ident     what this is, why the topic moved, and how current
    map       the four layers, built whole and parked as the home frame
    question  build the pipeline, or hand retrieval to the model
    pipeline  the 2026 production default, in four moves
    corpus    the corpus is the product: 54% against 38.7%, same weights
    ladder    naive, advanced, agentic, read as who decides what to retrieve
    timing    the newest result: when to retrieve, not what
    eval      split the system, and triage on one bit
    close     the take

What the step-5 critique changed:

  - Draft one gave the pipeline three beats (chunking, hybrid search,
    reranking). That is the page as it read two years ago, and it reached the
    agentic half at five minutes. One beat, four moves.
  - Draft one opened the map on nouns. The page glosses each layer as a
    question about the stack, so the headings are questions and the products
    arrive as answers: what you index, the pipeline, who drives it, how you
    know.
  - Draft one used a `stat` for the Proactive Memory Agent result. A `stat` is
    two reveals and therefore a twenty five second panel, and the material
    wanted a hundred words, which would have been a forty second motionless
    frame. It is a `points` with a head and three rows, and the figure is still
    written as a figure on the card.
  - Draft one closed on a `claim`, which draws one card and then holds it for
    the length of the take. That is the motionless closing frame every early
    overview in this series shipped. Five reveals and a small reserve here.
  - B was agreeing in draft one. B has two turns now, and both are the
    question the viewer is already forming: which half am I meant to build,
    and why not remind the agent at every step.

What was cut, so the next person can see what is still sitting on the page
rather than rediscover it:

  - Contextual retrieval (Anthropic): an LLM-written 50-100 token situating
    prefix prepended to each chunk at index time, which the page calls the
    quality ceiling for static pipelines. It is a fifth move in the pipeline
    beat, and a fifth reveal there costs about thirty words the episode does
    not have. It belongs with chunking and is the obvious first thing to
    restore if this is ever recut longer.
  - nDCG@k and golden sets have no row of their own in `eval`. Both are named
    on the map, which is where the orphan check needs them, and a fifth and
    sixth row there is another thirty words each. `eval` is the one beat that
    could grow if the episode is ever recut shorter elsewhere.
  - MTEB as a prior rather than a verdict, and the reason (models are tuned
    against it, and a legal or code corpus reorders the table). The close
    already carries the page's leading rule about a named index, which is the
    same lesson in its stronger form.
  - GraphRAG is named on the map and not toured. It is the one pill the tour
    does not reach: the corpus-global question no single chunk answers, and
    LazyGraphRAG and LightRAG getting most of it cheaper. A beat on it is
    forty seconds. Deliberate, not an omission.
  - The five components (knowledge base, retriever, ranker, integration layer,
    generator). A decomposition, not an argument, and the map already carries
    every part of it that a viewer can act on.
  - The Astra apparatus in full: 26 partner plugins, ethical walls, zero data
    retention, `gpt-6-astra-law`. It is the enterprise-retrieval checklist and
    it is a list. Only the figures survive.
  - The two papers (the original RAG paper, ReAct) and the related-topic
    blocks. A resources card is a deep dive's obligation; this close points at
    the page, and the page carries all of it.

Nothing needed back-porting to the page. Three glosses the narration adds are
already glossed in context there: chunking as "how a document is cut into
retrievable units", faithfulness as the fraction of claims entailed by the
context, and recall@k as whether the answer entered the prompt at all. Every
page mention was checked through the API rather than through `notion-fetch`,
which renders them as bare `<mention-page url=.../>`; all fifteen carry their
titles.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, two turns, both the question the viewer is forming

Numbers and names are spelled the way they should be said, because text to
speech reads "RAG", "BM25", "recall@k", "38.7%" and "pgvector" badly. Six
shapes were rewritten before the first render on rules this method already
carries: "RAG" is spelled "R A G" throughout, because an all-caps name that is
also an ordinary word is the shape that turned "HELM" into "LM"; "GraphRAG" is
said "Graph R A G" and "pgvector" is said "P G vector", because a welded
compound is the shape that produced "postgres cool"; the store is called
"Postgres" and never "PostgreSQL", for the same reason; "Vals AI" is given a
category word in front of it ("a legal research benchmark run by Vals A I"),
because a short name with nothing behind it is the shape "Kueue" failed on;
"Meta AI's Proactive Memory Agent" is recast unpossessed, because a possessive
on a name is what turned "Prefect's" into "prefix"; and no segment opens or
closes on "Astra", "RRF" or "nDCG".

Reveal arithmetic, which set the length. `spread` puts reveal k of n at
`(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments and the last reveal lands exactly `reserve` seconds before
the line ends. On the parked map that is binding rather than a preference: the
reserve is capped near 8.3 there (`still` is about `reserve - 2.4` against a
six second ceiling), so everything said after the fourth column is named has to
fit inside about twenty words. The map's four segments are therefore 40, 33, 33
and 27 words rather than four equal ones, and "how you know" is spoken six
words into the last segment.

A `points` head is a reveal of its own, which is what sizes these beats: a head
plus four rows is five reveals, and five reveals at ten to thirteen seconds is
a fifty second beat. That is also why the cost of an agentic loop is a row of
the `close` rather than a fifth row of `ladder`: `ladder` at six reveals wanted
a hundred and sixty words and the episode was thirty seconds over the wall,
while the close was already going to say that the shape of the question decides
the loop. The fact is said once, in the beat that uses it.

`corpus` is the one panel that does not fit that rule. It is a `bars` with a
head and two rows, so three reveals over about forty five seconds, which is
sparser than the guidance wants. It is kept because the page's claim there is a
gap between two numbers, and a gap is what bars are for; there is no third
measurement on the page to add as a row, and inventing one is not available.

Lit state of the map, decided for every beat rather than left to inherit,
because `focus` is a state and persists until something changes it:

    map         builds with all four columns lit
    question    inherits all four, which is right: the claim is about the board
    pipeline    lights "the pipeline"
    corpus      lights "what you index"
    ladder      lights "who drives it"
    timing      no focus at all. `ladder` already left "who drives it" lit, and
                timing is still that column: it is an architecture question.
                Lighting it again buys nothing and costs about a second of
                panel delay at the head of the beat. A decision, not an
                omission.
    eval        lights "how you know"
    close       lights all four, which is how this vocabulary says no emphasis

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour. That forces four
distinct tones, and `number` on the third column is the weakest fit of the
four. It is chosen over `cost`, which would say on screen that handing
retrieval to the model is a mistake, a verdict the page does not take.

No contract beat, deliberately: an overview's contract is the map itself, built
whole before anything is explained, and `check_structure.py` exempts the format
for exactly that reason. No resources card either, which is a deep dive's
obligation.

The map beat read at prose pace, not inventory pace. It came back at 145 words
a minute against the 95-135 the method budgets for a map, which is the second
episode in this batch to find that. The reason is the syntax rather than the
column count: the measurements behind the slow-map rule are beats that are
lists of bare product names separated by full stops, and this map is four
ordinary sentences with the names inside them. Budget a map beat by how it is
written, not by how many columns it has.

Reading the transcripts as text caught three defects that every gate passed,
all of them under a character error of 0.05:

  - `timing` grew the word "What?" out of nothing, between two complete
    sentences, at 0.012. One invented word is not a burst, so the detector
    cannot see it, and a seed reroll cleared it.
  - `pipeline` had the elided-"that" failure the method describes: "the
    paraphrases keyword matching misses" came back as "Dense vectors catch the
    paraphrases. Keyword matching misses.", which is two sentences and the
    opposite claim. Every word is correct, so no gate can fire and the
    transcript cannot adjudicate it. Written "the paraphrases THAT keyword
    matching misses" it was right first time.
  - `corpus` ended on a bare figure, "thirty eight point seven", and grew "of
    questions" after it. Ending on the word "percent" instead gave the model
    somewhere to land and it was clean. The method already says not to put a
    fragile name at either end of a segment; a bare number at the end behaves
    the same way.

Two accepts, stated rather than hidden. `pipeline` transcribes as "fused on
rank rather than on score. By reciprocal rank fusion, RRF", splitting one long
sentence in two; every word is correct and a reroll forced on a clean take has
no fallback. And `eval` transcribes "recall at k" as "recall it K" at a
character error of 0.002, which is a transcriber rendering an unstressed "at"
rather than a misread name.

`check_references` earned its keep. The `pipeline` beat opened on "what is on
screen is the twenty twenty six production default", spoken 1.5 seconds into a
beat that carries `focus`, and the frame it pulled was empty: `beat()` lights
the parked map before it builds anything. The screen reference is gone from
that line rather than moved.

Leads, which were the expensive part and are the reason five panels grew a row.
`check_leads.py` now reports a `points` item as UNCHECKED rather than passed
when the narration never says its label as a contiguous run, and on this script
that was 23 of 32 reveals. Timed by hand, the first cut had the narrator naming
agentic RAG 12.9 seconds, chunking 8.8 and the reranker 7.1 before their rows
were drawn. Two fixes, in this order:

  - `pipeline` and `ladder` were rewritten so the cumulative word count before
    segment k is at least `(k-1)/(n-1) x (dur - reserve) / dur`. In practice
    that is four segments of about 23 percent and a tail of about 9, not five
    equal ones, and what was wrong in both beats was the head segment: it eats
    a full slice of the drawing budget while carrying a one-line framing
    sentence.
  - Then five panels grew one row each, which is a CPU-only change and the
    fix the arithmetic actually asks for: `pipeline` split the reranker into
    the rerank and its cost, `ladder` gave "the decision moves at run time" its
    own row, `timing` gave the reminder its own row, `eval` gave the triage
    verdict one, and `close` gave the vendor caveat one. Worst lead across the
    episode went from 12.9 seconds to 3.3.

The one remaining lead is 3.3 seconds, on the closing row, and it is an accept:
the panel item's own words ("timing", "ranking") are spoken in the last
sentence, after the row is drawn, and only the sentence that leads into them
starts early.

Pace. `question` came back at 162 words a minute by `check_timing`, the fastest
beat in the episode and the one stating the organising question. Splitting its
three turns into five, every one a complete sentence, and turning its commas
into full stops took it to 153 without cutting a word. The renderer's own
figure ran high on this script, reporting 167 where `check_timing` said 162 and
162 where it said 145, so nothing was rerolled on the renderer's number.

Nothing needed back-porting to the page. Three things were checked for it and
did not qualify: the page expands every acronym the episode says out loud
(RAG, BM25, RRF, HNSW, nDCG, MTEB, ANN), it already glosses chunking as "how a
document is cut into retrievable units", and it already glosses faithfulness
and recall@k in the words the narration uses. LLM is used unexpanded on the
page and the narration simply says "a judge model" and "the model", so no gap
was opened. Terminal-Bench 2.0 is named without a gloss on the page and is
named without one here, because a gloss the page does not carry would be a
claim rather than an explanation.

Delivered: 6 minutes 47.7 seconds, 1080p30, 4.35 MiB, on the third and last
1080p rung of the rate-factor ladder. 149 words a minute overall, fastest beat
157, every still frame between 2.50 and 5.65 seconds, no overlap, no silence
over four seconds, layout audit clean.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: rag-and-retrieval"
SUBTITLE = "a pipeline you build, or a tool the agent calls"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, and how current ----------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of retrieval, and of retrieval augmented generation, "
        "which everybody shortens to R A G."),
    (A, "It covers everything between a user's question and an answer grounded "
        "in your own documents, with citations."),
    (A, "It earns an episode because the story has moved: R A G used to be a "
        "pipeline you built once."),
    (A, "The argument now is whether an agent should just do the retrieving "
        "itself, in a loop."),
    (A, "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Four columns, four reveals, four segments. Sized by the reserve cap rather
# than by taste: reveal four lands at `beat_length - reserve`, the reserve
# cannot go past about 8.3 on a parked beat, so the fourth column is named six
# words into the last segment and only twenty words follow it. The last line
# is the one that has to survive the collapse into headings, so the beat hands
# over on the board rather than on a name.
SCRIPT["map"] = [
    (A, "Whole board first, grouped the way the page groups it, and nothing "
        "explained yet."),
    (A, "Column one is what you index: the corpus, the embeddings over it, an "
        "H N S W index, and a store, usually Postgres with the P G vector "
        "extension."),
    (A, "Column two is the pipeline that answers a query. It starts with "
        "chunking. Hybrid search runs next. R R F fusion merges the two "
        "rankings, and reranking puts the best passages on top."),
    (A, "Column three is who drives it: naive R A G, then advanced, then "
        "agentic. Graph R A G sits on top, and long context argues you may "
        "not need an index at all."),
    (A, "And column four is how you know: recall at k, n D C G at k, "
        "faithfulness, and a golden set. That is the whole board."),
]

# --- the organising question ----------------------------------------------
# A `claim` has two reveals, so twenty five seconds is its honest budget. The
# note lands at `beat_length - reserve`, so the sentence it paraphrases is the
# last thing said rather than the middle of the beat.
SCRIPT["question"] = [
    (B, "So which half of that board am I meant to build?"),
    (A, "That is the question the page is arranged around."),
    (A, "You can build a retrieval pipeline."),
    (A, "You tune every stage of it yourself."),
    (A, "Or you can hand retrieval to the model, as a tool."),
    (A, "Then it works the queries out for itself."),
    (A, "The pipeline first. It is the half with the measurements."),
]

# --- the pipeline, in one beat --------------------------------------------
SCRIPT["pipeline"] = [
    # Segment sizes are the reveal arithmetic, not taste. Five reveals means
    # the cumulative word count before segment k has to be at least
    # (k-1)/4 x (dur - reserve) / dur, so four segments of about 23 percent
    # and a tail of about 9. The first cut ran 9, 44, 30, 25, 31 words and the
    # narrator named chunking 8.8 seconds and the reranker 7.1 seconds before
    # their rows were drawn. No screen reference in the opening line either:
    # a beat carrying `focus` spends a quarter second per row of the parked
    # map before it builds anything.
    (A, "So, the pipeline. Four moves, and this is the twenty twenty six "
        "production default, the stack most teams end up building whether "
        "they meant to or not."),
    (A, "The first move is chunking, how a document gets cut into retrievable "
        "units."),
    (A, "It moves quality more than the embedding model does, because a chunk "
        "that has lost its document context cannot be matched by a query that "
        "assumes it."),
    (A, "Then you search twice."),
    (A, "B M twenty five is a keyword method, and it catches the exact "
        "identifiers and rare names that dense vectors miss."),
    (A, "Dense vectors catch the paraphrases that keyword matching misses."),
    (A, "The two lists are fused on rank rather than on score, by reciprocal "
        "rank fusion, R R F, because the score scales are not comparable."),
    (A, "Then a cross encoder reranks between fifty and a hundred and fifty "
        "candidates."),
    (A, "That costs between thirty and three hundred milliseconds, and it is "
        "the highest leverage thing you can add."),
]

# --- the corpus is the product --------------------------------------------
SCRIPT["corpus"] = [
    (A, "Back to column one, where the page's biggest claim lives."),
    (A, "At the top of the market, the corpus, not the model, is what is being "
        "sold."),
    (A, "The worked case is Astra for Law, which OpenAI shipped in September."),
    (A, "It is one model paired with a proprietary legal index of more than "
        "two hundred and thirty million U R Ls, covering, they claim, more "
        "than ninety nine point nine percent of published United States case "
        "law."),
    (A, "On a legal research benchmark run by Vals A I, that model with the "
        "legal index is correct on fifty four percent of questions."),
    (A, "Fifteen points better than the same model with web search, which "
        "manages thirty eight point seven percent."),
]

# --- the other side of the board ------------------------------------------
SCRIPT["ladder"] = [
    # Same arithmetic. The first cut named agentic RAG 12.9 seconds before its
    # row was drawn, because the three rungs were said in the first forty
    # percent of the beat and the panel spreads five reveals across all of it.
    # The head segment carries the framing now, which is what makes room.
    (A, "Now the other side of the board. This is the half of the page that "
        "has actually moved, and it reads best as a ladder of who decides "
        "what to retrieve."),
    (A, "At the bottom, naive R A G retrieves once, with the raw query. "
        "Whatever comes back goes into the prompt, and nothing looks at it "
        "again."),
    (A, "Advanced R A G wraps that in a fixed graph of query rewriting, "
        "filtering and reranking. You designed the graph yourself, and it "
        "runs the same way on every query that comes in."),
    (A, "Agentic R A G hands retrieval to the model, as a tool it calls "
        "repeatedly, until it judges the context sufficient."),
    (A, "The decision has moved from you, at design time, to the model, at "
        "run time."),
    (A, "And at the far end of the ladder, a million token window absorbs the "
        "small corpus case. That is long context."),
]

# --- the newest result ----------------------------------------------------
SCRIPT["timing"] = [
    (A, "One newer result moves this sideways."),
    (A, "For a long horizon agent, the open variable is not what to retrieve. "
        "It is when."),
    (A, "Meta A I put a second model beside an acting agent."),
    (A, "Its only job is to decide, at each step, whether to remind the agent "
        "of something it already knows."),
    (A, "That took Claude Sonnet four point five on Terminal Bench two to "
        "forty five point nine percent, up from thirty seven point six, with "
        "no retraining of the worker."),
    (B, "Why not remind it at every step?"),
    (A, "Because a reminder eats context, and competes with the live task "
        "state."),
    (A, "Selective beats always. The memory model's job is discrimination, "
        "not ranking."),
]

# --- how you know ---------------------------------------------------------
SCRIPT["eval"] = [
    (A, "Fourth column, and it settles the argument inside your own stack."),
    (A, "Split the system in two and measure each half separately."),
    (A, "On the retrieval half, recall at k dominates, because nothing "
        "downstream can recover an answer that never entered the prompt."),
    (A, "On the generation half, a judge model scores faithfulness, the "
        "fraction of the answer's claims entailed by the retrieved context."),
    (A, "Then triage on one bit. For every wrong answer, was the right chunk "
        "in the prompt?"),
    (A, "That assigns the bug to one half or the other."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So, does the pipeline survive the agent?"),
    (A, "The page says that is the wrong question."),
    (A, "Two things decide it, and neither is the architecture."),
    (A, "The first is the corpus. That is where the fifteen points came from."),
    (A, "A curated corpus of a regulated domain is not reproducible by "
        "scraping."),
    (A, "The second is the shape of the question."),
    (A, "An agentic loop costs three to ten times the latency and the tokens. "
        "It earns that on multi hop work and wastes it on a lookup."),
    (A, "That is a routing decision, not a philosophy."),
    (A, "And the rule the page leads with: a retrieval sensitive number "
        "reported without a named index carries no information at all."),
    (A, "That includes the figures I quoted, which are the vendor's own."),
    (A, "If you are building for long horizon agents, the open variable is not "
        "the ranking. It is the timing."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: the layers of a retrieval stack, each
    # glossed as the question that layer answers. The headings are short
    # because the parked map is four headings in 4.2 units and a long heading
    # scales the strip below what the delivery encode can show.
    #
    # Tones. Subject for what you index, which the episode keeps coming back
    # to and which carries its biggest claim. Machinery for the pipeline,
    # which is literally apparatus. Verified for the evaluation column, whose
    # whole job is knowing something is true. Number for the architecture
    # column, the weakest fit of the four and chosen over `cost`, which would
    # deliver a verdict the page does not take. None is `context`, so every
    # column has somewhere to brighten from when a later beat lights it.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "what you index", "tone": "subject", "items": [
            "the corpus",
            "embeddings",
            "HNSW index",
            "pgvector"]},
        {"head": "the pipeline", "tone": "machinery", "items": [
            "chunking",
            "hybrid search",
            "RRF fusion",
            "reranking"]},
        {"head": "who drives it", "tone": "number", "items": [
            "naive RAG",
            "advanced RAG",
            "agentic RAG",
            "GraphRAG",
            "long context"]},
        {"head": "how you know", "tone": "verified", "items": [
            "recall at k",
            "nDCG at k",
            "faithfulness",
            "golden sets"]},
    ]},

    # The card carries the question's spine; the narration asks it in full, so
    # they share their key words without either reading the other out. No
    # focus: the map was built one beat ago with all four columns lit, which
    # is the state a claim about the whole board wants.
    "question": {"kind": "claim", "reserve": 4.5,
                 "text": "Build the pipeline,\n"
                         "or hand retrieval to the model?",
                 "note": "the pipeline first, because that is the half with "
                         "the measurements"},

    "pipeline": {"kind": "points", "tone": "machinery", "reserve": 5.0,
                 "focus": "the pipeline",
                 "head": "the 2026 production default",
                 "items": [
                     "chunking moves quality most",
                     "BM25 and dense vectors",
                     "RRF fuses on rank, not score",
                     "rerank the top 50-150",
                     "30-300 ms, highest leverage",
                 ]},

    # Two bars, because the page's claim here is a gap between two numbers and
    # a gap is what bars are for. There is no third measurement on the page,
    # so three reveals is what this beat has.
    "corpus": {"kind": "bars", "focus": "what you index",
               "reserve": 5.0,
               "head": "Vals AI Legal Research Bench, one model",
               "bars": [
                   {"label": "with the legal index", "text": "54%",
                    "value": 54, "tone": "verified"},
                   {"label": "with web search", "text": "38.7%",
                    "value": 38.7, "tone": "context"},
               ]},

    "ladder": {"kind": "points", "tone": "number", "reserve": 5.0,
               "focus": "who drives it",
               "head": "who decides what to retrieve",
               "items": [
                   "naive: one query, one shot",
                   "advanced: a fixed graph",
                   "agentic: the model decides",
                   "the decision moves at run time",
                   "long context: no index at all",
               ]},

    "timing": {"kind": "points", "tone": "verified", "reserve": 5.0,
               "head": "when to retrieve, not what",
               "items": [
                   "a second model decides when",
                   "45.9%, up from 37.6%",
                   "a reminder costs context",
                   "selective beats always",
               ]},

    "eval": {"kind": "points", "tone": "verified", "reserve": 5.0,
             "focus": "how you know",
             "head": "measure the two halves",
             "items": [
                 "recall at k dominates",
                 "faithfulness, from a judge",
                 "one bit: was it in the prompt?",
                 "it assigns the bug to one half",
             ]},

    # Lighting every column is how this vocabulary says no emphasis, and it is
    # also true: the close is about the whole board. Five reveals and a small
    # reserve, because a closing `claim` draws one card and then holds it for
    # the length of the take.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.0,
              "focus": ["what you index", "the pipeline", "who drives it",
                        "how you know"],
              "head": "what the map is for",
              "items": [
                  "the corpus decides more",
                  "a loop costs 3-10x",
                  "a number needs a named index",
                  "these figures are the vendor's",
                  "timing, not ranking",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {words} words ({b_turns} for B), "
          f"about {words * 0.40:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:10s} {len(turns)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
