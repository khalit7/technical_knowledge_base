"""
Narration for "Tech news, week to 21 September 2026".

Source: the canonical page "2026-09-21: tech news", covering roughly the
fourteenth to the twenty first of September. Every figure below is on that
page; nothing is invented for shape, and the one number the page tells you not
to quote (the sixty seven times per dollar operating point) is named on screen
as the thing not to quote rather than left out silently.

Shape: a news edition, so it is story, story, story. Four of them, each one
opened with the headline, why it matters and the context needed to follow it,
and only then the mechanism and the caveat. The handovers are flat on purpose,
because these four things are unrelated and a transition implying otherwise
would be a small lie. The rest of the week runs as a coda after the fourth
story, and the take is about the week rather than about a thread through it.

Two decisions worth recording for whoever writes the next one:

  - **The contract is a clause inside the opening** ("four stories, and here is
    roughly what they are") rather than a beat of its own. The skill allows
    that and asks the script to say so instead of letting the checker guess.
  - **Nothing parks.** A parked panel is a home frame for the rest of the
    episode, and a news edition has no home: the feedback map from story three
    sitting in the corner through story four and the close would claim a
    relationship between them that does not exist.

Beats dropped deliberately, so the next person knows it was a decision. There
is no question beat: a news edition answers a question per story, not one
across the whole thing, and the structure check does not ask news for one.
The Vera Rubin accelerator comparison is a coda line rather than a story,
because its usable number is a range on pre-release software and the page says
so; it would have earned two minutes of mechanism and does not yet deserve it.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is already thinking, four times, and
     A always does something different because of them

Numbers and names are spelled the way they should be said. Text to speech
reads "3.22x" and "Z.ai" badly, so neither appears in a spoken line.
"""

A = "A"
B = "B"

FORMAT = "news"
TITLE = "Tech news"
SUBTITLE = "four stories, then the rest of the week"
UPDATED = "21 September 2026"

# 'ident' carries both the opening and the contract clause inside it.
ROLES = {"opening": "ident", "contract": "ident", "take": "close"}

