"""
Topic overview: databases, as of 22 September 2026.

Source: the canonical Notion page "Topic: databases", read from Notion
directly on 22 September 2026 rather than from the repo mirror. Every system
name, figure and caveat below is on that page. Nothing is imported from the
two deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A comparison, not a mental model. The page is
a field of engines that do the same job differently, so the map is the field,
the organising question is what separates them, and the convergence beat is
the thirty seconds a reader of the page skims and a practitioner needs.

The axis, which is most of the work of a new overview. The page's own first
paragraph hands it over: a database is three stacked choices, a data model, a
storage engine and a distribution story, and "most product categories are the
top layer plus one specialised index rather than a genuinely new kind of
system". So the inventory is families grouped by workload, the question is
which physical trade each family took, and the payoff is that the families
are converging. The cut of this episode cleared in 74326b3 found the same
axis independently and it is kept. What is not kept is that cut's second
half: four of its eleven beats were caching, and all their figures (320 KB of
KV cache per token, the 0.99 and 0.75 similarity thresholds, cost-weighted
hit ratio) come from the deep dive "Caching: types, policies, and semantic
caching", not from this page. An overview may not out-claim the page it
derives from, and the inventory's source is the page. That is a whole second
episode, and it has its own page to be made from.

The outline that survived the revision step:

    ident        what this is, the page's own outcome-first line, the date
    map          four columns by workload, built whole, parked as the home
                 frame
    question     the three stacked choices, and the trade that follows from
                 them
    split        the master trade: OLTP against OLAP, rows against columns
    vector       the specialised-index column, and the one threshold a
                 practitioner actually needs
    convergence  what they are all doing the same way, which is the page's
                 real thesis
    planner      the page's one measured result, late and attributed
    close        the take: the five questions in order, and the one-way door

What the critique step changed:

  - Draft one gave B-tree against LSM-tree a beat of its own, next to rows
    against columns. Two beats on the storage engine in a six-minute
    overview, when the page itself says of that trade "Fully covered in the
    deep dive" and hands index families and query planning to the same place.
    It is now a closing clause inside `split`, with the handoff said out
    loud. That bought the convergence beat.
  - Draft one had a `choose` beat for the page's five questions and a
    separate `close`. They are the same beat: "what is the map for" is
    answered by the order you ask the questions in, so the take IS the
    chooser. Merged, which bought the planner beat back.
  - The map beat named its fourth column about eight seconds before `spread`
    drew it. Rather than reach for a bigger reserve, which on a parked beat
    is precisely the motionless tail and is capped at six, B's turn and A's
    answer moved to sit between column two and column three. The naming then
    lands where the drawing already is. Move the words, not the reserve.
  - `question` opened on "look at the stack on the right" in its second line,
    about eight seconds in, with one layer of three drawn. The screen
    reference moved to "those three, in that order", which is spoken after
    the third layer has landed.
  - `planner` originally ran mechanism, number, caveat. A `stat` has exactly
    two reveals, so its note cannot be drawn later than about half the beat
    whatever the reserve is, and the caveat was on screen long before it was
    spoken. The order is now number, caveat, mechanism, which is also the
    better order: qualify the figure, then explain it.
  - B agreed with A in draft one. B now interrupts three times: to notice
    that the same names appear in more than one column, which is the
    convergence arriving early; to ask what happens above the pgvector
    threshold; and to catch "best of three" before A can wave it past.
  - A trim pass turned commas into full stops rather than cutting words,
    which is the lever that actually works on pace.

Every `reserve` here was computed from `out/timing_topic_databases_overview.json`
after the voice existed, using reveal k of n landing at (k-1)/(n-1) of
`beat_length - reserve`, not guessed.

Lit state of the map, decided for every beat rather than left to inherit.
`question` inherits the fully lit map the build leaves behind, which is the
state it wants. `split` lights `analytical`, because the whole beat is the
column store half of a trade. `vector` lights `specialised index`.
`convergence` lights all four, which is how this vocabulary says no emphasis,
and is also true: the convergence is a claim about the whole board. `planner`
and `close` inherit that neutral state, deliberately, because a redundant
focus redraws an identical frame and costs about a second of panel delay.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the take points at the page, and the page carries DDIA, Database
Internals, CMU 15-445, Use The Index Luke and the Jepsen analyses.

What was cut from a 4,984-word page, so the next person can see the second
and third episodes sitting there rather than rediscover them:

  - Distributed SQL and NewSQL as a family. CockroachDB, TiDB, Yugabyte,
    Spanner, and Vitess as the different trick. Named nowhere on the map,
    because it is the answer to a question ("Postgres is genuinely
    exhausted") that almost nobody watching has yet earned the right to ask,
    and the page says so itself.
  - Transactions and isolation. Read committed against snapshot against
    serialisable, write skew, `SELECT ... FOR UPDATE`. The single most
    useful section on the page for somebody already running Postgres, and it
    is an anomaly-by-anomaly walk, which is a deep dive rather than five
    seconds of a map tour. This is the omission that hurts most.
  - CAP and PACELC. The page hands the systems-design treatment to
    Topic: systems-design already, and "the else branch is the one you live
    in" does not survive being said quickly.
  - Replication against partitioning as separate ideas. Survives only as the
    shard key in the take, which is the part that is irreversible.
  - The whole twelve-row comparison table, and the fourteen-line quick
    chooser. Both are reference material that reads off a page far better
    than it plays, and reading either aloud is the undifferentiated-list
    failure.
  - The ML data path paragraph: Kafka, Redis, ClickHouse, object storage and
    who holds what. Feature stores survive as one clause in `convergence`
    because "a naming convention over two databases" is an argument; the
    rest is an assignment table.
  - The DuckLabs acquisition, August 2026, and why the recommendation is
    unaffected. A good story about foundations and intellectual property,
    and not a database story.

The second episode this page obviously holds is transactions and isolation
levels, as a deep dive: name the anomaly, then pick the level. The third is
already written on its own page, the caching one, which the cleared cut tried
to bolt onto the end of this.

Two things this episode says that the page did not, and which were
back-ported to Notion in the same session, because the page is the thing that
lasts: that the categories are actively converging rather than merely
overlapping (the page holds every piece of evidence, InfluxDB v3 on Parquet,
ClickHouse beating dedicated time-series stores, Elasticsearch adding dense
vectors, feature stores being two databases, and never states the pattern),
and that the shard key and the partition key are the only choices here you
cannot walk back, which the page says twice in two places and never adds up.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, and A does something different after each

Names are spelled the way they should be said. Text to speech reads
"pgvector", "Neo4j", "SQLite", "1.81x" and "p99" badly, so every one of them
is spaced out or written as words on the spoken line.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: databases"
SUBTITLE = "three stacked choices, and the trade every engine made"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of databases. Where your data sits, what it costs to "
        "ask it a question, and why there are a dozen kinds of answer. "
        "Current as of the twenty second of September, twenty twenty six."),
    (A, "Outcome first, because the page leads with it. For almost everything "
        "you build, Postgres is the correct default. Parquet on object "
        "storage is the analytics layer. Redis is the cache. Everything else "
        "here is an escape hatch you take when a measured workload proves the "
        "default wrong."),
]

# -- the inventory, named before anything is explained ---------------------
# Four columns, four reveals, over about fifty five seconds. B's turn sits
# between column two and column three deliberately: it is what pushes the
# naming of the last two columns late enough to meet the drawing.
SCRIPT["map"] = [
    (A, "Here is the whole board, grouped the way the page groups it."),
    (A, "Operational stores first. Relational, Postgres and MySQL. Document, "
        "MongoDB. Wide column, Cassandra. Key value, Redis and DynamoDB."),
    (A, "Then analytical, for the enormous scanning queries. Columnar is "
        "ClickHouse, BigQuery and Snowflake. The lakehouse is Parquet on S "
        "three, under Iceberg or Delta."),
    (B, "Some of those names turn up in more than one column."),
    (A, "They do. That turns out to be the most useful thing on the board."),
    (A, "Third, the specialised indexes. Vector, P G vector and Qdrant. "
        "Search, Elasticsearch. Time series, Prometheus. Graph, Neo four J."),
    (A, "And fourth, embedded. No server at all, just a library in your "
        "process. S Q Lite, Duck D B, Rocks D B. That is the whole board. It "
        "goes in the corner now."),
]

# -- the organising question, over the stack that answers it ---------------
# Three layers, three reveals, so the beat is held to about forty five
# seconds and each layer is named roughly where `spread` draws it. The
# "top layer plus one index" line sits BEFORE the distribution line for that
# reason: it buys the ten seconds that put the third naming on the third
# reveal.
SCRIPT["question"] = [
    (B, "That is a dozen categories. How is anyone supposed to choose?"),
    (A, "By noticing that almost none of them is a new kind of system. Every "
        "one is three stacked choices, and the first is a data model. How you "
        "say what you mean."),
    (A, "Underneath it sits a storage engine. Rows or columns, B tree or L S "
        "M tree. That is the layer that decides what a query actually costs, "
        "and the storage engines deep dive takes it apart. Most categories on "
        "this map are just that top layer plus one specialised index."),
    (A, "And under both, a distribution story. Replication, partitioning, and "
        "which consistency you are willing to pay for."),
]

# -- the master trade, walked row by row -----------------------------------
SCRIPT["split"] = [
    (A, "So the question is not which product. It is which trade each family "
        "took. First trade, and the page is blunt about it. This split, not "
        "the vendor, decides everything downstream. Watch the analytical "
        "column light up."),
    (A, "Row store against column store. One keeps the whole record together. "
        "The other keeps each column together instead."),
    (A, "So a point lookup is one page read in a row store, and a column trip "
        "in the other."),
    (A, "A big scan is the other way round. A row store reads everything, "
        "asked for or not. A column store reads only what it needs, and "
        "compresses far harder. One to two orders of magnitude on aggregate "
        "scans."),
    (A, "And the price is updates. Cheap in a row store. A rewrite of large "
        "blocks in the other. Which is why analytics belongs on a replica, "
        "not your production primary."),
]

# -- the specialised-index column everybody asks about ---------------------
SCRIPT["vector"] = [
    (A, "Now the column everybody asks about. Vector search is an index type, "
        "not a database category."),
    (A, "Recall is tuned rather than guaranteed, index build is the expensive "
        "operation, and filtered search is where implementations differ."),
    (A, "So P G vector, inside Postgres, is the boring correct default. Your "
        "chunks already need metadata, tenancy, permissions and a delete "
        "path."),
    (A, "One transaction, one backup, no dual write skew. Right below roughly "
        "ten million vectors, that wins."),
    (B, "And above that?"),
    (A, "Past a hundred million, a dedicated store earns it. Qdrant, Milvus, "
        "Vespa, Turbopuffer."),
    (A, "Or when the predicate has to be evaluated during graph traversal. Or "
        "a hard p ninety nine under ten milliseconds. Index arguments, never "
        "data model ones."),
]

# -- what they are all doing the same way ----------------------------------
SCRIPT["convergence"] = [
    (A, "Now the part a reader of this page skims and a practitioner needs. "
        "What they are all doing the same way."),
    (A, "Postgres is absorbing the map. J S O N B gives you documents with "
        "real constraints and joins. P G vector gives you embeddings. "
        "TimescaleDB, PostGIS and full text search are already in there."),
    (A, "And it runs the other way. InfluxDB version three is now a Parquet "
        "engine. ClickHouse frequently beats a dedicated time series database "
        "at its own job. Elasticsearch added dense vectors."),
    (A, "Feature stores turned out to be two databases with a name. And under "
        "the lakehouse, Spark, Trino, Duck D B, ClickHouse and Snowflake all "
        "read the same bytes. One corpus, five engines."),
    (A, "That is the convergence. The same physical trades, arriving from "
        "every direction."),
]

# -- the page's one measured result, late and attributed -------------------
# A `stat` has exactly two reveals: the figure, then the note. The figure is
# immediate, so it is said at once; the note lands at the end of the budget,
# so the caveat is said at the end. That is the opposite of the order a
# previous episode settled on, because `spread` changed underneath it.
SCRIPT["planner"] = [
    (A, "One more thing, published last week, and the page's one measured "
        "result. One point eight one times. That is the number on the "
        "screen. Geometric mean speedup, measured against the choices the "
        "Postgres planner made for itself."),
    # "PostgreSQL" was in this line for one render and came back from the
    # transcriber as "postgres cool". The character gate passed the beat at
    # 0.011 because it is one word in a six hundred character take, and
    # nothing else would ever have shown it: reading the transcript did. The
    # page says PostgreSQL; the narrator says Postgres, which is the same
    # claim and is sayable.
    (A, "Rohan Bansal trained a four billion parameter distillation to write "
        "Postgres query plans, and beat the built in planner on join heavy "
        "analytic queries. A planner picks a join order from cardinality "
        "estimates, and those break on correlated predicates. Oldest known "
        "weakness in the field. A model trained on measured outcomes learns a "
        "correction from data instead."),
    (B, "How was that measured?"),
    (A, "Best of three rollouts. The latency cut was forty four point seven "
        "percent, and not one query came back slower. And they said so "
        "rather than burying it, which is the part to copy."),
]

# -- the take: what the map is for -----------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? Not picking a product. Knowing which trade "
        "you are buying, and in what order to ask."),
    (A, "Access patterns first. Which queries run, how often, at what "
        "latency. Data shape is the wrong start, because nearly any shape "
        "fits nearly any model."),
    (A, "Then invariants. If two rows must change together or not at all, you "
        "want real transactions in one store. That eliminates most of this "
        "board."),
    (A, "Then write volume and its shape. The peak decides it, not the "
        "average. Then how much you know today, because unknown queries "
        "favour a schema you can query new ways for free."),
    (A, "Then the one nobody writes down. Who debugs it at three in the "
        "morning."),
    (A, "And know the one way door. The partition key, and the shard key. "
        "Changing either rewrites every row. Everything else here you can "
        "walk back."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: families grouped by what the workload is,
    # which is how the page's own map section groups them, rather than a list
    # of vendors. Four columns, not three: the page's own diagram has five
    # top-level groups, and collapsing to three would have to fold the
    # specialised indexes into the operational stores, which is the exact
    # claim `vector` spends a beat denying.
    #
    # Four columns costs item width. `panel_columns` derives the pill from the
    # column count and clamps at 2.5 units, so every item here is kept under
    # about sixteen characters and the category name is said rather than
    # drawn. The alternative, category names on screen and systems only in
    # speech, loses the thing an inventory is for: a viewer hearing a name
    # they half know and placing it.
    #
    # Tones. Subject for operational, which is where the default lives and
    # where the take lands. Number for analytical, the measured-scan side of
    # the first trade. Machinery for the specialised indexes, which are
    # literally apparatus bolted onto a store. Verified for embedded, the one
    # group with nothing to argue about. None is toned `context`, so every
    # column has somewhere to brighten from when a later beat lights it.
    "map": {"kind": "columns", "park": True, "reserve": 4.5, "columns": [
        {"head": "operational", "tone": "subject", "items": [
            "Postgres, MySQL",
            "MongoDB",
            "Cassandra",
            "Redis, DynamoDB"]},
        {"head": "analytical", "tone": "number", "items": [
            "ClickHouse",
            "BigQuery",
            "Snowflake",
            "Parquet on S3"]},
        {"head": "specialised index", "tone": "machinery", "items": [
            "pgvector, Qdrant",
            "Elasticsearch",
            "Prometheus",
            "Neo4j"]},
        {"head": "embedded", "tone": "verified", "items": [
            "SQLite",
            "DuckDB",
            "RocksDB"]},
    ]},

    # The answer to the organising question, drawn rather than asserted. A
    # stack because the vertical order IS the argument: the model sits on the
    # engine sits on the distribution story, and the claim that follows is
    # that most categories differ only in the top layer.
    #
    # No focus: the map was built one beat ago with every column lit, which is
    # exactly the state this beat wants.
    "question": {"kind": "stack", "tone": "machinery", "reserve": 3.0,
                 "layers": [
                     ("data model", "how you say what you mean"),
                     ("storage engine", "rows or columns, B-tree or LSM"),
                     ("distribution", "replication, partitioning, consistency"),
                 ]},

    # A table, not a compare, and the reason is timing rather than taste. A
    # `compare` has exactly two reveals, and the last reveal lands at
    # `beat_length - reserve`, so on a fifty-second beat the second side
    # cannot appear until the second side has been spoken about for twenty
    # seconds, unless the reserve is set to twenty, which is precisely a
    # twenty second still frame and fails `check_timing`. A table reveals its
    # header and then one row per reveal, so five reveals walk a fifty second
    # beat at ten seconds each, and the narration can walk with them. The grid
    # is also genuinely the content here: two engines against four properties.
    #
    # Cells are kept short because the free region beside a parked map is
    # about 7.8 units and three text columns have to share it.
    "split": {"kind": "table", "focus": "analytical", "reserve": 4.0,
              "head": ["", "row store", "column store"],
              "rows": [
                  ["kept together", "the whole record", "each column"],
                  ["point lookup", "one page read", "a column trip"],
                  ["a big scan", "reads everything", "only what it needs"],
                  ["updates", "cheap", "rewrites blocks"],
              ]},

    # Also not a compare, for the same arithmetic: this beat spends thirty
    # seconds on the default and fifteen on the escape hatch, and a two-reveal
    # panel cannot draw a second side that late without a fifteen second dead
    # frame. Seven reveals over forty five seconds is one every six or seven,
    # which is what the narration actually does: it walks a single decision
    # from "what kind of thing is this" down to the threshold.
    "vector": {"kind": "points", "tone": "machinery",
               "focus": "specialised index", "reserve": 3.0,
               "head": "vector search, in one decision",
               "items": [
                   "an index type, not a category",
                   "recall tuned, not guaranteed",
                   "chunks need metadata, tenancy",
                   "below ~10M: pgvector wins",
                   "past ~100M: a dedicated store",
                   "or a hard p99 under 10 ms",
               ]},

    # The page's real thesis, and the most valuable thirty seconds in the
    # video. Six items rather than three, and that is arithmetic rather than
    # taste: `spread` puts the last reveal at the end of the budget, so a
    # three-reveal beat over fifty seconds leaves the viewer looking at a
    # finished card for a third of it.
    #
    # The heading renders in the subject colour whatever the tone says, which
    # is a known limitation of this panel kind and is harmless here.
    "convergence": {"kind": "points", "tone": "verified", "reserve": 5.0,
                    "focus": ["operational", "analytical",
                              "specialised index", "embedded"],
                    "head": "the same trades, from every direction",
                    "items": [
                        "JSONB: documents in Postgres",
                        "pgvector: embeddings",
                        "TimescaleDB, PostGIS, FTS",
                        "InfluxDB v3 is Parquet now",
                        "ClickHouse beats time-series",
                        "one corpus, five engines",
                    ]},

    # The number, alone and large, late in the episode and attributed out
    # loud. The note carries the qualification rather than leaving it to the
    # narration: a caveat that is only spoken is a caveat the person
    # screenshotting the frame does not get.
    #
    # No focus: `convergence` lit all four columns, which is how this
    # vocabulary says no emphasis, and that is the state this beat wants. A
    # redundant focus redraws an identical frame and costs a second of delay.
    "planner": {"kind": "stat", "reserve": 5.0, "big": "1.81x",
                "caption": "geometric mean speedup over the Postgres planner",
                "note": "best-of-three, 44.7% latency cut, zero regressions"},

    # The take, as the thing a viewer can use tomorrow: the page's five
    # questions in the order it asks them, then the irreversible one. One tone
    # throughout, because colouring any of these as a cost would deliver a
    # verdict the page does not; it gives an ordering, not a condemnation.
    "close": {"kind": "points", "tone": "subject", "reserve": 2.0,
              "head": "in this order",
              "items": [
                  "access patterns, not shape",
                  "invariants across rows",
                  "write volume and its shape",
                  "how much you know today",
                  "who debugs it at 3am",
                  "the partition key is one-way",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 147.5 + len(SCRIPT) * 3 / 60:.2f} minutes")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:13s} {w:3d} words  ~{w / 150 * 60:4.0f}s")
