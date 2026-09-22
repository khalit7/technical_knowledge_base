"""
Narration for "Tech news, week to 21 September 2026".

Source: the canonical Notion page "2026-09-21: tech news". Every figure below
comes from that page; nothing is invented for narrative shape.

Rewritten after Khalid watched the first cut: **the stories are not merged.**

The first version was built as "two stories, one point", with a spine running
from a task-horizon chart through a serving-infrastructure post to two
mathematical proofs, all arguing that the constraint had moved from capability
to verification. It is a good argument. It is not what happened this week.
Four unrelated things happened in the same seven days, and bending them onto
one line made the episode harder to follow than reading the page. The skill
now says so outright.

So this cut is four stories, in order, each finished before the next begins.
Each opens the same way: the headline in plain words, why it matters, the
context you need, and only then the detail and the caveat. The handovers are
flat on purpose ("second story") and imply no relationship, because there is
none. The close is about the week, not about a thread running through it.

What moved: the Nous refactor is now evidence inside story four rather than a
story of its own, and the three loop papers became one line in the coda,
because none of them carries a number worth a beat.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"3.22x" and "Z.ai" badly.
"""

A = "A"
B = "B"

FORMAT = "news"
TITLE = "Tech news, week to 21 September 2026"
SUBTITLE = "four stories, and the rest of the week at the end"
UPDATED = "21 September 2026"

