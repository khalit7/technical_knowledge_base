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
    lifecycle   and the ones that are simply finished, in weeks now
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

    "question": {"kind": "claim",
                 "text": "What does a public benchmark number tell you,\n"
                         "and when did it stop telling you that?",
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
              "head": "the other way a number dies: the questions are wrong",
              "items": [
        "MMLU: 6.5% of questions carry an error of some kind",
        "six physics suites re-graded: most failures were the test's fault",
        "OSWorld: about 300 broken tasks and checkers, flattening scores",
        "and the defects concentrate in the hard tail people quote",
    ]},

    "lifecycle": {"kind": "points", "focus": "GPQA Diamond",
                  "head": "and the ones that are simply finished", "items": [
        "Terminal-Bench-Science: 30.0% at launch, 52.6% seven days later",
        "GPQA Diamond at 96.0%, dropped from one major index in Sep 2026",
        "AA-Briefcase and GDP.pdf replaced it",
        "private held-out sets now carry 40% of that index, double",
    ]},

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
        "model gets called the best one, and the source of most numbers "
        "quoted at you about artificial intelligence."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns an episode because this landscape turns over in weeks now, and "
        "a number you learned to trust last year probably means something "
        "else today."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first. Three columns, nothing explained yet."),
    (A, "On the left, what still separates frontier models. Humanity's Last "
        "Exam. A R C A G I three. Terminal Bench Science. Real S W E. The top "
        "tier of FrontierMath. S W E bench Pro."),
    (A, "In the middle, the finished ones. M M L U. G P Q A Diamond. G S M "
        "eight K. HumanEval. S W E bench Verified. A R C A G I one."),
    (B, "That middle column is the list I was told to look at two years ago."),
    (A, "It is, and not one of them separates frontier models now. The right "
        "hand column is the newest thing here. HarnessDev. Phi Bench. MOLE. "
        "Hyper tau bench. Emergence World. Benchmarks whose subject is not "
        "the model."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So, the question the map is arranged to answer. What does a public "
        "benchmark number actually tell you, and when did it stop telling you "
        "that?"),
    (A, "One benchmark through the middle of it, because it produced the "
        "cleanest result in this field all year. Then how the rest of them "
        "die."),
]

# --- scaffolding moves the number at all ----------------------------------
SCRIPT["harness"] = [
    (A, "A R C A G I three is interactive game environments. The agent gets "
        "no instructions. It has to explore, work out the goal, and plan. "
        "Humans finish a hundred percent of them."),
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
        "requests, and compacts long conversations instead of forcing it to "
        "write visible notes."),
    (A, "The last two lines are the permanent part. A neutral harness has to "
        "make the reasoning visible in order to carry it forward. So once a "
        "model thinks partly in state that only its own provider can hand "
        "back, a neutral harness cannot reach part of what it can do."),
    (A, "A R C Prize's position is that those are two different questions, "
        "and both are worth asking. They have separated, and they are not "
        "rejoining."),
]

# --- how a benchmark dies, mechanism one ----------------------------------
SCRIPT["death"] = [
    (A, "Now the middle column, and how a benchmark dies. Usually not by "
        "being solved. By being wrong."),
    (A, "M M L U Redux re-annotated five thousand seven hundred M M L U "
        "questions across all fifty seven subjects. About six and a half "
        "percent carry an error of some kind, counting every defect type, not "
        "just wrong answer keys."),
    (A, "Then experts re-graded six widely used physics suites. Most of the "
        "items where frontier models had been scored wrong turned out to be "
        "the test's fault."),
    (B, "So the model was right and the test was wrong."),
    (A, "Often. Which inverts the way everybody reads a benchmark gap. The "
        "part a model fails mixes what it cannot do with what the benchmark "
        "got wrong, and the defects sit in exactly the hard tail people quote."),
]

# --- how a benchmark dies, mechanism two ----------------------------------
SCRIPT["lifecycle"] = [
    (A, "The other way is saturation, and that runs in weeks now. Terminal "
        "Bench Science launched in August as the least saturated agent "
        "benchmark anywhere, top score thirty percent. Seven days later a "
        "routine point release put it at fifty two point six."),
    (A, "And G P Q A Diamond, which was on every model card for three years, "
        "sits at ninety six percent and was dropped from a major index in "
        "September. Private held out sets now carry forty percent of that "
        "index, double what they did, to make it harder to optimise against."),
]

# --- the right-hand column ------------------------------------------------
SCRIPT["system"] = [
    (A, "The right hand column is the quietest change here. HarnessDev scores "
        "the harness a model wrote for itself. Phi Bench asks whether it can "
        "build the infrastructure it runs on. MOLE scores the monitor rather "
        "than the agent. Emergence World runs agents for sixteen days and "
        "watches what drifts."),
    (A, "Look at the fourth row. Hyper tau bench put Claude Opus five on "
        "agent building tasks. Twenty three point nine percent alone, eighty "
        "two point two percent paired with an engineer who knew the task. "
        "Identical work."),
    (A, "Which is the harness lesson in a different suit. How well this agent "
        "does is not a property of the agent."),
]

# --- what to actually ask -------------------------------------------------
SCRIPT["read"] = [
    (B, "So what do I ask when somebody puts one of these in front of me?"),
    (A, "The right hand side of the screen. S W E bench Pro spans forty seven "
        "to eighty percent, for the same benchmark, depending on the split "
        "and whose scaffold ran it. Terminal Bench four point zero "
        "recalibrated the time, processor and memory each task gets, so an "
        "older score is not comparable to it at all."),
    (A, "And the bottom row is the newest one. On legal research, the same "
        "G P T six Astra weights pass fifty four percent of the correctness "
        "checks with a licensed legal index behind them, and thirty eight "
        "point seven percent with ordinary web search."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for?"),
    (A, "Every number on it measures a whole system. A model, a harness, a "
        "split, a version, an index, and an answer key somebody wrote by "
        "hand. The model is one part, and the other parts move the number "
        "further than it does."),
    (A, "The one I would watch is on the left. Real S W E licenses tasks from "
        "private company repositories, so they cannot leak into training "
        "data, because they were never public. The leader sits at thirty "
        "eight point eight percent, about twenty points below what the same "
        "models post on public tasks. That gap is the closest thing here to "
        "an honest number."),
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
