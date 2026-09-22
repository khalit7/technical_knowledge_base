"""
Topic overview: math, as of 22 September 2026.

Source: the canonical Notion page "Topic: math", fetched from Notion rather
than from the repo mirror on 22 September 2026 (page_last_edited_at
2026-09-22T00:01). Every claim, name and figure below is on that page.
Nothing is imported from the four deep dives underneath it, which is the trap
the method names for a topic overview: a number that lives only on a page
below this one does not belong in the overview.

Which kind of overview this is. A mental model, not a comparison. The method
names this page explicitly as the example of the kind, and it is right: there
is no field of competitors here, nothing does the same job differently, and
"which of these four is best" is not a question anybody has. So the organising
question cannot be what separates them. It is the page's own: what does each
area let you say about a model that you could not otherwise say? The page's
central section is literally called "What each area buys you".

The axis, which is most of the work of a new overview. The page's own taxonomy
diagram is four areas with their contents hanging off them, and the prose that
follows is one paragraph per area plus a fifth paragraph on what only appears
once all four are in view. That is the axis: four areas, four different kinds
of answer, and then the convergence. The alternative axis, a tour of the four
deep-dive pages in the order the table lists them, is a table of contents read
aloud, and it is also the same four things in a worse order.

The cut cleared in 74326b3 found the same axis, and it is the page's rather
than that cut's, so it is kept. Four things from that cut are not:

  - It ran twelve beats. At this vocabulary's reveal pacing that is well past
    eight minutes, near the rung where the encode fails outright. Ten here.
  - Its map column for probability read "likelihood to loss", "MLE, MAP,
    Bayesian", "bias and variance", "tests, CLT, bootstrap" on a four-column
    map. Four columns nominally derive a 2.5-unit pill, and a pill grows to
    fit its label rather than scaling it, so the long items would have made
    that column visibly wider than the others and scaled the whole board down.
    Every item here is sixteen characters or fewer, which is what the two
    shipped four-column maps in this series used.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the end of its budget.
  - It spent a whole beat on forward versus reverse KL and another on
    curvature. Both are folded in below, for length.

What the critique step changed:

  - Draft one gave statistics a full `points` beat beside probability. They
    are the same column of the map and the same paragraph of the page, and the
    second beat was the first beat's caveats stretched to fill a slot. The
    statistics half is a short `stat` beat now, which is what it is: one
    number and the reason to distrust it.
  - Draft one closed the calculus beat on activation checkpointing, which left
    curvature with nowhere to go, and put the three readings of curvature in
    the take, where they arrived as a new idea in the last twenty seconds.
    Curvature is the calculus beat's punchline now: the Hessian is the
    condition number the linear algebra beat already named, and the Fisher
    information. That is a connection between two earlier beats rather than a
    new fact, which is what a fifth reveal should be.
  - Draft one's take listed five diagnoses and then explained curvature. The
    last segment of a beat has to fit inside the reserve, about a dozen words,
    so the explanation could not have landed there. The take is five
    diagnoses and a one-line rule now.
  - Draft one had B agreeing twice. B has two turns and both are the question
    the viewer is actually forming: "which of these do I need" at the hinge,
    and "people quote that at me" at the one-point gain.

What was cut, so the next person can see the second episode rather than
rediscover it:

  - Forward versus reverse KL. The page's own sentence is that the asymmetry
    explains why MLE-trained models cover every mode while RLHF-style KL
    penalties are mode-seeking and cost output diversity. It is the best
    single idea on the page that is not in this episode, and it cannot be said
    in the dozen words a reserve holds. It is a deep dive on "Information
    theory for ML", and it would carry one.
  - Convexity, and Lagrange multipliers as the machinery behind KL-constrained
    policy updates and behind reading a penalty as a norm-ball constraint.
    Named on the map, explained nowhere. Two abstractions that each need their
    own minute.
  - The gradient-descent divergence threshold at 2/lambda-max, and that
    ill-conditioning is what normalisation layers and good init are really
    fixing. Both are curvature consequences, and the curvature reveal is a
    twelve-word tail.
  - Mutual information and InfoNCE as a pair. InfoNCE survives as the fourth
    hat of cross entropy, which is where it earns its place here; mutual
    information is named on the map and left there.
  - The whole "Map of the deep dives" table and the Best resources block. A
    resources card is a deep dive's obligation, not an overview's, and the
    take points at the page, which carries both.

Reveal arithmetic, which set the length. `spread` puts reveal k of n at
`(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants its
line written as n segments: the first n-1 naming one reveal each, and the last
short enough to fit inside the reserve, which is about a dozen words. Every
beat below records the segments it was written to. Six panel beats of five
reveals at ten seconds a reveal is five minutes before the title card, the map
or the hinge, which is why this is ten beats and not twelve.

Lit state of the map, decided for every beat rather than inherited by
accident. `map` builds all four columns lit. `question` inherits that, which
is right: the hinge is about the whole board. `linalg`, `probability`,
`calculus` and `information` each light their own column. `statistics` passes
no focus and inherits probability deliberately: the statistics half is the
same column of the map, and a redundant focus redraws an identical frame at a
cost of about a second of panel delay. `converge` lights all four, which is
how this vocabulary says no emphasis and is also the true statement about a
beat whose subject is what all four share. `close` inherits that.

Tones, chosen so no column is `context` (a focus on the de-emphasis colour is
invisible) and so no pairing delivers a verdict the page refuses. Linear
algebra is `subject`, probability `number`, calculus `machinery` and
information theory `verified`. Nothing is `cost`: there is no mistake on this
map, and colouring one area against another would say on screen that one of
them is the wrong thing to learn.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason.

Voice. The character gate passed all ten beats on the first render, at errors
between 0.000 and 0.023, and reading the transcripts as text caught two real
defects it could not see. Both are exactly the classes the method names:

  - A real word swapped for another. "So we will walk the map instead" came
    back as "walk the math instead" at a character error of 0.023, on a page
    whose subject is maths and whose spine is the map. It says "build the map"
    now, which removes the collision rather than gambling on a seed.
  - A trailing phrase eaten. "Choose a distribution for p of y given x, take
    the negative log likelihood" came back without "of y given x" at 0.016.
    That phrase is the whole move, and the panel header carries it. It has its
    own clause and its own verb now, "Say what p of y given x looks like",
    which is the fix the method prescribes for an eaten appositive.

A third could not be adjudicated from the transcript: "an attention head"
transcribed as "and a tension head". Every reading is plausible and the gate
cannot decide it, so it says "one attention head" and was re-rendered, on the
same principle as the elided "that".

Pace cost one reroll. `linalg` came back at 163 words a minute at the
renderer, which is above the 158 that corresponds to the 165 `check_timing`
actually fails on. Its commas became full stops and its one chained sentence
became three. No word was cut, and it reads at 147 for 1.3 seconds more.

Rerolling is not monotonic, and this episode paid for it. The map beat was
re-rendered once for the pill rename and came back with "bits per byte" as
"bits per bar bye" and a no-speech probability of 0.44, at a *better*
character error than the take it replaced. The next roll was clean at 0.002
and 0.01. Save the wav aside before every reroll; the one saved here was
against the previous text and could not have been put back.

What the lead check found, and it was a real defect reached by a false path.
`check_leads` reported the map naming "calculus" 16.3 seconds before that
column is drawn. The cause was that the linear algebra column's fourth pill
read "matrix calculus", so the word was said while the viewer was looking at
the wrong column, and the map carried two things labelled calculus at once.
The pill is "matrix layout" now and the line says "matrix layout conventions",
which is still the page's own term. Every map lead is negative after that.

One lead is accepted rather than fixed: `probability` names "categorical" 3.3
seconds before its row is drawn. The panel is a table whose reveal count is
fixed by the data, so the only lever is the reserve, and the reserve that
would close it is 8.0 against a still-frame ceiling of about 5.5. The naming
happens inside a sentence that continues over the reveal, and the method's own
threshold is two seconds of noise against six to rewrite.

Reserves were fitted to the rendered durations by least squares, solving for
the R that puts reveal k of n, at (k-1)/(n-1) x (L - R), about a second and a
half after the segment that names it begins. Eight of the ten held. `map` did
not, and for the structural reason the method records: the fit wanted 3.45,
which is above the 2.7 the park spends on settle and morph but leaves the
finished board only three quarters of a second standing still. It is 5.0 by
hand, which buys 2.67 seconds of the whole map motionless. `question` did not
either, because its two turns are 9 and 45 words: fitting to the start of turn
two asks for a reserve of 16. The note has to land on the sentence it
paraphrases, which is the last one, so it is 2.7.

Length. 6 minutes 57 at 1080p and 4.31 MiB, on the third and last 1080p rung
of the encode ladder. That is nearer the seven minute wall than is
comfortable, and the reason is worth recording: the two pace fixes above cost
about eight seconds between them, on an episode outlined at 6 minutes 31 by
the words x 0.40 estimate. Pace wins over length, which is the method's rule,
but a future cut wanting margin should trim the opening: 32 seconds at 130
words a minute is the slowest beat in the episode and the one carrying least.
Every still frame is between 1.9 and 4.95 seconds, and the closing beat's is
1.9.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: math"
SUBTITLE = "what each area lets you see"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, what it is, why it earns the time, how current ---------
SCRIPT["ident"] = [
    (A, "This is the mathematics behind machine learning. Four areas. Linear "
        "algebra, probability and statistics, calculus and optimisation, and "
        "information theory."),
    (A, "It earns an episode because it is almost always handed over as a "
        "prerequisite list, and a list tells you nothing about why any of it "
        "is there. Nobody learns it all first."),
    (A, "So we will build the map instead. Current as of the twenty second "
        "of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Four columns, four reveals, and `spread` puts the fourth at
# beat_length - reserve. So this is three long segments and one short one:
# about thirty words per column for the first three, and the fourth named
# inside the reserve. Budgeted at about 120 words a minute rather than 150,
# because a run of bare names is read deliberately and that difference is the
# single biggest source of reserve error in this vocabulary.
#
# The orphan check shapes the wording: a pill passes if it shares one
# significant word with this beat's narration, so "eigen, SVD, QR" survives on
# "eigen" alone (single letters are dropped from the word set), and "MLE and
# MAP" survives only on the contiguous squashed run, which is why the line
# says "M L E and M A P" with nothing between them.
SCRIPT["map"] = [
    (A, "Whole board first, and nothing explained yet. On the left, linear "
        "algebra. Rank. The decompositions, eigen, S V D and Q R. Low rank "
        "approximation, which is where Lora comes from. And matrix layout "
        "conventions."),
    (A, "Then probability and statistics. Why this loss, and not some other "
        "one. M L E and M A P. Bias and variance. And the paired tests that "
        "let you compare two models honestly."),
    (A, "Calculus and optimisation. Gradients, worked out rather than "
        "quoted. The chain rule, as vector Jacobian products. Hessians, and "
        "Newton's method. Convexity, and Lagrange multipliers."),
    (A, "And information theory. Entropy, cross entropy and K L. Mutual "
        "information. Bits per byte."),
]

# --- the organising question ----------------------------------------------
# A `claim` has exactly two reveals, so twenty-five seconds is its honest
# budget. The note lands at beat_length - reserve, so the sentence the note
# paraphrases is the last thing said.
SCRIPT["question"] = [
    (B, "So which of those four do I actually need?"),
    (A, "That is the question everybody asks, and it has no answer short of "
        "all of it. So here is a better one. What does each area let you say "
        "about a model that you could not otherwise say? Four areas. Four "
        "different kinds of answer."),
]

# --- linear algebra: the geometry of a representation ---------------------
# Head plus four rows. Five segments, the last a dozen words. The condition
# number is named here on purpose: the calculus beat's punchline is that the
# Hessian is this same object, and that only works if the viewer has met it.
SCRIPT["linalg"] = [
    (A, "Linear algebra is the notation all of it is written in. A layer is "
        "a matrix. One attention head is a pair of contractions."),
    (A, "Rank is how many independent directions a map actually uses. Fine "
        "tuning updates have low intrinsic rank. That observation is what "
        "Lora exploits. Low rank K V compression uses it too."),
    (A, "The S V D turns truncation into arithmetic. That is Eckart Young. "
        "It hands you the best approximation at whatever rank you pick."),
    (A, "The condition number predicts one thing. Whether your optimisation "
        "problem is a long narrow valley."),
    (A, "And layout convention is why a gradient in a paper arrives "
        "transposed in your code."),
]

# --- probability: why this loss and not another --------------------------
# A `table`, because the grid itself is the content: one assumption per row,
# one loss per row. Header plus four rows is five reveals, so five segments
# and a short fifth. The page's punchline, that the loss was never taste, is
# said at the end of segment four rather than in the tail, because eleven
# words is all the tail holds.
SCRIPT["probability"] = [
    (A, "Probability turns a loss from an arbitrary choice into a "
        "consequence, with one move. Choose a distribution. Say what p of y "
        "given x looks like. Take the negative log likelihood. The loss "
        "falls out."),
    (A, "Assume the target is Gaussian, and out comes mean squared error. You "
        "never chose it. You assumed a bell curve."),
    (A, "Assume Bernoulli, a single weighted coin flip, and you get binary "
        "cross entropy. That is every binary classifier you have trained."),
    (A, "Assume categorical, and you get softmax cross entropy, the "
        "objective every language model is trained on. These are proper "
        "scoring rules, so the optimum is the true probability, which is "
        "what makes calibration meaningful."),
    (A, "And Poisson gives the Poisson loss. None of that was taste."),
]

# --- statistics: the honesty half, and the only figure on the page --------
# A `stat` has two reveals, the number and its note, so this is a short beat
# by construction: about twenty-five seconds, which is two reveals at the
# ten-to-thirteen seconds a reveal this vocabulary wants. The note lands at
# beat_length - reserve, so the shrinkage sentence is last.
#
# No focus. `probability` lit that column one beat ago and this is the other
# half of the same column, so a focus here would redraw an identical frame at
# a cost of about a second of panel delay.
SCRIPT["statistics"] = [
    (A, "The statistics half does a different job. It is what makes an "
        "evaluation result honest. Paired tests, because the same questions "
        "went to both models. Bootstrap confidence intervals on a benchmark "
        "delta. And then the number on the screen: a one point gain, on "
        "five hundred examples."),
    (B, "Which people quote at me constantly."),
    (A, "Error bars shrink like one over the square root of n. That is what "
        "decides it."),
]

# --- calculus: the mechanism, and the constraint it imposes ---------------
# Head plus four rows, five segments. The fifth is the connection rather than
# a new fact: the Hessian is the condition number from the linear algebra
# beat, and the Fisher information. That is what a tail reveal is for, and it
# is why the condition number was named two beats earlier.
SCRIPT["calculus"] = [
    (A, "Calculus and optimisation is the mechanics: how the thing actually "
        "gets trained. It comes in two orders, and the first has a surprise "
        "in it."),
    (A, "Backpropagation is reverse mode automatic differentiation, and the "
        "surprise is what it refuses to do. It never materialises a Jacobian. "
        "It asks each operation for a vector Jacobian product."),
    (A, "Follow the arrows and a backward pass costs roughly twice a "
        "forward pass. That is not folklore. It falls out of the picture."),
    (A, "And the binding constraint on a big run is not floating point "
        "operations. It is the activations you kept to do the backward pass. "
        "That is what activation checkpointing relieves."),
    (A, "Second order gives the Hessian: the condition number again, and "
        "Fisher information."),
]

# --- information theory: what a number means ------------------------------
# Head plus four rows, five segments, the last eleven words. The tokenizer
# pair is split across the last two reveals so the tail has a reveal of its
# own to land on.
SCRIPT["information"] = [
    (A, "Information theory is the measurement layer, and it is what makes a "
        "language model number mean anything at all."),
    (A, "Cross entropy, read as a code length, is the bits you pay when the "
        "code was built for your model but the data came from reality."),
    (A, "K L divergence is that gap. Which is slightly deflating, because "
        "your loss does not floor at zero. It floors at the entropy of the "
        "data itself."),
    (A, "And that decides how you read evaluations. Perplexity depends on "
        "the tokenizer, so two models with different vocabularies cannot be "
        "compared on it."),
    (A, "Bits per byte is tokenizer free. Scaling law work uses it."),
]

# --- the convergence, which is the reason to see all four at once ---------
# A `table` again, and the grid is the argument: one object, four places to
# stand. Header plus four rows. The blank corner cell that slid a whole
# header one column left in an earlier episode is not present here, both
# header cells carry text.
SCRIPT["converge"] = [
    (A, "Now the part that only exists once all four are in view. Cross "
        "entropy is one object wearing four hats, and which hat you see "
        "depends on where you are standing."),
    (A, "Stand in probability, and it is a maximum likelihood estimator. You "
        "are fitting a distribution to data."),
    (A, "Stand in information theory, and it is a code length. The same "
        "number, counted in bits."),
    (A, "Stand in calculus, and it is the thing whose gradient collapses to "
        "p minus y, which is why that same expression turns up for mean "
        "squared error and for softmax."),
    (A, "And contrastive learning calls it Info N C E. An N way softmax."),
]

# --- the take -------------------------------------------------------------
# Head plus five rows, which is six reveals that unfold with the line, rather
# than one card held motionless for half a minute: that is what every overview
# in this series did before the still-frame check could fire. A diagnosis
# rather than a recap, and the last row is the rule rather than a summary.
SCRIPT["close"] = [
    (A, "So what is the map for? Not for working through in order. It is "
        "for knowing which of the four to reach for."),
    (A, "You cannot see why the loss is that loss and not some other. That "
        "is probability. Choose the distribution and the loss is decided."),
    (A, "The run ran out of memory and you cannot see where. That is "
        "calculus, and the answer is nearly always the backward pass."),
    (A, "A representation collapsed, or a fine tune barely moved anything. "
        "That is linear algebra, and the word you want is rank."),
    (A, "An evaluation number will not tell you what it actually means. That "
        "is information theory."),
    (A, "And where two areas answer with the same object, keep it."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis. Four columns, which derives a 2.5-unit
    # pill: a pill grows to fit its label rather than scaling the label, so a
    # long item makes its column wider than the others and scales the whole
    # board down. Sixteen characters is the measured budget at four columns,
    # from the two four-column maps already shipped in this series.
    #
    # `reserve` is 6.5 rather than the fitted value, because a parked beat
    # spends two seconds letting the finished board stand still and 0.7 on the
    # morph, both out of the FRONT of the reserve: the rendered still frame is
    # about reserve minus 2.7. The format's premise is that the viewer sees
    # the size and shape of the field before any one part of it means
    # anything.
    "map": {"kind": "columns", "park": True, "reserve": 5.0, "columns": [
        {"head": "linear algebra", "tone": "subject", "items": [
            "rank",
            "eigen, SVD, QR",
            "low-rank, LoRA",
            "matrix layout",
        ]},
        {"head": "probability", "tone": "number", "items": [
            "why this loss",
            "MLE and MAP",
            "bias, variance",
            "paired tests",
        ]},
        {"head": "calculus", "tone": "machinery", "items": [
            "gradients",
            "chain rule, VJPs",
            "Hessians, Newton",
            "convexity",
        ]},
        {"head": "information", "tone": "verified", "items": [
            "entropy, KL",
            "cross-entropy",
            "mutual info",
            "bits-per-byte",
        ]},
    ]},

    # The hinge, and a short beat to match its two reveals. The card carries
    # the question's spine; the narration says the whole sentence, so they
    # share their key words without either reading the other aloud.
    #
    # No focus: the map was built one beat ago with all four columns lit,
    # which is the state a question about the whole board wants.
    "question": {"kind": "claim", "reserve": 2.7,
                 "text": "What does each area let you say\n"
                         "that you could not otherwise say?",
                 "note": "four areas, four different kinds of answer"},

    "linalg": {"kind": "points", "tone": "subject", "reserve": 1.8,
               "focus": "linear algebra",
               "head": "the notation all of it is written in",
               "items": [
                   "rank: how many directions",
                   "SVD: truncation as arithmetic",
                   "the condition number",
                   "layout: paper vs code",
               ]},

    # Two columns rather than three, so the grid is about fifty characters
    # wide and fits the 7.8 units left beside the parked map.
    "probability": {"kind": "table", "reserve": 3.5,
                    "focus": "probability",
                    "head": ["assume p(y | x) is", "and the loss is"],
                    "rows": [
                        ["Gaussian", "mean squared error"],
                        ["Bernoulli", "binary cross entropy"],
                        ["categorical", "softmax cross entropy"],
                        ["Poisson", "the Poisson loss"],
                    ]},

    # The figure is written as a figure, not spelled out, so "the number on
    # the screen" is a true sentence and the card is scannable.
    "statistics": {"kind": "stat", "tone": "number", "reserve": 4.6,
                   "big": "1 point",
                   "caption": "gain, on a 500-example eval",
                   "note": "error bars shrink like 1 over root n"},

    "calculus": {"kind": "points", "tone": "machinery", "reserve": 3.3,
                 "focus": "calculus",
                 "head": "the mechanics of how it trains",
                 "items": [
                     "backprop never builds a Jacobian",
                     "backward costs 2x a forward",
                     "activations, not FLOPs, bind",
                     "Hessian, condition number, Fisher",
                 ]},

    "information": {"kind": "points", "tone": "verified", "reserve": 2.6,
                    "focus": "information",
                    "head": "what a bit of data is worth",
                    "items": [
                        "cross-entropy is a code length",
                        "KL is the gap: the loss floors",
                        "perplexity is tokenizer-bound",
                        "bits-per-byte is tokenizer-free",
                    ]},

    # `focus` lists all four columns, which is how this vocabulary says no
    # emphasis, and is also the true statement about a beat whose whole
    # subject is the thing all four share.
    "converge": {"kind": "table", "reserve": 3.6,
                 "focus": ["linear algebra", "probability", "calculus",
                           "information"],
                 "head": ["read it as", "and cross entropy is"],
                 "rows": [
                     ["probability", "a maximum-likelihood estimator"],
                     ["information theory", "a code length"],
                     ["calculus", "the thing whose gradient is p - y"],
                     ["contrastive learning", "InfoNCE, an N-way softmax"],
                 ]},

    # Six reveals on the closing beat rather than one card held still, which
    # is the defect this series carried four times before the still-frame
    # check could fire. No focus: `converge` left all four lit, and the take
    # is about all four.
    "close": {"kind": "points", "tone": "subject", "reserve": 1.5,
              "head": "where to look when you are stuck",
              "items": [
                  "why this loss? probability",
                  "out of memory? the backward pass",
                  "a collapse? rank",
                  "the eval number? entropy",
                  "two areas, one object: keep it",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words * 0.40 / 60:.2f} minutes at 0.40 seconds a word")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        n = len(VISUALS[key].get("items", VISUALS[key].get("columns",
              VISUALS[key].get("rows", []))))
        print(f"  {key:14s} {len(beat)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
