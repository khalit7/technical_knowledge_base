"""
The two minute edition for the week ending 14 September 2026.

Written to the same skill as the 21 September cut and sharing none of its
content, which is the point: if the format only works on one week's stories it
is not a format.

    ident -> story one (headline, why, context, then mechanism)
          -> story two (headline, why, context, then mechanism)
          -> the take that ties them together

The two stories this week are DeepSeek shipping an encoder-decoder and
Real-SWE measuring coding agents on private code. They are the same story: one
lab optimised for what production actually costs, and one benchmark measured
what production actually returns, and both numbers are far from the leaderboard
they replace.

Every figure comes from the canonical page "2026-09-14: tech news".
"""

A = "A"
B = "B"

FORMAT = "news"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the technical news for the week ending the fourteenth of September, "
        "twenty twenty six."),
    (A, "Two stories about the gap between a benchmark and a working system."),
]

# --- story one: DeepSeek V4.1-Flash --------------------------------------
SCRIPT["story1_open"] = [
    (A, "Story one. DeepSeek released a new open model, and the surprise is not "
        "how clever it is. It is the shape of it."),
    (A, "Every frontier model for the last two years has been a decoder. "
        "One stack of layers, reading and writing with the same machinery."),
    (A, "This one is an encoder and a decoder, split down the middle. "
        "Forty layers, twenty on each side, as you can see on the diagram."),
    (B, "Which is an architecture people mostly stopped using."),
]

SCRIPT["story1_why"] = [
    (A, "So why go back to it? Because of the number underneath, "
        "and this is the part worth your attention."),
    (A, "The key value cache is the memory a model keeps for every token in a "
        "conversation, and on long agent runs it is the thing that fills your "
        "expensive graphics card memory."),
    (A, "This design cuts that cache to roughly a quarter of what their previous "
        "model needed. Same job, a quarter of the memory."),
    (B, "So they spent the whole generation on what it costs to run, "
        "not on what it can do."),
    (A, "That is exactly it. Five hundred and fifty two billion parameters in total, "
        "but only eight billion of them active while it reads, "
        "and sixteen billion while it writes."),
]

# --- story two: Real-SWE --------------------------------------------------
SCRIPT["story2_open"] = [
    (A, "Story two, and it is the other half of the same point."),
    (A, "A group called Specific Labs licensed ten real tasks from real companies, "
        "on private code nobody has trained on, and ran eight coding agents at them. "
        "Six hundred and forty attempts, scored."),
    (A, "The best one solved thirty eight point eight percent. "
        "The chart is every model they tried, and nothing clears forty."),
]

SCRIPT["story2_detail"] = [
    (A, "Now hold that against the public benchmark. "
        "The same models, one week earlier, scored fifty five and fifty seven percent "
        "on Terminal Bench."),
    (B, "So working on private code costs about twenty points."),
    (A, "About twenty points. And two details make it worse. "
        "Cost per attempt ranged from two dollars fifty to nearly seven, "
        "with no relationship at all to whether it worked."),
    (A, "And of the runs that finished inside ten minutes, "
        "seventy one percent of them failed. "
        "A fast answer was mostly a wrong answer."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So, both stories, one point. The leaderboard and the production system "
        "have come apart."),
    (B, "And the interesting work this week was done by the people measuring "
        "the second one."),
    (A, "Which is the question to take back to your own stack. "
        "Not what it scores. What it costs, and what it does on code nobody has seen."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, "
          f"about {words / 142 * 60:.0f} seconds at the paced delivery rate")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:16s} {len(turns)} turns  {w:3d} words  ~{w / 142 * 60:4.0f}s")
