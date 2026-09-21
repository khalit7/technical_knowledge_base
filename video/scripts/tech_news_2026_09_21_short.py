"""
The two minute cut of "Tech news, week to 21 September 2026".

A whole small edition, not an excerpt. It follows the news shape the skill
sets out rather than the single-explainer shape:

    ident -> story one (headline, why, context, then detail)
          -> story two (headline, why, context, then detail)
          -> the take that ties them together

Three things this version does that the first cut did not, all from Khalid's
review of it:

  - It says what it is. The opening card and the opening sentence give the
    edition and the date, so somebody arriving cold knows what they are
    watching and how current it is.
  - It separates the stories and opens each one properly: the claim first, then
    why it matters, then the context needed to follow it, and only then the
    mechanism. A viewer is entitled to know what a story is before deciding to
    spend a minute on it.
  - The narration points at the visuals. Lines name the chart, the axis and the
    labels on screen, and numbers are spoken at the moment they appear.

The two detail beats are the full episode's, unchanged, so the versions cannot
drift and their audio is rendered once and shared.
"""

from scripts.tech_news_2026_09_21 import A, B, SCRIPT as FULL

FORMAT = "news"

# The contract lives inside the opening here ("two stories, and by the end they
# turn out to be the same story") rather than in a beat of its own. At three
# and a half minutes it needs one; it does not need a separate one.
ROLES = {"contract": "ident"}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the technical news for the week ending the twenty first of September, "
        "twenty twenty six."),
    (A, "Two stories, and by the end they turn out to be the same story."),
]

# --- story one ------------------------------------------------------------
SCRIPT["story1_open"] = [
    (A, "Story one. Anthropic released a report measuring how much better their "
        "models have got at running long tasks on their own, without a person "
        "checking in."),
    (A, "The number on the screen is the one that matters. A job the model can "
        "finish by itself went from about four minutes, to twelve hours, "
        "in two years."),
    (A, "It matters because that was an argument until this week, and now it is "
        "measurements. If you are planning anything around agents, "
        "this is the curve your plan rests on."),
    (B, "One caveat worth holding onto, though. These are self reported numbers."),
    (A, "They are. Anthropic measured its own models, on its own codebase, "
        "and it benefits from the answer. That is why the data exists at all, "
        "and it is why you hold it loosely."),
]

SCRIPT["horizon"] = FULL["horizon"]
SCRIPT["horizon_caveat"] = FULL["horizon_caveat"]

# --- story two ------------------------------------------------------------
SCRIPT["story2_open"] = [
    (A, "Story two, and this is the one worth your time."),
    (A, "A Chinese lab called Z A I, the one that used to be called Zhipu, "
        "says its model G L M five point three built the system that now serves it. "
        "Thirteen days from start to production, and more than three times "
        "the throughput they began with."),
    (A, "It matters because of what they say the bottleneck was, and it was not "
        "the model. Look at the loop: model, work, feedback. "
        "They are claiming the constraint sits on that last edge."),
    (B, "And they are careful to say this is not recursive self improvement."),
]

SCRIPT["feedback"] = [
    (A, "So they replaced one sparse signal, the test failed, "
        "with the three kinds of feedback coming up underneath it now."),
    (A, "Correctness, comparing results across execution paths. "
        "Behaviour, timelines instead of totals. "
        "Performance, which constraint actually binds."),
    (A, "Two bugs fell out of that which no end to end metric would have found: "
        "a precision bug under one parallelism strategy, "
        "and a twenty percent slowdown that was the Python global interpreter lock."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So, both stories, one point. The constraint moved. "
        "It used to sit on how capable the model was, and it now sits on verification."),
    (B, "So the question about your own stack changes."),
    (A, "It does. Not which model. "
        "What does this thing find out when it is wrong, and how soon."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, "
          f"about {words / 162 * 60:.0f} seconds at the measured delivery rate")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:16s} {len(turns)} turns  {w:3d} words  ~{w / 162 * 60:4.0f}s")