# The contract is a clause inside the opening rather than a beat of its own:
# "four stories, and here is what they are" tells the viewer the shape of the
# next seven minutes, which is what a contract is for. The skill allows this
# and asks that the script say so rather than letting a checker guess.
ROLES = {"opening": "ident", "contract": "ident", "question": "s1_open",
         "take": "close"}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    "ident": [
        (A, "This is the technical news. Week ending the twenty first of "
            "September, twenty twenty six."),
        (A, "Four stories this week. A lab publishing numbers on its own "
            "engineering. Two machine checked proofs at wildly different "
            "prices. A model that built the software now serving it. And a "
            "study of what agents do when somebody attacks them."),
        (A, "They are not connected, and I am not going to pretend they are. "
            "The rest of the week comes at the end."),
    ],

    "s1_open": [
        (A, "Story one. Anthropic published a report measuring how much of "
            "its own engineering its models now do."),
        (A, "It matters because this argument is normally conducted with "
            "adjectives. This is the first time a frontier lab has put a "
            "series of numbers behind it."),
        (A, "The context you need is that these are internal measurements. "
            "Nobody outside a frontier lab can measure a frontier lab. Keep "
            "that in your pocket, I will come back to it."),
    ],
    "s1_detail": [
        (A, "The number that carries is task horizon. How long a job a model "
            "can finish on its own, start to finish."),
        (A, "March, twenty twenty four. Opus three. About four minutes."),
        (A, "March, twenty twenty five. Sonnet three point seven. Ninety "
            "minutes."),
        (A, "March this year. Opus four point six. Twelve hours."),
        (B, "And the axis on that chart is logarithmic, so every step is much "
            "bigger than it looks."),
        (A, "It is. The projection for next year is work that would take a "
            "person weeks."),
    ],
    "s1_leverage": [
        (A, "The leverage numbers around it are the part people quoted."),
        (A, "More than eighty percent of the code merged into Anthropic's own "
            "production codebase was written by Claude, as of May."),
        (A, "The model leads twenty six percent of their artificial "
            "intelligence research work, with more than thirty thousand "
            "internal agents running at any one time. And their continuous "
            "integration workload grew twenty five fold in six months."),
    ],
    "s1_caveat": [
        (B, "So this is Anthropic measuring Anthropic."),
        (A, "It is, and that is the honest way to read all of it. Every figure "
            "was produced by the company that benefits from the answer, which "
            "is also why it exists at all. Take the direction of the series "
            "seriously and any single value with a pinch of salt."),
    ],

    "s2_open": [
        (A, "Second story. Two different labs produced formally verified "
            "mathematics this month. Real proofs, checked by machine."),
        (A, "It matters because a proof is not a benchmark score. There is no "
            "partial credit and nothing to game."),
        (A, "Both are written in Lean, a language for stating mathematics a "
            "computer can check line by line. If it compiles, the theorem is "
            "proved."),
    ],
    "s2_detail": [
        (A, "Anthropic's run took eleven days and about six billion output "
            "tokens. Its agents coordinated through an open platform called "
            "Prove2Me, over a graph of theorem statements."),
        (A, "OpenAI's grew to ten thousand concurrent agents, exchanged four "
            "point nine million messages, and burned roughly three hundred "
            "billion output tokens. Estimated cost, two to twenty two and a "
            "half million dollars."),
        (B, "Same category of result, fifty times the bill."),
        (A, "Roughly, yes. And the thing that explains the gap is not one team "
            "being cleverer than the other."),
    ],
    "s2_why": [
        (A, "Anthropic's run built on Kevin Buzzard's formalisation effort at "
            "Imperial. It was standing on verified ground and adding to it."),
        (A, "OpenAI's problem had far less of that already built, so it paid to "
            "construct the scaffolding as it went."),
        (A, "So the lesson is about starting position rather than about either "
            "lab. How much verified structure you begin with is most of what a "
            "run like this costs."),
    ],

    "s3_open": [
        (A, "Third story. Zed dot A I published an account of how their model "
            "built the inference software that now serves it."),
        (A, "It matters because it is unusually specific. Most claims in this "
            "area are about what a model could do. This one is about what "
            "shipped, on more than a hundred thousand Chinese accelerators."),
        (A, "Thirteen days from start to production. Three point two two times "
            "the throughput they began with."),
    ],
    "s3_detail": [
        (A, "The interesting claim is about why it worked, and they are blunt "
            "about it. The bottleneck was never the model. It was the "
            "feedback."),
        (A, "So they replaced one sparse signal, the test failed, with three "
            "kinds of local, verifiable feedback."),
        (A, "Correctness, by comparing results across execution paths. System "
            "behaviour, by reading timelines instead of totals. Performance, by "
            "layered testing that shows which constraint is binding."),
    ],
    "s3_bugs": [
        (A, "You can see what that buys, because two bugs fell out of it that "
            "an end to end metric would never have produced."),
        (A, "A T F thirty two precision bug visible under one parallelism "
            "strategy only. And a twenty percent slowdown that turned out to "
            "be the Python global interpreter lock, blocking the key value "
            "cache transfer from overlapping."),
        (B, "Neither of which shows up as anything except, it is a bit slow."),
        (A, "Exactly. The model could not have fixed either one, because "
            "nothing told it they existed."),
    ],
    "s3_caveat": [
        (B, "Is this the self improving system everybody keeps predicting?"),
        (A, "They say no, explicitly, and that is why the post is worth "
            "reading. Humans kept the objectives and the boundaries. What "
            "changed was the environment the model worked inside."),
    ],

    "s4_open": [
        (A, "Fourth story, and it is the one I would actually act on."),
        (A, "A group called Emergence stress tested long horizon multi agent "
            "systems under attack. Eight worlds, ten agents each, sixteen "
            "days, eight hundred and fifty thousand model calls."),
        (A, "It matters because everything else published about agents measures "
            "them doing their job. This measures them being interfered with, "
            "which is the condition they will run in."),
    ],
    "s4_detail": [
        (A, "None of the systems was resilient. And the finding that should "
            "worry you is not that they were fooled."),
        (A, "It is that detection did not ensure containment. Systems "
            "recognised adversarial content, and then went on interacting with "
            "it, in some cases for another forty six hours."),
        (B, "So the system knew, and carried on anyway."),
        (A, "The system knew, and nothing in the loop was wired to act on "
            "knowing. Detection is not a control. It is a signal, and a signal "
            "with nothing attached to it changes nothing."),
    ],
    "s4_review": [
        (A, "There is a friendlier version of the same shape from Nous "
            "Research. They pointed nearly fourteen hundred subagents at a "
            "million line Python repository for about nineteen hours, and cut "
            "a third of the non test source for around nineteen thousand "
            "dollars."),
        (A, "The tests passed. Human reviewers then found removed public "
            "interfaces that the tests had happily approved. A green suite is "
            "not a review."),
    ],

    "coda": [
        (A, "Quickly, the rest of the week."),
        (A, "Vera Rubin N V L seventy two posted up to seven times the token "
            "throughput per megawatt of G B three hundred, on pre release "
            "software. N Vidia shipped GPU programming in Rust, in two tracks."),
        (A, "Bonsai two squeezed a twenty seven billion parameter model to one "
            "point seven six bits per weight, keeping ninety eight percent of "
            "its scores. And Claude Code now reads an agents markdown file."),
        (A, "Last, experts re-graded six popular physics benchmarks and found "
            "most of the failures everyone had reported were the test's fault. "
            "Wrong answer keys, ambiguous questions, grader bugs."),
    ],
    "close": [
        (A, "So, four stories, and they do not add up to one thing. That is "
            "normal, and a week that did add up to one thing would be the "
            "surprising case."),
        (A, "If you take one of them, take the fourth. Detection without "
            "containment is the failure mode most likely to be sitting inside "
            "something you are already running."),
        (A, "The written issue has all of it, with the sources."),
    ],
}

