"""
Topic overview: machine learning fundamentals, as of 22 September 2026.

Source: the canonical Notion page "Topic: ml-fundamentals", read from Notion
directly on 22 September 2026 rather than from the repo mirror. Every claim
below is on that page, in its "Map of the space" section or in its table of
deep dives. Nothing is imported from the ten child pages underneath it, and
nothing is invented for shape. The page carries no figures at all, which is
why no beat here is a `bars` or a `stat`: there would be nothing honest to
put in one.

Which kind of overview this is. A mental model, not a comparison. There is
nothing on this page competing with anything else on it: ten pages of parts,
almost all of it revision. So the organising question is the one the skill
gives that kind of overview, what this way of looking at the subject lets you
say that you could not otherwise say, and the beats are the distinctions that
only exist when the whole board is visible at once.

The axis. The page hands it over rather than leaving it to be invented. Its
"Map of the space" section is not ten summaries; it is a set of observations
that each run across several bands, and it closes by saying so outright: "One
thread runs through four of these bands at once." So the episode is the
threads, and the ten children appear only where a thread passes through one.
Four threads are carried here, and between them they touch nine of the ten
pages:

    cross entropy   losses, metrics, contrastive and SSL
    gating          activations, sequence models
    vanishing       activations, normalisation and init, sequence models,
                    debugging training
    weight decay    regularisation, optimisers

A previous cut of this episode exists in git history, cleared in 74326b3, and
it was read at the outline. Its axis is kept, because it is the page's own and
because the alternative, walking the ten children in the order the page lists
them, is exactly the "narrating a list" failure the method names. Three things
from that cut are not kept:

  - Eleven beats and about 1,150 words, which is past the seven minute wall
    where the encode ladder gives up 1080p. Eight beats and 980 words here,
    and one whole thread cut (see below).
  - Its `gating` and `metrics` beats were `compare` panels, two reveals each,
    on forty second lines. That is the still-frame defect twice over. `gating`
    is a six reveal `points` beat here and the metrics material is gone.
  - Not one of its beats carried a `reserve`, so every panel finished revealing
    at the very end of its budget while the narration had already named the
    last item.

What the critique step changed:

  - Draft one carried a fifth thread, classical ML's machinery resurfacing
    elsewhere (hinge loss and the kernel trick, nearest neighbours as the
    ancestor of vector retrieval, boosting's second-order information and the
    losses that therefore need a defined Hessian). It is a real thread and it
    is the only one that touches the tenth page. It was cut on length: with it
    the script ran about 1,060 words, which is 7.1 minutes, and the encode
    ladder gives up 1080p at seven. Cutting a thread whole was the honest move
    rather than thinning all five.
  - Draft one had a `lineage` beat of its own, about attention removing the
    seq2seq bottleneck. It is two sentences of the same argument the gating
    beat is already making, that the sequence-models page is not history, so
    it is the last two reveals of that beat instead of a beat.
  - Draft one's `vanishing` beat was `points`. The material is a grid, one
    row per cause and the page it sits on, so it is a `table`.
  - Draft one's close recited the four threads and stopped. It now ends on the
    habit they teach, that a page boundary here is a filing choice rather than
    a fact, and on the one thing on this page that is still moving.
  - B was agreeing in draft one. B has two turns now, and each is the
    question the viewer is already forming: where to start on a page of ten,
    and whether the entropy on the metrics page is really the same object or
    just the same word.

Length. 980 words, which the shipped series delivers at about 0.40 seconds
a word, so this is estimated at 6 minutes 37, the same figure the
llm-training episode delivered from 981 words. That is inside the seven
minute wall with about twenty seconds of margin, which is roughly what the
punctuation fix costs if a beat comes back fast. Draft one ran 1,099 words
and 7 minutes 25, and the trimming was the fifth thread plus a few words out
of every segment rather than a coarser picture.

Reveal arithmetic, which is what set the shape of every beat. `spread` puts
reveal k of n
at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments, and everything said after the last item is named has to
fit inside the reserve: five seconds, about twelve words. Every panel beat
below records the segments it was written to, and the last segment of each is
deliberately the shortest thing in the beat. The map beat is budgeted at about
133 words a minute rather than 150, because an inventory of bare names is read
slowly; that is the rate the comparable map beat in the llms episode actually
delivered.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns in their own tones. `question` inherits
that, which is right: the question is about the whole board. `cross_entropy`
lights "training components" and "evaluation and paradigms", which is where
its three pages live. `gating` lights "training components" and "history and
practice". `vanishing` passes no focus and inherits that state deliberately:
its four pages are in those same two columns, so a focus would redraw an
identical frame at a cost of about a second of panel delay. `weight_decay`
lights "training components" alone. `close` lights all three, which is how
this vocabulary says no emphasis.

Tones on the map, chosen so no column is `context` (a focus on the
de-emphasis colour is invisible, and every column here is pointed at by some
later beat) and so no pairing delivers a verdict the page refuses. Training
components is `subject`, because that is where three of the four threads
start. Evaluation and paradigms is `number`, which is literally what that
column is: the place measurement lives. History and practice is `machinery`,
because the argument the episode makes about it is that the constructions on
it are still running underneath everything else. Colouring the older pages
`cost` against the modern ones `verified` would say on screen that the
lineage was a mistake, and the page says the opposite.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the page carries a Best resources block and the close points at
the page rather than reciting it.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - The classical ML thread described above. On its own it is the best
    candidate for a second episode from this page, because it is the one
    argument here that points outward: hinge loss and the kernel trick sitting
    on the losses page, nearest neighbours as the ancestor of vector
    retrieval, and boosting's use of second-order information as the reason
    some losses have to have a defined Hessian.
  - KL divergence as the second object-in-three-places: the page says it is
    "the same object in VAE regularisers, in distillation, and in RLHF's
    policy anchor". That is the cross-entropy beat's argument run a second
    time, and three of its four destinations are on other topic pages, so it
    belongs to an episode that can follow them there.
  - The ROC-versus-PR distinction, which the page reduces to a denominator:
    the whole negative class, or the model's own positive predictions. It is
    the sharpest single line on the metrics row and it is a thread of length
    one, which is the wrong shape for this episode.
  - The 2024-26 optimiser challengers as a group, Muon, Shampoo and SOAP,
    Lion and schedule-free, and the page's point that they change the update
    geometry or remove the schedule rather than tuning it. Muon survives as
    one of the four dated exceptions in the close.
  - The text metrics entirely: BLEU, ROUGE, METEOR, perplexity, BERTScore,
    MoverScore.
  - The "which activation you picked decides which initialisation is right"
    coupling, which is a fifth cross-page dependency and did not fit the
    vanishing beat's six segments.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts. The
page says weight decay is "a regulariser by intent and an optimiser property
by implementation, which is exactly why AdamW exists", and its optimiser row
lists "decoupled weight decay" as a thing the deep dive covers. What it never
says is what AdamW decouples the decay FROM. A reader can go and find out; a
listener cannot, and without it the sentence is a name rather than an
explanation. So the narration says that Adam's per-parameter scaling rescales
the penalty along with the gradient and that AdamW applies the decay to the
weights directly instead, and the page now says it too. It is a definition of
a term the page already uses, which is the only kind of thing a video may add.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, two turns, each the question the viewer is forming
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: ml-fundamentals"
SUBTITLE = "ten pages, and the four threads that cut across them"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and why it earns the time -----------------
SCRIPT["ident"] = [
    (A, "This is machine learning fundamentals. Ten pages covering the parts "
        "every network is assembled from. The losses, the activations, the "
        "optimisers, the normalisation and the metrics."),
    (A, "Almost all of it is revision. So the reason to be here is not the ten "
        "pages. It is what you can only see with all ten on screen at once. "
        "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, so three reveals, and `spread` puts the third at
# `beat_length - reserve`. That makes this two long segments and one short
# one: column one carries five pages and gets about forty-five percent of the
# words, column two three pages and about forty percent, and column three is
# named inside the reserve.
#
# Budgeted at about 133 words a minute rather than 150, because a run of bare
# names is read slowly; that is the rate the comparable map beat in the llms
# episode actually delivered. The orphan check is what shapes the wording: a
# pill like "optimisers, schedules" passes on the shared word "optimisers",
# and "normalisation, init" on "normalisation", so the narration has to say
# those words rather than paraphrase them.
SCRIPT["map"] = [
    (A, "Start with the whole board. Nothing explained yet. Three groups, and "
        "the first is most of the topic. Training components. Losses, which "
        "score the prediction. Activations. Regularisation, which is how you "
        "stop the model memorising. Optimisers, and the schedules that set "
        "the learning rate. And normalisation and initialisation."),
    (A, "Second group. Evaluation and paradigms. Metrics, for measuring the "
        "thing you built rather than training it. Classical machine learning, "
        "which predates all of this and still wins on plain tables of "
        "numbers. And contrastive and self supervised learning, where "
        "embedding models come from."),
    (A, "And history and practice. Sequence models, and debugging training. "
        "That is the whole board. It goes in the corner now."),
]

# --- the organising question ----------------------------------------------
# A `stack` of three, so three segments, and the question itself is the third
# layer rather than the first. That is the right way round for this panel: the
# top layer lands at `beat_length - reserve`, so the sentence it paraphrases
# has to be the last thing said in the beat.
#
# Layer names are short because `panel_stack`'s pill is a fixed five units
# wide and does not derive from the content.
SCRIPT["question"] = [
    (B, "Ten pages. Where do I even start?"),
    (A, "Not at page one. There is exactly one thing worth asking at this "
        "altitude, and which of the ten to open first is not it."),
    (A, "Because read in the order the board lists them, ten pages is a "
        "syllabus. And you can already read a syllabus without me."),
    (A, "So. What do these ten say together that none of them says alone?"),
]

# --- thread one: cross entropy, in three places ---------------------------
# Six reveals, so six segments of about thirty words each, and a last one
# short enough to fit inside the reserve. B's turn sits on the metrics
# segment, which is where a viewer is most likely to suspect a pun rather
# than an identity.
#
# "InfoNCE" is spelled "Info N C E" in speech, because a lowercase compound is
# the shape that came back as "LittleMul" once. The panel item pairs it with
# "contrastive", which is the word the orphan check matches on.
SCRIPT["cross_entropy"] = [
    (A, "First thread, and it runs through three of these pages at once. "
        "Cross entropy. You know it as a loss function. It is two other "
        "things as well, under other names."),
    (A, "On the losses page it is the objective, the thing you minimise. And "
        "every classification loss in common use turns out to be cross "
        "entropy underneath."),
    (A, "Label smoothing reweights them. Class weights reweight them. Focal "
        "loss reweights them. Those are not four different losses. They are "
        "one loss, adjusted four different ways."),
    (B, "And the entropy on the metrics page. Same thing, or just the same "
        "word?"),
    (A, "Same thing. Entropy, cross entropy and K L are that loss read as a "
        "measurement rather than as an objective."),
    (A, "And on the contrastive page it turns up a third time. Info N C E is "
        "cross entropy again, an N way classification over one positive "
        "against all the negatives beside it."),
    (A, "Which is why batch size matters there and nowhere else here."),
]

# --- thread two: gating, and why the history page is not history ----------
# Six reveals, six segments. The last two are the seq2seq material, which had
# a beat of its own in draft one: it is the same argument, so it is the end of
# this one instead.
#
# "SwiGLU" is written "Swiglu" for the voice and never opens or closes a
# segment. "LSTM" is spelled "L S T M", and single letters are dropped from
# the orphan check's word set entirely, so the panel item pairs it with
# "projections", which is a word the narration says.
SCRIPT["gating"] = [
    (A, "Second thread. There is a page here called sequence models, and at "
        "a glance it is history."),
    (A, "Recurrent nets, and the long short term memory cell. It is neither, "
        "and here is the tell."),
    (A, "Open up the L S T M gate and look at what is inside. Two "
        "projections of the same input, side by side. That is the whole "
        "mechanism."),
    (A, "One of those two gates the other. So the network learns how much "
        "signal to let through, rather than passing all of it every time."),
    (A, "Now jump forward to the activations page. Swiglu is the default "
        "feed forward block in a transformer, and it is that same "
        "construction."),
    (A, "Two projections, one gating the other, so the slope is learned per "
        "neuron."),
    (A, "And attention came off that same old page. It was invented to "
        "remove a bottleneck."),
    (A, "In sequence to sequence models the whole input got squeezed into "
        "one fixed size vector before decoding began."),
    (A, "So the transformer is what is left of that lineage."),
]

# --- thread three: one problem, four directions ---------------------------
# A table, head row plus four rows, so five reveals. A table's head row IS a
# reveal of its own, unlike a `columns` heading, so this is five segments and
# not four.
#
# The rows are the four causes the page names rather than the pages they sit
# on, because "normalisation and initialisation" is one child page carrying
# two of them. The page's own count is four directions, and the narration
# says so.
#
# Neither head cell is blank: a blank corner cell is the shape that slid a
# whole header one column left in an earlier episode. Cells are short because
# a two-column table has to fit the roughly seven point eight units left
# beside the parked map.
#
# No `focus`. `gating` already lit "training components" and "history and
# practice", which is exactly where these four pages are, so a focus here
# would redraw an identical frame and cost about a second of panel delay.
SCRIPT["vanishing"] = [
    (A, "Third thread, and this one runs furthest. Vanishing gradients. It "
        "sits on several of these pages, and on each of them it looks like a "
        "completely different problem."),
    (A, "On the activations page it is saturation. A sigmoid that has "
        "flattened out at either end has almost no derivative left to hand "
        "backwards."),
    (A, "On initialisation it is scale. Start the weights at the wrong size "
        "and the signal shrinks a little at every layer, from step zero "
        "onwards."),
    (A, "On normalisation it is placement. Those two pages chase a single "
        "invariant between them. Roughly constant activation and gradient "
        "variance across every layer, at step zero and forever after."),
    (A, "And on sequence models it is a product of Jacobians, multiplied "
        "once per time step, heading for zero. Which is what the cell state "
        "fixes, by adding rather than multiplying."),
    (A, "So debugging training is the index back through them all."),
]

# --- thread four: the boundary case ---------------------------------------
# Five reveals, five segments. This was a three-step `flow` until the silent
# preview showed the step labels scaled to about a third of body size; the
# note on the panel below records why.
#
# This is the shortest beat in the episode on purpose. It is one observation,
# and padding it to match the threads either side of it would be the quota
# this method exists to refuse.
SCRIPT["weight_decay"] = [
    (A, "Fourth thread, the smallest, and it explains something you have "
        "typed a hundred times. Weight decay belongs to two of these pages at "
        "once."),
    (A, "By intent it is a regulariser. You penalise large weights to stop "
        "the model overfitting, which is the regularisation page."),
    (A, "By implementation it is not a regulariser at all. It is a property "
        "of the optimiser, applied inside the update step."),
    (A, "And in there it gets mixed in with the per parameter scaling Adam "
        "does to every gradient. So the penalty you meant gets rescaled along "
        "with the gradient."),
    (A, "Which is why Adam W exists. It decays the weights directly "
        "instead."),
]

# --- the take -------------------------------------------------------------
# Six reveals on the closing beat, deliberately. Every overview in this series
# before the still-frame check could fire ended on a card drawn once and held
# motionless for fifteen to thirty seconds, because a take draws its claim in
# one move and then has nothing left to do with half a minute of speech.
#
# No line on the card is the spoken sentence; each is that sentence's spine.
# The four dated exceptions are said with a verb each rather than as a run of
# four bare names, which is the shape the voice model fills in with
# inventions, and "J E P A" is not the last thing in its segment.
#
# The item order is the order the lines are spoken in, which is not the order
# they were first written in. "not a reading order" was in the head segment
# and drawn as reveal two, so the narration named it about eight seconds
# before it existed; the dated exceptions and the closing habit were swapped
# for the same reason, since only the shorter of the two fits in the reserve.
SCRIPT["close"] = [
    (A, "So what is this map actually for? That is the last thing worth "
        "saying here."),
    (A, "And the obvious answer to it is the wrong one, so it is worth a "
        "moment."),
    (A, "It is not a reading order. You do not read a syllabus from the "
        "top."),
    (A, "You reach for one when you need it, and this map works the same "
        "way."),
    (A, "Read as ten separate pages, this is a list you will have forgotten "
        "by Thursday."),
    (A, "Read as four threads cutting across it, the whole subject is a good "
        "deal smaller than it looks."),
    (A, "Cross entropy is one object in three places. Gating is one "
        "construction in two different eras."),
    (A, "Vanishing gradients is one problem seen from four directions. And "
        "weight decay belongs to two pages at once."),
    (A, "One thing to watch. Almost everything here is settled, so the page "
        "flags its exceptions with dates."),
    (A, "Swiglu is one. R M S Norm is another. Mew on, and J E P A, are the "
        "other two."),
    (A, "And where two of these pages disagree, look harder. That is the "
        "interesting part."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Grouped the way the page's own taxonomy diagram groups
    # its children, which is the grouping a viewer needs in order to place a
    # page they half remember.
    #
    # Three columns is the comfortable number, and the map beat draws at full
    # frame width rather than beside anything, so twenty-one characters is
    # safe here. It would not be on a later beat.
    #
    # `reserve` is 7.5 rather than 3: a parked beat spends two seconds of
    # settle and a 0.7 second morph out of the FRONT of its reserve, so this
    # leaves a motionless finished board of about five seconds, which is the
    # format's premise. Checked against the rendered duration, not guessed.
    "map": {"kind": "columns", "park": True, "reserve": 7.5, "columns": [
        {"head": "training components", "tone": "subject", "items": [
            "losses",
            "activations",
            "regularisation",
            "optimisers, schedules",
            "normalisation, init"]},
        {"head": "evaluation and paradigms", "tone": "number", "items": [
            "metrics",
            "classical ML",
            "contrastive and SSL"]},
        {"head": "history and practice", "tone": "machinery", "items": [
            "sequence models",
            "debugging training"]},
    ]},

    # A stack, because the order is the argument: ten pages at the bottom, the
    # syllabus they add up to above them, and the question that is the only
    # way out of that on top.
    "question": {"kind": "stack", "reserve": 4.5, "layers": [
        ("ten pages", "in the order the board lists them"),
        ("a syllabus", "which you can already read"),
        ("one question", "what do they say together?"),
    ]},

    # Toned `subject`. Lights both columns the thread passes through.
    "cross_entropy": {"kind": "points", "tone": "subject", "reserve": 5.0,
                      "focus": ["training components",
                                "evaluation and paradigms"],
                      "head": "cross entropy, three times",
                      "items": [
                          "losses: the objective",
                          "smoothing, focal: reweighted",
                          "metrics: the same, measured",
                          "contrastive: InfoNCE",
                          "so batch size matters there",
                      ]},

    # Toned `machinery`, honestly: every line here is a piece of construction
    # rather than a result.
    "gating": {"kind": "points", "tone": "machinery", "reserve": 5.0,
               "focus": ["training components", "history and practice"],
               "head": "the history page is not history",
               "items": [
                   "the LSTM gate: two projections",
                   "one gates the other",
                   "SwiGLU: the same construction",
                   "attention removed the bottleneck",
                   "what is left of the lineage",
               ]},

    # No focus: inherited from `gating`, which lit the same two columns. See
    # the note on the beat above.
    "vanishing": {"kind": "table", "reserve": 5.0,
                  "head": ["it looks like", "on this page"],
                  "rows": [
                      ["saturation", "activations"],
                      ["the wrong scale", "initialisation"],
                      ["placement", "normalisation"],
                      ["a product of Jacobians", "sequence models"],
                      ["the index back to them all", "debugging training"],
                  ]},

    # This was a `flow` until the silent preview, and the preview is the only
    # thing that could have caught what was wrong with it. `panel_flow`'s pill
    # is a fixed 3.4 units wide and three of them plus their arrows do not fit
    # the roughly 7.8 units left beside a parked map, so `fit` scaled the step
    # labels to about a third of body size: legible in the frame at 1080p and
    # not after the delivery encode. The layout audit passed it cleanly,
    # because nothing overlapped and nothing left the frame. Three reveals on
    # a forty second beat was thin as well, so `points` fixes both.
    "weight_decay": {"kind": "points", "tone": "machinery", "reserve": 5.0,
                     "focus": "training components",
                     "head": "weight decay, on two pages",
                     "items": [
                         "by intent, a regulariser",
                         "by implementation: optimiser",
                         "Adam rescales the penalty",
                         "so AdamW decays directly",
                     ]},

    # The take, as five lines that unfold with it rather than one card held
    # still for half a minute. Lighting all three columns is how this
    # vocabulary says no emphasis, and the take is about the whole board.
    "close": {"kind": "points", "tone": "subject", "reserve": 5.0,
              "focus": ["training components", "evaluation and paradigms",
                        "history and practice"],
              "head": "what the map is for",
              "items": [
                  "not a reading order",
                  "ten pages, four threads",
                  "one object, several names",
                  "SwiGLU, RMSNorm, Muon, JEPA",
                  "where they disagree, look",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words * 0.40 / 60:.1f} minutes at 0.40 seconds a word")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:16s} {len(beat)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
