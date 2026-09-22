"""
Topic overview: inference and serving, as of 22 September 2026.

Source: the canonical Notion page "Topic: inference-and-serving", read from
Notion directly on 22 September 2026 rather than from the repo mirror. Every
figure, name and date below is on that page. Nothing is imported from the six
deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A comparison, and the thing being compared is
not the engines. It is the BOTTLENECK each technique was built to attack. The
page's own arithmetic is the axis: single-stream decode speed is roughly
memory bandwidth divided by bytes touched per token, and every technique on
the page is either "move fewer bytes" or "amortise the same bytes over more
tokens". The page then names a third regime that sits outside that framing
entirely, batch size one, where neither compute nor bandwidth binds and what
is left is the cost of launching kernels.

So the organising question is "where is the request actually stuck?", and the
map is the page's own three layers with the techniques read against three
regimes rather than listed. A tour of vLLM against SGLang against TensorRT-LLM
is the alternative axis and it is the wrong one: that is the page's comparison
table read aloud, and it makes the engine the first decision when the page
treats it as the last one.

The cut cleared in 74326b3 found the same axis independently, and it is kept,
because it is the page's own. Five things from that cut are not kept:

  - Twelve beats. That is over eight minutes, one rung below the length at
    which the render fails outright. Eight here, and the engines were folded
    into the two beats they are the answer to rather than given a beat of
    their own, which is also where they finally mean something.
  - Not one of its beats carried a `reserve`, so every panel finished
    revealing at the very end of its budget and the narration ran ahead of
    the picture throughout.
  - Four of its beats were two-reveal panels over forty-second lines:
    `bytes` was a `stat`, `overhead` was a two-bar chart, and `engines` and
    `objection` were both `compare`. That is the still-frame defect the
    timing check exists to catch, and it would have shipped four times in one
    episode. `overhead` survives as a two-bar chart here only because its
    line was cut to about thirty-eight seconds to match.
  - Its `prefill` beat lit the `orchestration` column while explaining
    chunked prefill and prefix caching, which are technique-layer things. The
    focus lists both columns here, and only because the P/D split genuinely
    is the orchestration layer's job.
  - Its `weights` beat spent ninety seconds on BITCOS. Ternary packing is the
    other half of bytes per token and it is a real result, but it is one
    encoding of one weight format, and it cost the beat that the objection
    needed.

The outline that survived the revision step:

    ident      what the stack is, how current, and where price is decided
    map        engines, orchestration, techniques: everything named, parked
    question   a stack is fast for one reason at a time: the three regimes
    prefill    compute bound: chunk it, cache the prefix, or split it off
    decode     bandwidth bound: paged cache, MLA, batching, speculation
    overhead   batch size one: a fused kernel, against a wafer
    objection  an algorithmic saving is not a systems-realisable one
    close      the take: which question is this change answering?

What the critique step changed:

  - Draft one opened on the eight hundred and ninety bytes figure. It is the
    best number on the page and it means nothing to somebody who has not yet
    been told that cache footprint is the binding constraint. It is a clause
    inside `decode` now, said after the constraint has been established.
  - Draft one gave the engines a beat of their own, late, as vLLM against
    SGLang. Two positions side by side is a two-reveal panel and the beat was
    forty seconds long, which is the still-frame defect. Worse, it made the
    engines a subject rather than a consequence. SGLang is now one clause at
    the end of `prefill`, where prefix caching has just been explained, and
    vLLM is one clause inside `decode`, where paged attention has. That is
    the whole argument of the episode in two sentences instead of a beat.
  - Draft one had `question` as a `claim` card and `regimes` as a separate
    table. They are one beat: the question is "where is it stuck" and the
    table is the answer, so splitting them spent fifty seconds saying the
    question twice.
  - The AgentX numbers and the GLM-5.3-Flash cache economics were both in
    draft one. Both are excellent and neither is about where a request is
    stuck, so both are cut rather than shrunk.
  - B was agreeing. B has two turns now, and each one turns the beat: the
    first asks how you know which regime you are in, which is what makes the
    table an answer rather than a taxonomy, and the second asks for a cheap
    control, which is what Random Attention is.

Reveal arithmetic, which is what set the length. `spread` puts reveal k of n
at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments, the last of which has to fit inside the reserve. Every
beat below records the segments it was written to. Budgeted at 150 words a
minute except `map`, which is an inventory and is budgeted at 115, and with
about three seconds a beat on top.

The finding that cost this episode a second voice pass, because no check sees
it. `spread` divides the beat into n EQUAL slices, so the narration's segments
have to be equal too, and the segment that is never equal is the FIRST one. A
beat opens with a short orienting line, nine or fourteen words, and then runs
three thirty-word segments; the head reveal takes a quarter or a fifth of the
beat regardless, so every item after it is drawn five to eight seconds after
the narration has named it. Measured on the first render: `decode` named paged
attention at 3.4 seconds and drew it at 11.2, `prefill` named chunked prefill
at 5.2 and drew it at 10.5, `overhead` named Cohere at 10.9 and drew the bar
at 17.1. The layout audit was clean, `check_timing` passed with every still
frame under six seconds, and the narrator was pointing at nothing four times.
No reserve fixes it: the reserve moves every reveal together. The fix is to
write the opening segment as long as the others, which is what the rule about
n roughly equal segments means and is not what it looks like it means.

The one place the arithmetic still does not come out clean, stated rather than
hidden: `map` has three reveals and fifteen items, so its third column is
named about two seconds before `spread` draws it. Three reveals cannot be
aligned with five names any better than that. Its reserve is 8.0 rather than
6.0, which is the largest a parked beat can take before the still frame
exceeds six seconds, since the park spends about 2.4 seconds of settle and
morph out of the front of it.

The map beat is also the pace outlier and it is worth recording. The method
says to budget an inventory beat at about 115 words a minute against 150 for
prose. This one came back at 94: 110 words in 70.1 seconds, longer than any
map beat in the series so far (50.8, 55.3 and 62.0 on the three before it).
The take is clean at a character error of 0.002 and was kept rather than
rerolled, because a reroll is not monotonic and the beat carries fifteen
product names. Budget a map beat at nearer 100 words a minute than 115.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns lit. `question` passes no focus and
inherits that deliberately: the question is about the whole board, and a
redundant focus costs about a second of panel delay and redraws an identical
frame. `prefill` lights techniques and orchestration, because the P/D split
genuinely is the orchestration layer. `decode` lights techniques and engines.
`overhead` lights engines alone, because a megakernel serving engine is an
engine and the other answer is not on the map at all. `objection` lights
techniques. `close` lights all three, which is how this vocabulary says no
emphasis, and is also true.

No column is toned `context`, because a focus on a context-toned column is
invisible: the narration would say to look at something that does not move.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the page carries six deep dives and a five-stage learning path,
and the close points at the page.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - BITCOS in full: ternary weights at an information-theoretic 1.585 bits,
    five-trit packing rounding that to 1.625, zeros reaching 51.5% of all
    weights across 29 models, and 2 minus zero density giving 1.485 bits on
    the sparsest, for 1.18x end-to-end on CPU and 1.27x on GPU. That is the
    weights half of bytes per token, and this episode is about the cache
    half.
  - The whole cache-economics-as-product-decision cluster: GLM-5.3-Flash's
    IndexPool averaging every four lookup vectors to cut KV cache below a
    quarter at 1M context, the hybrid linear plus sparse attention stack, and
    the price it buys, 57 on the Intelligence Index at about $0.09 a task
    against roughly $2.03. Context length priced by cache management is a
    whole episode and it is a good one.
  - DeepSeek V4.1-Flash's architecture beyond the one number: the causal
    encoder-decoder split, cross-layer sparse attention with index reuse,
    hierarchical retrieval, the Engram memory, FP4 cache storage, and the
    deliberate 8B-prefill / 16B-decode asymmetry.
  - AgentX and the Vera Rubin evaluation. The methodology argument, that an
    accelerator comparison run on single-turn traffic measures a stack with
    its most valuable features switched off, is squarely about this page. It
    is also hardware, it already has its own episode, and the page's own
    caveat on the headline figure needs room to state properly.
  - The engine release notes: vLLM v0.28.0 and v0.29.0, Model Runner V2
    becoming the default, sequence parallelism and dual-batch overlap not yet
    on V2, and SGLang v0.5.18's 2.38x faster startup. Release notes date
    badly and startup time deserves the beat it cannot have here.
  - DFlash2 and block-diffusion drafting, at up to 3.43x output throughput.
    It is the most interesting thing on the page and it is a deep dive: a
    drafter, not a model, and the argument is about what diffusion is FOR.
  - REFRAG at 30.75x TTFT, and LCLM's architecture search, which is the
    practical guide if you build one: mean pooling, a 1024 encoder window,
    causal encoder attention, a plain MLP adapter.
  - TGI's archival, MLX and Apple silicon, KServe, Ray Serve and the whole
    quick chooser. Named on the map, which is what the map is for.

  The obvious second episode from this page is the cache-economics one:
  IndexPool, MLA, V4.1-Flash's 890 bytes, tiered offload to SSD, and the
  prices each of them buys. It is one clause of the close here.

The one back-port. The page states all three regimes but never in one place:
prefill compute-bound and decode memory-bound are said inside the DeepSeek
V4.1 section, and batch size one is introduced as "its own two answers, both
outside the bytes-per-token framing". Saying "there are three places a
request gets stuck, and no more" is the video's organising sentence, and a
narration that organises the page better than the page does is a gap in the
page. It went back into the page in this session, next to the arithmetic
paragraph it belongs to, before this script was rendered.

What reading the transcripts caught, none of which any gate rejected. Five
defects across three voice passes, and the classes are worth listing because
they are not the ones the error rate is built for. "Paged attention" came back
as "page detention" and "continuous batching" as "notice batching", both of
them the first words of their sentence, at a character error of 0.026; neither
name opens a sentence now. "Baseten's" arrived as "BASINS'", and is written
"Base Ten's", which is how it is said. "It scales out too: route to the
replica" was heard as "it scales out to root to the replica", which is not a
sentence in any language. And the closing clause of `prefill` came back as
"Cache Shipped Over RDMX Cache Shipped Over": a repetition burst and a mangled
acronym in the most exposed position a clip has, its last words, at a
character error of 0.047 and a no-speech probability of 0.21. R D M A is no
longer the last thing said in that beat.

One defect the gates found that was not there, and one they still cannot see.
`overhead` is reported BAD at a character error of 0.073 and its transcript is
correct end to end. The whole excess is the normaliser: the script says
"fifteen hundred to eighteen hundred and fifty", the transcriber writes
"1500 to 1850", and `num2words` expands those as "one thousand, five hundred"
and "one thousand, eight hundred and fifty", so a correctly read figure scores
as six wrong words. Colloquial hundreds are the gap. It was kept rather than
rerolled, because rerolling cannot fix a measurement. What the gates still
cannot see is that the same beat originally said "reaches fifteen hundred to
eighteen hundred and fifty. Weights on chip", with no unit on the number at
all and a fragment the model welded onto it, so the transcript read "1850
weights on chip". The figure now carries "tokens a second" and the fragment
has a verb.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, two turns, each of which turns the beat

Names are spelled the way they should be said. Three were rewritten before the
first render on rules this method already carries: "TensorRT-LLM" is written
"Tensor R T L L M", because a word welded to an acronym is the shape that
produced "postgres cool"; "llama.cpp" is written "llama C P P", because "dot"
spoken breaks the contiguous run the orphan check needs; and "DeepSeek" is
written "Deep Seek", which is what the transcriber returns anyway. "Dynamo",
"Triton", "Cohere" and "Cerebras" are ordinary words to the model.

The orphan check is what actually constrains the map's narration. "llm-d"
shares no significant word with anything sayable, so it passes only on the
squashed contiguous match, which means the line has to say "L L M D" with
nothing between the letters: an interposed "dash" orphans the pill. Same for
"TensorRT-LLM" and "llama.cpp".
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: inference-and-serving"
SUBTITLE = "a serving stack is fast for exactly one reason at a time"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and why it earns the time -----------------
SCRIPT["ident"] = [
    (A, "This is the map of inference and serving. The stack that turns model "
        "weights into tokens a second, on hardware you rent by the hour. "
        "Three layers: the engine, the orchestration above it, and the "
        "techniques both of them implement."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns your time because a model's price is decided here rather than "
        "in training, and because most advice about it was measured in a "
        "regime you are not in."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, three reveals, and `spread` puts the third at
# `beat_length - reserve`. So two long segments and one shorter one: about
# fifty words for the first column, thirty-five for the second, and the third
# named in the last stretch.
#
# The squashed-match constraint is why the names run with no connectives
# between them. Anything interposed between two halves of a pill's spelling
# orphans it, so "L L M D" cannot become "L L M dash D".
SCRIPT["map"] = [
    (A, "Whole board first. Nothing explained yet. Three columns, and they "
        "are the page's own three layers. Engines first. An engine owns a "
        "card and turns it into a token factory. V L L M. S G Lang. Tensor R "
        "T L L M. llama C P P. And M L X, on Apple silicon."),
    (A, "Above them, orchestration. That layer owns no card. It routes "
        "requests across engines and across nodes. Nvidia's Dynamo. L L M D, "
        "the Kubernetes native one. Triton Inference Server. Ray Serve. K "
        "Serve."),
    (A, "And underneath both, the shared vocabulary. The techniques. A paged "
        "cache. Continuous batching. Prefix caching. Speculative decoding. "
        "And splitting prefill apart from decode."),
]

# --- the organising question, and its answer, in one beat -----------------
# Four reveals: the header, then one row each. The earlier cut made the
# question a `claim` card and the regimes a separate table, which spent fifty
# seconds asking the question twice.
#
# No focus. The map was built one beat ago with all three columns lit, which
# is exactly the state a question about the whole board wants, and a redundant
# focus redraws an identical frame at a cost of about a second of delay.
SCRIPT["question"] = [
    (A, "Now the sentence this whole topic rests on. A serving stack is fast "
        "for exactly one reason at a time. Apply the wrong technique and you "
        "get nothing."),
    (B, "So how do you know which one you are?"),
    (A, "You find where the request is stuck. There are three places. "
        "Prefill is the prompt. It is read in one pass. So it is compute "
        "bound. You chunk it. Or you split it off."),
    (A, "Decode is the generation. One token at a time. Each token drags the "
        "weights and the cache past the same units. Bandwidth bound. You "
        "attack bytes per token."),
    (A, "And at batch size one, neither binds. What is left is launch "
        "overhead. You fuse. Or you buy silicon."),
]

# --- the compute-bound stage ----------------------------------------------
# Five reveals, so five segments: the head, then one item each, with the last
# short enough to sit inside the reserve. SGLang arrives in the fourth segment
# rather than in an engine beat of its own, because prefix caching has just
# been explained and the engine is the consequence of it.
SCRIPT["prefill"] = [
    (A, "Start on the compute bound side. Somebody is sitting there waiting "
        "for a first token, and every technique here exists to shorten that "
        "wait."),
    (A, "Chunked prefill co schedules pieces of a long prompt alongside "
        "everybody else's decoding. So one hundred thousand token prompt "
        "stops stalling the whole batch. On by default now."),
    (A, "Prefix caching is the larger win. It works across requests, not "
        "within one. On agent traffic, sixty to ninety percent of input "
        "tokens are shared with something you already served."),
    (A, "Reusing those blocks is the biggest first token win available. It "
        "also scales out, by routing to the replica already holding the "
        "prefix. S G Lang calls that radix attention."),
    (A, "At datacentre scale you split the two stages apart. They get their "
        "own pools, and an R D M A link carries the cache between them."),
]

# --- the bandwidth-bound stage --------------------------------------------
# Five reveals, and the item order is the narration order: paged attention,
# continuous batching, MLA, then speculation. vLLM arrives as the consequence
# of paged attention rather than as a subject of its own.
#
# DeepSeek V4.1-Flash's 890 bytes of cache per token was in three drafts of
# this beat and is out. It is the best single number on the page, and the page
# credits it to a different stack of mechanisms entirely (grouped-query
# attention, head pruning, selective layer caching, FP4 cache storage), so a
# sentence putting it next to MLA makes a causal claim the page does not. It
# needs its own beat, and that beat is the second episode named below.
SCRIPT["decode"] = [
    (A, "Cross to the other side. Decode is a different problem. It is short "
        "of bytes, not short of arithmetic. Everything that makes decode "
        "faster answers that one fact."),
    (A, "Start with paged attention, which manages the key value cache the "
        "way an operating system manages memory. Fixed size blocks, a table "
        "per sequence. It recovered the sixty to eighty percent "
        "preallocating wasted, and made V L L M the default."),
    (A, "The second technique is continuous batching. It schedules at the "
        "iteration level rather than the request level. On variable length "
        "traffic that is worth roughly ten times the throughput."),
    (A, "Multi head latent attention, M L A, attacks it from the model side. "
        "One low rank latent per token per layer, rather than keys and values "
        "per head. Ten to thirty times smaller."),
    (B, "And speculative decoding? Everybody quotes that one."),
    (A, "It is lossless, which is the good part. But the gain fades as the "
        "batch grows."),
]

# --- the third regime -----------------------------------------------------
# Three reveals, and therefore a short beat: about forty seconds, not the
# fifty a points panel would carry. The two-bar chart survives here, where the
# earlier cut's version did not, only because the line was written to it
# rather than the other way round. Bars share a baseline and the widths are
# computed from `value`, so the ratio on screen is arithmetic the viewer can
# check rather than a claim.
SCRIPT["overhead"] = [
    (A, "Third regime. One person, one prompt, nothing to batch against. "
        "That is the case the throughput literature skips, because "
        "everything else assumes a queue to amortise the work against. Two "
        "answers, and they are not the same kind of thing."),
    (A, "In software, Cohere fused the whole decode step into a single kernel "
        "launch. Two hundred and ninety two tokens a second at batch size "
        "one. Sixty two percent of speed of light, and one point five eight "
        "times faster than V L L M. Everything else here shrinks the bytes. "
        "This raises the bandwidth."),
    (A, "In hardware, Cerebras reaches fifteen hundred to eighteen hundred "
        "and fifty tokens a second, with the weights held in on chip "
        "memory."),
]

# --- the objection --------------------------------------------------------
# Five reveals: the head and four lines, every one of them a reason a
# published saving is not a saving. The draft that was previewed had LCLM's
# five-to-nine-times win as a fifth item, and the frame showed why that is
# wrong: a `points` panel takes one tone, so the one family that works was
# drawn in the cost colour, and the picture delivered a verdict on it that
# the page does not. No check sees that. It is found by looking at a frame.
# The win is said rather than shown, which the rules allow in that direction.
#
# The beat now ends on Random Attention rather than on LCLM, which is the
# better close anyway: the cheap control is the thing a viewer can act on
# tomorrow.
SCRIPT["objection"] = [
    (A, "Now the objection, and it is the sharpest paragraph on the page. A "
        "great many published cache savings are not savings, and the reason "
        "is a systems reason rather than a quality one."),
    (A, "Cache compression prefills normally, then evicts entries by "
        "heuristic. So the expensive part, building the whole cache, already "
        "happened before anything was saved."),
    (A, "Worse, several evict unevenly across heads and layers, so they "
        "cannot shrink the sequence at all. The positions are masked, not "
        "shortened."),
    (A, "The family that does work shortens the input before the decoder "
        "sees it. L C L M reaches a first token five to nine times faster. "
        "And most eviction methods are unsupported in V L L M and S G Lang "
        "anyway."),
    (B, "Is there a cheap control you could run against that?"),
    (A, "Salesforce found that keeping a uniformly random subset of cache "
        "entries matches or beats learned importance eviction."),
]

# --- the take -------------------------------------------------------------
# Five reveals on the closing beat, deliberately. Every overview in this
# series before the still-frame check could fire ended on a card that drew
# itself once and sat motionless for fifteen to thirty seconds.
#
# One tone throughout. Colouring the test `verified` and the regimes `context`
# would deliver a verdict the page does not: the page says most write-ups blur
# the distinction, not that the techniques they describe are wrong.
SCRIPT["close"] = [
    (A, "So what is the map for? Not for picking an engine. Here the engine "
        "is the last decision, not the first."),
    (A, "It is for knowing which question you are answering. Latency, "
        "throughput and quality are one frontier, not three independent "
        "knobs. That is Base Ten's framing, and it is the test to carry out "
        "of here."),
    (A, "So ask of any change: does it move you along that frontier, or push "
        "the frontier itself outward? A batching policy moves you along it. "
        "Better kernels push it out."),
    (A, "Most write ups blur those two, which is why so much inference advice "
        "contradicts itself."),
    (A, "And ask which regime it was measured in. A technique that doubles "
        "throughput at batch size sixty four can do nothing at batch size "
        "one."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. The columns are the page's own opening sentence: the
    # engine, the server and orchestration layer, and the techniques both
    # layers implement. Every item is kept to twenty characters or fewer,
    # which is inside the widest that has shipped in this series.
    #
    # Tones. Subject for the engines, which is where the viewer thinks the
    # subject is. Machinery for orchestration, which is literally what that
    # column is. Number for the techniques, because every measured win in this
    # episode comes out of that column. None is `context`, so every column has
    # somewhere to brighten from.
    #
    # `reserve` is 6.0 rather than 3.0 because a parked beat spends two
    # seconds of settle and a 0.7 second morph out of the FRONT of the
    # reserve, leaving a motionless tail of about three and a half seconds.
    # The format's premise is that the viewer sees the whole field standing
    # still before any part of it means anything.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "engines", "tone": "subject", "items": [
            "vLLM",
            "SGLang",
            "TensorRT-LLM",
            "llama.cpp",
            "MLX"]},
        {"head": "orchestration", "tone": "machinery", "items": [
            "NVIDIA Dynamo",
            "llm-d",
            "Triton",
            "Ray Serve",
            "KServe"]},
        {"head": "techniques", "tone": "number", "items": [
            "paged KV cache",
            "continuous batching",
            "prefix caching",
            "speculative decoding",
            "prefill/decode split"]},
    ]},

    # The question and its answer in one panel. A table, because the grid
    # genuinely is the content: three regimes, what binds each, and what you
    # are allowed to attack. Cells are kept to eighteen characters, which has
    # to fit the roughly seven point eight units left beside the parked map.
    #
    # The header's first cell is filled rather than blank: an empty corner
    # cell slid a whole header one column left in an earlier episode.
    "question": {"kind": "table", "reserve": 5.5,
                 "head": ["stuck where", "bound by", "what you attack"],
                 "rows": [
                     ["prefill", "compute", "chunk it, split it"],
                     ["decode", "HBM bandwidth", "bytes per token"],
                     ["batch size 1", "launch overhead", "fuse, or silicon"],
                 ]},

    # Lights techniques AND orchestration: chunked prefill and prefix caching
    # are technique-layer, and the P/D split genuinely is the orchestration
    # layer's job, which is the one honest reason to light two columns.
    "prefill": {"kind": "points", "tone": "subject", "reserve": 5.0,
                "focus": ["techniques", "orchestration"],
                "head": "prefill: compute bound",
                "items": [
                    "chunked prefill, on by default",
                    "60-90% of agent input shared",
                    "the biggest first token win",
                    "P/D split: pools, KV over RDMA",
                ]},

    # Toned `number`, matching the column it lights, because every line here
    # is a measured recovery or a measured ratio rather than a verdict.
    "decode": {"kind": "points", "tone": "number", "reserve": 5.0,
               "focus": ["techniques", "engines"],
               "head": "decode: bandwidth bound",
               "items": [
                   "paged attention: 60-80% waste",
                   "continuous batching: about 10x",
                   "MLA: 10-30x smaller per token",
                   "lossless, but it fades",
               ]},

    # A chart, because the length is the point and the ratio is the argument.
    # `value` is given and the widths are computed, so the two bars share a
    # baseline and cannot lie by arithmetic. Machinery for the software
    # answer, number for the hardware one: two neutral tones, because the page
    # takes no position on which is right.
    "overhead": {"kind": "bars", "reserve": 5.0, "focus": "engines",
                 "head": "batch size one: two answers", "bars": [
                     {"label": "Cohere megakernel", "text": "292 tok/s",
                      "value": 292, "tone": "machinery"},
                     {"label": "Cerebras, Qwen3.8-27B",
                      "text": "1,500-1,850 tok/s",
                      "value": 1850, "tone": "number"},
                 ]},

    # Toned `cost`, and every line earns it: each one is a reason a claimed
    # saving is not a saving. The heading draws in the subject colour whatever
    # the tone, which is a known limitation of `points` rather than a choice.
    "objection": {"kind": "points", "tone": "cost", "reserve": 5.0,
                  "focus": "techniques",
                  "head": "algorithmic, or systems-realisable",
                  "items": [
                      "evict a cache you already built",
                      "masked, not shortened",
                      "unsupported in vLLM, SGLang",
                      "random beats learned eviction",
                  ]},

    # The take, as four lines that unfold with it rather than one card held
    # still for half a minute.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.5,
              "focus": ["engines", "orchestration", "techniques"],
              "head": "the test to carry out of here",
              "items": [
                  "one frontier, not three knobs",
                  "along it, or pushing it out?",
                  "most write ups blur the two",
                  "which regime was it measured in",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    # `map` is an inventory and is read about 35 words a minute slower.
    slow = sum(len(line.split()) for _, line in SCRIPT["map"])
    secs = (words - slow) / 150 * 60 + slow / 115 * 60 + len(SCRIPT) * 3
    print(f"about {secs / 60:.2f} minutes ({secs:.0f}s)")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        rate = 115 if key == "map" else 150
        print(f"  {key:11s} {w:3d} words  ~{w / rate * 60:4.0f}s")
