"""
Topic overview: evaluation and LLM judges, as of 22 September 2026.

Source: the canonical Notion page "Topic: evaluation-and-llm-judges", read
from Notion directly on 22 September 2026 rather than from the repo mirror.
Every name, figure and caveat below is on that page. Nothing is imported from
the four deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A mental model rather than a comparison. The
page is not a field of competitors: the harnesses are a small part of it and
the rest is how measurement is done and where it breaks. So the organising
question is not "what separates these tools", it is "when your number moves,
what moved", which is a distinction that only exists once you can see the
whole subject at once.

The axis, which is most of the work of a new overview. The page hands it over
in its failure-modes bullet: "an observed delta has to be attributed to the
model, the judge or the gold labels before anyone acts on it". So the map is
what you can run, what runs it, and what inside it can be lying, and the third
column is the spine. A tour of lm-eval-harness against Inspect against
promptfoo would have been a procurement video, and the page is not about
procurement.

The cut of this episode cleared in 74326b3 found the same axis independently,
and it is kept, because it is the page's own. What is not kept is that cut's
evidence. Its docstring admits it outright: the null-model win rates, the
truncation failure, the GSM8K label-error rate, the ranking movement on
cleaned sets and the MOLE seventy two percent all come from the deep dives
below this page rather than from this page. The overview's inventory source is
the page it derives from, so every one of those is gone, and the beats they
carried are rebuilt on figures this page actually holds: the human agreement
band, the meta-eval ceiling, the checklist size, and the enclave. That cut
also gave MOLE a whole beat for a number the page does not carry; MOLE
survives here as the page states it, as a claim about what gets graded, with
no figure attached.

The outline that survived the revision step:

    ident       what this is, what it is not, how current, why it earns it
    map         three columns, everything named, parked as the home frame
    question    the attribution rule: which of the three moved?
    harnesses   the middle column, and why two numbers do not compare
    judges      how it grades fixes how it is biased
    ceiling     calibration, and the ceiling above the calibration
    enclave     contamination made mechanical instead of contractual
    close       the take: attribute first, and the habits that follow

What the critique step changed:

  - Draft one had a beat for the five eval layers after the map had already
    named them, which is the map read twice. The layers carry their
    one-clause gloss inside the map beat, where the viewer meets them, and
    the beat that repeated them is gone. That bought the enclave beat.
  - Draft one ran checklist grading as its own beat, next to the enclave.
    Two structural answers in seven minutes turned the last third into a
    list, and the checklist result is a judge-design result, so it is now
    the last item under the grading modes where a viewer can act on it. Its
    list-level caveat came with it, because without the caveat the item is
    an overclaim: the page is explicit that a checklist judge ranks a field
    correctly while staying unreliable on any single response.
  - The enclave beat was a `compare` in draft one. A `compare` has exactly
    two reveals, and this beat needs a minute, which would have left it
    motionless for half of that. It is a `table` now, which is also the
    better picture: the whole point is one structure drawn twice with the
    two parties swapped, and a grid says that where two free-form columns do
    not. The blank corner cell that slid a header one column left in an
    earlier episode is fixed, and this table has one; the frame was checked.
  - `ceiling` opened on "look at the line under it" in draft one. At eight
    seconds into a seven-reveal beat that line does not exist yet, so the
    reference is gone and B's question is answered in words instead.
  - B agreed with A in draft one. B now interrupts four times: to make the
    obvious wrong assumption that it is the model, to ask whether a bigger
    judge would fix the bias, to say that eighty percent sounds good, and to
    ask what the catch is on the enclave. A does something different after
    each.

What the preview step changed, and this is the part worth reading twice.
`spread` puts reveal n of n at exactly `beat_length - reserve`, so whatever is
said after the last item is named has to fit inside the reserve, which
`check_timing` caps at six seconds. Draft one put forty three words after the
map's third column was named and drew that column thirteen seconds late;
`harnesses` named HELM and promptfoo twelve and sixteen seconds before their
rows existed. The fix is structural rather than a nudge: **a panel with n
reveals wants its narration written as n roughly equal segments, with the last
item named inside the reserve.** Every beat here is built that way, two panels
gained a row so that a closing claim had a reveal of its own to land on, and
the measured landings are within about four seconds of the words throughout.

Reserves were then checked against the rendered durations rather than the
word-count estimate, using reveal k of n landing at
`(k-1)/(n-1) x (beat_length - reserve)`, and the arithmetic held, so none
moved. `judges` and `ceiling` went from 4.0 and 3.0 to 5.5 at the preview
stage, which is what pulled their reveals back under the narration.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns lit. `question` inherits that, which is
the state it wants, because the attribution rule is a claim about the whole
board. `harnesses` lights "what runs it". `judges` lights "what can be lying".
`ceiling` inherits that lit state deliberately and passes no focus: the beat
is still about the judge, and a redundant focus redraws an identical frame and
costs about a second of panel delay. `enclave` lights "what you can run",
because contamination is a property of the set you run, not of the grader.
`close` lights all three, which is how this vocabulary says no emphasis, and
is also true.

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour, so the narration would
say to look at something that does not move.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the take points at the page, and the page carries the four deep
dives and their resource blocks.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - Guardrails. Pre-call, during-call and post-call rails, NeMo Guardrails,
    and the guard-model landscape. It is one of the page's six branches and
    it has its own deep dive, and it is a runtime-safety subject rather than
    a measurement one: the map's three columns do not have a place for it
    without pretending a rail is an eval. That is the omission that hurts
    most, and it is the obvious second episode from this page.
  - Production eval engineering as a subject: golden sets, promotion paths,
    offline against online metrics, paired tests and power analysis,
    gold-label auditing. Four of those survive as habits in the take. The
    statistics do not survive at all, and a paired test explained quickly is
    a paired test explained wrongly.
  - The full failure-mode catalogue. Verbosity, self-preference and
    sycophancy are not walked one at a time, because six bias names in
    sequence is the undifferentiated-list failure; the grading-mode beat
    carries the shape of the problem instead.
  - The double-blind pilot's other contamination path, the benchmark's own
    questions leaking into the pretraining crawl from their public source.
    It is a real caveat and it needs its own thirty seconds to land, and the
    beat already carries two caveats.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts: the
page names the "loglikelihood-against-generative fault line" that makes
harness numbers incomparable and hands the explanation to the deep dive, so a
reader of the topic page is told there is a fault line and not what it is. A
listener cannot follow a link, so `harnesses` says what it is in one sentence,
and having written the plain version it belongs on the page too.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, four turns, and A does something different after each

Text to speech, and what it took. Every take was transcribed and read as text
against the script, and that reading, not the error rate, is what caught all
of it. Nine defects passed the character gate:

  - Two hallucinated sentences. "Every harness scores in one of two ways"
    came back as "All of them suck. They all score in one of two ways", and
    "each side puts in one thing" grew "What a routine." after it. Both were
    cured by naming the subject rather than pointing at it, and by folding a
    four-word fragment into the sentence before it.
  - Three insertions into one list. "The model. The judge. The gold labels."
    took "the readers", then "the joke", then a bare "you", on three
    different seeds. A list of three short noun phrases is a gap the model
    fills; each item has a clause now.
  - Two inverted sentences. "becomes a property of the machine" came back as
    "becomes a promise. The property of the machine", which says the
    opposite, and it was the repeated word "promise" it tripped on. "Not
    picking a harness. For remembering that" was delivered as one clause.
  - Two wrong words. "Position bias does not announce itself" became "One
    bias", and "scored the same way every time" became "forward the same way
    every time". Both are single real words swapped for single real words,
    which is what neither the error rate nor the burst detector can see.
  - Names. "Lighteval" came back as "LittleMul" and then, worse, as the same
    string the model used for "L M eval harness", so two different harnesses
    were named identically. It is "Hugging Face's Light Eval" now, which the
    page's own diagram supports and which stays recoverable however the word
    lands. "HELM" lost its first syllable and arrived as "LM"; spelled as the
    word "Helm" it is said correctly. "Rocket Eval" was mangled on four
    seeds running ("Evil", "Evol", "RocketyVal") until it stopped being the
    first thing in its sentence.
  - Pace. `harnesses` came back at 166 words a minute, over the gallop
    threshold, and was fixed with full stops rather than the delete key, as
    the skill says. It reads at 162 now.

Numbers and names are otherwise spelled the way they should be said, because
text to speech reads "LLM", "lm-eval-harness", "O(n^2)", "75-85%" and
"RewardBench 2" badly. METR and Apollo were on the spoken line for one draft
and are gone: "METR" comes back as "meter" and neither name does work that
"the safety institutes" does not.

Timing re-cut, 23 September 2026, VISUALS only, audio byte-identical. The
first cut had thirteen reveals named before they were drawn, worst 10.1s
(promptfoo in `harnesses`), and two stills at exactly 6.0s. Every reserve was
swept to the value `check_leads --reserves` suggests. `harnesses` and `judges`
each gained two rows for sentences the beat already spoke with no reveal, near
the end of the line, which re-spaced the earlier rows under their names:
the "safe to ship" question and the fault line split into its two halves, and
"answers each alone" and "bias has no channel left". The enclave's last row
was re-pointed to the beat's last sentence, "Google's own enclave" and "no
transcripts for anyone". After: no lead over 3s, worst still 5.2s.

Length. 6 minutes 58 at 1080p and 4.61 MiB, which is the third 1080p rung.
The six-minute target and the reveal-pacing arithmetic pull against each other
on a page this dense: eight beats whose panels carry six or seven reveals each
cannot be narrated in 840 words without naming things before they are drawn.
This episode chose the alignment. A cut to six minutes is a cut of a beat, not
a trim of every beat, and the beat to cut would be `enclave`.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: evaluation-and-llm-judges"
SUBTITLE = "an eval is a measuring instrument, and nobody calibrates theirs"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, and what it is not -------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of evaluation. Not the datasets, which are their own "
        "topic. This is how the measuring gets done. What you run, what runs "
        "it, and who grades the answers."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns an episode for one reason. An eval is a measuring instrument, "
        "and almost nobody calibrates theirs."),
]

# -- the inventory, named before anything is explained ---------------------
# Three columns, three reveals, so the narration is three segments of roughly
# equal length and the third column is named in the last few seconds. That is
# not a stylistic choice: `spread` puts reveal n at exactly beat_length minus
# reserve, so whatever is said after the last column is named has to fit
# inside the reserve, which `check_timing` caps at six seconds. Draft one put
# forty three words there and named the third column thirteen seconds before
# it was drawn.
#
# The second segment is padded out to match the first for the same reason, and
# the padding is not filler: it is the sentence that sets up the third column,
# which is that a harness produces a number and has no opinion about whether
# the number is right.
SCRIPT["map"] = [
    (A, "The whole board first. Three columns. On the left, the five things "
        "you can run, cheapest first. Static benchmarks, which score a fixed "
        "dataset the same way every time. L L M judges, a biased proxy for human preference that "
        "scales to anything. Human eval, the standard, expensive and itself "
        "noisy. Regression gates wired into C I. And online measurement, on "
        "live traffic."),
    (A, "In the middle, the harnesses that run them. L M evaluation harness. "
        "Inspect. Light Eval. Helm, which is in maintenance. Promptfoo and "
        "Braintrust. "
        "Those are plumbing rather than measurement. Each one takes a "
        "dataset through a model and hands you a number, and none of them "
        "has an opinion about whether the number is right."),
    (A, "And on the right, three suspects. The model you changed. The judge "
        "that graded it. And the gold labels it was graded against."),
]

# --- the organising question ----------------------------------------------
# A short beat on purpose: a `claim` has two reveals, so half a minute is its
# whole honest budget, and this is the hinge rather than a section.
#
# The turns are ordered so the sentence the card's note carries is spoken
# last. Draft one said it eight seconds in, and the note does not appear until
# beat_length minus reserve, which put fifteen seconds between the claim and
# the frame that carries it.
SCRIPT["question"] = [
    (B, "Surely it is usually the model. That is the thing you changed."),
    (A, "That is the assumption, and it is usually wrong. So the discipline is "
        "attribution. Before anybody acts on a delta, work out which of the "
        "three fallible parts actually moved. Everything after this is how "
        "each of them lies to you."),
    (A, "Start from the base rate. Most apparent model regressions turn out to "
        "be eval bugs first, and model changes second."),
]

# --- the middle column ----------------------------------------------------
# Nine reveals: head, five harnesses, then three rows for the closing
# sentences (safe to ship, and the fault line as two halves), so the last row
# lands on the last sentence and the five harness rows space out under their
# names. Seven reveals, as first cut, drew promptfoo ten seconds late.
SCRIPT["harnesses"] = [
    (A, "The middle column, lit on the map. They all run a dataset through a "
        "model and score it. The difference is the unit of work."),
    (A, "L M eval harness takes a declarative task. That makes it the "
        "reproducibility standard behind the numbers on a model card."),
    (A, "Inspect takes a program with a sandbox. The safety institutes run "
        "it. It is the default for anything agentic."),
    (A, "Hugging Face's Light Eval takes a pretraining loop. You run it "
        "while a model is still training, rather than after."),
    (A, "Helm takes seven metrics at once. It has been in maintenance since "
        "June. Read it. Do not build on it."),
    (A, "Promptfoo and Braintrust take an application config. The question "
        "there is no longer whether the checkpoint is good. It is whether "
        "this prompt and tool setup is safe to ship."),
    (A, "And that is why you cannot mix them. Every harness scores "
        "in one of two ways. Either it measures the likelihood of a fixed "
        "set of options. Or it reads the text the model generates."),
]

# --- the judge, and how the grading mode fixes the bias -------------------
# Nine reveals, and the last item is the caveat rather than a second claim,
# because the caveat is what stops the checklist line being an overclaim and
# it needs a reveal of its own to be said late enough. "answers each alone"
# and "bias has no channel left" were added in the timing re-cut so the
# checklist sentence has rows to land on; with seven reveals the first rows
# were drawn five to seven seconds after they were named.
SCRIPT["judges"] = [
    (A, "Second suspect. A judge is a measuring instrument that happens to be "
        "a model, and the grading mode fixes its bias profile."),
    (A, "Pointwise gives one absolute score, and the scale drifts. A seven "
        "today is not a seven next month."),
    (A, "Pairwise compares two answers. It agrees with humans more, carries "
        "position bias, so you run both orderings, and costs n squared to "
        "rank a field."),
    (A, "Rubric grading against a reference is the most reliable mode, and "
        "the only one that says which criterion failed."),
    (B, "Can you just use a bigger judge?"),
    (A, "Smaller ones. A jury of small judges from different families beats "
        "one large judge on cost and on human agreement."),
    (A, "Rocket Eval, a paper from twenty twenty five, goes further. A "
        "frontier model turns each query into five to ten binary checklist "
        "questions, and a small judge answers "
        "each alone, never in sight of the others. Position bias has no "
        "channel left."),
    (A, "But the correlation is list level. Rank a field with it, never one "
        "answer."),
]

# --- calibration, and the ceiling above it --------------------------------
# No focus: `judges` left "what can be lying" lit, which is the state this
# beat wants, and a redundant focus costs about a second of panel delay for
# an identical frame.
SCRIPT["ceiling"] = [
    (A, "Which raises the question nobody asks of their own judge. What is "
        "its calibration certificate?"),
    (A, "No judge number means anything until it has been checked against "
        "human labels on a gold slice."),
    (A, "And you read that check with Cohen's kappa rather than raw "
        "agreement, because agreement by chance flatters every judge."),
    (B, "And eighty percent agreement with my expert is good?"),
    (A, "Not necessarily. Two humans labelling open ended work agree seventy "
        "five to eighty five percent of the time."),
    (A, "So a judge at eighty percent may be at the ceiling rather than "
        "underperforming, and you cannot tell which without the slice."),
    (A, "Two more. Self consistency certifies nothing, because a judge can "
        "be reproducible and systematically wrong at once. And the meta "
        "evals, Judge Bench and Reward Bench two, rank the judges "
        "themselves."),
    (A, "They put even frontier judges at sixty to seventy percent on hard "
        "comparisons."),
]

# --- the third suspect, and the structural answer to it -------------------
# The narration walks the table row by row rather than side by side, which is
# the order `spread` draws it in. Said side by side, as draft one did, the
# evaluator's half of row three is spoken fourteen seconds before row three
# exists.
SCRIPT["enclave"] = [
    (A, "Third suspect, the gold labels and the set they sit in. "
        "Contamination is handled by contract, and nobody can check "
        "afterwards that a held out set stayed held out. So every benchmark "
        "has a shelf life."),
    (A, "In August, Google DeepMind ran what it calls the first double blind "
        "evaluation of a proprietary model, with the Singapore A I Safety "
        "Institute and M L Commons. Read it across, because each side puts in "
        "exactly one thing."),
    (A, "The lab its weights, the evaluator its benchmark. And neither one "
        "sees what the other put in. The lab never sees the prompts. The "
        "evaluator never sees the weights."),
    (A, "So there is no training on the prompts, and the model never leaves. "
        "Contamination stops being a matter of trust and becomes a property "
        "of the hardware. And that hardware belongs to Google, which is also "
        "the party being evaluated."),
    (B, "And the catch?"),
    (A, "Google's own enclave, then. And no transcripts for anyone."),
]

# --- the take -------------------------------------------------------------
# Seven reveals on the closing beat, deliberately. Every overview in this
# series before the method changed ended on a card that drew itself once and
# then sat still for fifteen to thirty seconds while the take was spoken over
# it. A head plus six habits unfolds with the line instead, and the turns are
# sized so each habit is spoken about where it is drawn.
SCRIPT["close"] = [
    (A, "So what is the map for? It is not for picking a harness. It is for "
        "remembering that a delta has to be pinned on one of three parts "
        "before anybody acts on it."),
    (A, "The habits cost almost nothing. Pin the judge model and its prompt "
        "version, and treat a change to either as a new instrument."),
    (A, "Run both orderings, every time. A judge's position bias does not "
        "announce itself."),
    (A, "Keep a human labelled slice, and check the judge against it rather "
        "than against itself. That is the whole of calibration."),
    (A, "And before you believe your next failing gate, audit the items it "
        "failed on. Half of what looks like a worse model is a wrong label."),
    (A, "Then the newest one. A stated refusal is not a refusal. MOLE found "
        "that a model saying no was no guide to whether it went ahead "
        "anyway."),
    (A, "So grade the trajectory, not the reply text."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis. Three columns rather than a list of
    # tools: what you can run, what runs it, and what inside it can be lying.
    # The third column is the spine of the episode, so it is on the board from
    # the first beat and the narration returns to it three times.
    #
    # Three columns is the comfortable number. `panel_columns` derives the
    # pill width from the column count, so three at full frame width gives
    # about 3.4 units each, and every item here is kept short enough to sit in
    # one without shrinking the whole group.
    #
    # Tones. Verified for the five layers, which are the things that actually
    # get run. Machinery for the harnesses, which are literally apparatus.
    # Cost for the three suspects, which is what the whole episode is about
    # and is the one column that names a failure. None is `context`, so every
    # column has somewhere to brighten from when a later beat lights it.
    "map": {"kind": "columns", "park": True, "reserve": 6.0, "columns": [
        {"head": "what you can run", "tone": "verified", "items": [
            "static benchmarks",
            "LLM judges",
            "human eval",
            "regression gates in CI",
            "online measurement"]},
        {"head": "what runs it", "tone": "machinery", "items": [
            "lm-evaluation-harness",
            "Inspect",
            "lighteval",
            "HELM (maintenance)",
            "promptfoo, Braintrust"]},
        {"head": "what can be lying", "tone": "cost", "items": [
            "the model",
            "the judge",
            "the gold labels"]},
    ]},

    # A claim, and a short beat to match its two reveals. The card carries the
    # rule; the narration says the reasoning that arrives at it, so they share
    # their spine without either reading the other out.
    #
    # No focus: the map was built one beat ago with all three columns lit, and
    # that is exactly the state an attribution rule about the whole board
    # wants.
    "question": {"kind": "claim", "reserve": 4.1,
                 "text": "Three fallible parts.\nPin the delta on one before you act.",
                 "note": "most apparent model regressions are eval bugs first"},

    # A table, because the grid is genuinely the content: five harnesses
    # against one property. It is also the panel kind with enough reveals for
    # a fifty second beat. A `compare` or a `stat` here would have drawn once
    # and sat still.
    #
    # Cells are short because the free region beside a parked map is about 7.6
    # units and two text columns have to share it.
    "harnesses": {"kind": "table", "focus": "what runs it", "reserve": 2.8,
                  "head": ["harness", "one unit of work"],
                  "rows": [
                      ["lm-eval-harness", "a declarative task"],
                      ["Inspect", "a program with a sandbox"],
                      ["lighteval", "a pretraining loop"],
                      ["HELM", "seven metrics at once"],
                      ["promptfoo", "an application config"],
                      ["", "is this setup safe to ship?"],
                      ["every harness", "likelihood of fixed options"],
                      ["", "or the text the model generates"],
                  ]},

    # Nine reveals over the longest beat in the episode, which is right: this
    # is the page's own centre of gravity and the one place a viewer changes
    # what they do on Monday.
    #
    # The heading renders in the subject colour whatever the tone says, which
    # is a known limitation of this panel kind and is harmless here.
    "judges": {"kind": "points", "focus": "what can be lying",
               "tone": "machinery", "reserve": 4.1,
               "head": "how it grades fixes how it is biased",
               "items": [
                   "pointwise: one score, and it drifts",
                   "pairwise: position bias, n-squared",
                   "rubric: which criterion failed",
                   "a jury of small judges beats one",
                   "checklist: 5 to 10 binary questions",
                   "answers each alone",
                   "bias has no channel left",
                   "but list-level: never one answer",
               ]},

    # Seven reveals, and the order is the argument: the certificate, then the
    # ceiling that makes the certificate readable, then the two things that
    # are not a certificate at all. The ceiling line sits third so that B's
    # "eighty percent is good?" lands on a frame that already has the human
    # band drawn on it.
    #
    # Toned `cost` because every line here is a way the instrument is worse
    # than it looks. That is a verdict the page takes itself, in the sentence
    # that self-consistency certifies nothing.
    "ceiling": {"kind": "points", "tone": "cost", "reserve": 4.9,
                "head": "the calibration certificate",
                "items": [
                    "human labels on a gold slice",
                    "Cohen's kappa, not raw agreement",
                    "two humans agree 75 to 85%",
                    "so 80% may be the ceiling",
                    "self-consistency certifies nothing",
                    "JudgeBench: 60-70% on hard pairs",
                ]},

    # One structure drawn twice with the two parties swapped, which is exactly
    # what `compare` cannot do and a grid can. It is also the arithmetic: a
    # `compare` has two reveals and this beat runs about forty five seconds,
    # so it would have been motionless for twenty of them. Head plus three
    # rows is four reveals, which walks with the narration.
    "enclave": {"kind": "table", "focus": "what you can run", "reserve": 3.2,
                "head": ["", "the lab", "the evaluator"],
                "rows": [
                    ["puts in", "its weights", "its benchmark"],
                    ["never sees", "the prompts", "the weights"],
                    ["so", "no training on them", "the model never leaves"],
                    ["but", "Google's own enclave", "no transcripts for anyone"],
                ]},

    # The take, as seven things that unfold with the line rather than one card
    # held still for half a minute, which is what every overview in this
    # series did before the still-frame check could fire.
    #
    # One tone throughout. Colouring the habits as `verified` and the MOLE
    # line as `cost` would deliver a verdict the page does not: the page
    # reports what MOLE found, it does not call the practice a mistake.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.0,
              "focus": ["what you can run", "what runs it",
                        "what can be lying"],
              "head": "attribute the delta, then act",
              "items": [
                  "pin the judge model and its prompt",
                  "run both orderings",
                  "keep a human-labelled slice",
                  "audit the items a gate failed on",
                  "a stated refusal is not a refusal",
                  "grade the trajectory, not the text",
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
