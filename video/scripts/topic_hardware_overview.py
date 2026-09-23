"""
Topic overview: hardware, as of 22 September 2026.

Source: the canonical Notion page "Topic: hardware", read from Notion directly
on 22 September 2026 rather than from the repo mirror. Every part number,
figure, date and claim below is on that page. Nothing is imported from the four
deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A comparison, but not of vendors. The thing
being compared is the SCALE a claim is made at, and the vendors are what sits
at each scale. That axis is most of the work of a new overview, and it is the
page's own: the page says outright that "both vendors have moved the unit of
comparison from the card to the rack", it gives a whole heading to rack-scale
competition, and it gives another to the grid. The unit moved twice in about
two years, from the chip to the rack to the substation, and most published
numbers are still quoted at the wrong scale. So the organising question is "at
what scale was that measured?", and the map is three scales rather than a list
of accelerators.

The alternative axis, a tour of Nvidia against AMD against Google against the
ASICs, is what the page's taxonomy diagram looks like and it is the wrong one:
this page carries enough part numbers to make a catalogue, and a catalogue read
aloud is not an episode.

The cut cleared in 74326b3 found the same axis independently, and it is kept,
because it is the page's own. Four things from that cut are not kept:

  - It ran ten beats and 1,222 words, which is about eight and a half minutes,
    one rung below the length at which the render fails outright. Eight beats
    here, and the challengers, the caveats and the supply story were folded
    into the beats they are the mechanism for rather than given beats of their
    own.
  - Not one of its beats carried a `reserve`, so every panel finished revealing
    at the end of its budget. Its `rack` beat said "look at those two rows
    together" while `spread` had drawn two of five rows.
  - Three of its beats were two-reveal panels over forty-second lines: `chips`
    was a `compare`, `grid` was a `stat`, and `close` was a `claim`. That is
    the still-frame defect the timing check exists to catch, and it would have
    shipped three times in one episode. They are `points` beats now, with five
    or six reveals each.
  - Its `caveat` beat narrated the rules: "the page says plainly it is an
    extreme operating point and should not be quoted, so I am not going to."
    The behaviour is already visible in not quoting it. The `rubin` table says
    what the figure is and the narration calls it an outlier, and neither
    mentions a decision.

Its `focus` values were also item names ("Nvidia: A100 to Vera Rubin", "AMD's
Helios rack"), which against a parked map resolve to the column heading
anyway. Focus is decided at column level here, which is the only level that
exists once the map has collapsed.

The outline that survived the revision step:

    ident    what this is, how current, and the claim that the unit moved twice
    map      three columns, everything named, parked as the home frame
    question at what scale was that measured?
    chips    scale one: what one part still decides, and the two opposite bets
    rack     scale two: the NVLink domain, the twentyfold cliff, the three bets
    rubin    the one independent measurement, and which of its three numbers
             to quote
    grid     scale three: energisation, not fabrication, and the economics that
             are already priced per gigawatt
    close    the take: which question to ask of any hardware claim

What the critique step changed:

  - Draft one opened on the seven times per megawatt figure. That is the exact
    number the page hedges hardest, and opening on it would have made the
    `rubin` beat a retraction. The episode opens on the unit moving instead,
    which is the claim the page actually makes.
  - Draft one had a beat on per-chip specifications and a separate beat on
    Groq and Cerebras. They are one story, because the specialists ARE the
    claim that memory rather than arithmetic is the constraint, taken to its
    two extremes. One beat now, and Positron's funded bet against HBM closes
    it because it is the same argument with money on it.
  - Draft one gave the three scale-up challengers a `table` of their own.
    AMD's Helios, Huawei's UnifiedBus and the Cornelis fabric are all answers
    to the twentyfold bandwidth cliff, so they are the back half of the `rack`
    beat, which is where the cliff is explained.
  - The Nvidia datacentre revenue print and the Hugging Face acquisition were
    both in draft one. Neither does work on this spine, which is about the
    scale a number is measured at, so both were cut rather than shrunk.
  - The DRAM price rise and the H.R. 9340 vote were a beat of their own. The
    supply story earns its place only as the mechanism under the grid
    constraint, so DRAM became the last line of `grid` and the vote was cut.
  - B was agreeing in draft one. B now has one turn, and it carries the
    assumption the whole episode corrects: that these columns are a league
    table with a winner in each.

Reveal arithmetic, which is what actually set the length. `spread` puts reveal
k of n at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals
wants n narration segments: the first n-1 about one reveal each, and the last
one short enough to fit inside the reserve. Every beat below records the
segments it was written to, and the last segment of every panel beat is
deliberately the shortest.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns lit. `question` inherits that, which is
right: the question is about the whole board. `chips` lights "per chip".
`rack` lights "the scale-up domain". `rubin` passes no focus and inherits that
state deliberately, because the Vera Rubin measurement is a rack-tier result
and a redundant focus redraws an identical frame at a cost of about a second
of panel delay. `grid` lights "power and supply". `close` lights all three,
which is how this vocabulary says no emphasis, and is also true.

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour, so the narration would
say to look at something that does not move.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the page carries four deep dives and a Best resources block, and
the close points at the page.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - Nvidia's Q2 FY27 print: 96.2 billion dollars of revenue, 89.0 of it
    datacentre, up 117% year on year, with 108 guided. It is the demand
    denominator for every capacity claim in this knowledge base and it does no
    work on a spine about measurement scale.
  - The 12.93 billion dollar Hugging Face acquisition. A genuinely large story
    and not a hardware-scale one.
  - Cerebras CS-4: three WSE-3 Turbo wafers, 250 PFLOPS, 43.2 PB/s, shipping
    Q3 2026. The wafer-scale argument lands on WSE-3's own numbers, and a
    second system in the same breath turns the beat into a product roundup.
  - AWS Trainium and Inferentia, the Qualcomm co-design, and the fact that
    roughly a quarter of 2026 AI server shipments are ASIC-based. The
    vertical-integration argument is a different one from the memory argument
    the `chips` beat makes, and it wants its own beat.
  - Arm Neoverse CSS N4 and the A20 Pro in the iPhone 18 Pro. The page's CPU
    and edge bullet is a fourth scale, below the chip, and this episode has
    three.
  - Huawei's Ascend 960 schedule (960DT Q1 2027, 960PR Q3 2027, 970, 980) and
    the Atlas SuperPoD racks. Named on the map; UnifiedBus is the part of that
    story that belongs to the scale-up argument, and it is the part that runs.
  - The whole supply-response and regulation cluster: Samsung doubling HBM4
    output, H.R. 9340 passing 417 to 3, the Nvidia and Google grid-stress
    framework, and SemiAnalysis's 2.3GW of restriction-delayed capacity
    against 300-plus local moratoria. Five dated items, one subject, and no
    room inside a grid beat that already has to explain energisation.
  - High-bandwidth flash as a capacity tier, which is the same direction as
    Positron's bet and gets one clause on neither.
  - The performance-math bullet: 6ND, bytes per parameter, KV-cache size,
    roofline, MFU. That is a deep dive of its own on the page and it is the
    arithmetic this whole episode rests on, so it is the obvious thing NOT to
    squeeze in.

  The obvious second episode from this page is the supply and grid half on its
  own: DRAM at 500%, HBM4 capacity, transformer lead times, interconnection
  queues, the House vote, the utility frameworks and the moratorium numbers in
  proportion. It is one heading of the page and it gets one beat here.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts: the
three-scale reading is assembled from the page and stated nowhere on it. The
page has the NVLink domain and the twentyfold cliff in one bullet, the
per-utility-gigawatt economics in a second section and the energisation
constraint in a third, and a reader has to notice for themselves that those
are three different denominators for the same question. A listener cannot, so
the narration says it in the opening, and having written the plain version it
belongs on the page too. The page's own opening paragraph now carries it: that
hardware claims are made per chip, per scale-up domain and per gigawatt, that
the three are not interchangeable, and that the first question about any
figure below is which of them it was measured at. It is an instruction for
reading what is already there rather than a new claim, which is the only kind
of thing a video is allowed to add.

The glosses the narration adds beyond that are already on the page in the same
words: the page defines the scale-up domain as the set of GPUs inside which
"tensor parallelism is affordable", and it defines an ASIC and an LPU in full
on first use. The one phrase that is the video's own, "the substation", is a
restatement of the page's "energisation, not fabrication" claim rather than a
new assertion.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, one turn, carrying the assumption the episode corrects

Numbers and names are spelled the way they should be said, because text to
speech reads "1.8 TB/s", "NVL72", "MI300X", "46,000 mm2" and "$149.9B" badly.
Three shapes were rewritten before the first render on the rules this method
already carries: "Groq" is left as written because it is one syllable and
unambiguous; "SemiAnalysis" is written "Semi Analysis", because a welded
compound is the shape that produced "LittleMul"; and "HBM" is always "H B M",
never opened on. "InfiniBand" and "Ethernet" are ordinary words to the model
and came back correct.

What the render actually found, in the order it found it.

Pace. `rack` came back at 174 words a minute by `check_timing` and the lever is
punctuation rather than the delete key: its commas became full stops and it
read at 156 without a word being cut. That cost sixteen seconds, which is most
of the difference between this episode and a six and a half minute one, and it
is the right trade: a beat nobody can follow is worse than 6:52.

Two defects got through the character gate and were caught by reading the
transcripts as text. Neither is a class the gate is built for:

  - A single real word swapped for another, which is the class neither gate
    can see. "So the domain boundary picks your parallelism" came back as "the
    domain boundary picture parallelism" at a character error of 0.019, which
    is not a sentence. "Decides your parallelism" reads correctly.
  - A figure read as a different figure. "Four hundred to eight hundred
    gigabits a network card" arrived as "700 to 800", at a character error of
    0.052, which is a wrong number spoken over a right one on screen. Written
    "between four hundred and eight hundred" it came back correct. The same
    take also turned "A M D's Helios answers" into "A Form-D's helios
    amperes", which is the rule about not opening a sentence on the fragile
    name: "Take A M D first. Helios answers like for like" reads correctly.

And one that is not a defect but reads like one: "There, N V Link gives..."
transcribes as "Their NVLink gives...". They are homophones, so the audio is
the same either way and no reroll can change it.

Reserves were set from the rendered durations rather than from the word-count
estimate, using reveal k of n landing at `(k-1)/(n-1) x (beat_length -
reserve)`. The first pass exposed the thing no check sees: `rack`, `grid` and
`close` each had one segment twice the length of its neighbours, so the reveals
(which are spread evenly in time) fell seven to thirteen seconds behind the
words that named them. No reserve can fix that, because a reserve moves the
tail and not one reveal. All three beats were rewritten into segments of
roughly equal length, at about thirty words each for a six-reveal beat, and
re-recorded. Every lead is now under four seconds.

The reserves themselves are capped by `still` rather than by taste.
`check_timing` fails a frame held over six seconds and `still` lands about 0.4
above the reserve on an ordinary beat, so 5.5 is the practical ceiling, and the
ideal values the arithmetic wanted (5.9 for `chips`, 6.6 for `grid`, 6.7 for
`rubin`) are all above it. `map` is the exception: a parked beat spends the two
second settle and the 0.7 second morph out of the front of its reserve, so 7.5
measures as 5.17 of still frame, and the arithmetic wanted 8.0.

Length. 6 minutes 52 at 1080p and 4.47 MiB, on the third and last 1080p rung of
the encode ladder. That is closer to the seven minute wall than is comfortable
and it is entirely the pace fix on `rack`. The trim lever, if a future cut
needs one, is `rubin`: the `grid` beat already carries the per-gigawatt
economics and the close already carries the discipline the table teaches.

The orphan check is what actually constrains the map's narration here, and on
a page this thick with part numbers it constrains it hard. "AMD: MI300X to
MI400" shares no word with any sayable line, so it passes only on the squashed
contiguous match, which means the narration has to say "A M D, M I three
hundred X to M I four hundred" with nothing at all in between: an "up" in "up
to" breaks the run and orphans the pill. Same for "NVLink and NVSwitch", which
needs "N V Link and N V Switch" said back to back.

Re-cut 2026-09-23, for timing only, audio byte-identical. The published cut was
fitted before check_leads modelled the focus delay (0.25 s per map handle,
seventeen handles, so 4.25 s off the front of chips, rack, grid and close).
A fresh render found five leads, worst 8.5 s on `close`, a 6.0 s still on
`close`, and thirteen untimed reveals. The repair: every row rewritten as the
narration says it; the points heads on chips, rack, grid and close dropped,
since on a focus beat a head only pushes every row one place later; `close`
gained "three funded challengers" for a sentence that had nothing drawn under
it; every reserve swept to the --reserves midpoint. Worst lead now 2.2 s on
real word timestamps, worst still 4.1 s. The first NVL72 label, "one rack, one
domain", matched a rack and a domain spoken twenty seconds earlier; keep
labels to words that first appear in their own sentence.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: hardware"
SUBTITLE = "the chip, the rack, the substation: at what scale was that measured?"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and the claim -----------------------------
SCRIPT["ident"] = [
    (A, "This is the map of the hardware. The compute landscape everything "
        "else in this knowledge base runs on. Graphics cards, tensor "
        "processing units, the custom inference chips, and the networks that "
        "tie a room of them together."),
    (A, "It earns an episode because the thing you are meant to compare "
        "moved twice in two years. It was the chip. Then the rack. This year "
        "it is the substation. Current as of the twenty second of September, "
        "twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, three reveals, and `spread` puts the third at
# `beat_length - reserve`. So the narration is two long segments and one short
# one: about fifty words per column for the first two, and the third column
# named in the last few seconds.
#
# The squashed-match constraint above is why the middle segment reads as a run
# of bare names with no connectives: "N V Link and N V Switch. A M D's Helios
# rack." Anything between two halves of a pill's spelling orphans it.
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. Three columns. Not vendors: "
        "the three scales you can compare at. Per chip. "
        "Nvidia, A one hundred to Rubin. A M D, M I three hundred X to M I "
        "four hundred. Google's tensor processing units, now at Ironwood. "
        "Groq and Cerebras. Huawei's Ascend nine sixty."),
    (A, "Then the scale up domain. The chips wired closely enough to split one "
        "tensor across them. N V Link and N V Switch. A M D's Helios "
        "rack. Huawei's UnifiedBus. The Cornelis fabric, which is open. And "
        "the tensor processing unit's I C I torus."),
    (A, "And third, power and supply. D R A M prices. Transformer lead times. "
        "Grid queues. Energisation, not fabrication."),
]

# --- the organising question ----------------------------------------------
# A `claim` has two reveals, so its whole honest budget is about twenty five
# seconds and this is a hinge rather than a section. The turns are ordered so
# the sentence the note carries is spoken last: the note does not appear until
# `beat_length - reserve`.
SCRIPT["question"] = [
    (B, "Every one of those columns has somebody claiming to be fastest."),
    (A, "They do. And that is the question the map is arranged to answer. When "
        "somebody says one of these is faster, faster at what scale? The "
        "honest answer moved right twice, and most quoted numbers have not "
        "caught up."),
    (A, "So we go left to right. The chip. The rack. The grid connection."),
]

# --- scale one ------------------------------------------------------------
# Six reveals, so six segments: a head, four items of about thirty words each,
# and a short last one that fits inside the reserve. The two specialists are
# not a history of accelerators, they are the memory claim taken to its two
# extremes, which is why they sit inside this beat rather than beside it.
SCRIPT["chips"] = [
    (A, "Start at the part. Three things about one chip still decide what you "
        "can run. How much memory it has, how fast that memory is, and "
        "what format it multiplies in."),
    (A, "Notice what is missing. Peak arithmetic. Memory, not arithmetic, is "
        "the binding constraint, and the two specialists push that to opposite "
        "extremes."),
    (A, "Groq removes high bandwidth memory entirely. The model sits in on chip "
        "static memory. About two hundred and thirty megabytes a chip. Latency "
        "deterministic to the cycle, and a model spread over hundreds of "
        "chips."),
    (A, "Cerebras declines to cut the wafer up. One die of forty six thousand "
        "square millimetres, forty four gigabytes on the wafer. A model that "
        "fits needs no network between chips at all."),
    (A, "Positron raised eight hundred and seventy five million dollars before "
        "its chip taped out, to build around commodity memory instead."),
    (A, "And one vendor number here. Ironwood, fifty percent better per "
        "dollar. Google's own, unreproduced."),
]

# --- scale two ------------------------------------------------------------
# Six reveals again. The cliff is the mechanism and the three challengers are
# all answers to it, so they share the beat: separating them made the second
# half a product list with no argument under it.
SCRIPT["rack"] = [
    (A, "Second scale. This is where the word unit changed meaning. The thing "
        "people compare stopped being a chip, and became a rack full of them. "
        "The reason is bandwidth."),
    (A, "Start inside a scale up domain. That is the set of parts wired "
        "closely enough to split one tensor across. There, N V Link gives a "
        "Blackwell part one point eight terabytes a second."),
    (A, "An N V L seventy two rack puts seventy two of those parts in one "
        "domain. That rack, not the chip, is the current unit of frontier "
        "training and inference."),
    (A, "Step outside it and you are on InfiniBand or Ethernet. That is "
        "between four hundred and eight hundred gigabits a network card. "
        "Roughly a twentieth of the bandwidth. So the domain boundary decides "
        "your parallelism."),
    (A, "Which is why that tier is contested three ways. Take A M D first. "
        "Helios answers like for like, and carries thirty one terabytes of H "
        "B M four in one rack. Cornelis raised two hundred and five million "
        "for an open fabric."),
    (A, "And Huawei goes the other way. Make the domain bigger, to a million "
        "processors."),
]

# --- the one independent measurement --------------------------------------
# A table, because the grid genuinely is the content: three claims from one
# evaluation, each with how it was measured and how to read it. Header plus
# three rows is four reveals, walked row by row, which is the order `spread`
# draws it in.
#
# No focus: `rack` left "the scale-up domain" lit, which is the state a
# rack-tier result wants, and a redundant focus redraws an identical frame at
# a cost of about a second of panel delay.
SCRIPT["rubin"] = [
    (A, "Now the measurement, and the method is half of it. Semi Analysis "
        "replayed real agentic traffic across thousands of chips. Multi turn, "
        "long context, heavy prefix reuse. Not the single turn traffic these "
        "comparisons use."),
    (A, "Read it across. The headline is up to seven times the token "
        "throughput per megawatt of a G B three hundred. That is on pre "
        "release software, against the three times Nvidia itself claimed."),
    (A, "The middle row is the one to use. One point four to three times "
        "better throughput per total cost of ownership, at sixty to a hundred "
        "tokens a second. That is the interactivity anyone serves at."),
    (A, "And the sixty seven times per dollar figure going around is one "
        "extreme operating point. An outlier."),
]

# --- scale three ----------------------------------------------------------
# Five reveals. The per-gigawatt economics sit here rather than in `rubin`
# because "per utility gigawatt" is a grid measurement, and putting it here is
# what makes the third column a consequence of the second rather than a
# separate subject.
SCRIPT["grid"] = [
    (A, "Third scale, and here the topic stops being about chips at all. It is "
        "about whether the building those chips sit in can actually be "
        "switched on."),
    (A, "Roughly fifteen gigawatts of compute scheduled for twenty twenty "
        "seven may sit dark, because the site will not be ready. That is "
        "against an estimated sixty six gigawatts of American demand in the "
        "same year."),
    (A, "High voltage transformers run on forty eight to sixty month lead "
        "times, and grid interconnection queues are backlogged. That fifteen "
        "gigawatt figure started with an Elon Musk post, so it is directional "
        "rather than audited."),
    (A, "The bottlenecks under it are documented independently. Which is why "
        "that evaluation modelled its economics per utility gigawatt. A "
        "hundred and forty nine point nine billion dollars of profit, against "
        "a hundred and five point three billion."),
    (A, "And it shows in memory. D R A M prices, up five hundred percent in a "
        "year."),
]

# --- the take -------------------------------------------------------------
# Six reveals on the closing beat, deliberately. Every overview in this series
# before the still-frame check could fire ended on a card that drew itself once
# and then sat motionless for fifteen to thirty seconds. A head plus five lines
# unfolds with the take instead.
SCRIPT["close"] = [
    (A, "So what is the map for? Not for memorising part numbers, because "
        "those change every quarter. It is for something narrower than that."),
    (A, "It is for asking one question of any hardware claim you are handed. "
        "At what scale was that measured? The answer changes what the number "
        "means."),
    (A, "Per chip numbers still decide what fits in memory, and what format it "
        "multiplies in. What they stopped deciding is who wins."),
    (A, "The rack decides what you can split a tensor across. That tier now "
        "has three funded challengers rather than one incumbent, which was not "
        "true a year ago."),
    (A, "And if energisation rather than fabrication is the constraint next "
        "year, performance per megawatt decides how much capability a fixed "
        "grid connection can host. A seven times claim on that axis beats any "
        "comparison of peak throughput."),
    (A, "So the number I want next is one measured by somebody not selling the "
        "part."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis. The columns are deliberately not vendors:
    # they are the three scales a claim can be made at, which is the whole
    # argument. A vendor tour would be the page's taxonomy diagram read aloud.
    #
    # Three columns is the comfortable number. `panel_columns` derives the pill
    # width from the column count, so three at full frame width gives about
    # 3.5 units each, and every item is kept to twenty two characters or fewer,
    # which is the widest that has shipped in this series.
    #
    # Tones. Subject for the parts, which is where the episode starts. Number
    # for the scale-up domain, which is where the measured figures live.
    # Cost for power and supply, which is what that column is: the page treats
    # every line of it as a constraint priced in time or money. None is
    # `context`, so every column has somewhere to brighten from.
    #
    # `reserve` is 6.0 rather than 2.5 because a parked beat spends two of
    # those seconds letting the finished board stand still before it collapses
    # into its headings, and the format's premise is that the viewer sees the
    # whole field before any part of it means anything. That leaves a
    # motionless tail of about three and a half seconds.
    "map": {"kind": "columns", "park": True, "reserve": 6.2, "columns": [
        {"head": "per chip", "tone": "subject", "items": [
            "Nvidia: A100 to Rubin",
            "AMD: MI300X to MI400",
            "Google TPU: Ironwood",
            "Groq and Cerebras",
            "Huawei Ascend 960"]},
        {"head": "the scale-up domain", "tone": "number", "items": [
            "NVLink and NVSwitch",
            "AMD's Helios rack",
            "Huawei UnifiedBus",
            "Cornelis open fabric",
            "TPU ICI torus"]},
        {"head": "power and supply", "tone": "cost", "items": [
            "DRAM prices",
            "transformer lead times",
            "grid queues",
            "energisation"]},
    ]},

    # A claim, and a short beat to match its two reveals. The card carries the
    # question's spine; the narration says the full sentence, so they share
    # their key words without either reading the other out.
    #
    # No focus: the map was built one beat ago with all three columns lit, and
    # that is exactly the state a question about the whole board wants.
    "question": {"kind": "claim", "reserve": 2.8,
                 "text": "At what scale\nwas that measured?",
                 "note": "the chip, the rack, the grid connection"},

    # Toned `subject`: this is the first scale and the one the rest of the
    # episode keeps stepping away from.
    "chips": {"kind": "points", "tone": "subject", "reserve": 3.1,
              "focus": "per chip",
              "items": [
                  "memory, not arithmetic",
                  "Groq: no HBM, 230 MB on chip",
                  "Cerebras: 46,000 mm2 wafer",
                  "Positron raised $875M vs HBM",
                  "Ironwood: 50%, Google's own",
              ]},

    # Toned `number`, matching the column it lights, because every line here is
    # a measured bandwidth or a measured capacity rather than a verdict.
    "rack": {"kind": "points", "tone": "number", "reserve": 2.8,
             "focus": "the scale-up domain",
             "items": [
                 "NVLink, 1.8 terabytes a second",
                 "NVL72: 72 parts, one domain",
                 "outside: a twentieth of that",
                 "now contested three ways",
                 "or make the domain bigger",
             ]},

    # The header's first cell is "the claim" rather than blank: a blank corner
    # is the shape that slid a whole header one column left in an earlier
    # episode. It is fixed in `panel_table` now, and this table avoids it
    # anyway.
    #
    # Cells are kept to sixteen characters, because a three-column table has to
    # fit the roughly seven point eight units left beside the parked map.
    "rubin": {"kind": "table", "reserve": 3.0,
              "head": ["the claim", "measured how", "how to read it"],
              "rows": [
                  ["7x per megawatt", "pre-release", "Nvidia said 3x"],
                  ["1.4x-3x per TCO", "at 60-100 tok/s", "the one to use"],
                  ["67x per dollar", "an extreme point", "an outlier"],
              ]},

    # Toned `cost`, matching its column, and honestly: every line is something
    # that has to be paid for in time, power or money. The modelled profit line
    # is the exception and it sits here because it is denominated in gigawatts,
    # which is the point of the beat.
    "grid": {"kind": "points", "tone": "cost", "reserve": 3.6,
             "focus": "power and supply",
             "items": [
                 "15 GW scheduled, maybe dark",
                 "transformers: 48-60 months",
                 "per gigawatt: $149.9B profit",
                 "DRAM prices, up 500%",
             ]},

    # The take, as five lines that unfold with it rather than one card held
    # still for half a minute, which is what every overview in this series did
    # before the still-frame check could fire.
    #
    # One tone throughout. Colouring the first scales as `context` and the
    # megawatt line as `verified` would deliver a verdict the page does not:
    # the page says per-chip numbers stopped deciding who wins, not that they
    # stopped mattering.
    "close": {"kind": "points", "tone": "subject", "reserve": 3.5,
              "focus": ["per chip", "the scale-up domain", "power and supply"],
              "items": [
                  "ask at what scale",
                  "per chip: what fits in memory",
                  "per rack: what you can split",
                  "three funded challengers",
                  "per megawatt: what grids host",
                  "measured by somebody neutral",
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