SCRIPT: dict[str, list[tuple[str, str]]] = {

    # -- what this is ------------------------------------------------------
    "ident": [
        (A, "This is the technical news for the week ending the twenty first "
            "of September, twenty twenty six."),
        (A, "Four stories. A lab publishing numbers on its own engineering. "
            "Two machine checked proofs at wildly different prices. A model "
            "that built the software now serving it. And a study of what "
            "agents do under attack."),
        (A, "They are not connected, and, look, I am not going to pretend they are. The rest of the week comes at the end."),
    ],

    # -- story one ---------------------------------------------------------
    "s1_open": [
        (A, "Story one. Anthropic published a report measuring how much of its "
            "own engineering work its models now do."),
        (A, "It matters because this argument normally runs on adjectives, and "
            "this is a frontier lab putting a series of measurements behind it."),
        (A, "One thing to hold first. These are internal numbers, on its own "
            "models, on its own codebase. I will come back to that."),
    ],
    "s1_horizon": [
        (A, "The measurement that carries is task horizon. How long a job the "
            "model finishes on its own, with nobody checking in."),
        (A, "Watch the bars. March twenty twenty four, Opus three, four "
            "minutes. March twenty twenty five, Sonnet three point seven, "
            "ninety minutes. March this year, Opus four point six, twelve hours."),
        (A, "The bottom bar is a hundred and eighty times the top one. Work "
            "taking a person weeks is projected for next year."),
    ],
    "s1_leverage": [
        (A, "Three figures around it, and these are the ones people quoted."),
        (A, "More than eighty percent of the code merged into Anthropic's "
            "production codebase was written by Claude, as of May. The model "
            "leads twenty six percent of their research work. More than thirty "
            "thousand internal agents run at any one time."),
    ],
    "s1_caveat": [
        (B, "All of which Anthropic measured about Anthropic."),
        (A, "Yeah. And every figure was produced by the company that benefits from "
            "the answer. That is also why it exists, because nobody outside a "
            "frontier lab can measure the inside of one."),
        (A, "Take the direction of that chart seriously. Hold any single value "
            "in it loosely."),
    ],

    # -- story two ---------------------------------------------------------
    "s2_open": [
        (A, "Second story. Two labs produced formally verified mathematics in "
            "the same fortnight, and one of them started a fight about credit."),
        (A, "It matters because a proof is not a benchmark score. There is no "
            "partial credit and nothing to game."),
        (A, "Both are written in Lean, a language for stating mathematics a "
            "computer checks line by line. If it compiles, the theorem is proved."),
    ],
    "s2_cost": [
        (A, "The two runs are side by side, and the gap is the story."),
        (A, "OpenAI ran a swarm that grew to ten thousand concurrent agents, "
            "about three hundred billion output tokens, and an estimated bill "
            "of two million to twenty two and a half million dollars."),
        (A, "Anthropic said one research model, alone for eleven days on about "
            "six billion output tokens, produced the first complete Lean proof "
            "of Fermat's Last Theorem."),
        (B, "Six billion against three hundred billion. That is two percent."),
        (A, "About two percent, yeah. And it is not that one lab is cleverer."),
    ],
    "s2_credit": [
        (A, "Anthropic's run built on Kevin Buzzard's formalisation effort at "
            "Imperial, and credited it. It stood on verified ground. The other "
            "had far less to stand on, and paid to build the scaffolding as it "
            "went."),
        (A, "Then the argument. A mathematician at New York University accused "
            "OpenAI over credit, and asked whether the model had trained on his "
            "own sessions with their coding tool. OpenAI answered only for the "
            "two months before the announcement, which leaves everything "
            "earlier unanswered."),
        (B, "So that is a live question about whether a provider trains on "
            "your work."),
        (A, "And that is the part to carry into a vendor decision, not the proof."),
    ],

    # -- story three -------------------------------------------------------
    "s3_open": [
        (A, "Third story. A Chinese lab called Z dot A I published an account "
            "of how its model built the inference software that now serves it."),
        (A, "The number on screen is the one they lead with. Three point two "
            "two times the throughput they started with, thirteen days from "
            "nothing to production."),
        (A, "It matters because it is specific. Most writing here is about "
            "what a model could do. This shipped, on more than a hundred "
            "thousand Chinese accelerators."),
    ],
    "s3_feedback": [
        (A, "And the transferable finding, it is not about self improvement at all. "
            "They are blunt that the bottleneck was never the model. It was "
            "the feedback the model was getting."),
        (A, "So they replaced one sparse signal, the test failed, with the "
            "three kinds of local, verifiable feedback on screen now."),
        (A, "Correctness, comparing numerical results across execution paths. "
            "System behaviour, reading timelines instead of totals. "
            "Performance, layered testing that shows which constraint binds."),
    ],
    "s3_bugs": [
        (A, "Two bugs fell out of that which no end to end metric would ever "
            "have produced."),
        (A, "A T F thirty two precision bug, visible only under particular "
            "parallelism strategies. And a twenty percent slowdown that turned "
            "out to be the Python global interpreter lock."),
        (A, "Neither reads as anything except, it is a bit slow. The model "
            "could not have fixed either, because nothing told it they existed."),
    ],

    # -- story four --------------------------------------------------------
    "s4_open": [
        (A, "Fourth story, and this is the one I would act on."),
        (A, "A group called Emergence stress tested long horizon multi agent "
            "systems under attack. Eight worlds, ten agents each, sixteen "
            "days, eight hundred and fifty thousand model calls, under prompt "
            "injection and exposed memory."),
        (A, "It matters because everything else published about agents measures "
            "them doing their job. This measures them being interfered with."),
    ],
    "s4_finding": [
        (A, "None of the systems was resilient, which is unsurprising. The "
            "line on screen is the part that should worry you."),
        (A, "Detection did not ensure containment. The systems recognised "
            "adversarial content, and carried on interacting with it anyway, "
            "in some cases for another forty six hours."),
        (B, "So it knew, and it kept going."),
        (A, "It knew, and nothing was, well, nothing in the loop was wired to act "
            "on knowing. A signal with nothing attached to it changes nothing."),
    ],

    # -- the rest of the week ---------------------------------------------
    "coda": [
        (A, "Quickly, the rest of the week."),
        (A, "N Vidia's Vera Rubin rack posted up to seven times the token "
            "throughput per megawatt of the current generation, on pre release "
            "software. Ignore the sixty seven times per dollar headline. The "
            "authors call that an extreme operating point."),
        (A, "N Vidia also, and this was the week's top story on Hacker News, "
            "shipped GPU programming in Rust, in two tracks. And "
            "Bonsai two squeezed a twenty seven billion parameter model to one "
            "point seven six bits per weight, keeping ninety eight percent of "
            "its scores."),
        (A, "Last, experts re-graded six popular physics benchmarks, and found "
            "most of the failures everyone reported were the test's fault. "
            "Wrong answer keys, ambiguous questions, grader bugs."),
    ],

    # -- the take ----------------------------------------------------------
    "close": [
        (A, "So. Four stories, and they do not add up to one thing, which is, "
            "honestly, the normal case for a week of news."),
        (A, "One observation, now you have seen them. Three of these had the "
            "phrase recursive self improvement attached by somebody. The lab "
            "that actually shipped something spent a paragraph saying that is "
            "not what happened, and that humans kept the objectives. Worth "
            "remembering next time you meet the phrase with no numbers under "
            "it."),
        (A, "If you act on one of these, act on the fourth. Detection without "
            "containment is the failure most likely to be sitting inside "
            "something you already run. The written issue has all of it."),
    ],
}

