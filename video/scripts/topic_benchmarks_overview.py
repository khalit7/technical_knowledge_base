"""
Topic overview: benchmarks, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: a public benchmark
number is a measurement of a whole system, and the model is only one part of
it. The page has the cleanest demonstration of that in the knowledge base, so
it is the spine here: the same model, on the same benchmark, thirty-seven
points apart through two labelled harnesses, and the higher score is the
cheaper run. Everything else on the page is an instance of the same thing, a
number that stopped meaning what it meant, and the two mechanisms are
scaffolding on one side and item defects on the other.

The inventory is therefore benchmarks sorted by whether they still tell you
anything, not by subject: what still discriminates, what is finished, and the
new class whose subject is not the model. Sorting them by domain would have
been a taxonomy read aloud, and the page's taxonomy block already does that
better than speech can.

The sibling episode on "Topic: evaluation-and-llm-judges" owns why your own
eval lies to you. This one owns why a public number dies. Contamination,
gold-label error and grader bugs appear in both, deliberately: here they are
how a benchmark dies, there they are why your labels are wrong.

The outline that survived the revision step:

    ident       what this is, how current, why it earns the time
    map         three columns, everything named, nothing explained. Parked,
                and every later beat lights the part being discussed
    question    what does a number tell you, and when did it stop
    harness     ARC-AGI-3 read as a 30% benchmark until the scaffolds landed
    astra       the spine: 62.7% against 99.9%, and the cheaper run is the
                higher one
    separated   why, and why it is permanent: latent reasoning state
    death       the other mechanism: the questions themselves are wrong
    saturation  and the rate, which now runs in weeks rather than years
    system      the right-hand column: the subject is not the model
    read        what to ask when somebody quotes you one of these
    close       the take, and Real-SWE as the thing to watch

What the step-4 critique caught, and what changed:

  - Draft one opened on the 37-point gap. That is opening on a surprising
    number about a subject nobody has been told is the subject, which is the
    failure the opening rule exists to prevent. The gap moved to the middle,
    where it is the payload, and the opening now names the field and dates it.
  - Draft one had a beat on the taxonomy: knowledge, math, coding, agentic,
    long context, and so on. It was eleven names with nothing said about any
    of them, and it made the map a list rather than an argument. Cut, and the
    map now sorts by status, which is the thing this episode is about.
  - The harness story and the Astra pair were one beat and it ran to a hundred
    and forty words. Split: the first establishes that scaffolding moves the
    number at all, the second is the labelled pair, and B's question lands
    between them where a viewer actually forms it.
  - Four numbers were doing no work in speech (Phi-Bench's 36.53%, HarnessDev's
    2,207 instances, the $12.78 human cost per game, the 20 billion tokens of
    MOLE monitoring corpora) and were cut rather than shrunk. Phi-Bench and
    HarnessDev survive as names in the table, which is what the inventory
    needs from them.
  - tau2-bench and pass^k came out entirely. Reliability against best case is
    a good idea and it is a third mechanism, and three mechanisms in six
    minutes is a list. It is named on the page for anyone who reads it.
  - B was agreeing in draft one. B now has four turns and each one changes
    what A does next.
  - Draft three measured nine and a half minutes, which is past the point
    where the delivery encode steps down to 720p to fit Notion's cap and the
    text stops being crisp. A whole beat went rather than a trim across all of
    them: the 67 cents ARC-AGI-1 run, which is a second thing one score hides
    on a benchmark family the episode has already used for the first. Every
    remaining beat then lost its second clause.

Every figure comes from the canonical page "Topic: benchmarks", read from
Notion on 22 September 2026, except the MMLU errata rate, which is on that
page's own deep dive "Knowledge and reasoning benchmarks". Nothing was
invented for shape.

Numbers and names are spelled the way they are said, because text to speech
reads "ARC-AGI-3", "62.7%" and "$26,098" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: benchmarks"
SUBTITLE = "what a public number measures, and when it stopped measuring it"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Sorted by whether the number still tells you anything,
    # because that is the argument; sorted by subject it would be a taxonomy
    # read aloud.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "still discriminates", "tone": "verified", "items": [
            "HLE",
            "ARC-AGI-3",
            "Terminal-Bench-Science",
            "Real-SWE",
            "FrontierMath Tier 4",
            "SWE-bench Pro"]},
        {"head": "finished", "tone": "context", "items": [
            "MMLU",
            "GPQA Diamond",
            "GSM8K",
            "HumanEval",
            "SWE-bench Verified",
            "ARC-AGI-1"]},
        {"head": "the subject is not the model", "tone": "machinery", "items": [
            "HarnessDev",
            "Phi-Bench",
            "MOLE",
            "Hyper-tau-bench",
            "Emergence World"]},
    ]},

    # Not the sentence A speaks. The panel states the object of the episode,
    # the narration asks the question, and neither reads the other out.
    "question": {"kind": "claim",
                 "text": "What is a benchmark number\na measurement of?",
                 "note": "one benchmark through the middle of it, then how the rest die"},

    "harness": {"kind": "bars", "focus": "ARC-AGI-3",
                "head": "ARC-AGI-3: one benchmark, different scaffolding",
                "bars": [
        {"label": "default harness", "text": "about 30%", "value": 30, "tone": "cost"},
        {"label": "Prime Agent", "text": "95.5%", "value": 95.5, "tone": "subject"},
        {"label": "Nvidia AVO", "text": "100%", "value": 100, "tone": "subject"},
        {"label": "humans", "text": "100%", "value": 100, "tone": "context"},
    ]},

    # The spine. Two sides rather than two bars: the cost is the second axis
    # and it runs the wrong way, which is spatial rather than arithmetic.
    "astra": {"kind": "compare", "sides": [
        {"head": "standard harness", "tone": "context", "items": [
            "62.7%",
            "$26,098",
            "provider-agnostic"]},
        {"head": "Provider Adapter", "tone": "verified", "items": [
            "99.9%",
            "$18,817",
            "keeps the model's own state"]},
    ]},

    "separated": {"kind": "points", "tone": "machinery",
                  "head": "why the adapter wins, and why it is permanent",
                  "items": [
        "it preserves opaque reasoning state between requests",
        "it compacts long conversations instead of forcing visible notes",
        "a neutral harness has to make the reasoning visible to carry it",
        "so it cannot reach part of what the model can do",
    ]},

    "death": {"kind": "points", "focus": "MMLU", "tone": "cost",
              "head": "how a benchmark dies: the questions are wrong",
              "items": [
        "MMLU: 6.5% of questions carry an error of some kind",
        "six physics suites re-graded: most failures were the test's fault",
        "OSWorld: about 300 broken tasks and checkers, flattening scores",
        "and the defects concentrate in the hard tail people quote",
    ]},

    "saturation": {"kind": "stat", "big": "22 points",
                   "caption": "of headroom, gone in seven days", "tone": "cost",
                   "note": "Terminal-Bench-Science launched in August 2026 at "
                           "30.0% and stood at 52.6% a point release later"},

    "system": {"kind": "table", "focus": "MOLE",
               "head": ["benchmark", "what it actually scores"],
               "rows": [
        ["HarnessDev", "the harness the model wrote for itself"],
        ["Phi-Bench", "whether it can build the infrastructure it runs on"],
        ["MOLE", "the monitor, not the agent"],
        ["Hyper-tau-bench", "23.9% alone, 82.2% paired with an engineer"],
        ["Emergence World", "16 days of continuous operation"],
    ]},

    "read": {"kind": "compare", "focus": "SWE-bench Pro", "sides": [
        {"head": "the number you are quoted", "tone": "context", "items": [
            "ARC-AGI-3, 99.9%",
            "SWE-bench Pro, 80%",
            "Terminal-Bench, 57.9%",
            "legal research, 54%"]},
        {"head": "the question that decides it", "tone": "subject", "items": [
            "which harness",
            "which split, whose scaffold",
            "which version",
            "which index"]},
    ]},

    "close": {"kind": "claim",
              "text": "A benchmark number measures a system.\n"
                      "The model is one part of that system.",
              "note": "quote it with its harness, its split and its version, "
                      "or you have not quoted anything"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of benchmarks. The public tests that decide which "
        "model gets called the best one, and the source of nearly every "
        "number quoted at you about A I."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns an episode because the landscape turns over in weeks now, and "
        "a number you trusted last year means something else today."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first. Three columns, nothing explained yet."),
    (A, "On the left, what still separates frontier models. Humanity's Last "
        "Exam. A R C A G I three. Terminal Bench Science. Real S W E. "
        "FrontierMath's top tier. S W E bench Pro."),
    (A, "In the middle, the finished ones. M M L U. G P Q A Diamond, at "
        "ninety six percent, dropped from a major index this month. G S M "
        "eight K. HumanEval. S W E bench Verified. A R C A G I one."),
    (B, "That middle column is the list I was told to look at two years ago."),
    (A, "It is. And the right hand column is the newest thing here. "
        "HarnessDev. Phi Bench. MOLE. Hyper tau bench. Emergence World. Their "
        "subject is not the model at all."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So, the question the map is arranged to answer. What does a public "
        "benchmark number actually tell you, and when did it stop telling you "
        "that?"),
    (A, "One benchmark through the middle, because it produced the cleanest "
        "result in this field all year. Then how the rest of them die."),
]

# --- scaffolding moves the number at all ----------------------------------
SCRIPT["harness"] = [
    (A, "A R C A G I three is interactive game environments. The agent gets "
        "no instructions. It has to explore, work out the goal, and plan. "
        "Humans finish all of them."),
    (A, "Through the middle of this year it read as a thirty percent "
        "benchmark. Then inside one week of August, two results moved that "
        "baseline without touching the model. Prime Agent, ninety five and a "
        "half percent. N Vidia's agentic variation operators, a hundred."),
    (A, "Look at the gap above the first bar. All of that is scaffolding."),
]

# --- the spine ------------------------------------------------------------
SCRIPT["astra"] = [
    (A, "Which is why A R C Prize now publishes two labelled harness results "
        "for every model. Same weights, same benchmark, two official numbers."),
    (A, "G P T six Astra. On the standard provider agnostic harness, sixty "
        "two point seven percent, for twenty six thousand and ninety eight "
        "dollars. Through the provider adapter, ninety nine point nine "
        "percent, for eighteen thousand eight hundred and seventeen."),
    (B, "Wait. The higher score is the cheaper run?"),
    (A, "The higher score is the cheaper run. Thirty seven points apart, "
        "three point six six times faster, on forty nine percent fewer tokens."),
]

# --- why, and why it does not go away -------------------------------------
SCRIPT["separated"] = [
    (A, "The difference is not a trick, and the reasons are on the screen. "
        "The adapter keeps the model's opaque reasoning state between "
        "requests, and compacts long conversations rather than forcing "
        "visible notes."),
    (A, "The last two lines are the permanent part. A neutral harness has to "
        "make the reasoning visible to carry it forward, so once a model "
        "thinks partly in state only its provider can hand back, that harness "
        "cannot reach part of what it can do. Those are two different "
        "questions now, and they are not rejoining."),
]

# --- how a number stops meaning anything ----------------------------------
SCRIPT["death"] = [
    (A, "Now the middle column, and how a benchmark dies. Usually not by "
        "being solved. By being wrong."),
    (A, "M M L U Redux re-annotated five thousand seven hundred questions. "
        "About six and a half percent carry an error of some kind, and that "
        "counts every defect type, not just wrong answer keys."),
    (A, "Then experts re-graded six physics suites. Most of the items where "
        "frontier models had been scored wrong turned out to be the test's "
        "fault. Third line, same story earlier: OSWorld was revised because "
        "about three hundred of its tasks and checkers were broken."),
    (B, "So the model was right and the test was wrong."),
    (A, "Often. Which inverts how everybody reads a benchmark gap: the part "
        "a model fails mixes what it cannot do with what the test got wrong, "
        "and those defects sit in the hard tail."),
]

# --- how a number stops meaning anything, mechanism two -------------------
SCRIPT["saturation"] = [
    (A, "The other way they die is faster than it used to be. Terminal Bench "
        "Science launched in August at thirty percent, the least saturated "
        "agent benchmark anywhere. Seven days later a point release put it at "
        "fifty two point six. Twenty two points of headroom, gone in a week, "
        "and nothing is wrong with the benchmark."),
]

# --- the right-hand column ------------------------------------------------
SCRIPT["system"] = [
    (A, "The right hand column is the quietest change here. HarnessDev "
        "scores the harness a model wrote for itself. Phi Bench, whether it "
        "can build the infrastructure it runs on. MOLE scores the monitor "
        "rather than the agent, and Emergence World runs agents for sixteen "
        "days."),
    (A, "Look at the fourth row. Hyper tau bench ran Claude Opus five on "
        "agent building tasks: twenty three point nine percent alone, eighty "
        "two point two percent paired with an engineer who knew the task."),
    (A, "Which is the harness lesson again. How well an agent does is not a "
        "property of the agent."),
]

# --- what to actually ask -------------------------------------------------
SCRIPT["read"] = [
    (B, "So what do I ask when somebody puts one of these in front of me?"),
    (A, "The right hand side of the screen. Top row you have seen: which "
        "harness. Then S W E bench Pro, which spans forty seven to eighty "
        "percent for one benchmark, depending on the split and whose scaffold "
        "ran it."),
    (A, "Terminal Bench four point zero recalibrated what each task is "
        "allowed, so older scores are not comparable to it."),
    (A, "And the bottom row. On legal research the same Astra weights pass "
        "fifty four percent of the correctness checks with a licensed legal "
        "index behind them, and thirty eight point seven with web search."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? Every number on it measures a whole system. "
        "A model, a harness, a split, a version, an index, and an answer key "
        "somebody wrote by hand. The model is only one of its parts, and the "
        "others move the number further."),
    (A, "The number I would watch is on the left. Real S W E licenses tasks "
        "from private company repositories, so they cannot leak into training "
        "data. Its leader sits at thirty eight point eight percent, about "
        "twenty points below what those models post publicly. That gap is the "
        "closest thing here to an honest number."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words, "
          f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, spoken in SCRIPT.items():
        w = sum(len(line.split()) for _, line in spoken)
        print(f"  {key:12s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
