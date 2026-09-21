"""
The two minute edition for the week ending 7 September 2026.

Both stories are about the same thing: what a measurement can actually see.
GPT-6 Astra's headline score turns out to be a property of the harness it was
run through, and the model's own reasoning has partly moved somewhere a
harness cannot look.

    ident -> story one (headline, why, context, then mechanism)
          -> story two (headline, why, context, then mechanism)
          -> the take

Written short on purpose. The narration is not slowed down after the fact any
more, because stretching it made the voice sound processed, so the only lever
on pace is the writing: short sentences, full stops rather than commas, and
one clause at a time. Every figure comes from "2026-09-07: tech news".
"""

A = "A"
B = "B"

FORMAT = "news"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the technical news. The week ending the seventh of September, "
        "twenty twenty six."),
    (A, "Two stories. Both are about what a measurement can actually see."),
]

# --- story one: the harness, not the model -------------------------------
SCRIPT["story1_open"] = [
    (A, "Story one. OpenAI shipped GPT six Astra. It is a big model, "
        "trained on more than a hundred thousand graphics cards."),
    (A, "But the number everyone quoted is not really a fact about the model."),
    (A, "ARC Prize ran Astra on their reasoning benchmark twice. "
        "Same model. Two different harnesses."),
    (B, "A harness being the scaffolding around the model. "
        "How it is prompted, what it can remember, how the run is managed."),
]

SCRIPT["story1_numbers"] = [
    (A, "Here are the two results. On the standard harness, "
        "sixty two point seven percent. That run cost twenty six thousand dollars."),
    (A, "On a new harness built with the provider, ninety nine point nine percent. "
        "And that run cost eighteen thousand."),
    (B, "So the better score was also the cheaper one."),
    (A, "Yes. Thirty seven points apart. Same model, same questions. "
        "The difference is the scaffolding."),
    (A, "The new harness keeps the model's reasoning state between requests. "
        "The old one makes it write its thinking out as text every time. "
        "That is the whole gap."),
]

# --- story two: reasoning you cannot read --------------------------------
SCRIPT["story2_open"] = [
    (A, "Story two. And it is why that gap exists."),
    (A, "Astra uses something called recurrent depth. "
        "Instead of writing out every step of its thinking, "
        "it loops its own activations back through its own layers."),
    (A, "So part of the reasoning never becomes text. Look at the diagram. "
        "The tokens on the left are what you can read. "
        "The loop on the right is what you cannot."),
]

SCRIPT["story2_why"] = [
    (A, "Safety researchers pushed back hard. "
        "Buck Shlegeris warned it could destroy our ability to monitor "
        "a model's chain of thought."),
    (B, "And OpenAI's answer?"),
    (A, "That their use of it is limited, and visible reasoning is preserved."),
    (A, "But the part that matters for you is not the safety argument."),
    (A, "Thinking done inside that loop is thinking your evaluation cannot see. "
        "And your serving stack has to carry it between calls."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So, both stories, one point. A score is a fact about a harness, "
        "not just about a model."),
    (B, "And the reasoning is moving somewhere the harness cannot see."),
    (A, "So when a number arrives this week, ask what ran it. "
        "That question is now worth thirty seven points."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, "
          f"about {words / 155 * 60:.0f} seconds at an unstretched delivery rate")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        sentences = sum(line.count(".") + line.count("?") for _, line in turns)
        print(f"  {key:16s} {len(turns)} turns  {w:3d} words  "
              f"{w / max(sentences, 1):4.1f} words per sentence")
