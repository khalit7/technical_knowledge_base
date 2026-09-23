"""
Topic overview: SWE and system design, as of 22 September 2026.

Source: the canonical Notion page "Topic: swe-and-system-design", read from
Notion directly on 23 September 2026, not from the repo mirror (they agree,
and the mirror was diffed against the fetch before a word was written). Every
name, number and claim below is on that page: its three-pillar opening, its
mermaid map, "The map, briefly", "What the named ideas actually are", "How
they compose for an ML engineer", the "Also under this topic" paragraph and
the topic-wide resource list. Nothing is imported from the five child pages.

Which kind of overview this is. A mental model, not a comparison. Nothing on
this page competes with anything else on it: it is one subject with three
parts that compose in one direction, and the page says so in its own first
paragraph. So the organising question is the one the method gives that kind
of overview, what seeing the whole board at once lets you say that a list of
names cannot.

The axis, and the problem the axis has to solve. This is the one topic in
the knowledge base where every single box has a famous book behind it:
Kleppmann for distributed systems, OSTEP for the operating system, the SRE
book for operations, Huyen for the ML serving layer. A video that toured the
boxes would be a worse version of four books. What the page has that the
books do not is exactly two things, and they are the episode:

  - the direction of dependency, which the page states outright: "the
    fundamentals bound what a design can promise, the design shapes what code
    you write, and the craft determines whether the whole thing survives
    contact with production";
  - the four places a model breaks the ordinary answer, which is the whole
    content of the page's ML-layer paragraph: expensive long-lived requests,
    capacity quantised in GPUs rather than fluid vCPUs, nondeterministic
    outputs so correctness is statistical, and cost per request high enough
    that caching, routing and quota design dominate the architecture.

So the beats that earn their place are the ones where an ML service bends
ordinary engineering, and everything the page is honestly just pointing at
(CAP, consistency models, the database taxonomy, DDIA) is left as a pointer.

A previous cut exists in git history and was read at the outline, before the
inventory axis was chosen. Cleared in 74326b3. Three things are kept from it
because they are right and they are the page's own: the three-pillar map
built bottom-up in the dependency order, the CRUD-versus-model-service
contrast as the organising question, and the ten-thousand-tenant walk as the
beat where the three pillars visibly compose. Four things are not:

  - Its penultimate beat was code review, and every fact in it (review the
    tests first, small PRs, LLM-authored code raising the review bar) came
    from the child deep dive "API and Code Design", not from this page. Its
    own docstring said so. The method is explicit that a figure living only
    on a page below does not belong in the overview, so the beat is gone,
    and with it the close that was built on it.
  - It used `compare` with four items a side for the CRUD contrast. That
    panel has two reveals however much it carries, so a forty-odd second beat
    on it is twenty seconds of still frame. A `table` with a head row and
    four rows is five reveals of the same material.
  - It used a three-column `columns` panel for the three kinds of test, and
    so did this one until the lead arithmetic killed it. Three reveals means
    the second kind has to be named at forty-five percent of the beat's words
    and the third at ninety, which leaves model behaviour, the one that
    actually breaks, with the last ten words of the beat. `points` with five
    reveals says the same thing in the order the argument wants.
  - It used a four-step `flow` for the walk. Beside a parked map the free
    region is about 7.8 units and four steps plus their arrows want about
    eighteen, which renders as unreadable coloured blocks and passes the
    layout audit cleanly. `points` here.
  - It spent a whole beat on OSTEP and another on the four bottlenecks. They
    are one idea, "what the fundamentals are for", and OSTEP is its payoff:
    the beat is one six-reveal `points` panel that ends on the mapping onto
    GPU serving. That is a beat saved, which is most of the length margin.

What the critique step changed:

  - Draft one opened the question beat on "most of this is just software
    engineering, why is it in an ML knowledge base". That is a real question
    and it is answered by the previous beat, so it was dead weight. The
    question is now the sharper one the page implies but never asks: every
    box here has a better book, so what is the board itself for?
  - Draft one's close listed the four differences again. A recap is the
    banned ending. It now closes on the two directions the dependency order
    is used in and on the gap the page names against Andrew Ng's list, which
    tells a viewer whether this map is theirs at all.
  - B was decorative in draft one, three turns of agreement. B now does the
    three things B is for: asks what is left once cost is accounted for,
    names the test that actually breaks, and pushes on whether the board is
    a reading list. A fourth turn, three words, carries the second half of
    the organising question.
  - Draft one had the close assert "four hundred pages each" about the books
    it names. No such figure is on the page. Cut: a number that cannot be
    traced back does not go in, and a video may add explanation but never a
    figure of its own.

Length. Eight beats, thirty-two reveals, 1,009 words as shipped, planned at
0.42 seconds a word (the top of the measured range, because planning short costs nothing
and planning long drops the episode to 720p). The `fundamentals` beat carries
six reveals and is deliberately the longest: six reveals is a sixty-five
second beat and the episode has room for exactly one.

Length took three passes and every one of them was arithmetic rather than
taste. The first draft ran 1,153 words, because sizing eight beats by their
reveal counts and sizing the episode by its minutes give answers forty
percent apart, exactly as the method warns. What reconciled them was cutting
where it is free: trimming a beat AFTER its last reveal is named lowers every
lead in that beat, while trimming before one raises the leads that follow, so
the passes took words out of tails and out of the two beats whose leads had
the most slack. It delivered at 6:46 for 1,009 words, which is 0.402 seconds
a word, the series median: planning at 0.42 over-predicted by eighteen
seconds, in the direction that costs nothing.

Reserves were placeholders until the voice existed and are now fitted to the
rendered durations: for each beat, the smallest reserve that keeps every
reveal within two seconds of the words that name it. `map` is the exception:
a parked beat spends
two seconds of settle and a 0.7 second morph out of the FRONT of its reserve,
so anything under about 2.7 leaves the finished board no motionless time at
all, which is the one thing this format exists to give the viewer. Its fit
asked for 4.9 and it carries 6.5, which buys four seconds of finished board
and, because a bigger reserve draws the columns earlier, smaller leads too.

Focus states. The map is lit column by column as each pillar is discussed,
whole for the walk (a focus naming every label is how this vocabulary says
"no emphasis"), and `close` carries no focus at all: the walk already left
the board lit whole, and a redundant focus buys nothing while costing about
a second of panel delay at the head of the beat. That is a decision, not an
omission.

What reading the transcripts caught, all of it after every gate had passed:

  - `testing` silently dropped "Model behaviour" from the front of A's turn,
    at a character error of 0.021. That is the deletion failure this method
    names: a name at the head of a segment is absorbed into the sentence
    before it, and what is left is grammatical, so nothing fires. Recast as
    "It is model behaviour, and it takes two kinds of test", it read
    correctly and the beat came back slower as well, 140 words a minute
    against 154.
  - `walk` said "One seventy billion parameter replica" and the transcriber
    wrote "170 billion", which is what an ear gets too. The page says one
    70B replica. "A single seventy billion parameter replica" is
    unambiguous. The same beat's "the page's own worked example" came back
    as "PageZone", the possessive failure, and is now "the worked example
    the page gives".
  - `testing` said "Regression evals" and the transcriber heard "Regression
    of vowels". The page's own words, regression suites, are not ambiguous.
  - `question` ended on the bare word "four" and came back as "the page
    name's for". Ending on "four of them" fixes it for the transcriber and
    for the listener. The same beat's "Chip Huyen" arrived as "Chip Rien"
    until the name got a category phrase behind it, "Chip Huyen's A I
    Engineering", which is this method's rule for a name the model cannot
    spell.
  - `close` came back at 177 words a minute, well past the gate. Not one
    word was cut: the same text split from five turns into nine, every one
    a complete sentence, read at 150.

One screen reference is a judged accept rather than a fix. The map beat says
"these three depend on each other in one direction" four seconds in, with one
column drawn. It is anaphoric to the opening, which has just named the three
pillars, rather than deictic to the frame, and the alternative was rerolling
a take that transcribed at a character error of 0.000. Recorded here so the
next person can see it was decided.

Back-ported to the Notion page in the same session: the dependency order runs
in both directions, so the layer below the one you are looking at is where a
misbehaving service is usually explained. The page had it as an interview
habit only. The video may add explanation but not claims, and that one was
doing enough work in the close to have to exist on the page first.

Deliberate omissions, so the next person can see they were decisions. CAP,
consistency models, delivery semantics, leader election and the database
taxonomy are named on the map as "distributed systems" and never opened:
they are the page pointing at DDIA, and a video of them would be a worse
DDIA. The interview structure is one clause in the walk rather than a beat.
API design keeps one pill on the map and one clause in the walk, because its
substance (versioning, pagination, errors, webhooks) is all on the child
page. The five topic-wide resources are named where they do work in the
question beat rather than listed at the end: an overview owes no resources
card, only a deep dive does.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: swe-and-system-design"
SUBTITLE = "where a model bends ordinary engineering"
UPDATED = "22 September 2026"

# Colour semantics, fixed once for the episode and then kept:
#   machinery  the systems fundamentals, the substrate nobody writes
#   subject    system design, which is what the episode is arguing about
#   verified   software craft, which is what keeps the answer true
#   number     a measured quantity
# Every later panel takes the colour of the pillar it belongs to.

VISUALS = {
    "ident": {"kind": "title"},

    # Three columns, bottom-up in the page's own dependency order, because
    # that order is the argument: fundamentals bound design bounds craft.
    #
    # Three columns on the map beat is a 22 character pill; every item here
    # is at or under it. They shrink to 15 once the map is parked, but what
    # parking leaves on screen is the three headings and nothing else, so
    # the pill budget that matters is the map beat's own.
    "map": {"kind": "columns", "park": True, "reserve": 6.5, "columns": [
        {"head": "systems fundamentals", "tone": "machinery", "items": [
            "OSTEP for the OS",
            "networking",
            "databases"]},
        {"head": "system design", "tone": "subject", "items": [
            "distributed systems",
            "the ML serving layer",
            "the interview"]},
        {"head": "software craft", "tone": "verified", "items": [
            "testing",
            "API design",
            "code review"]},
    ]},

    # A stack, because the order is the argument: what the board looks like
    # from outside, what it is actually for, and the part of it that exists
    # nowhere else. Every label is a phrase the narration says verbatim, in
    # its own segment, because the lead check can only time a reveal whose
    # label appears as a contiguous run.
    "question": {"kind": "stack", "reserve": 2.8, "tone": "subject", "layers": [
        ("a better book exists", "for almost every box"),
        ("the direction of dependency", "what bounds what"),
        ("where a model bends it", "the four the page names"),
    ]},

    # The four differences, as a grid, because the grid is the content: the
    # same four questions asked of two kinds of service. The corner cell is
    # deliberately not blank; an empty corner slides the whole header one
    # column left, silently, and the layout audit passes it.
    "serving": {"kind": "table", "tone": "subject", "reserve": 4.0,
                "focus": "system design",
                "head": ["what changes", "a CRUD service", "a model service"],
                "rows": [
                    ["requests", "short and cheap", "seconds of GPU time"],
                    ["capacity", "fluid virtual CPUs", "whole GPUs"],
                    ["correctness", "binary", "statistical"],
                    ["cost per call", "a later optimisation", "picks the design"],
                ]},

    # Six reveals, deliberately, and the only beat in the episode with more
    # than five: the four bottlenecks the page says you are expected to be
    # able to name, and then the OSTEP mapping as the payoff rather than as
    # a beat of its own. Ten to thirteen seconds a reveal makes this a
    # sixty-five second beat, which is why nothing else here runs long.
    "fundamentals": {"kind": "points", "tone": "machinery", "reserve": 5.0,
                     "focus": "systems fundamentals",
                     "head": "naming the bottleneck", "items": [
                         "fsync latency, a millisecond",
                         "TCP slow start",
                         "the page cache",
                         "GPU memory bandwidth",
                         "OSTEP, one layer down"]},

    # The craft pillar. This was a three-column `columns` panel until the
    # lead arithmetic killed it: three columns is three reveals, so the
    # second kind of test has to be named at forty-five percent of the beat's
    # words and the third at ninety, which leaves the most important of the
    # three with the last ten words of the beat. Five reveals puts the payoff
    # ("no assertion, only regression") on a row of its own, where the
    # sentence that carries it has somewhere to land.
    #
    # One tone for all five, because a `points` panel takes one: the page
    # takes no position that any of the three kinds of test is a mistake, and
    # a cost tone here would say on screen that one of them is.
    "testing": {"kind": "points", "tone": "verified", "reserve": 4.9,
                "focus": "software craft",
                "head": "three separate things", "items": [
                    "code: deterministic",
                    "data: schema and drift",
                    "model behaviour",
                    "no assertion, only regression"]},

    # The worked example, which is where the three pillars visibly compose.
    # `points` rather than `flow`: four flow steps and their arrows want
    # about eighteen units in the 7.8 that are free beside a parked map.
    #
    # It lights all three columns, which against a parked map is how this
    # vocabulary says "no emphasis": the beat is about the whole board.
    "walk": {"kind": "points", "tone": "machinery", "reserve": 4.0,
             "focus": ["systems fundamentals", "system design",
                       "software craft"],
             "head": "ten thousand tenants", "items": [
                 "the physics bounds it",
                 "the traffic: queues and keys",
                 "the model: routing and caching",
                 "the craft keeps it alive",
                 "the ML system design interview"]},

    # Four reveals on the take, not one card. Measured across this series,
    # every closing beat that draws a single claim then holds it sits
    # motionless for fifteen to thirty seconds while the narrator finishes.
    "close": {"kind": "points", "tone": "subject", "reserve": 5.2,
              "head": "what the board is for", "items": [
                  "justify up, debug down",
                  "the model bends four answers",
                  "front end and app security"]},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is, what it actually is, why it earns the time, and the
    #    context the first real beat needs.
    "ident": [
        (A, "This is the software engineering and system design map: the "
            "engineering substrate under every machine learning service. "
            "Three pillars. Systems fundamentals, system design, and software "
            "craft. Current as of the twenty second of September, twenty "
            "twenty six."),
        (A, "It is also the one page here where almost every box has a famous "
            "book behind it. So the question is what the board tells you "
            "that the books do not."),
    ],

    # 2. the inventory. Three segments, one per column, each naming its column
    #    as that column is drawn, and a tail short enough to fit the reserve.
    "map": [
        (A, "The whole board first, nothing explained yet, built from the "
            "bottom because these three depend on each other in one "
            "direction. Underneath, the systems fundamentals: O STEP for the "
            "O S, networking, databases."),
        (A, "Above them sits system design, which is two layers rather than "
            "one. Distributed systems in general, then the M L serving layer "
            "on top, and the interview that walks both."),
        (A, "The third pillar is software craft: testing, A P I design, code "
            "review. The whole board goes in the corner now."),
    ],

    # 3. the organising question. Three segments, one per layer of the stack.
    "question": [
        (A, "Here is the awkward thing about this topic. For almost every "
            "box on that board, a better book exists already. Kleppmann on "
            "the distributed layer, Chip Huyen's A I Engineering on the model "
            "half, Google's S R E book on running any of it."),
        (A, "So what is the board itself for? Two things, and the first is "
            "the direction of dependency: what bounds what. Fundamentals "
            "bound what a design may promise, the design shapes the code, the "
            "craft decides whether it survives."),
        (B, "And the second?"),
        (A, "The second is where a model bends it, and the page names four of "
            "them."),
    ],

    # 4. the four differences. The head row is a free reveal at the top of the
    #    beat, then one segment per row, each naming its row as it is drawn.
    #    The cost row is named at the very end of its segment, because
    #    everything after the last reveal has to fit inside the reserve.
    "serving": [
        (A, "So, what changes when the thing behind the endpoint is a model? "
            "Put an ordinary C R U D service, the kind that reads and writes "
            "rows, beside one with a model behind it."),
        (A, "Requests first. A C R U D request is short and cheap, a few "
            "milliseconds of a processor. A model request is seconds of G P U "
            "time, streamed a token at a time."),
        (A, "Then capacity. You scale a web service on fluid virtual C P Us, "
            "a few percent more whenever you want. Model capacity arrives in "
            "whole G P Us, and there is no tenth of one."),
        (A, "Correctness is third. A query is binary, right or wrong. A "
            "generated answer is statistical, so what you promise is a "
            "distribution."),
        (B, "Which leaves cost, usually somebody else's problem."),
        (A, "Not here. Caching, routing and quotas decide the whole shape. "
            "Cost per call is not a later optimisation, it picks the "
            "design."),
    ],

    # 5. what the fundamentals are for, and the OSTEP mapping as the payoff.
    #    Six reveals: the head, four bottlenecks, and the mapping. The head
    #    segment is deliberately the longest, because `spread` gives the head
    #    an equal slice of time and a short opening segment is where the
    #    narrator gets ahead of the picture.
    "fundamentals": [
        (A, "Down a layer now, to the fundamentals, because the page is blunt "
            "about what they are for. They are not background reading you get "
            "to eventually. They are how you defend a design choice: by "
            "naming the bottleneck rather than by pattern matching."),
        (A, "Four are worth saying out loud. F sync latency, a millisecond, "
            "is what a durable write costs when it must reach stable storage. "
            "It caps what one transaction can write."),
        (A, "T C P slow start is the congestion window ramping up on every "
            "new connection. That is why short lived connections underuse the "
            "link."),
        (A, "The page cache is the operating system holding recent file pages "
            "in memory. That is why a disk read is often free, and why memory "
            "pressure looks like unexplained I O."),
        (A, "And G P U memory bandwidth caps decode throughput, because "
            "generating one token reads the whole weight set once. Memory "
            "bound, not compute bound."),
        (A, "Which is why an operating systems textbook sits on a machine "
            "learning page. O STEP, one layer down: paging becomes K V cache "
            "blocks, scheduling becomes continuous batching."),
    ],

    # 6. the craft pillar. Five segments, one per reveal.
    "testing": [
        (A, "Over to the craft pillar. Testing a machine learning system is "
            "three separate things, and only one of them behaves like "
            "software you have tested before."),
        (A, "That one is the code: deterministic, unit tested, and property "
            "based when the examples you thought of run out. It is also the "
            "part that breaks least."),
        (A, "The second is not about code at all, and no unit test catches "
            "it. The data: schema and drift. Schema checks say the shape is "
            "what you promised, drift checks say the contents have not "
            "moved."),
        (B, "And the third is the one that actually breaks."),
        (A, "It is model behaviour, and it takes two kinds of test. "
            "Regression suites against the last checkpoint, contract tests on "
            "the outputs, both running in the pipeline rather than by hand."),
        (A, "Because there is no assertion, only regression: nothing says a "
            "generated answer is correct, only that it still behaves."),
    ],

    # 7. the worked example, where the three pillars visibly compose. The head
    #    is free at the top of the beat, then one segment per step.
    "walk": [
        (A, "Here is how the three pillars compose, on the worked example the "
            "page gives. Serve an L L M feature to ten thousand tenants."),
        (A, "The physics bounds it. A single seventy billion parameter replica "
            "needs so many G P Us, holds so many concurrent K V caches, and "
            "cold starts in minutes."),
        (A, "Then the traffic: queues and keys. A gateway in front, a queue "
            "with backpressure, and idempotency keys so that a retry is not a "
            "second charge."),
        (A, "Then the model: routing and caching. Route across model tiers, "
            "cache semantically and by prefix, and keep a degradation ladder "
            "for when the pool saturates."),
        (A, "And the craft keeps it alive: contract tests on the outputs, A P "
            "I versioning so a tenant survives the model swap."),
        (A, "Which is worth one more sentence, because that walk is also, "
            "almost word for word, the M L system design interview."),
    ],

    # 8. the take. Four reveals, because a take that draws one card and holds
    #    it sits motionless for the half minute it takes to say.
    "close": [
        (B, "So is this a reading list?"),
        (A, "It is not, and that is what the board is for."),
        (A, "Forty four hours of resources hang off this page. Reading them "
            "in order teaches you the wrong thing."),
        (A, "It is an order of dependency, and it runs both ways: justify up, "
            "debug down."),
        (A, "You defend a design by naming the layer below it. When it "
            "misbehaves, you look at that same layer."),
        (A, "The part that is in none of those books is where the model bends "
            "four answers."),
        (A, "That is the part of this page worth a second pass."),
        (A, "One honest gap, which the page names itself, against Andrew Ng's "
            "list of software fundamentals."),
        (A, "Front end and app security are not here. If that is the job, "
            "this is not your map."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words * 0.42 / 60:.1f} minutes at 0.42 seconds a word")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:16s} {len(beat)} turns  {w:3d} words  ~{w * 0.42:4.0f}s")
