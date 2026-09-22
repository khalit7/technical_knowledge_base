"""
Topic overview: llm-training-and-post-training, as of 22 September 2026.

Source: the canonical Notion page "Topic: llm-training-and-post-training",
read from Notion directly rather than from the repo mirror, on 22 September
2026. The two were diffed and are identical. Every stage name, figure and
caveat below is on that page; nothing is imported from the twelve deep dives
underneath it, and nothing was invented for shape.

Which kind of overview this is. A mental model, not a comparison. There is no
field of competitors here: there is one subject with structure, a lifecycle
that runs from a pile of text to something you can send a question to. So the
inventory is not a list of labs, it is the column of stages, and the
organising question is what each stage is actually buying, because that is the
distinction that only exists once you can see the whole column at once.

The axis, which is most of the work of a new overview. The page's own taxonomy
diagram is a flow: pretraining, then mid-training, then the post-training
pipeline, then compression, then deployment, with the distributed training,
precision and infrastructure machinery drawn alongside rather than inside it.
That is the axis, and it is the page's own. The alternative axis, a tour of the
twelve deep dives in the order the table lists them, is a table of contents
read aloud.

The cut cleared in 74326b3 found the same axis independently, which is why it
is kept: it is the page's, not that cut's. Four things from it are not kept:

  - It ran eleven beats, which at this vocabulary's reveal pacing is over
    eight minutes, past the rung where the encode gives up 1080p and near the
    one where the render fails outright. Nine beats here.
  - Its pretraining beat was a `bars` panel asserting that better data
    contributed "3.24x" more compute-efficiency gain than better models. That
    figure is not on this page. The page says "far more of the
    compute-efficiency gain on the data side than on the model side" and
    attaches no multiple to it, so the bar chart is gone and the sentence is
    said in the page's own terms. This is the defect the method warns about in
    deleted cuts, found on the second one examined.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the end of its budget and several lines named things long before they
    existed.
  - Its `machinery` and `compression` beats were separate. Precision is a row
    of the machinery panel now, and PEFT and distillation are said where they
    are actually being used, in the cheap-end beat, rather than listed.

What the critique step changed:

  - Draft one gave mid-training a beat of its own, immediately after
    pretraining, and then gave Thomson Reuters a second beat. They are one
    thing: mid-training is the path, and the Thomson Reuters budget is what
    the path costs. Merged, and the merge paid for the `cheap_end` beat.
  - Draft one had the post-training beat as a three-step `flow`. A flow's pill
    is a fixed 3.4 units and "preference optimisation" does not fit in one, so
    the whole group scaled down; and three steps left reward hacking, which
    the page calls the central failure mode of all of it, with no row to land
    on. It is `points` with five rows now, and reward hacking has one.
  - Draft one closed the budgets beat with B asking "reported by whom?". That
    put the provenance caveat after the last reveal, where only about a dozen
    words fit. The table has a fourth row, "by", instead: the caveat is on
    screen in the same grid as the numbers, which is where the format says a
    vendor-reported figure belongs.
  - B had three turns in draft one and two of them were agreement. B has one
    turn, and it carries the assumption the whole episode exists to correct:
    that the five stages are the same operation at different sizes.

Reveal arithmetic, which is what actually set the length. `spread` puts reveal
k of n at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals
wants its line written as n segments: the first n-1 naming one reveal each,
and the last one short enough to fit inside the reserve, which at about 150
words a minute is twelve to fourteen words. Every beat below records the
segment sizes it was written to. That coupling, not taste, is why this episode
has nine beats: six panels of five reveals at eleven seconds a reveal is
already five and a half minutes before the title card, the map or the hinge.

Lit state of the map, decided for every beat rather than inherited by
accident. `map` builds all five layers lit. `question` inherits that, which is
right: the hinge is a claim about the whole column. `knowledge` lights
pretraining. `machinery` lights all five, which is how this vocabulary says no
emphasis and is also the true statement: the machinery runs under every stage.
`behaviour` lights post-training. `budgets` lights mid-training and
post-training together, because the whole beat is those two paths priced
against each other. `cheap_end` passes no focus and inherits that state
deliberately: it is the same two stages one budget down, and a redundant focus
redraws an identical frame at a cost of about a second of panel delay.
`close` lights all five.

The map's tone is `subject` rather than `context`, because a focus on a
context-toned row is invisible: that tone is already the de-emphasis colour,
so the narration would say to look at something that does not move.

No contract beat, deliberately. An overview's contract is the map itself, and
the structure check exempts the format for that reason. No resources card
either: that is a deep dive's obligation, and the close points at the page,
which carries twelve deep dives, nine key papers and a Best starting resources
block.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - The whole "Self-improving and automated-research loops" section, which is
    an H2 of the page in its own right: Anthropic's measured series (over 80%
    of merged production code, the four-minute to twelve-hour task horizon,
    3x to 52x on code optimisation, 26% of AI research work, 30,000 internal
    agents, the 25-fold CI growth), the Z.ai boundary, and Dream-RSI. It is
    cut whole rather than shrunk, because it answers a different question:
    not what each stage buys, but what happens when the loop closes on the
    researcher. It is the obvious second episode from this page and it has
    enough measured figures to carry one. The task-horizon series is also
    already the spine of a published news edition.
  - Cognition SWE-2, and the Meta FAIR research preference models. Both are
    good, and the page carries four 2026 post-training instances where a
    video has room for none: the beat explains what the stage buys, and four
    instances of it is the page read aloud. ToolGrad went the same way,
    though its inversion (verify the answer first, write the question after)
    is the best single idea in that paragraph and would headline a
    post-training data episode.
  - The open pretraining recipes, OLMo 2/3, K2 Horizon, SmolLM3, and the
    nanoGPT speedrun that produced Muon. Naming four recipes takes a whole
    reveal and says nothing about what pretraining buys.
  - Magic's claimed 10x pretraining compute-efficiency. It is vendor-reported
    and not reproduced, and the episode already spends its provenance budget
    on the two figures in the budgets table, where the caveat has a row of the
    grid to sit in.
  - Tokenizers, positional encodings and sampling and decoding. Three of the
    twelve deep dives, named on the map inside their stage and not explained.
    A tokenizer is a component rather than a stage, and the map is stages.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts: the
distributed-training paragraph writes "TP inside a node, PP across nodes, EP
for MoE experts, CP for the sequence dimension" and never says what any of
those four letters pairs stand for. A reader can follow the link to the deep
dive; a listener cannot, and cannot even tell that TP and PP are different
kinds of thing. The narration expands all four, and having written the plain
version it belongs on the page too, in the house shape the page already uses
elsewhere. The page now reads "TP (tensor parallelism) inside a node, PP
(pipeline parallelism) across nodes, EP (expert parallelism) for MoE experts,
CP (context parallelism) for the sequence dimension". Nothing else was added:
no figure, no claim, no example.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, one turn, carrying the assumption the episode corrects

Numbers and names are spelled the way they should be said, because text to
speech reads "Qwen3.5-397B-A17B", "bf16", "$40M", "13.6k" and "RLVR" badly.
Four shapes were rewritten before the first render on rules this method
already carries: "LoRA" is written "Lora", because an all-caps name welded to
a lowercase fragment is the shape that produced "LittleMul", and the orphan
check still matches the panel's "LoRA" on its squashed spelling; "PostgreSQL"
is written and said "Postgres", which is the case the method names outright;
"SkyRL" is written "Sky R L"; and no beat opens on a fragile name.

Four defects got through the character gate anyway and were caught by reading
the transcripts as text. Three are real and one only looks it:

  - A hallucinated repetition inside a long sentence. "climbing the proxy you
    wrote down while the thing you actually wanted stalls" came back as
    "...while the thing you actually wrote down actually wanted, stalls", at a
    character error of 0.029. The echo is the cause: the sentence already
    contained "you wrote down", so the model had somewhere to fall back to.
    Two sentences joined by "Meanwhile" fixed it.
  - A real word swapped for another. "freeze the base, train something small"
    arrived as "frees the base train something small", which the comma splice
    exposed. Two clauses with a subject and a verb each read correctly.
  - A metric mangled. "A P E X Agents pass at one" came back as "APEX agents'
    paths at one". Pass@1 is dropped from the narration; the panel and the
    page both carry it, so nothing is lost.
  - And the one that is not a defect: "a verifier the domain already had"
    transcribed with a full stop in the middle, because a relative clause with
    the "that" elided invites a pause. Every word was right. It says "a
    verifier that the domain already had" now, because the closing line of the
    episode is not the place to gamble on whether the pause was real.

Pace cost one reroll. `question` came back at 166, 173, 176 and 172 words a
minute on four consecutive seeds at a character error of 0.000, which is the
case this method names exactly: a clean read that is unusable, where more
attempts cannot help because the text is the problem. Its commas became full
stops, no word was cut, and it reads at 149 for 2.7 seconds more. `knowledge`
at 161 and `budgets` at 164 are close to the ceiling and were left alone,
both being dense with spelled-out acronyms and figures.

Reserves were fitted to the rendered durations by least squares, solving for
the R that puts reveal k of n, at (k-1)/(n-1) x (L - R), about a second and a
half after the segment that names it begins. Eight of the nine held and every
landing is within about two seconds of its words. `map` did not, and the
reason is structural rather than particular to this episode: the fit wanted
2.1 seconds, which is less than the two-second settle plus the 0.7-second
morph that come out of the FRONT of a parked beat's reserve, so the fitted
value leaves the finished column no motionless time at all and the format's
premise goes unmet. It is 5.0 by hand: about three seconds of the middle of
the column drawn slightly ahead of the words, in exchange for 2.3 seconds of
the whole board standing still. Fit every beat, then override the parked one
upward.

Length. 6 minutes 37 at 1080p and 4.34 MiB, on the third and last 1080p rung
of the encode ladder. The trim lever, if a future cut needs one, is the
`machinery` beat's last row, the Ultra-Scale Playbook, which is the only row
in the episode that names a resource rather than a mechanism. Delivered word
count predicts better than the estimator here: across the three most recent
overviews a finished episode runs about 0.41 seconds a word including the
per-beat tails, so 974 words predicted 6:40 against the 6:37 delivered, where
the estimator said 7.1 minutes. Every still frame is between 1.9 and 3.5
seconds, and the closing beat's is 1.9, which is the defect this series
carried four times before the still-frame check could fire.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: llm-training-and-post-training"
SUBTITLE = "the stages a model goes through, and what each one buys"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, what it is, why it earns the time, how current ---------
SCRIPT["ident"] = [
    (A, "This is the map of how a language model actually gets built. Every "
        "stage between a pile of raw text and something you can send a "
        "question to."),
    (A, "It earns an episode because the word training covers five different "
        "operations that buy five different things. And because this page "
        "prices two of them, which practitioners almost never do. Current as of "
        "the twenty second of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Five layers, five reveals, and `spread` puts the fifth at
# beat_length - reserve. So the line is five segments: four of about
# twenty-five words naming one layer each, and a short fifth that fits inside
# the reserve. This is an inventory beat, so it is budgeted at about 115 words
# a minute rather than 150: a list of short names separated by full stops is
# read deliberately, and that difference is the single biggest source of
# reserve error in this vocabulary.
SCRIPT["map"] = [
    (A, "Whole column first, nothing explained yet. At the top, pretraining. "
        "The next token objective over an enormous corpus, and the scaling "
        "laws that divide the compute."),
    (A, "Then mid training. The high quality anneal at the end of the run, "
        "long context extension, and domain adaptation, which has a name of "
        "its own: continued pretraining."),
    (A, "Then post training. Supervised fine tuning, then preference "
        "optimisation, then reinforcement learning against something that can "
        "verify the answer."),
    (A, "Then compression, a different kind of work. Distillation, pruning and "
        "quantisation, about making the finished thing cheap to run."),
    (A, "And at the bottom, serving. Sampling and decoding. That column stays "
        "on screen."),
]

# --- the organising question ----------------------------------------------
# A `claim` has exactly two reveals, so twenty-five seconds is its whole
# honest budget. The note lands at beat_length - reserve, so the sentence the
# note paraphrases is the last thing said.
SCRIPT["question"] = [
    (B, "So are those five just different sizes of the same operation?"),
    (A, "No. That is worth getting straight. Each one buys a different "
        "capability. Nothing further down the column puts back what an earlier "
        "stage did not buy. So here is the question the rest of this answers. "
        "What is each stage actually buying you?"),
    (A, "Reach for the wrong one and you pay for it."),
]

# --- pretraining ----------------------------------------------------------
# Four reveals: the head, then three rows. Three segments of about thirty
# words and a short fourth. The last row is the punchline, because it has to
# fit inside the reserve and it is ten words long.
SCRIPT["knowledge"] = [
    (A, "Pretraining buys what the model knows. Nothing further down the column "
        "puts knowledge in that this stage did not pay for, which is why it "
        "takes almost all the compute."),
    (A, "The rule for dividing that compute has been Chinchilla since twenty "
        "twenty two. It fixes the split between parameters and tokens for a "
        "given budget, and everybody now trains far past it."),
    (A, "And a decomposition of progress from twenty nineteen to twenty twenty "
        "five puts far more of that efficiency gain on the data side than on "
        "the model side. Chinchilla said nothing about token quality."),
    (A, "So one token is not worth as much as another."),
]

# --- the machinery, which is not a stage ----------------------------------
# Five rows, no head: a head would be a sixth reveal and push the beat past
# sixty seconds. `focus` lists all five layers, which is how this vocabulary
# says no emphasis, and is also the true statement about a beat describing the
# thing that runs under every stage.
SCRIPT["machinery"] = [
    (A, "Underneath all five stages sits the machinery, and it is a "
        "composition problem rather than a choice. F S D P two and H S D P "
        "give you sharded data parallelism."),
    (A, "Tensor parallelism splits one matrix multiply across the cards inside "
        "a node. Pipeline parallelism splits the layers across nodes, because "
        "that traffic has to cross the network."),
    (A, "Expert parallelism spreads a mixture of experts out. Context "
        "parallelism splits the sequence itself, which is what makes a hundred "
        "and twenty eight thousand token run fit."),
    (A, "Precision sits beside all of that. The mainstream moved from B F "
        "sixteen to F P eight, and four bit formats now arrive for training "
        "rather than storage."),
    (A, "Hugging Face's Ultra Scale Playbook distils four thousand benchmarked "
        "runs into one book."),
]

# --- post-training --------------------------------------------------------
# Five rows, no head. Reward hacking gets a row of its own rather than a
# clause, because the page calls it the central failure mode of the whole
# pipeline and a claim with no reveal to land on has to live in the reserve.
SCRIPT["behaviour"] = [
    (A, "Post training buys behaviour, and it converged on three steps. First, "
        "S F T, supervised fine tuning. It buys the format: the model answers "
        "your instruction instead of continuing your text."),
    (A, "Then preference optimisation buys taste. Given two acceptable "
        "answers, which one does a person prefer? That is R L H F, or the D P "
        "O family, which skips the reward model entirely."),
    (A, "Then R L V R, reinforcement learning with verifiable rewards, buys "
        "correct answers against a checker, on anything a program can verify. "
        "G R P O is the workhorse. Those algorithms belong to the "
        "reinforcement learning topic."),
    (A, "All three share one failure mode. Reward hacking. The policy keeps "
        "climbing the proxy you wrote down. Meanwhile the thing you actually "
        "wanted stalls, or gets worse."),
    (A, "K L penalties, reward ensembles and hidden test splits all exist "
        "because of it."),
]

# --- what two of those stages cost ----------------------------------------
# A `table`, because the grid itself is the content: two paths, four things
# said about each. Header plus four rows is five reveals. The fourth row is
# the provenance caveat, on screen in the same grid as the figures, which is
# where the format says a reported number belongs.
SCRIPT["budgets"] = [
    (A, "So what do two of those stages cost? Practitioners almost never say, "
        "and this year two organisations did. Between them they price the two "
        "paths. Mid train for a domain, or post train for behaviour."),
    (A, "Who took which path? Thomson Reuters took the mid training path, on "
        "top of Qwen three point five. Mercor took the post training path, "
        "using Sky R L."),
    (A, "Thomson Reuters selected two hundred billion curated tokens from a pool "
        "of nineteen trillion. Mercor ran reinforcement learning over one "
        "thousand nine hundred and twenty eight expert knowledge work tasks."),
    (A, "Forty million dollars, in three months. And a seventy percent "
        "relative improvement on A P E X Agents."),
    (A, "One is reported, not audited. The other is their own write up."),
]

# --- the same shape, three orders of magnitude down -----------------------
# No focus: `budgets` left mid-training and post-training lit, which is
# exactly the state this beat wants, and a redundant focus redraws an
# identical frame at a cost of about a second of panel delay.
SCRIPT["cheap_end"] = [
    (A, "Now the same shape, three orders of magnitude down the budget. A "
        "Postgres query planner, specialised from four hundred and twenty "
        "trajectories distilled from G P T six Astra."),
    (A, "The fine tuning went into Lora adapters of about twenty one million "
        "parameters, on consumer cards. That is P E F T, parameter efficient "
        "fine tuning. You freeze the base. You train something small beside it."),
    (A, "Then agentic reinforcement learning, with a custom reward and an "
        "anchored G R P O variant, over about thirteen thousand six hundred "
        "queries."),
    (A, "The result is a four billion parameter model that beat a hand tuned "
        "production planner on its own task, for hundreds of dollars. "
        "Periodic's Neon is that shape at a laboratory budget."),
    (A, "What both ends share is a verifier that the domain already had."),
]

# --- the take -------------------------------------------------------------
# Head plus four rows, which unfold with the line, rather than one card held
# motionless for half a minute: that is what every overview in this series did
# before the still-frame check could fire. A diagnosis rather than a recap,
# and the last row is the precondition both budgets turned on.
SCRIPT["close"] = [
    (A, "So what is the column for? It is a diagnosis. Before you spend "
        "anything, work out which stage your problem actually lives in."),
    (A, "If the model does not know something, that is pretraining, or "
        "continued pretraining on your corpus. That is the expensive answer, "
        "and the one people reach for first."),
    (A, "If it knows the thing and will not say it in the shape you need, that "
        "is supervised fine tuning. That is the cheap answer, hundreds of "
        "dollars cheap."),
    (A, "And if it is right in general, wrong on your task, and a program can "
        "check the answer, that is reinforcement learning against a verifier."),
    (A, "Without a verifier, there is no cheap win."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis. A `stack` rather than `columns`, because
    # the vertical order IS the argument: each stage can only buy what the one
    # above it already paid for, and the page's own taxonomy diagram is a flow
    # in exactly this order.
    #
    # `panel_stack`'s pill is a fixed 5.0 units whatever the label, and the
    # gloss sits beside it, so the row is 5.0 plus a gutter plus the gloss.
    # This beat is built at full frame width, before anything is parked, so
    # there are about 12.4 units and a gloss of sixty characters is safe.
    #
    # Toned `subject`, not `context`: a focus on a context-toned row is
    # invisible, because that tone is already the de-emphasis colour, and a
    # later beat would say to look at something that does not move.
    #
    # `reserve` is 5.5 rather than 3.0 because a parked beat spends two
    # seconds letting the finished column stand still and 0.7 on the morph,
    # both out of the FRONT of the reserve, so the rendered still frame is
    # about reserve minus 2.7. The format's premise is that the viewer sees
    # the size and shape of the field before any one part of it means
    # anything, and until the settle existed the complete map was only ever on
    # screen for the 0.7 seconds of the morph.
    "map": {"kind": "stack", "park": True, "tone": "subject", "reserve": 5.0,
            "layers": [
                ("pretraining", "the next-token objective, the data, the scaling laws"),
                ("mid-training", "the anneal, long context, domain adaptation"),
                ("post-training", "SFT, preference optimisation, RLVR"),
                ("compression", "distillation, pruning, quantization"),
                ("serving", "sampling and decoding"),
            ]},

    # The hinge, and a short beat to match its two reveals. The card carries
    # the question's spine; the narration says the whole sentence, so they
    # share their key words without either reading the other aloud.
    #
    # No focus: the map was built one beat ago with every layer lit, which is
    # the state a claim about the whole column wants.
    "question": {"kind": "claim", "reserve": 2.5,
                 "text": "What is each stage\nactually buying?",
                 "note": "reach for the wrong one and you pay for it"},

    # Head plus three rows. The third row is the page's own conclusion about
    # Chinchilla, phrased so it fits inside the reserve.
    "knowledge": {"kind": "points", "tone": "number", "reserve": 2.3,
                  "focus": "pretraining",
                  "head": "pretraining buys what the model knows",
                  "items": [
                      "Chinchilla splits parameters against tokens",
                      "more of the gain came from data than models",
                      "one token is not worth as much as another",
                  ]},

    # Five rows and no head: a head would be a sixth reveal and a
    # sixty-five second beat. Every row is kept to about thirty characters,
    # which is the measured budget for a `points` item beside a parked map.
    #
    # `focus` lists all five layers, which is how this vocabulary says no
    # emphasis. Without it the beat would inherit `knowledge`'s single lit
    # layer and the map would go on asserting that this is about pretraining
    # while the narration says it runs under everything.
    "machinery": {"kind": "points", "tone": "machinery", "reserve": 3.1,
                  "focus": ["pretraining", "mid-training", "post-training",
                            "compression", "serving"],
                  "items": [
                      "FSDP2, HSDP: sharded data parallel",
                      "TP in a node, PP across nodes",
                      "EP for experts, CP for sequence",
                      "bf16 to fp8, now 4-bit training",
                      "4000+ runs, distilled into a book",
                  ]},

    # One tone for all five rows. Colouring the first three `verified` and
    # reward hacking `cost` would deliver a verdict the page does not: the
    # page calls reward hacking the reason the mitigations exist, not a reason
    # the pipeline is a mistake.
    "behaviour": {"kind": "points", "tone": "machinery", "reserve": 2.7,
                  "focus": "post-training",
                  "items": [
                      "SFT: answers, doesn't continue",
                      "preference optimisation: which one",
                      "RLVR: correct against a checker",
                      "reward hacking is the failure mode",
                      "KL penalties, reward ensembles",
                  ]},

    # The blank corner cell is the shape that slid a whole header one column
    # left in an earlier episode. It is fixed in `panel_table`, and this table
    # has one, so the frame is looked at during the silent preview rather than
    # assumed.
    #
    # The last row is the provenance. A vendor-reported figure has to be
    # labelled as such on screen as well as out loud, and a row of the same
    # grid is the honest place for it.
    "budgets": {"kind": "table", "reserve": 2.5,
                "focus": ["mid-training", "post-training"],
                "head": ["", "mid-train for domain", "post-train for behaviour"],
                "rows": [
                    ["who", "Thomson Reuters", "Mercor with SkyRL"],
                    ["on", "200B tokens from 19T", "1,928 expert tasks"],
                    ["reported", "$40M in three months", "+70% on APEX-Agents"],
                    ["by", "reported, not audited", "their own write-up"],
                ]},

    "cheap_end": {"kind": "points", "tone": "verified", "reserve": 2.4,
                  "items": [
                      "420 trajectories, distilled",
                      "LoRA adapters, 21M parameters",
                      "then anchored GRPO on real queries",
                      "a 4B model beat a tuned planner",
                      "the domain already had a verifier",
                  ]},

    # The take as five things that unfold with the line, rather than one card
    # held motionless for half a minute, which is what every overview in this
    # series did before the still-frame check could fire.
    #
    # The fourth row exists because of the reserve arithmetic rather than
    # because the list wanted a fourth item: the closing sentence, which is
    # the precondition both budgets turned on, had no reveal of its own to
    # land on and eight words is all a 3.5 second reserve holds.
    "close": {"kind": "points", "tone": "subject", "reserve": 1.5,
              "focus": ["pretraining", "mid-training", "post-training",
                        "compression", "serving"],
              "head": "which stage you need is a diagnosis",
              "items": [
                  "does not know it: pretraining",
                  "knows it, wrong shape: SFT",
                  "wrong on your task, checkable: RL",
                  "no verifier, no cheap win",
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
        rate = 115 if key == "map" else 150
        print(f"  {key:12s} {w:3d} words  ~{w / rate * 60:4.0f}s"
              f"  {len(VISUALS.get(key, {}).get('items', VISUALS.get(key, {}).get('rows', [1])) or [1])} rows")
