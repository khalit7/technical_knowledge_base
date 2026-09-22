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
    beat: move the words, not the reserve.
  - The question beat originally ran number, sub-finding, caveat. A `stat`
    has two reveals, so its note cannot be drawn later than about half the
    beat however the reserve is set, and the caveat was therefore on screen
    twenty seconds before it was spoken. The caveat moved up to sit directly
    behind the number, which is also the better order: qualify it, then say
    what to do with it.

Every `reserve` here was computed from `out/timing_*.json` after the voice
existed, not guessed, using reveal k landing at k/n of `beat_length -
reserve`. Two facts that arithmetic makes plain and that are worth writing
down, because both cost a re-render:

  - `spread` waits a full gap after the LAST reveal too, so a beat's
    motionless tail is about `beat_length / reveals` plus the reserve. A
    reserve cannot fix a still frame; it can only make one. The only lever is
    more reveals or a shorter beat, which is why `close` carries six items
    rather than the three-layer stack it started as.
  - A two-reveal panel (`stat`, `compare`) on a fifty-second beat cannot help
    finishing around the halfway mark. Where that matters, the narration has
    to move to meet it.

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
    (A, "Column two, the pipeline that turns one of those into the next. "
        "Extraction. Filtering. Deduplication. Then mixing and staging."),
    (B, "The first column is the one everybody talks about."),
    (A, "And the second is the one that separates the generations."),
    (A, "Column three is data nobody crawled. Synthetic text. S F T and "
        "preference data. Verifiable rewards. And environments, the newest "
        "thing here."),
    (A, "Every one of those corpora is Common Crawl underneath. What changes "
        "is the pipeline. That is the whole board, and it goes in the corner "
        "now."),
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
    "map": {"kind": "columns", "park": True, "reserve": 5.5, "columns": [
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
    "question": {"kind": "stat", "reserve": 0.0, "big": "3.24x",
                 # One line, not two. Breaking it after "data" rendered the
                 # second line as "th  an from models", a gap inside the word
                 # itself. Nothing reports that: the layout audit sees no
                 # overlap, nothing off frame and legible type. It was found
                 # by looking at the frame, which is what frames are for.
                 "caption": "more compute-efficiency gain from data "
                            "than from models, 2019 to 2025",
                 "note": "one decomposition, one window, not replicated"},

    # Two positions side by side, because the disagreement is the content and
    # a side-by-side makes the difference spatial rather than remembered.
    # A compare reveals one whole side at a time, two reveals, so "both sides
    # are on the screen" has to land after the second one: the reserve is set
    # from the rendered beat length so that it does.
    #
    # Tones. Subject against number, deliberately, and not cost against
    # verified: the page reports a live disagreement and takes no side, so the
    # frame may not award one. Drawing DCLM in the failure colour would say on
    # screen that aggressive filtering is a mistake, which is a verdict nobody
    # published.
    "filtering": {"kind": "compare", "focus": "the pipeline", "reserve": 11.0,
                  "sides": [
        {"head": "DCLM", "tone": "subject", "items": [
            "aggressive selection",
            "discard the rest",
            "the controlled benchmark"]},
        {"head": "Nemotron-CC", "tone": "number", "items": [
            "quality tiers",
            "rephrase the low tiers",
            "~4x more unique tokens"]},
    ]},

    # A stack, because the vertical order is the argument: this is one run
    # read top to bottom, and the whole point is that it is no longer one
    # homogeneous pass. No focus: `filtering` already lit the pipeline column
    # and a focus is column-level against a parked map, so re-lighting here
    # would redraw the identical frame and cost about a second of panel delay.
    "mixing": {"kind": "stack", "tone": "machinery", "reserve": 16.0,
               "layers": [
                   ("the bulk phase", "a broad mixture, most tokens"),
                   ("mid-training", "the last 10-30%: maths, code"),
                   ("long context", "a short final stage"),
               ]},

    # A points list rather than a table: these five do not vary along shared
    # axes, they are five kinds of manufactured data with five jobs, and the
    # narration's arc is that the further down you read the less it looks like
    # text. The heading renders in the subject colour whatever the tone says,
    # which is a known limitation of this panel kind.
    "synthetic": {"kind": "points", "tone": "subject",
                  "focus": "manufactured data", "reserve": 21.0,
                  "head": "text nobody crawled", "items": [
                      "from scratch: narrows style",
                      "rephrasing: rewrite a real page",
                      "SFT: traces verified first",
                      "preference: on-policy, judged",
                      "RLVR: prompt and verifier",
                  ]},

    # Two routes to the same object. No focus: `synthetic` already lit
    # manufactured data, which is the column both of these live in. Items stay
    # near twenty-two characters, which is what a compare side has room for
    # beside a parked map.
    "environments": {"kind": "compare", "reserve": 22.0, "sides": [
        {"head": "invert the generation", "tone": "subject", "items": [
            "a verified tool chain",
            "then the question",
            "correct by construction"]},
        {"head": "reconstruct it", "tone": "machinery", "items": [
            "a recorded trajectory",
            "rebuild the environment",
            "replayed, and checked"]},
    ]},

    # The take, as the one thing a viewer can use tomorrow: the same three
    # stages, reordered into the order to spend on them, and then the thing to
    # watch. One tone throughout, because colouring "the model" as a cost
    # would deliver a verdict the page does not. The page gives an ordering at
    # fixed compute, not a condemnation.
    #
    # Six reveals rather than three, and this is arithmetic rather than taste.
    # `spread` waits an equal gap after every reveal including the last, so a
    # beat's motionless tail is about (length / reveals) whatever the reserve
    # is: three reveals over forty seconds leaves thirteen seconds of a card
    # sitting still, which is the defect every overview in this series has
    # shipped with and which `check_timing` fails at six. The first draft was
    # a three-layer stack and measured 17.7 seconds. Six reveals and a shorter
    # take bring it under the limit; the reserve is zero because holding the
    # tail back is what causes the problem rather than what fixes it.
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