VISUALS = {
    "ident": {"kind": "title"},

    "s1_open": {"kind": "claim",
                "text": "Anthropic measured how much of its own\nengineering its models now do.",
                "note": "the first frontier lab to put a series of numbers behind the argument"},
    "s1_detail": {"kind": "bars", "head": "task horizon: how long a job it finishes alone",
                  "bars": [
        {"label": "Opus 3, Mar 2024", "text": "4 minutes", "value": 4},
        {"label": "Sonnet 3.7, Mar 2025", "text": "90 minutes", "value": 90},
        {"label": "Opus 4.6, Mar 2026", "text": "12 hours", "value": 720},
        {"label": "projected, 2027", "text": "weeks", "value": 1440, "tone": "context"},
    ]},
    "s1_leverage": {"kind": "points", "head": "the leverage, as of May", "items": [
        "80%+ of merged production code, written by Claude",
        "26% of their AI research work, led by the model",
        "30,000+ internal agents running at any one time",
        "CI workload 25x in six months; the test suite 10x to keep up",
    ]},
    "s1_caveat": {"kind": "claim", "text": "Anthropic measured Anthropic.",
                  "note": "take the direction of the series, not any single value"},

    "s2_open": {"kind": "claim",
                "text": "Two labs produced machine-checked\nmathematics this month.",
                "note": "written in Lean: either the proof assistant accepts it, or it does not"},
    "s2_detail": {"kind": "compare", "sides": [
        {"head": "Anthropic", "tone": "verified", "items": [
            "11 days",
            "about 6 billion output tokens",
            "agents coordinated over a graph of theorems"]},
        {"head": "OpenAI", "tone": "cost", "items": [
            "10,000 concurrent agents",
            "4.9 million messages",
            "about 300 billion tokens, $2m to $22.5m"]},
    ]},
    "s2_why": {"kind": "claim",
               "text": "The gap is starting position,\nnot cleverness.",
               "note": "how much verified structure you begin with is most of what it costs"},

    "s3_open": {"kind": "stat", "big": "3.22x", "caption": "throughput, in thirteen days",
                "note": "GLM-5.3 built the inference software that now serves it, "
                        "on more than 100,000 Chinese accelerators"},
    "s3_detail": {"kind": "columns", "park": True, "columns": [
        {"head": "correctness", "tone": "verified",
         "items": ["compare results", "across execution paths"]},
        {"head": "system behaviour", "tone": "machinery",
         "items": ["timelines, not totals"]},
        {"head": "performance", "tone": "number",
         "items": ["layered testing", "which constraint binds"]},
    ]},
    "s3_bugs": {"kind": "points", "head": "two bugs an end-to-end metric never finds",
                "tone": "cost", "items": [
        "a TF32 precision bug, under one parallelism strategy only",
        "a 20% slowdown that was the Python global interpreter lock",
        "the model could not have fixed either: nothing told it they existed",
    ]},
    "s3_caveat": {"kind": "claim", "text": "The lab says this is not\nself-improvement.",
                  "note": "humans kept the objectives and the boundaries"},

    "s4_open": {"kind": "stat", "big": "850,000", "caption": "model calls, under attack",
                "tone": "cost",
                "note": "eight worlds, ten agents each, sixteen days"},
    "s4_detail": {"kind": "claim",
                  "text": "Detection did not ensure containment.",
                  "note": "systems recognised adversarial content and went on interacting "
                          "with it, in some cases for another 46 hours"},
    "s4_review": {"kind": "points", "head": "the friendlier version of the same shape",
                  "items": [
        "1,393 subagents, 19 active hours, about $19,000",
        "a third of the non-test source removed, and the tests passed",
        "human reviewers then found removed public interfaces",
    ]},

    "coda": {"kind": "points", "head": "the rest of the week", "items": [
        "Vera Rubin NVL72: up to 7x the tokens per megawatt of GB300",
        "Nvidia shipped GPU programming in Rust, in two tracks",
        "Bonsai 2: 27B at 1.76 bits per weight, 98% of its scores",
        "Claude Code now reads an agents markdown file",
        "six physics benchmarks re-graded: most failures were the test's fault",
    ]},
    "close": {"kind": "claim",
              "text": "Four stories. They do not add up to one thing.",
              "note": "if you take one, take the fourth: detection without containment"},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 145:.1f} minutes at 145 words per minute")
