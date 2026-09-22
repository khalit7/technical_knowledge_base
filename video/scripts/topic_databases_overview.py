"""
Topic overview: databases, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: a database is not a
product you pick, it is three stacked choices (a data model, a storage engine,
a distribution story), and almost every category on the map is the top layer
plus one specialised index. So the inventory is families rather than vendors,
and the organising question is which physical trade each family took. That is
the axis, and getting it right was most of the work: a list of twelve products
read aloud would be a catalogue, not an episode.

The outline that survived the revision step:

    ident       what this is, plus the page's own outcome-first line
    map         the families, built and parked: operational, analytical,
                specialised index, embedded
    question    the three stacked choices, and the trade that follows
    rows_cols   trade one: row store against column store
    btree_lsm   trade two: B-tree against LSM-tree
    planner     what an index buys, how the planner gets it wrong, and the
                1.81x learned-plan result
    vector      vector search is an index type, not a category
    cache_ladder the caching order, cheapest and safest first
    kv_cache    the KV cache number, because it caps batch size
    semantic    the one cache with a false-positive rate
    close       the take: which trades are one-way doors, and the metric

What the step-4 critique changed:

  - Draft one had a separate "what an index is" beat and a separate planner
    beat. They are one story (an index turns a scan into a lookup, and the
    planner decides whether to use it from estimates that are wrong), so they
    merged.
  - Draft one also stated the organising question over a claim card and then
    drew the three stacked choices in a beat of its own. The stack IS the
    answer to the question, so the card went and the question is now spoken
    over the stack that justifies it. That took the episode under seven
    minutes, which is where a topic overview belongs.
  - Draft one stopped the caching section at Redis, which is the page's
    boring half. The deep half is the three LLM caches, so the ladder, the KV
    number and the semantic threshold curve all stayed and the Redis sentence
    shrank to a clause.
  - The Join Order Benchmark size (113 queries) and the training set size
    (13.6k) were both in draft one. Only one of them does work in speech, so
    the training set went.
  - B was agreeing in draft one. B now interrupts four times: once to ask how
    anyone chooses, once to name what the LSM trade is borrowed from, once to
    catch "best of three", and once to read the accuracy column of the chart
    that A is about to over-claim from.

Everything traces to the canonical page "Topic: databases". The caching
figures (320 KB per token, the 0.99 and 0.75 thresholds, cost-weighted hit
ratio) come from that page's own deep dive, "Caching: types, policies, and
semantic caching", which the topic page lists and describes.

Numbers are spelled the way they are said, because text to speech reads
"1.81x" and "pgvector" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: databases"
SUBTITLE = "what a query costs, what an index buys, and the trade every engine made"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "operational", "tone": "subject",
         "items": ["relational", "document", "wide-column", "key-value"]},
        {"head": "analytical", "tone": "number",
         "items": ["columnar", "lakehouse"]},
        {"head": "specialised index", "tone": "machinery",
         "items": ["vector", "search", "time-series", "graph"]},
        {"head": "embedded", "tone": "verified",
         "items": ["SQLite", "DuckDB", "RocksDB"]},
    ]},

    "question": {"kind": "stack", "layers": [
        ("data model", "how you say what you mean"),
        ("storage engine", "rows or columns, B-tree or LSM"),
        ("distribution", "replication, partitioning, consistency"),
    ]},

    "rows_cols": {"kind": "compare", "focus": "analytical", "sides": [
        {"head": "row store", "tone": "subject", "items": [
            "the whole record kept together",
            "a point lookup is one page read",
            "updates are cheap"]},
        {"head": "column store", "tone": "number", "items": [
            "each attribute kept together",
            "a scan reads only the columns it touches",
            "1-2 orders of magnitude on aggregates"]},
    ]},

    "btree_lsm": {"kind": "table", "focus": "operational",
                  "head": ["", "B-tree", "LSM-tree"],
                  "rows": [
                      ["writes", "in place", "buffered, then compacted"],
                      ["reads", "predictable", "amplified"],
                      ["compaction", "none", "constant background load"],
                      ["found in", "Postgres, MySQL", "Cassandra, RocksDB, ClickHouse"],
                  ]},

    "planner": {"kind": "stat", "big": "1.81x",
                "caption": "geometric mean speedup over the Postgres planner",
                "note": "a 4B distillation, best-of-three. 44.7% latency cut "
                        "on join-heavy queries, zero regressions"},

    "vector": {"kind": "compare", "focus": "specialised index", "sides": [
        {"head": "pgvector, inside Postgres", "tone": "verified", "items": [
            "one transaction, one backup, one delete path",
            "right below roughly 10M vectors"]},
        {"head": "a dedicated store", "tone": "machinery", "items": [
            "past roughly 100M vectors",
            "filtering during graph traversal",
            "a hard p99 under 10 ms"]},
    ]},

    "cache_ladder": {"kind": "flow", "tone": "machinery", "steps": [
        "prefix caching", "KV capacity", "exact match", "semantic, last"]},

    "kv_cache": {"kind": "stat", "big": "320 KB",
                 "caption": "of KV cache per token, Llama-3-70B at FP16",
                 "note": "so one 128k-token request holds about 40 GB, "
                         "more than half an H100"},

    "semantic": {"kind": "bars",
                 "head": "one AWS benchmark, one dataset, two thresholds",
                 "bars": [
                     {"label": "threshold 0.99", "text": "23.5% hit rate",
                      "value": 23.5, "tone": "verified"},
                     {"label": "threshold 0.75", "text": "90.3% hit rate",
                      "value": 90.3, "tone": "cost"},
                 ]},

    "close": {"kind": "claim",
              "text": "Postgres until a measurement says otherwise.\n"
                      "Then take the escape hatch that measurement points at.",
              "note": "and measure cost-weighted hit ratio: the work you "
                      "avoided, not the requests you served"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of databases. Where your data sits, what it costs to "
        "ask it a question, and why there are a dozen kinds of answer. "
        "Current as of the twenty second of September, twenty twenty six."),
    (A, "Outcome first, because the page puts it first. For almost everything "
        "you build, Postgres is the default. Everything else here is an escape "
        "hatch you take once a measurement proves it wrong."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Here is the whole board, grouped the way the page groups it, and "
        "nothing explained yet. Operational stores, the ones your product "
        "writes to. Relational, Postgres and MySQL. Document, MongoDB. Wide "
        "column, Cassandra. Key value, Redis."),
    (A, "Analytical stores, for the few enormous queries. Columnar: ClickHouse, "
        "BigQuery, Duck D B. And lakehouse tables, Parquet under Iceberg or "
        "Delta."),
    (A, "Then the specialised indexes. Vector, search, time series, graph. "
        "And the embedded ones, with no server at all. S Q Lite, Duck D B and "
        "RocksDB."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "That is a dozen categories. How is anyone supposed to choose?"),
    (A, "By noticing that almost none of them is a new kind of system. Look at "
        "the stack. A database is three stacked choices. A data model, how you "
        "say what you mean. A storage engine, rows or columns, B tree or "
        "L S M. And a distribution story underneath."),
    (A, "The storage engine is the layer that decides what a query costs. And "
        "most categories on that map are the top layer plus one specialised "
        "index, which is why vector database is best read as an approximate "
        "nearest neighbour index sold separately."),
    (A, "So the question is not which product. It is which trade each family "
        "took."),
]

# --- trade one ------------------------------------------------------------
SCRIPT["rows_cols"] = [
    (A, "First trade. Watch the analytical column light up on the map."),
    (A, "A row store keeps the whole record together, so a point lookup is one "
        "page read. A column store keeps each attribute together, so a scan "
        "reads only the columns it touches, and compresses far harder."),
    (A, "That buys one to two orders of magnitude on aggregate scans, and "
        "costs you cheap updates. Which is why analytics never belongs on your "
        "production primary."),
]

# --- trade two ------------------------------------------------------------
SCRIPT["btree_lsm"] = [
    (A, "Second trade, one layer down, back on the operational side. A B tree "
        "updates in place. Predictable reads, no compaction. That is what "
        "Postgres and MySQL do."),
    (A, "An L S M tree buffers writes in memory and flushes sorted files that "
        "get compacted later. Much higher write throughput, and you pay on the "
        "other two rows of the table."),
    (B, "So the write scaling is not free. It is borrowed from the read path."),
    (A, "And from a background job that never stops. Cassandra, RocksDB and "
        "ClickHouse all take that deal knowingly."),
]

# --- what an index buys, and the number -----------------------------------
SCRIPT["planner"] = [
    (A, "Third piece of the physics. An index is a redundant, ordered copy of "
        "some of your data, and it turns a scan into a lookup. Every index you "
        "add makes writes slower, and the planner's job harder."),
    (A, "And it is wrong in one particular way. It picks a join order from "
        "cardinality estimates, and those break on correlated predicates. "
        "Oldest known weakness in the field."),
    (A, "Which is why this number is on the page. One point eight one times, "
        "geometric mean speedup over the Postgres planner itself, from a four "
        "billion parameter model trained to write plans, on the Join Order "
        "Benchmark."),
    (B, "Best of three is doing a lot of work in that sentence."),
    (A, "It is, and they said so rather than burying it. Forty four point "
        "seven percent off join heavy latency. Zero regressions."),
]

# --- the specialised index everyone asks about ----------------------------
SCRIPT["vector"] = [
    (A, "Now the specialised index column. Vector search is an index type, not "
        "a database category. Recall is tuned rather than guaranteed, and "
        "filtered search is where implementations differ."),
    (A, "So Postgres with P G vector is the boring correct default. One "
        "transaction, one backup, one delete path, and it is the right answer "
        "below roughly ten million vectors."),
    (A, "A dedicated store earns the other side past a hundred million, or "
        "when filtering has to happen during graph traversal, or when you need "
        "a hard p ninety nine under ten milliseconds. Index arguments, never "
        "data model ones."),
]

# --- the deepest part of the topic ----------------------------------------
SCRIPT["cache_ladder"] = [
    (A, "Last layer, and the deepest thing under this topic. Caching. Redis is "
        "the right cache, and that is the boring half. The interesting half is "
        "the order on the screen: each step is cheaper and safer than the next."),
    (A, "Prefix caching first, always. Exact prefix reuse, so no correctness "
        "risk at all, and on agentic traffic sixty to ninety percent of your "
        "input tokens are shared prefix. Which dictates prompt layout. Stable "
        "content first, volatile last. A timestamp at the top of a system "
        "prompt destroys the whole cache, and the only symptom is a bill that "
        "never goes down."),
    (A, "Then exact match caching on a fully normalised request, which is "
        "free and catches more retries than anyone expects."),
]

SCRIPT["kv_cache"] = [
    (A, "Step two is the K V cache underneath it, and here is the number to "
        "memorise. Three hundred and twenty kilobytes per token. That is Llama "
        "three seventy B at F P sixteen: eighty layers, eight key value heads, "
        "head dimension a hundred and twenty eight, doubled for keys and "
        "values."),
    (A, "So one request at a hundred and twenty eight thousand tokens holds "
        "about forty gigabytes. More than half an H one hundred. K V capacity, "
        "not weights, caps your batch size."),
]

SCRIPT["semantic"] = [
    (A, "And semantic caching last, because it is the only cache in the stack "
        "with a false positive rate. Every other cache is exact. A semantic "
        "hit is a guess that two different questions deserve one answer."),
    (A, "Look at the two bars. At a threshold of zero point nine nine, an "
        "A W S benchmark got a twenty three point five percent hit rate. Drop "
        "it to zero point seven five and it gets ninety point three."),
    (B, "And the accuracy barely moved. Ninety two point one to ninety one "
        "point two."),
    (A, "On that dataset. Negation is the blind spot. Is X safe for children, "
        "against is X unsafe for children, scores above zero point nine five "
        "with opposite answers."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? Not for picking a product. It is for knowing "
        "which trade you are buying, and which ones you cannot walk back. Two "
        "you cannot: the shard key, and the partition key in a wide column "
        "store, because changing either rewrites every row."),
    (A, "And take one metric away, the one on the screen. Cost weighted hit "
        "ratio, not hit ratio. Ninety five percent hits where the misses are "
        "the expensive queries is worse than eighty that catches them."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
