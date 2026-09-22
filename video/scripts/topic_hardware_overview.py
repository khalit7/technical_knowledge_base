"""
Topic overview: hardware, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: the unit of comparison
has moved twice in about two years, from the chip to the rack to the
substation, and most published numbers are still quoted at the wrong scale. So
the inventory is not a list of accelerators, it is three scales you can compare
at, and the organising question is which scale a given claim was measured at.
Getting that axis right was most of the work: the page carries enough part
numbers to make a catalogue, and a catalogue read aloud is not an episode.

This page is also the richest of the four in this batch on caveats, and they
are the reason the video exists in this shape. One headline figure the page
says outright should not be quoted, one measured on pre-release software, and
one vendor claim nobody outside the vendor has reproduced. Those go in, spoken,
rather than being quietly dropped.

The outline that survived the revision step:

    ident        what this is, and the claim that the unit moved twice
    map          the board in three columns, built and parked: per chip, the
                 scale-up domain, power and supply
    question     at what scale was that measured?
    chips        scale one: what a single part still decides, and the two
                 opposite bets the inference specialists took
    rack         scale two: the NVLink domain and the twentyfold cliff
    rubin        the measured Vera Rubin result, per gigawatt
    caveat       the numbers the page says not to quote, read out
    challengers  the scale-up tier is now contested three ways
    grid         scale three: energisation, not fabrication
    close        the take: performance per megawatt is the axis that pays

What the step-4 critique caught, and what changed:

  - Draft one opened on the seven times per megawatt figure. That is the exact
    number the page hedges hardest, and opening on it would have made the
    caveat beat a retraction. It moved behind the measured profit-per-gigawatt
    comparison, which is the number the page says to use.
  - Draft one had a beat on per-chip specifications and a separate beat on
    Groq and Cerebras. They are one story (memory, not arithmetic, is the
    constraint, and the specialists are that claim taken to its two extremes),
    so they merged into one beat.
  - The Nvidia datacentre revenue print and the Hugging Face acquisition were
    both in draft one. Neither does work on this spine, which is about the
    scale a number is measured at, so both were cut rather than shrunk. They
    belong to the page.
  - The DRAM price rise and the H.R. 9340 vote were a beat of their own. The
    supply story only earns its place as the mechanism under the grid
    constraint, so it became two sentences inside the grid beat.
  - B was agreeing in draft one. B now interrupts three times: once to name
    what the third column actually is, once to catch that the comparison is
    per gigawatt rather than per rack, and once to ask where the fifteen
    gigawatt figure came from, which is the question the page itself answers.

Every figure, part number and claim comes from the canonical page
"Topic: hardware", read from Notion on 22 September 2026. Nothing was invented
for shape, and the operating point the page flags as unrepresentative is named
as such rather than used.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers and names are spelled the way they should be said, because text to
speech reads "1.79 TB/s", "NVL72" and "H.R. 9340" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: hardware"
SUBTITLE = "the chip, the rack, the substation: at what scale was that measured?"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. The columns are deliberately not vendors: they are the
    # three scales a claim can be made at, which is the whole argument.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "per chip", "tone": "subject", "items": [
            "Nvidia: A100 to Vera Rubin",
            "AMD: MI300X to MI400",
            "Google TPU: v4 to Ironwood",
            "Groq, Cerebras, Trainium",
            "Huawei Ascend 960"]},
        {"head": "the scale-up domain", "tone": "machinery", "items": [
            "NVLink and NVSwitch",
            "AMD's Helios rack",
            "Huawei UnifiedBus",
            "Cornelis open fabric",
            "TPU ICI torus"]},
        {"head": "power and supply", "tone": "cost", "items": [
            "HBM and DRAM prices",
            "transformers: 48-60 months",
            "grid interconnection queues",
            "energisation, not fabrication"]},
    ]},

    "question": {"kind": "claim",
                 "text": "At what scale was that measured?",
                 "note": "we go left to right: the chip, the rack, the grid connection"},

    "chips": {"kind": "compare", "focus": "Nvidia: A100 to Vera Rubin", "sides": [
        {"head": "Groq LPU", "tone": "machinery", "items": [
            "no HBM at all",
            "~230 MB of on-chip SRAM",
            "every instruction timed at compile time",
            "deterministic latency at batch 1",
            "one model spans hundreds of chips"]},
        {"head": "Cerebras WSE-3", "tone": "subject", "items": [
            "declines to cut the wafer up",
            "~46,000 mm2, ~900,000 cores",
            "44 GB of SRAM on the wafer",
            "125 PFLOPS",
            "no inter-chip network at all"]},
    ]},

    "rack": {"kind": "points", "focus": "NVLink and NVSwitch",
             "head": "why the rack became the unit", "items": [
        "NVLink: 1.8 TB/s per Blackwell GPU",
        "NVL72: 72 GPUs in one domain",
        "outside it: 400-800 Gb/s per NIC",
        "roughly a twentieth of the bandwidth",
        "so the domain boundary picks your parallelism",
    ]},

    "rubin": {"kind": "bars",
              "head": "modelled at 75 tokens/s, per utility gigawatt",
              "bars": [
        {"label": "GB300 revenue", "text": "$114.9B", "value": 114.9,
         "tone": "context"},
        {"label": "GB300 profit", "text": "$105.3B", "value": 105.3,
         "tone": "context"},
        {"label": "Vera Rubin revenue", "text": "$159.5B", "value": 159.5,
         "tone": "number"},
        {"label": "Vera Rubin profit", "text": "$149.9B", "value": 149.9,
         "tone": "number"},
    ]},

    "caveat": {"kind": "points", "tone": "cost",
               "head": "the numbers not to quote", "items": [
        "7x tokens per megawatt: pre-release software",
        "Nvidia itself claimed 3x",
        "1.4x to 3x per TCO: use this one",
        "\"67x per dollar\": the page says do not quote it",
        "Ironwood 50% per dollar: vendor, unreproduced",
    ]},

    "challengers": {"kind": "table", "focus": "AMD's Helios rack",
                    "head": ["challenger", "the bet", "where it is"],
                    "rows": [
        ["AMD Helios", "72 GPUs, 31 TB HBM4", "2026"],
        ["Huawei UnifiedBus", "a domain of up to 1M processors", "1,000+ supernodes shipped"],
        ["Cornelis fabric", "open, GPU-agnostic scale-up", "$205M, shipping"],
    ]},

    "grid": {"kind": "stat", "big": "15 GW", "tone": "cost",
             "caption": "scheduled for 2027, and possibly dark",
             "note": "against an estimated 66 GW of US data-centre demand "
                     "by the same year"},

    "close": {"kind": "claim",
              "text": "The chip stopped being the unit.\nThe megawatt is.",
              "note": "which is why performance per megawatt is worth more "
                      "than any comparison of peak throughput"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of the hardware. The compute landscape everything else "
        "in this knowledge base runs on. Graphics processing units, tensor "
        "processing units, the custom inference chips, and the networks that "
        "tie them into one machine."),
    (A, "It earns an episode because the thing you are meant to compare moved "
        "twice in two years. It was the chip. Then the rack. This year it is "
        "the substation. Current as of the twenty second of September."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. The three columns are not "
        "vendors. They are the three scales you can compare at."),
    (A, "Per chip. Nvidia, A one hundred through to Vera Rubin. A M D, M I "
        "three hundred X up to M I four hundred. Google's tensor processing "
        "units up to Ironwood. The specialists, Groq, Cerebras and Trainium. "
        "And Huawei's Ascend nine sixty."),
    (A, "Then the scale up domain, meaning the chips wired closely enough that "
        "you can split one tensor across them. N V Link. Helios. UnifiedBus. "
        "Cornelis. The I C I torus."),
    (A, "And the third column. Memory prices, transformers on four to five year "
        "lead times, grid interconnection queues."),
    (B, "That last column is electricity and paperwork."),
    (A, "It is. And it decides how much of the first column ever runs."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So here is the question the map is arranged to answer. When somebody "
        "tells you one of these is faster, faster at what scale?"),
    (A, "We go left to right. The chip, the rack, the grid connection. The "
        "comparisons moved right twice, and most quoted numbers have not "
        "caught up."),
]

# --- scale one ------------------------------------------------------------
SCRIPT["chips"] = [
    (A, "Start at the part. Three properties of a single chip still decide what "
        "you can run on it. How much memory it has, how fast that memory is, "
        "and what number format it multiplies in. Memory, not arithmetic, is "
        "the constraint."),
    (A, "The two specialists on screen take that to opposite extremes. Groq "
        "removes high bandwidth memory entirely and holds the model in on chip "
        "static memory, about two hundred and thirty megabytes a chip. That "
        "buys latency deterministic to the cycle, and it costs spreading any "
        "real model over hundreds of chips."),
    (A, "Cerebras refuses to cut the wafer up at all. Nine hundred thousand "
        "cores on one piece of silicon, forty four gigabytes of memory on the "
        "wafer itself. For a model that fits, the network between chips does "
        "not exist."),
    (B, "Both of those are arguments about where the bytes sit."),
    (A, "Every interesting hardware argument now is."),
]

# --- scale two ------------------------------------------------------------
SCRIPT["rack"] = [
    (A, "Which is how the rack became the unit. Inside a scale up domain, "
        "N V Link gives a Blackwell part one point eight terabytes a second to "
        "its neighbours, and the N V L seventy two rack puts seventy two of "
        "them in one domain."),
    (A, "Step outside and you are on four hundred to eight hundred gigabits per "
        "network card. Look at those two rows together: roughly a twentieth of "
        "the bandwidth. Inside the domain, splitting one tensor across chips is "
        "affordable. Outside, it is not."),
]

# --- the measured result --------------------------------------------------
SCRIPT["rubin"] = [
    (A, "So, the first independent measurement of the new rack generation, and "
        "the method is half the story. SemiAnalysis replayed real agentic "
        "traffic across thousands of chips. Multi turn, long context, heavy "
        "prefix reuse, not the single turn traffic usually used."),
    (A, "Modelled at seventy five tokens a second, per utility gigawatt, Vera "
        "Rubin comes out at a hundred and fifty nine and a half billion dollars "
        "of revenue and a hundred and forty nine point nine billion of profit. "
        "G B three hundred is at a hundred and fourteen point nine and a "
        "hundred and five point three."),
    (B, "Per gigawatt. Not per rack, and not per chip."),
    (A, "Per gigawatt. That is what the chart is for."),
]

# --- the objection --------------------------------------------------------
SCRIPT["caveat"] = [
    (A, "Now the numbers not to quote, because this page is unusually careful "
        "about its own."),
    (A, "The headline from that same evaluation is up to seven times the token "
        "throughput per megawatt of G B three hundred. That is pre release "
        "software, against the three times Nvidia claimed for itself. The "
        "figure to use is the middle line: one point four to three times better "
        "throughput per total cost of ownership."),
    (A, "There is also a sixty seven times performance per dollar number going "
        "around. The page says plainly it is an extreme operating point and "
        "should not be quoted, so I am not going to. Google's fifty percent "
        "claim for Ironwood is the vendor's own, unreproduced."),
]

# --- the contested tier ---------------------------------------------------
SCRIPT["challengers"] = [
    (A, "The scale up tier is the one everybody is now attacking, in three "
        "different ways."),
    (A, "A M D's Helios rack is the like for like answer. Seventy two chips, "
        "two point nine exaflops, thirty one terabytes of H B M four. About "
        "four hundred and thirty gigabytes per chip, ahead of Vera Rubin on "
        "memory capacity."),
    (A, "Huawei's UnifiedBus is the second move. If you are behind on the chip, "
        "make the domain bigger. Up to a million linked processors, over a "
        "thousand supernodes already shipped. Against that twentyfold cliff, it "
        "reframes export control from chips to systems."),
    (A, "And Cornelis, an Intel spinout, raised two hundred and five million "
        "dollars for an open, vendor neutral fabric, attacking the software "
        "lock rather than the silicon."),
]

# --- scale three ----------------------------------------------------------
SCRIPT["grid"] = [
    (A, "Third column, and here the topic stops being about chips at all. "
        "Roughly fifteen gigawatts of compute scheduled for twenty twenty seven "
        "may sit dark, because the site will not be ready. High voltage "
        "transformers run on four to five year lead times, and grid "
        "interconnection queues are backlogged."),
    (B, "Where does the fifteen gigawatts come from?"),
    (A, "An Elon Musk post, so directional rather than audited, and the page "
        "says so. What is independently documented is the bottleneck underneath "
        "it. D R A M prices tell the same story, up roughly five hundred "
        "percent in twelve months."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what does the map say? Per chip numbers still decide what fits in "
        "memory, and they stopped deciding who wins. The rack decides what "
        "parallelism you can afford, and that tier now has three funded "
        "challengers, not one incumbent."),
    (A, "And if energisation rather than fabrication is the constraint next "
        "year, performance per megawatt decides how much capability a fixed "
        "grid connection can host. Which is why a seven times claim on that "
        "axis deserves more attention than any comparison of peak throughput. "
        "The number I want next is one measured by somebody not selling the "
        "part."),
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
