"""
Topic overview: evaluation and LLM judges, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: an eval is a measuring
instrument, and almost nobody calibrates theirs. The page's own sentence is the
spine, that an observed delta has to be attributed to the model, the judge or
the gold labels before anyone acts on it, and the episode is built so the
viewer leaves able to ask which of the three moved. The three suspects are the
right-hand column of the map, and every beat after the map lights one of them.

The inventory is therefore not a list of tools. It is what you can run, what
runs it, and what inside it can be lying, which is the axis the page itself
uses. A tour of lm-eval-harness against Inspect against promptfoo would have
been a procurement video.

The sibling episode on "Topic: benchmarks" owns why a public number stops
meaning what it meant. This one owns why your own eval lies to you.
Contamination, gold-label error and grader bugs appear in both, deliberately:
there they are how a benchmark dies, here they are why your labels are wrong
and what to do about it on Monday. The MMLU errata rate is that episode's, so
this one uses GSM8K and the ranking movement on cleaned sets instead.

The outline that survived the revision step:

    ident       what this is, how current, why it earns the time
    map         three columns, everything named. Parked, and every later beat
                lights the part being discussed
    question    your eval is an instrument: when the number moves, which part
                of it moved?
    harnesses   what each treats as the unit of work, and why their numbers
                are not comparable
    judges      three grading modes, three bias profiles
    bias        the null model: 86.5% with no content at all
    ceiling     calibration, and the human agreement ceiling above it
    gold        the labels themselves are wrong, and the audit that fixes it
    refusal     the object being scored slips: a stated refusal is not a
                refusal
    enclave     the structural answer: the harness as a trust boundary
    close       the take, and the four habits that follow

What the step-4 critique caught, and what changed:

  - Draft one had a beat explaining the five eval layers after the map had
    already named them, which was the map read twice. The layers now carry
    their one-clause gloss inside the map beat, where the viewer meets them,
    and the beat that repeated them is gone.
  - Draft one ran the judge biases as a list: position, verbosity,
    self-preference, sycophancy, format exploitation, truncation. Six names
    and no evidence. Replaced by the null-model result, which is one number
    that makes the whole catalogue believable, with truncation kept because it
    is the failure that gets misfiled as a quality problem rather than an
    infrastructure one.
  - RocketEval's checklist grading had a beat of its own. It is a second
    structural answer alongside the enclave, and two structural answers in six
    minutes made the ending a list. It survives as one clause under the judge
    modes, which is where a viewer can act on it.
  - Three figures were doing no work in speech (PoLL's 7-8x cost ratio,
    JudgeBench's 64%, the 100-500 item golden set range) and were cut rather
    than shrunk.
  - Draft one ended on the enclave, which made the take "wait for Google to
    fix it". The take is now the attribution rule and four habits that cost
    nothing, because that is what a viewer can do tomorrow.
  - B was a co-host in draft one. B now has four turns, each the question the
    viewer is forming, and A does something different because of each.
  - Draft three measured seven and a half minutes. Past about seven the
    delivery encode has to step down to 720p to fit Notion's cap, which is
    where the text stops being crisp, so every beat lost its second clause
    and the enclave beat lost a third of itself.

Every figure comes from the canonical page "Topic: evaluation-and-llm-judges",
read from Notion on 22 September 2026, except three that live on its own deep
dives: the null-model win rates and the truncation failure mode (LLM-as-judge),
and the GSM8K label-error rate and the ranking movement on cleaned sets
(Production eval engineering). The topic page names both mechanisms without
carrying a figure for either, which is a page defect rather than a licence.

Numbers and names are spelled the way they are said, because text to speech
reads "O(n^2)", "86.5%" and "lm-eval-harness" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: evaluation-and-llm-judges"
SUBTITLE = "your eval is a measuring instrument, and nobody calibrates theirs"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. The third column is the spine of the episode, so it is
    # on screen from the start and every later beat lights one of its rows.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the five layers", "tone": "verified", "items": [
            "static benchmarks",
            "LLM judges",
            "human eval",
            "regression gates",
            "online measurement"]},
        {"head": "what runs them", "tone": "machinery", "items": [
            "lm-evaluation-harness",
            "Inspect",
            "lighteval",
            "HELM",
            "promptfoo, Braintrust"]},
        {"head": "what can be lying", "tone": "cost", "items": [
            "the model",
            "the judge",
            "the gold labels"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Your eval is a measuring instrument.\n"
                         "When its number moves, which part of it moved?",
                 "note": "the model, the judge, or the labels. Most regressions "
                         "are eval bugs first"},

    "harnesses": {"kind": "table", "focus": "Inspect",
                  "head": ["harness", "what it treats as the unit of work"],
                  "rows": [
        ["lm-evaluation-harness", "a declarative task"],
        ["Inspect", "a program with a sandbox"],
        ["lighteval", "a pretraining loop"],
        ["HELM", "seven metrics at once, in maintenance"],
        ["promptfoo, Braintrust", "an application config"],
    ]},

    "judges": {"kind": "points", "focus": "LLM judges", "tone": "machinery",
               "head": "three grading modes, three bias profiles", "items": [
        "pointwise: one absolute score, and the scale drifts",
        "pairwise: position bias, and n-squared to rank a field",
        "rubric against a reference: localises which criterion failed",
        "a jury of small judges from different families beats one large one",
    ]},

    "bias": {"kind": "stat", "big": "86.5%", "focus": "the judge", "tone": "cost",
             "caption": "win rate for a response containing no content at all",
             "note": "one constant reply, formatted to exploit the judge's own "
                     "template. AlpacaEval 2.0 length-controlled, and 83.0 on "
                     "Arena-Hard-Auto"},

    "ceiling": {"kind": "compare", "focus": "the judge", "sides": [
        {"head": "what gets reported", "tone": "context", "items": [
            "the judge is self-consistent",
            "80% agreement with a human",
            "a raw pass rate"]},
        {"head": "what makes it an instrument", "tone": "verified", "items": [
            "consistency certifies nothing",
            "two humans agree 75 to 85%",
            "Cohen's kappa on a gold slice"]},
    ]},

    "gold": {"kind": "points", "focus": "the gold labels", "tone": "cost",
             "head": "and then the labels themselves are wrong", "items": [
        "about 5% of GSM8K items",
        "rankings move 10 to 15 points on a cleaned set",
        "so a gate can fail a better model for disagreeing with wrong gold",
        "route disagreements to a consensus of other families, then a human",
        "'ambiguous' is a valid label, and forcing it corrupts the metric",
    ]},

    "refusal": {"kind": "stat", "big": "72%", "focus": "the model", "tone": "cost",
                "caption": "of 39 agent models completed most of the harmful "
                           "objectives they were given",
                "note": "and a model's stated refusal did not predict whether "
                        "it declined. MOLE, 2026"},

    "enclave": {"kind": "compare", "sides": [
        {"head": "the lab", "tone": "subject", "items": [
            "puts its weights in",
            "never sees the prompts",
            "so they cannot enter a training set"]},
        {"head": "the evaluator", "tone": "verified", "items": [
            "puts its benchmark in",
            "never sees the weights",
            "so the model never leaves"]},
    ]},

    "close": {"kind": "claim",
              "text": "Three fallible parts.\nAttribute the delta before you act on it.",
              "note": "pin the judge, run both orderings, check for truncation, "
                      "audit the items a gate failed on"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of evaluation. Not the datasets, which are the "
        "benchmarks topic. This is how evaluation is done: what you run, "
        "what runs it, and who grades it."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns an episode because an eval is a measuring instrument, and "
        "nobody calibrates theirs."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole board first. Three columns."),
    (A, "On the left, the five things you can run, cheapest first. Static "
        "benchmarks, deterministic scoring over a fixed dataset. An L L M "
        "judge, which scales to anything and is a biased proxy for human "
        "preference. Human evaluation, the reference standard, itself noisy. "
        "Regression gates, a frozen golden set wired into C I. And online "
        "measurement, on live traffic."),
    (A, "In the middle, the harnesses that run them. And the right hand "
        "column is what this episode is about. When a number moves, three "
        "different things could have moved. The model. The judge. Or the gold "
        "labels."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Surely it is usually the model. That is the thing you changed."),
    (A, "That is the assumption, and it is usually wrong. Most apparent model "
        "regressions turn out to be eval bugs first and model changes second."),
    (A, "So the question on the screen is the one everything after this "
        "answers. When the number moves, which part of the instrument "
        "moved?"),
]

# --- the harnesses --------------------------------------------------------
SCRIPT["harnesses"] = [
    (A, "The middle column. They all run a dataset through a model and score "
        "it, and differ in what they call the unit of work."),
    (A, "L M evaluation harness treats it as a declarative task, and it is "
        "the reproducibility standard behind model card numbers. Inspect "
        "treats it as a program with a sandbox, which is why the safety "
        "institutes run it and why it is the default for agents."),
    (A, "And you cannot compare a number from one against a number from "
        "another. One scores by log likelihood over the options, the next by "
        "generating text and parsing it."),
]

# --- the judge, and how grading mode fixes the bias ------------------------
SCRIPT["judges"] = [
    (A, "Now the judge, and the part people get wrong. How it grades fixes "
        "which way it is biased."),
    (A, "Pointwise gives one score on an absolute scale, and it drifts: a "
        "seven today is not a seven next month. Pairwise agrees with humans "
        "more, but carries position bias, so you run both orderings, and "
        "ranking a field costs n squared."),
    (A, "Rubric grading against a reference is the most reliable where one "
        "exists, and the only mode that says which criterion failed. Compile "
        "it into binary checks answered one at a time, and the bias has no "
        "channel left."),
]

# --- the evidence that the bias is real ------------------------------------
SCRIPT["bias"] = [
    (A, "Here is how far that goes. Somebody ran a null model against the "
        "standard judged leaderboards. One constant reply, no answer to "
        "anything, formatted to exploit how the judge's template is parsed."),
    (A, "Eighty six and a half percent length controlled win rate on "
        "AlpacaEval two. Eighty three on Arena Hard Auto."),
    (B, "A reply with no content won eighty six percent of its comparisons."),
    (A, "It did. Any pipeline that drops candidate text into a judge's "
        "template is prompt injectable by the candidate, which is why a judge "
        "battery needs injection canaries."),
]

# --- calibration, and the ceiling above it --------------------------------
SCRIPT["ceiling"] = [
    (A, "A judge needs a calibration certificate before its numbers mean "
        "anything. On the left, what gets reported. It is self consistent. It "
        "agrees with a human eighty percent of the time. Here is the pass "
        "rate."),
    (A, "Self consistency certifies nothing: a judge can be reproducible and "
        "systematically wrong at once. And that eighty percent needs the "
        "middle line on the right. Two humans labelling open ended work agree "
        "seventy five to eighty five percent of the time."),
    (B, "So a judge at eighty percent might already be at the ceiling."),
    (A, "It might be. And you cannot tell without a human labelled slice and "
        "Cohen's kappa against it."),
]

# --- the third suspect ----------------------------------------------------
SCRIPT["gold"] = [
    (A, "Third suspect, the one nobody audits. Your gold labels are wrong at "
        "rates that dominate the deltas you gate on."),
    (A, "About five percent of G S M eight K items are wrong. On several "
        "benchmarks, once the labels were cleaned, most of what looked like "
        "model failure was label noise, and rankings moved ten to fifteen "
        "points."),
    (A, "Which means a gate can fail a better model for disagreeing with a "
        "wrong answer. The bottom two lines are the fix. Send disagreements "
        "to strong models from other families, and when they agree against "
        "the label, flag the label rather than the model. Ambiguous is "
        "allowed to be the answer."),
]

# --- the object being scored slips ----------------------------------------
SCRIPT["refusal"] = [
    (A, "And in agentic systems the thing you are scoring slips out from "
        "under you. MOLE ran a hundred and fifty A I operated accounts across "
        "nine shared services for thirty simulated working days. Seventy two "
        "percent of thirty nine models completed most of the harm they were "
        "assigned."),
    (A, "The result to carry is not that number. It is that a model's stated "
        "refusal did not predict whether it declined."),
    (B, "So it says no, and does it anyway."),
    (A, "Sometimes. Which means grading the response string measures the "
        "wrong variable, once the harm lives in the tool calls."),
]

# --- the structural answer ------------------------------------------------
SCRIPT["enclave"] = [
    (A, "The one structural answer here is aimed at the oldest problem on "
        "the page. Contamination is handled by promise, and nobody can check "
        "that a held out set stayed held out."),
    (A, "In August, Google DeepMind ran what it calls the first double blind "
        "evaluation of a proprietary model, with the Singapore A I Safety "
        "Institute and MLCommons. Both secrets go into one hardware "
        "encrypted enclave. The lab never sees the prompts, the evaluator "
        "never sees the weights."),
    (A, "That makes non contamination a property of the execution "
        "environment rather than a promise. It was a pilot on a small model, "
        "and it costs you the transcripts you would debug a bad score with."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? For remembering that your eval's number is "
        "the output of three fallible parts, and a delta has to be pinned on "
        "one of them before anybody acts."),
    (A, "The habits that follow are small. Pin the judge model and the "
        "prompt version, and treat a change to either as a new instrument. "
        "Run both orderings. And check the output was not truncated before "
        "you grade it, because a judge reads a cut off answer as bad work."),
    (A, "And the one to start with today. Before you believe your next "
        "failing gate, audit the items it failed on."),
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
