"""
Topic overview: data curation and datasets, as of 22 September 2026.

Source: the canonical Notion page "Topic: data-curation-and-datasets", read
from Notion directly on 22 September 2026. Every corpus name, method, figure
and caveat below is on that page. Nothing is imported from the four deep
dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A mental model, not a comparison. There is
exactly one head-to-head on the page, DCLM against Nemotron-CC on how hard to
filter, and everything else is one process with stages: what you start with,
what you do to it, and what you manufacture once the crawl runs out. So the
map is three stages of one pipeline rather than a field of competitors, and
the tour walks it left to right without changing altitude.

That axis comes from the cut of this episode cleared in 74326b3, which found
it independently and recorded it in its own docstring. It is the hard-won
part and it is kept. Everything else is written fresh: that cut ran to eleven
beats against a spine that no longer exists.

The organising question is the page's own sharpest claim, and the reason this
page earns a video rather than a read: at fixed compute, data decisions move
benchmarks more than most architecture decisions do. Unlike most claims of
that shape it has been quantified, at 3.24x, and that figure is what turns
the map from an inventory into an argument.

The outline that survived the revision step:

    ident        what this is, the claim that earns the time, and the date
    map          three columns, built whole, parked as the home frame
    question     by how much, and which decisions: the figure, its
                 sub-finding, and how loosely to hold it
    filtering    column two: cheapest-first, and the live disagreement
    mixing       column two again: domain weights, and the death of the
                 single static mixture
    synthetic    column three: text nobody crawled, and model collapse read
                 honestly
    environments the newest thing on the page, manufactured two ways
    close        where the next week goes, and what to watch

What the critique step changed:

  - Draft one opened on the corpus lineage and held the 3.24x for the middle.
    That is backwards. The decomposition is the only reason the lineage is
    worth an evening, so it moved to beat three, directly behind the question
    it answers, and the lineage became its evidence rather than its preamble.
    (The cleared cut had already made this call, and it was right, so it is
    made again.)
  - Draft one gave the 3.24x one beat and its qualification another. One
    decomposition by one analyst over one window is not a separate argument,
    it is how the number should be said, so the caveat is now the last two
    lines of the beat that states it. That bought a whole beat.
  - Draft one ran to 1,172 words and about eight and a quarter minutes, which
    is past the rung where the encode gives up 1080p and near the one where
    the render fails outright. What bought most of it back was cutting the
    standalone corpora beat; see below for what that costs.
  - Draft one had a tooling beat: datatrove against the Dolma toolkit against
    NeMo Curator. A good table on the page, and a catalogue in a video,
    because nothing about it is an argument. Cut to one clause in
    `filtering`.
  - The CMR scaling law had its own beat. It is the same idea as the rest of
    the mixing beat, fit a law on cheap probe runs and solve for the ratio,
    so it became a sentence and then went entirely with the rest of the
    continued-pretraining thread.
  - `question` first said "there is a figure, and it is on the screen" in its
    second line, about ten seconds in, on a stat panel whose reveals are
    spread across the beat. The screen reference moved to sit on the number
    itself, which is where the panel has actually drawn.
  - B agreed with A in draft one. B now interrupts three times: to say which
    column people actually talk about, to point out that "small models" means
    nearly everybody, and to ask the obvious question about training on model
    output.
  - A trim pass turned commas into full stops rather than cutting words,
    which is the lever that actually works on pace.
  - The map beat named its third column at 29 seconds and `spread` drew it at
    38. Rather than fight that with `reserve`, which on a parked beat is the
    still frame at the end and so is capped at about 6 seconds, B's turn and
    A's answer moved between column two and column three. The naming then
    lands where the drawing already was. This is the general fix for a map
    beat: move the words, not the reserve. (It did not move them far enough,
    and the re-cut below moved them again. The instinct was right.)
  - The question beat originally ran number, sub-finding, caveat. A `stat`
    has two reveals, so its note cannot be drawn later than about half the
    beat however the reserve is set, and the caveat was therefore on screen
    twenty seconds before it was spoken. The caveat moved up to sit directly
    behind the number, which is also the better order: qualify it, then say
    what to do with it.

Every `reserve` here was computed from `out/timing_*.json` after the voice
existed, not guessed, using reveal k landing at `(k-1)/(n-1)` of
`beat_length - reserve`.

RE-CUT, 23 September 2026, timing only. The argument, the axis, the map, the
beats and the take are the first cut's. Four beats held a motionless frame
past the six second limit, the worst 22.3 seconds, and four reveals were
named before they were drawn, the worst 17.8. Both defects had one cause:
this file was written against an arithmetic that has since been corrected,
and the paragraph it used to carry here was wrong in the way that matters.

What it said, and what is actually true:

  - It said `spread` waits a full gap after the last reveal, so a beat's
    motionless tail is `beat_length / reveals` plus the reserve, and that a
    reserve "cannot fix a still frame, it can only make one". `spread` no
    longer waits that gap. The tail is `reserve + 0.35` on an ordinary beat
    and `reserve - 2.35` on a parked one, and it is therefore the reserve
    and nothing else. Four reserves here were set to 11, 16, 21 and 22 to
    buy leads back, and every one of them bought an equal number of seconds
    of frozen frame. Bringing them inside the cap, 5.5 ordinary and 8.4
    parked, is most of this re-cut.
  - It said a two-reveal panel "cannot help finishing around the halfway
    mark", which is the same error read the other way: reveal n lands at
    exactly `beat_length - reserve`, so everything said after the last thing
    is named has to fit inside the reserve. That is the single rule the
    whole re-cut turns on, and it is what condemned three panels here.

What changed, beat by beat, and why the cheap fix was not always available:

  - `filtering` and `environments` were `compare` panels on beats of 55.6
    and 37.7 seconds. A compare has exactly two reveals, one per side, so
    the second lands at `beat - reserve` and wanted reserves of 11.8 and
    12.4 against a ceiling of 5.5. There is no row to add on a compare, and
    a `table` is worse here than it looks: both beats run one side and then
    the other, while a table reveals a row at a time across both, so every
    row is named in the first half and drawn in the second. Both became
    `points`. What is lost is the side-by-side, and that is a real loss; it
    is bought back in `environments` by a heading that names both routes at
    t=0, and in `filtering` by a row that does the same.
  - `mixing` kept its stack and gained one layer, which is the cheap fix
    working as advertised: ten seconds of narration followed "long context"
    and had no reveal to land on.
  - `synthetic` lost its heading and gained a row, for the same reason at
    both ends.
  - `question` is the case where neither lever exists. A `stat` has two
    reveals and the second is the note, so the note can only paraphrase the
    last thing said in the beat, and it was carrying the caveat, spoken
    twenty seconds earlier. Re-pointing it is the only move. The caveat
    leaves the frame and stays in the narration.
  - `map` is the case where the visuals could not fix it at all, and the
    only re-render this cut paid for. A `columns` panel reveals once per
    column, the map is three columns by construction, and forty-two of the
    beat's 123 words came after column three was first named: nineteen
    seconds of tail against a parked ceiling of 8.4, so no reserve within
    reach could close a 14.3 second lead. Splitting a column would have put
    four headings on screen under a narrator saying "column three". So the
    words moved: B's line and A's answer went up ahead of column two, the
    Common Crawl summary came out of the closing turn and became the bridge
    into column three, and "the newest thing here" moved from the end of the
    column-three list to the clause that opens it. Twenty-two words now
    follow the first naming, which fits. Two words were dropped and none
    added; the take came back at 131 words a minute, cer 0.003, and the
    transcript was read against the line.

One reveal is left that no check can time: `filtering`'s "DCLM against
Nemotron-CC", because the narration spells D C L M out letter by letter and
never says the two names as one run. Hand-timed: it is drawn at 23.6 seconds
and its names are spoken at 26.9 and 40.8, both after, which is the safe
direction. `environments`' heading is untimed too and cannot be otherwise,
being reveal one of its beat.

One defect this re-cut does not fix, because it is not what `still`
measures. `question` is a 54.7 second beat with two reveals, so the frame
moves at the top and then not again until 49 seconds in. `still` scores only
the tail, from the last motion to the end, so it reports 5.8 and passes. The
honest fix is a panel with more rows, and there is no panel kind in this
vocabulary that draws one large number with rows under it. Written again
from scratch, this beat would not be a `stat`.

Why there is no beat of its own for column one, which is the decision a
reader of the page will query first. Its content is a list of names, and its
one argument, that what separates the generations is a better quality
classifier rather than more raw data, is a claim about column two. So the
lineage is named in full during the map beat, in the page's own order, and
the argument is handed to `filtering` where the classifier actually lives.
What is lost is the dates and a flow picture of the descent. A 4-step flow
was drafted and would not have survived anyway: a flow pill is a fixed 3.4
units wide plus a one-unit arrow, so four steps are about eighteen units
squeezed into the 7.8 that is left beside a parked map, and `fit` then takes
the labels under the legibility floor.

Lit state of the map, decided per beat rather than left to inherit:
`question` inherits the fully lit map the build leaves behind, which is the
state it wants. `filtering` lights the pipeline, and `mixing` inherits that
rather than re-lighting it: both beats live in that column, a focus is
column-level against a parked map, so re-lighting would redraw the identical
frame and cost about a second of panel delay for no change on screen.
`synthetic` lights manufactured data and `environments` inherits it, for the
same reason. `close` lights all three, which is how this vocabulary says no
emphasis. Column one is never lit alone, because no beat is about it alone.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for exactly that reason. No resources card either, which is a deep
dive's obligation; the take points at the page, and the page carries the
FineWeb blog post, the DCLM, Nemotron-CC and Tulu 3 papers, and the CMR
scaling law.

What was cut from an 1,837-word page, so the next person can see the second
episode sitting there rather than rediscover it:

  - The tooling table: datatrove, the Dolma toolkit, NeMo Curator, Spark and
    Ray. Four rows of "when to use", which is a thing to look up rather than
    a thing to watch. datatrove survives as one clause, because the library
    behind FineWeb is worth being able to name.
  - Decontamination and PII scrubbing, named on the map inside "the pipeline"
    and never explained. The page hands contamination checking to
    Topic: benchmarks.
  - The CMR (Critical Mixture Ratio) scaling law, and with it the whole
    continued-pretraining thread. The page hands CPT mechanics to
    Topic: fine-tuning-and-adaptation, so the episode stops at the general
    mixing idea. This is the omission that hurts most, because "how much
    replay" is the question a practitioner actually arrives with.
  - Self-instruct, LIMA and UltraFeedback as named datasets. The arc they sit
    in, self-instruct to verified distillation, human labels to on-policy and
    a judge, is what a viewer can use; the names are a reading list.
  - The 150-350M recommendation, FineWeb-Edu plus a small code and maths
    sprinkle. The single most actionable line on the page, and also a recipe,
    which reads off a page far better than it plays.
  - FineWeb2, FinePDFs, Dolma 1-3 by version, and the Nemotron-CC v1 to v2.1
    history. The map names the families; the version numbers are the page's.

The second episode this page obviously holds is the pipeline itself, as a
deep dive: extraction, language ID, heuristics, the classifier, MinHash and
suffix-array dedup, decontamination, with FineWeb's and DCLM's per-stage
ablations as the evidence. One mechanism followed down, which is a deep dive
rather than a second overview.

Two things this episode says that the page did not, and which were
back-ported to Notion in the same session, because the page is the thing that
lasts: why manufactured data exists at all (the crawl is finite, which the
page implies with "once your token horizon is the binding constraint" but
never states), and the arc of column three, documents then pairs then whole
environments, which the page's four sub-headings contain but do not say.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, and A does something different after each

Names are spelled the way they should be said. Text to speech reads "C4",
"DCLM", "SFT", "RLVR", "Nemotron-CC" and "3.24x" badly, so acronyms are
spaced out and every figure is written as words on the spoken line.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: data-curation-and-datasets"
SUBTITLE = "the decisions that move benchmarks more than architecture does"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of data curation and datasets. The data side of "
        "training a large language model. Where pretraining tokens come from. "
        "How a raw web crawl becomes a corpus. How the post training data "
        "gets built."),
    (A, "It earns an episode because of one claim, the sharpest in this "
        "knowledge base. At fixed compute, data decisions move benchmarks "
        "more than most architecture decisions do. And somebody has now put a "
        "number on it. Current as of the twenty second of September, twenty "
        "twenty six."),
]

# -- the inventory, named before anything is explained ---------------------
SCRIPT["map"] = [
    (A, "Three columns. Everything named, nothing explained yet."),
    (A, "Column one, the corpora. Nearly all of it descends from Common "
        "Crawl. C four and the Pile. RefinedWeb. FineWeb and D C L M. Dolma "
        "three and Nemotron C C."),
    (B, "The first column is the one everybody talks about."),
    (A, "And the second is the one that separates the generations."),
    (A, "Column two, the pipeline that turns one of those into the next. "
        "Extraction. Filtering. Deduplication. Then mixing and staging."),
    (A, "Every one of those corpora is Common Crawl underneath. What changes "
        "is the pipeline."),
    (A, "Column three is data nobody crawled, and it is the newest thing "
        "here. Synthetic text. S F T and preference data. Verifiable "
        "rewards. And environments."),
    (A, "That is the whole board. It goes in the corner."),
]

# -- the organising question, and the figure that answers half of it -------
SCRIPT["question"] = [
    (A, "So, the question this map is arranged to answer. If data really does "
        "beat architecture at fixed compute, by how much, and which "
        "decisions?"),
    (A, "For the first half there is now a figure. A decomposition published "
        "this month split the compute efficiency gains from twenty nineteen "
        "to twenty twenty five in two. Improvements to the data, and "
        "improvements to the model."),
    (A, "Data contributed three point two four times more, and that is the "
        "number on the screen. The two barely interact, so you are not "
        "trading one against the other."),
    (A, "One decomposition, one window, and nobody has replicated it. Hold it "
        "loosely."),
    (A, "The sub finding is the one to act on, though. Small models gain most "
        "from data quality."),
    (B, "Which is almost everybody outside a frontier lab."),
    (A, "Exactly. Curation pays best where compute is scarcest."),
]

# -- column two, first half: the live disagreement -------------------------
SCRIPT["filtering"] = [
    (A, "Column two, then, and it runs cheapest first. U R L filtering. "
        "Extraction. Language identification. Heuristics. Then a model based "
        "quality classifier. Then deduplication. Datatrove, the library "
        "behind FineWeb, runs all of it."),
    (A, "One stage dominates, and it is that classifier. Which is also where "
        "the live disagreement sits. How hard should you filter?"),
    # "DataComp" as one word was swallowed whole by two different seeds: both
    # takes said "D C L M argues for aggressive selection" and dropped the
    # expansion, which the character gate passed at 0.043. Split into two
    # words, with "which is" to make the appositive speakable, it survives.
    (A, "Both sides are on the screen. D C L M, which is Data Comp for "
        "Language Models, argues for aggressive selection. Keep what scores "
        "well, discard the rest. It is also the controlled benchmark everyone "
        "measures against."),
    (A, "Nemotron C C sorts into quality tiers instead, and rephrases the low "
        "tiers rather than dropping them. Four times more unique tokens at "
        "the same quality. That matters once your token horizon binds."),
]

# -- column two, second half: mixing and staging ---------------------------
SCRIPT["mixing"] = [
    (A, "Last stage, and the underrated one. What share of the token budget "
        "each domain gets. Web, code, maths, papers, books. It changes what "
        "the model can do at fixed compute."),
    (A, "And you can choose without the real run. DoReMi reads domain weights "
        "off a small proxy. Data Mixing Laws fit loss against the "
        "proportions. RegMix is a cheap regression over tiny runs."),
    (A, "The bigger change is the shape on the screen. The static mixture is "
        "gone. A broad bulk phase, most of the tokens. Then mid training over "
        "the last ten to thirty percent, upweighting maths and code as the "
        "rate decays. Then a short long context stage."),
    (A, "It works because scarce good tokens are not diluted across ten "
        "trillion tokens of web. And patterns stick when the rate is already "
        "low."),
]

# -- column three ----------------------------------------------------------
SCRIPT["synthetic"] = [
    (A, "Column three. Nobody crawled any of this, and the reason is simple. "
        "The crawl is finite and your appetite is not."),
    (A, "Generating documents from scratch works, the textbooks are all you "
        "need line, but it narrows style and shapes skills towards "
        "benchmarks."),
    (A, "What went mainstream instead is rephrasing. Have a model rewrite a "
        "real web page into a cleaner register. You keep the diversity of the "
        "source and fix only the form."),
    (A, "Below that, the post training data. Fine tuning moved to curated "
        "distillation, with traces verified first. Preference data is on "
        "policy, judged by a model. And verifiable rewards swap the reward "
        "model for a checker. A prompt, and a verifier."),
    (B, "Is training on model output not the thing that ruins models?"),
    (A, "Model collapse. Real in the experiment that named it, which assumed "
        "recursion replacing human data. Accumulate rather than replace. "
        "Ground it in real documents. Filter."),
]

# -- the newest thing on the page ------------------------------------------
SCRIPT["environments"] = [
    (A, "Which points at the newest part of the page, and it is not text. If "
        "verifiable reward training consumes environments rather than "
        "documents, somebody has to manufacture them."),
    (A, "Two ways, and both are on the screen."),
    (A, "Invert the generation. Build a verified tool chain first, then write "
        "the question that asks for it, so the answer is correct by "
        "construction."),
    (A, "Or reconstruct it. Take a trajectory recorded inside an environment, "
        "and rebuild the environment around it, so the whole thing can be "
        "replayed and checked."),
    (A, "A third kind of training data, beside text and preferences, with the "
        "least settled practice of anything here."),
]

# -- the take --------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? It says where your next week goes."),
    (A, "If the decomposition is even roughly right, then at fixed compute "
        "the mixture and the filter are worth more than the architecture. The "
        "smaller your model, the more true that is."),
    (A, "So, the mixture first. Domain weights and staging. Then the filter, "
        "one classifier deciding what survives. And the model last, which is "
        "the one people reach for first."),
    (A, "And column three keeps growing. Documents, then pairs, then whole "
        "environments. Least settled practice is where the next gain hides."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: three stages of one process, not three
    # subjects and not a field of competitors. Three columns rather than four,
    # because the pill width is derived from the column count and a fourth
    # takes the labels below what the delivery encode can show. Items stay
    # near twenty characters for the same reason.
    #
    # Tones. Verified for the corpora, artefacts already built and already
    # measured. Machinery for the pipeline, which is literally the apparatus
    # that turns one of them into the next. Subject for manufactured data,
    # because that column holds the page's newest material and is where the
    # take lands. None of the three is toned `context`, so every one of them
    # has somewhere to brighten from when a later beat lights it.
    #
    # `reserve` is what makes the last line true. Without it the third column
    # finishes drawing on the final word and the park morph then runs after
    # the line has stopped, collapsing the map into silence.
    #
    # 8.1 is the parked ceiling less a frame or two of margin: `still` on a
    # parked beat is `reserve - 2.35` (settle 2.0, morph 0.7, minus the 0.35
    # tail), so 8.35 is where the six second limit bites, and the measured
    # figure wanders about a sixth of a second either side of the arithmetic
    # because waits quantise to the frame. 8.3 measured 5.93, which is a pass
    # that could as easily have been a fail. On a parked map raising the
    # reserve is a pure win, because every column is drawn earlier as well.
    "map": {"kind": "columns", "park": True, "reserve": 8.1, "columns": [
        {"head": "the corpora", "tone": "verified", "items": [
            "C4 and the Pile",
            "RefinedWeb",
            "FineWeb and DCLM",
            "Dolma 3, Nemotron-CC"]},
        {"head": "the pipeline", "tone": "machinery", "items": [
            "extraction",
            "filtering",
            "dedup",
            "mixing and staging"]},
        {"head": "manufactured data", "tone": "subject", "items": [
            "synthetic text",
            "SFT and preference",
            "verifiable rewards",
            "environments"]},
    ]},

    # The figure, alone and large, because it is the one number the whole
    # episode rests on. The note carries the qualification rather than leaving
    # it to the narration: a caveat that is only spoken is a caveat the person
    # screenshotting the frame does not get.
    #
    # No focus: the map was built one beat ago with every column lit, which is
    # exactly the state this beat wants.
    "question": {"kind": "stat", "reserve": 5.5, "big": "3.24x",
                 # One line, not two. Breaking it after "data" rendered the
                 # second line as "th  an from models", a gap inside the word
                 # itself. Nothing reports that: the layout audit sees no
                 # overlap, nothing off frame and legible type. It was found
                 # by looking at the frame, which is what frames are for.
                 "caption": "more compute-efficiency gain from data "
                            "than from models, 2019 to 2025",
                 # A `stat` has exactly two reveals and the second is the
                 # note, so the note lands at `beat - reserve` and can only
                 # paraphrase the LAST thing said in the beat. It used to
                 # carry the caveat, which is spoken twenty seconds before
                 # the end, and was therefore drawn 17.8 seconds after the
                 # words that name it: the worst lead in the episode. There
                 # is no row to add on a two-reveal panel, so the fix is to
                 # re-point the note at the closing sentence. What that costs
                 # is the caveat on the frame, which the first cut wanted
                 # there for the person screenshotting it; it survives in the
                 # narration, twice, and the caption cannot take it without
                 # running to a second line, which broke inside a word the
                 # last time this panel was given one.
                 "note": "curation pays where compute is scarce"},

    # This was a `compare`, and a compare cannot survive a fifty-five second
    # beat: it has exactly two reveals, one per side, so the second one lands
    # at `beat - reserve` however the reserve is set. Nemotron-CC is named at
    # 40.8 seconds with fifteen seconds of narration still to come, which
    # wants a reserve of 11.8 against an ordinary ceiling of 5.5. The old cut
    # bought the lead down by setting the reserve to 11.0 and paid for it with
    # 11.3 seconds of motionless frame. There is no row to add on a compare,
    # and a table is worse here: the narration runs one side and then the
    # other, while a table reveals a row at a time across both, so every row
    # is named in the first half and drawn in the second.
    #
    # So: a list, which is what a beat whose narration is sequential wants.
    # Eight rows over the beat is one every seven seconds, and it lets the
    # first twenty-five seconds land on something, which the compare never
    # did: the whole cheapest-first pipeline had no reveal at all.
    #
    # Row four is what keeps "both sides are on the screen" honest. It is
    # drawn at 23.6 seconds and the line is spoken at 25.6, so both names are
    # up by then. It is the one reveal here the lead check cannot time, since
    # the narration spells D C L M out letter by letter and never says the
    # two names as one run; timed by hand, its names are spoken at 26.9 and
    # 40.8, both after it is drawn, which is the safe direction.
    #
    # Tones. One tone for the whole list, which sidesteps the trap the
    # compare had to dodge by hand: the page reports a live disagreement and
    # takes no side, so the frame may not award one.
    "filtering": {"kind": "points", "tone": "machinery",
                  "focus": "the pipeline", "reserve": 5.5, "items": [
                      "cheapest first: extraction",
                      "a classifier, then dedup",
                      "one stage dominates",
                      "DCLM against Nemotron-CC",
                      "DCLM: aggressive selection",
                      "Nemotron-CC: quality tiers",
                      "rephrased, ~4x more tokens",
                      "once the token horizon binds",
                  ]},

    # A stack, because the vertical order is the argument: this is one run
    # read top to bottom, and the whole point is that it is no longer one
    # homogeneous pass. No focus: `filtering` already lit the pipeline column
    # and a focus is column-level against a parked map, so re-lighting here
    # would redraw the identical frame and cost about a second of panel delay.
    #
    # The fourth row is arithmetic, not decoration. Reveal n lands at
    # `beat - reserve`, so everything said after the last row is named has to
    # fit inside the reserve, and ten seconds of narration followed "long
    # context". Three rows therefore wanted a reserve of 7.5 against a
    # ceiling of 5.5, and the old cut set 16.0 and froze the frame for
    # sixteen seconds. A row whose words are spoken in that last sentence
    # fixes it outright, and the sentence had no reveal of its own anyway.
    "mixing": {"kind": "stack", "tone": "machinery", "reserve": 5.5,
               "layers": [
                   ("the bulk phase", "a broad mixture, most tokens"),
                   ("mid-training", "the last 10-30%: maths, code"),
                   ("long context", "a short final stage"),
                   ("why it works", "not diluted, patterns stick"),
               ]},

    # A points list rather than a table: these five do not vary along shared
    # axes, they are five kinds of manufactured data with five jobs, and the
    # narration's arc is that the further down you read the less it looks like
    # text. The heading renders in the subject colour whatever the tone says,
    # which is a known limitation of this panel kind.
    #
    # Two changes, both timing. The heading went: it is drawn at the head of
    # the beat, but a `focus` beat spends 3.75 seconds lighting the map
    # first, so a heading paraphrasing the beat's opening words was already
    # three seconds behind them, and it pushed every real row one place later
    # for nothing. And a row was added for the model-collapse answer, which
    # is the last twelve seconds of the beat and used to have no reveal to
    # land on: without it the last row sits at `beat - reserve` and wants a
    # reserve of 13.2 against a ceiling of 5.5, which is how this beat came
    # to hold a still frame for 21 seconds.
    #
    # "on policy" rather than "on-policy": the hyphen makes one token of two
    # words the narration says separately, which the lead check cannot match
    # at all, so the row was silently untimed.
    "synthetic": {"kind": "points", "tone": "subject",
                  "focus": "manufactured data", "reserve": 5.5,
                  "items": [
                      "from scratch: narrows style",
                      "rephrasing: rewrite a real page",
                      "SFT: traces verified first",
                      "preference: on policy, judged",
                      "RLVR: prompt and verifier",
                      "accumulate, not replace",
                  ]},

    # Two routes to the same object. No focus: `synthetic` already lit
    # manufactured data, which is the column both of these live in.
    #
    # This was a compare too, and it failed the same way: two reveals, the
    # second one named at 22.3 seconds with fifteen still to run, wanting a
    # reserve of 12.4 against a ceiling of 5.5. The old cut set 22.0 and held
    # a motionless frame for 22.3 seconds, the worst in the episode.
    #
    # The heading is what buys back the thing the compare was for. It names
    # both routes and is drawn at t=0, so "two ways, and both are on the
    # screen", spoken eleven seconds in, is true of the frame; the rows then
    # walk the two routes in the order the narration takes them, two rows for
    # the first, three for the second, and a last row for the closing line,
    # which is what keeps the final reveal inside the reserve. The heading is
    # the one reveal the lead check cannot time, and it cannot produce a lead
    # either, because reveal one is drawn at the top of the beat.
    "environments": {"kind": "points", "tone": "subject", "reserve": 5.2,
                     "head": "invert it, or reconstruct it", "items": [
                         "a verified tool chain first",
                         "correct by construction",
                         "a trajectory, recorded",
                         "rebuild the environment",
                         "replayed, and checked",
                         "least settled practice",
                     ]},

    # The take, as the one thing a viewer can use tomorrow: the same three
    # stages, reordered into the order to spend on them, and then the thing to
    # watch. One tone throughout, because colouring "the model" as a cost
    # would deliver a verdict the page does not. The page gives an ordering at
    # fixed compute, not a condemnation.
    #
    # Six reveals rather than three, and this is arithmetic rather than taste,
    # though not the arithmetic the first cut wrote down here. The tail is the
    # reserve and nothing else, so six reveals do not buy still time directly;
    # what they buy is somewhere for the last sentence to land, which is the
    # same thing seen from the other end. The first draft was a three-layer
    # stack and measured 17.7 seconds, because its closing line had no reveal
    # and therefore sat past the last one. This beat is the only one in the
    # episode the re-cut did not have to touch: reserve zero, still 0.6, worst
    # lead 2.2, because the last row is the last thing said.
    "close": {"kind": "points", "tone": "subject", "reserve": 0.0,
              "focus": ["the corpora", "the pipeline", "manufactured data"],
              "head": "where the next week goes", "items": [
                  "the mixture: weights, staging",
                  "the filter: one classifier",
                  "the model: last, at fixed compute",
                  "and column three keeps growing",
                  "documents, pairs, environments",
                  "where the next gain hides",
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
