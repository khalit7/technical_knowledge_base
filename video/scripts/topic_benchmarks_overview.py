"""
Topic overview: benchmarks, as of 22 September 2026.

Source: the canonical Notion page "Topic: benchmarks". Every figure, name and
claim below is on that page; nothing is invented for shape, and no number is
imported from a neighbouring page or from the four deep dives underneath it.

Which kind of overview this is. A comparison, but not the usual one: nobody
picks one benchmark the way they pick a database engine, so "which is best"
is not a question the map can answer. The page gives the axis in its own
second sentence: "That sentence is a list of names until you know where each
one misleads you... here is only the failure each headline number conceals."
So the tour is of what a number leaves out, and there are three of those.

The inventory is benchmarks sorted by whether the number still tells you
anything: what still discriminates, what is finished, and the new class whose
subject is not the model. That axis comes from the cut of this episode that
was cleared in 74326b3, and it is the one thing worth keeping from it.
Sorting by subject instead, knowledge then maths then coding then agentic, is
the page's own taxonomy block read aloud: eleven branches, nothing said about
any of them, and a map that is a list rather than an argument. Written fresh
otherwise, because that cut was built to rules that have since changed, most
of all the length.

The outline that survived the revision step:

    ident       what a benchmark is, and the fact that makes the topic worth
                six minutes: above about ninety percent a test stops
                discriminating, and most of the famous ones are already there
    map         three columns, everything named, nothing explained. Parked as
                the home frame
    question    not which one to trust. What does the number leave out?
                Three things, and the beats take them in order
    rate        when it was measured: 22 points of headroom in seven days,
                and the test that was dropped from an index this month
    harness     what it ran inside: 62.7 against 99.9, one model, one task
                set, two labelled harnesses
    answerkey   whether the key was right, which inverts the usual reading of
                a benchmark gap
    system      the third column: the monitor, the pairing, the duration
    convergence what the durable designs all share, and the aggregator that
                just doubled the weight on it. The most valuable half minute
    take        three questions to ask of any number somebody hands you

What the critique step changed:

  - Draft one had four concealments, the fourth being the split a score was
    run on (SWE-bench Pro spanning 47 to 80%, Real-SWE costing twenty points
    against public tasks). It ran to eight minutes, which delivers at 720p on
    an episode whose frames are mostly small labels. The split beat went
    rather than a trim across all of them, because Real-SWE's real
    contribution is licensing rather than the spread, and licensing is a line
    in the convergence beat where it belongs. The four questions in the take
    became three.
  - Draft one opened the ARC Prize beat on the two figures. The inverted
    pyramid is a news rule, but the defect is general: 62.7 against 99.9
    means nothing until somebody has said both are the same model on the same
    tasks. Actor and action first, then the numbers.
  - The answer-key beat was a list of errata. Errata are a footnote; the
    claim worth four sentences is what they do to the reading of a gap, which
    inverts what a residual means and is the page's own point. The compare
    panel is now assumption against finding, not benchmark against error rate.
  - `system` carried four items, Phi-Bench included. Four is a list. Three,
    each scoring a different non-model thing, is an argument, so Phi-Bench
    stays named on the map and off the panel.
  - The take originally closed on "the constraint has moved to verification".
    That is a thesis about a week of news, not about this page, and the page
    does not say it. It closes on the three questions instead, which is the
    thing a viewer can do tomorrow.
  - `rate` first said "watch a benchmark cross from the left column to the
    middle one". The parked map is its three headings and nothing else, and
    the beat's own `focus` delays it further, so the line pointed at a
    movement the frame cannot show. The deixis came out.
  - A second trim pass took every beat's spare clause, which is the lever the
    skill says actually works on pace: commas became full stops and qualifying
    phrases went. That is 1,221 words down to 924.
  - `map` opened on "Here is the whole board". `check_references` pulled the
    frame and it was the title strip and nothing else: a beat's reveals are
    spread across its whole length, so its first line cannot point at its own
    panel, and `reserve` holds back the tail rather than the head. The line
    lost its deixis. "These still discriminate", eight seconds later, lands
    correctly on a finished column.

On length, which is a deviation worth stating rather than hiding. The skill
says plan at about a hundred and fifty words a minute and aim to land under
six, and this lands at about six point two. Two further cuts were considered
and refused: dropping `system` leaves the third map column named and never
toured, which is the one thing an overview's home frame must not do, and
dropping `convergence` removes what the format calls its most valuable half
minute. Everything below those two has already gone, and the two whole
episodes this page still holds are named at the end of this docstring. So the
episode delivers at 720p rather than 1080p, deliberately.

Beats deliberately not written, so the next person knows it was a decision.
There is no contract beat: an overview builds the whole map on screen before
explaining any of it, which is a stronger promise than a list of steps, and
the structure check exempts the format for that reason. There is no resources
card: that is a deep dive's obligation, and the take points at the page,
which carries Epoch AI, Artificial Analysis, LMArena, HELM and BetterBench.

What was cut, on a 5,859-word page with a seventy-row master table. This page
holds at least two more episodes and they are worth naming: a whole one on
the cost axis, which spans five orders of magnitude on the ARC family alone
(44% on ARC-AGI-1 for about sixty-seven cents against the $18,817 and $26,098
Astra runs, with EdgeBench and cost-per-hour beside it); and one on the
integrity crisis, where Berkeley RDI's scanning agent reached near-perfect
scores on eight agent benchmarks by reward hacking, with GAIA, WebArena and
OSWorld's three hundred broken checkers as the evidence. Also cut: tau2-bench
and pass^k, which is a genuinely new metric and the omission that hurts most;
SWE-rebench and decontamination by the calendar; the retrieval-index result
(54% against 38.7% on identical weights); LiveCodeBench and the live/rolling
family; AIME sampling protocol; HarnessDev; reward-hacking activation
monitors; and the two vendor claims the page carries as unverifiable.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, and A always does something different
     because of them

Names are spelled the way they should be said. Text to speech reads "HLE",
"GPQA", "ARC-AGI-3", "GSM8K", "SWE-bench" and "62.7%" badly, so acronyms are
spaced out, versions are spoken as words, and anything that could not be said
cleanly was kept off the spoken line entirely.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: benchmarks"
SUBTITLE = "what a headline number leaves out"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of the benchmarks people use to compare language "
        "models. A benchmark is a fixed set of tasks, scored the same way for "
        "every model."),
    (A, "Current as of the twenty second of September, twenty twenty six, and "
        "the date matters here. Once a frontier model scores above about "
        "ninety percent on a test, that test has stopped discriminating. Most "
        "of the famous ones are already there."),
]

# -- the inventory, named before anything is explained ---------------------
SCRIPT["map"] = [
    (A, "The whole board, then, sorted by whether the number still tells you "
        "anything. I am explaining none of it yet."),
    (A, "These still discriminate. H L E, which is Humanity's Last Exam. Arc "
        "A G I three. Frontier Math, at tier four. Swee bench Pro. Terminal "
        "Bench Science. Real swee."),
    (A, "These are finished. M M L U. G P Q A Diamond. G S M eight K. Human "
        "Eval. Swee bench Verified. Arc A G I one. Every one of those was "
        "once a headline number."),
    (A, "And this column is newer. Benchmarks whose subject is not the model "
        "at all. Fi Bench. Mole. Hyper tau bench. Emergence World."),
]

# -- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "So which one should I actually trust?"),
    (A, "None of them on their own. Every name up there is a number attached "
        "to a setup, and this topic exists because the setup is missing from "
        "almost everywhere the number gets quoted."),
    (A, "Three things go missing, over and over. When it was measured. What "
        "it ran inside. And whether the answer key was right."),
]

# -- one: the age of the number --------------------------------------------
SCRIPT["rate"] = [
    (A, "Start with the age of the number, because that is what moves "
        "fastest."),
    (A, "Terminal Bench Science launched in August. Seventy expert curated "
        "research tasks, deliberately hard. The best score at launch was "
        "thirty percent, from Claude Opus five."),
    (A, "Seven days later, a routine point release put Claude Fable five "
        "point one at fifty two point six. Twenty two points of headroom, "
        "gone in a week."),
    (A, "Nothing is wrong with the benchmark. The point is the rate. G P Q A "
        "Diamond was the frontier knowledge test, and this month Artificial "
        "Analysis dropped it from their index as saturated."),
]

# -- two: the harness ------------------------------------------------------
SCRIPT["harness"] = [
    (A, "Second, what it ran inside. The harness is the scaffold and the "
        "agent loop wrapped around the model."),
    (A, "Arc A G I three is the worked case: interactive game environments a "
        "model cannot have read in training. Until this summer it read as a "
        "thirty percent benchmark."),
    (A, "Since September, Arc Prize publishes two scores per model, each "
        "labelled with its harness. For G P T six Astra: sixty two point "
        "seven percent through the neutral, provider agnostic harness. Ninety "
        "nine point nine through a provider adapter."),
    (B, "Same model, same tasks. Those cannot both be one capability."),
    (A, "Arc Prize say exactly that, which is why both sit on the leaderboard "
        "with labels. The adapter keeps the model's reasoning state inside "
        "the provider between calls, rather than forcing it into notes."),
]

# -- three: the answer key -------------------------------------------------
SCRIPT["answerkey"] = [
    (A, "Third, and almost nobody checks this one. Whether the answer key is "
        "right."),
    (A, "H L E is the headline knowledge benchmark. Expert questions, graded "
        "by a language model against a stored answer. Future House found "
        "roughly twenty nine percent of its chemistry and biology answers "
        "contradicted by the literature. Scale's own review put expert "
        "disagreement around eighteen percent."),
    (A, "And it generalises. Experts re graded six physics suites. Behind "
        "most of the items where models were marked wrong sat wrong keys, "
        "ambiguous questions, or grader bugs."),
    (A, "Sit with what that does to the reading. The part of a suite a model "
        "fails is normally read as the model's limit. A large share of it is "
        "what the benchmark got wrong, and the defects cluster in exactly the "
        "hard tail people quote."),
]

# -- the third column ------------------------------------------------------
SCRIPT["system"] = [
    (A, "That third column is the newest thing here. Benchmarks whose subject "
        "is not the model."),
    (A, "Mole scores the monitor. A hundred and fifty A I operated accounts, "
        "thirty simulated workdays, twelve injected threats. Seventy two "
        "percent of agent models complete most of the harmful objectives, and "
        "the best monitors miss close to half of it."),
    (A, "Hyper tau bench scores the pairing. Claude Opus five passes twenty "
        "three point nine percent of held out tasks alone, and eighty two "
        "point two paired with an engineer."),
    (A, "Emergence World scores duration. Eight worlds of ten agents, sixteen "
        "days. Systems recognised hostile content and kept interacting with "
        "it, in some cases forty six hours later. Detection did not produce "
        "containment."),
]

# -- the convergence -------------------------------------------------------
SCRIPT["convergence"] = [
    (B, "All right. So what does one that still works look like?"),
    (A, "The durable designs arrived at the same answers separately."),
    (A, "Private or rotating question sets, so there is nothing to memorise. "
        "Live sets pinned to dates, so every problem lands after the model's "
        "cutoff. Licensed private repositories: Real swee licensed ten tasks "
        "out of companies' production code, and the same models score about "
        "twenty points lower there. Interactive environments. And paired "
        "human baselines, so a score has a ceiling."),
    (A, "The aggregators moved too. Artificial Analysis rebuilt their index "
        "this month, and private held out sets now carry forty percent of the "
        "weight. Double what it was, to make the index harder to optimise "
        "against."),
]

# -- the take --------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So what is the map for? Not for picking a winner. It is for reading "
        "a number somebody hands you."),
    (A, "Three questions, and you can ask all three in a minute. When was it "
        "measured, given a test can lose twenty two points of headroom in a "
        "week. What harness did it run in. And has anyone checked the answer "
        "key."),
    (A, "A number that cannot survive those three is not a measurement, it is "
        "marketing. And remember what the second question was worth. One "
        "model, one set of tasks, sixty two point seven, or ninety nine point "
        "nine."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, sorted by whether the number still tells you anything.
    # Six names a column is the most that stays legible once the map is fitted
    # to the full frame and then compacted, and the page has seventy rows, so
    # these are its own "active frontier" sentence, the entries its master
    # table marks saturated or retired, and its "subject is the surrounding
    # system" section.
    #
    # Tones. Verified for the ones that still measure something, because that
    # is literally the claim: checked, and still discriminating. Context for
    # the finished ones: on screen, not what we are discussing, which is the
    # colour's exact meaning. Machinery for the third column, because what
    # those score is the apparatus around the model rather than the model.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "still discriminates", "tone": "verified", "items": [
            "HLE", "ARC-AGI-3", "FrontierMath Tier 4", "SWE-bench Pro",
            "Terminal-Bench-Science", "Real-SWE"]},
        {"head": "finished", "tone": "context", "items": [
            "MMLU", "GPQA Diamond", "GSM8K", "HumanEval",
            "SWE-bench Verified", "ARC-AGI-1"]},
        {"head": "not the model", "tone": "machinery", "items": [
            "Phi-Bench", "MOLE", "Hyper-tau-bench", "Emergence World"]},
    ]},

    # No focus. The map was just built with every column lit, and this beat
    # is about all of them, so re-lighting everything would cost a second of
    # delay to change nothing. The lit state is inherited deliberately.
    "question": {"kind": "claim",
                 "text": "Every score is a number\nattached to a setup.",
                 "note": "when it was measured · what it ran inside · whether "
                         "the key was right"},

    # Two measurements of one benchmark seven days apart. The labels are
    # models rather than dates, so the frame cannot be misread as one model
    # improving, which is the thing bars genuinely cannot draw. Both columns
    # are lit because the beat is about the crossing between them.
    "rate": {"kind": "bars", "reserve": 12.0,
             "focus": ["still discriminates", "finished"],
             "head": "Terminal-Bench-Science 0.1, seven days apart", "bars": [
                 {"label": "Claude Opus 5", "value": 30.0, "text": "30.0%",
                  "tone": "context"},
                 {"label": "Claude Fable 5.1", "value": 52.6, "text": "52.6%",
                  "tone": "number"},
             ]},

    # One model, one task set, two harnesses. Exactly what bars are for, and
    # the reason values are given rather than widths: the gap is the argument,
    # so it has to be drawn by arithmetic. Reserved heavily because both
    # figures are spoken two thirds of the way through the beat and the bars
    # must be finished by then.
    #
    # Both bars are measured numbers, so the lower one is not dimmed and the
    # higher one is not the verified colour. The frames from the silent
    # preview made the case: drawn as context against verified, the picture
    # says the adapter run is the real score, which is a ranking ARC Prize
    # explicitly refuses. Machinery is what the adapter actually is, provider
    # plumbing, and the colour then carries the distinction without the
    # judgement.
    "harness": {"kind": "bars", "reserve": 16.0, "focus": "still discriminates",
                "head": "ARC-AGI-3: GPT-6 Astra, one task set", "bars": [
                    {"label": "neutral harness", "value": 62.7, "text": "62.7%",
                     "tone": "number"},
                    {"label": "provider adapter", "value": 99.9, "text": "99.9%",
                     "tone": "machinery"},
                ]},

    # No focus, deliberately: HLE and the physics suites are in the same
    # column the previous beat lit, so the map is already saying the right
    # thing and a second focus would only delay this panel.
    #
    # Assumption against finding, because the claim is not the errata, it is
    # what the errata do to the reading of a gap. Items are kept near
    # twenty-two characters, which is what a compare side has room for beside
    # a parked map.
    "answerkey": {"kind": "compare", "reserve": 18.0, "sides": [
        {"head": "how a gap is read", "tone": "context", "items": [
            "the model failed",
            "the gap is the limit",
            "the hard tail is real"]},
        {"head": "what re-grading found", "tone": "cost", "items": [
            "~29% contradicted",
            "18% expert disagreement",
            "wrong keys, bad items"]},
    ]},

    # Three items, each naming what is actually being scored, short enough to
    # stay large beside the parked map. The heading renders in the subject
    # colour whatever the tone says, which is a known limitation of `points`;
    # the items carry the machinery colour so the column and the beat match.
    "system": {"kind": "points", "tone": "machinery", "focus": "not the model",
               "head": "what is actually being scored", "items": [
                   "MOLE: the monitor",
                   "Hyper-tau-bench: the pairing",
                   "Emergence World: the duration",
               ]},

    # Back to neutral. The convergence is about every column, and leaving the
    # third one lit would point at it while the line points at all three.
    "convergence": {"kind": "points", "tone": "verified", "reserve": 14.0,
                    "focus": ["still discriminates", "finished",
                              "not the model"],
                    "head": "what the durable designs share", "items": [
                        "private or rotating sets",
                        "live sets pinned to dates",
                        "licensed private repos",
                        "interactive environments",
                        "paired human baselines",
                    ]},

    # No focus: the map is already neutral from the previous beat, which is
    # the state the take wants.
    "take": {"kind": "claim",
             "text": "Ask three questions\nof every benchmark number.",
             "note": "when was it measured · what harness · who checked the "
                     "key"},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 150:.1f} minutes at 150 words per minute")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:12s} {w:3d} words  ~{w / 150 * 60:4.0f}s")