VISUALS = {
    "ident": {"kind": "title"},

    "s1_open": {"kind": "claim",
                "text": "Anthropic measured how much of its own\n"
                        "engineering its models now do.",
                "note": "internal measurements, of its own models, on its own codebase"},
    "s1_horizon": {"kind": "bars",
                   "head": "task horizon: how long a job it finishes alone",
                   "bars": [
                       {"label": "Opus 3, Mar 2024", "text": "4 minutes", "value": 4},
                       {"label": "Sonnet 3.7, Mar 2025", "text": "90 minutes", "value": 90},
                       {"label": "Opus 4.6, Mar 2026", "text": "12 hours", "value": 720},
                   ]},
    "s1_leverage": {"kind": "points", "head": "the leverage, as of May 2026",
                    "items": [
                        "80%+ of merged production code, written by Claude",
                        "26% of their AI research work, led by the model",
                        "30,000+ internal agents running at any one time",
                    ]},
    "s1_caveat": {"kind": "claim",
                  "text": "Self-reported, by the party\nthat benefits from the answer.",
                  "note": "which is also why the numbers exist at all"},

    "s2_open": {"kind": "claim",
                "text": "Two labs produced machine-checked\nmathematics this month.",
                "note": "written in Lean: the proof assistant accepts it, or it does not"},
    "s2_cost": {"kind": "compare", "sides": [
        {"head": "OpenAI, Navier-Stokes", "tone": "cost", "items": [
            "10,000 concurrent agents",
            "about 300 billion output tokens",
            "$2m to $22.5m, estimated",
        ]},
        {"head": "Anthropic, Fermat", "tone": "verified", "items": [
            "one model, working alone",
            "11 days",
            "about 6 billion output tokens",
            "2% of the token spend",
        ]},
    ]},
    # No tone here on purpose: red means a cost or a failure in this series,
    # and two of these four lines are neither.
    "s2_credit": {"kind": "points",
                  "head": "the part to carry into a vendor decision",
                  "items": [
                      "one run built on Buzzard's Imperial formalisation, and said so",
                      "the other paid to build the scaffolding as it went",
                      "then: did the model train on the complainant's own sessions?",
                      "answered only for the two months before the announcement",
                  ]},

    "s3_open": {"kind": "stat", "big": "3.22x",
                "caption": "end-to-end throughput, in 13 days",
                "note": "GLM-5.3 built the inference stack that now serves it, "
                        "on 100,000+ Chinese accelerators"},
    "s3_feedback": {"kind": "columns", "columns": [
        {"head": "correctness", "tone": "verified",
         "items": ["compare results", "across execution paths"]},
        {"head": "system behaviour", "tone": "machinery",
         "items": ["timelines", "not totals"]},
        {"head": "performance", "tone": "number",
         "items": ["layered testing", "which constraint binds"]},
    ]},
    "s3_bugs": {"kind": "points", "tone": "cost",
                "head": "two bugs an end-to-end metric never finds",
                "items": [
                    "a TF32 precision bug, under particular parallelism strategies",
                    "a 20% slowdown that was the Python global interpreter lock",
                    "neither reads as anything but: it is a bit slow",
                ]},

    "s4_open": {"kind": "stat", "big": "850,000", "tone": "cost",
                "caption": "model calls, under attack",
                "note": "eight worlds, ten agents each, sixteen days, "
                        "prompt injection and exposed memory"},
    "s4_finding": {"kind": "claim",
                   "text": "Detection is not containment.",
                   "note": "systems recognised adversarial content and went on "
                           "interacting with it, in some cases for another 46 hours"},

    "coda": {"kind": "points", "head": "the rest of the week", "items": [
        "Vera Rubin NVL72: up to 7x the tokens per megawatt of GB300",
        "the 67x per dollar headline is an extreme point: use 1.4x to 3x",
        "Nvidia shipped GPU programming in Rust, in two tracks",
        "Bonsai 2: 27B at 1.76 bits per weight, 98% of its scores",
        "six physics benchmarks re-graded: most failures were the test's fault",
    ]},

    "close": {"kind": "claim",
              "text": "Four stories. Unrelated, and that is normal.",
              "note": "if you act on one, act on the fourth"},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 145:.1f} minutes at 145 words per minute")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:14s} {w:3d} words  ~{w / 145 * 60:4.0f}s")
