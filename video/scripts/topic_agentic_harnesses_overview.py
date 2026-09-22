"""
Topic overview: agentic harnesses, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: harness quality swings
SWE-bench scores by 10-22 points on identical model weights, and decides the
bill even where it does not move the score. Everything else on the page is an
answer to "so what is the harness actually doing to earn that". The page is the
second largest in the knowledge base and roughly 60% of it is research summary,
so the whole job here is selection: the research is evidence for the organising
claim, not a tour of papers.

The outline that survived the revision step:

    ident       what a harness is, the date, and the 10-22 point claim
    map         the four families, named and parked as the home frame:
                terminal CLIs, editors, cloud agents, personal agents
    question    not which product. What is the harness doing, and what does
                it cost
    sees        the first thing it decides: what the model sees and keeps.
                Two opposite harnesses, both beating the vendor's own
    adapter     the demonstration: one model, two harnesses, 62.7% and 99.9%,
                and the better score is the cheaper one
    cost        the half people skip: SoL-Pi, half the spend is harness waste
    objection   the counterweight: the harness barely moves success rate
    real        which is true of which population. Real-SWE against
                Terminal-Bench 4.0, and the 20-point private-codebase penalty
    containment the other half: what it is allowed to do
    take        a benchmark number without a named harness carries no
                information

What the step-4 critique changed:

  - Draft one walked the six harness-scaling strategies in the order the page
    lists them. That is a tour of papers, and it buried the claim the page
    opens with. Rebuilt as three things a harness decides (what the model
    sees, what it wastes, what it may do), with the papers as evidence under
    those headings. Three strategies were cut outright rather than shrunk.
  - The GLM-5.3 feedback story, Nous's 1,393 subagents and Agora were all cut:
    the 21 September news edition covers them at length, and an overview that
    repeats last week's episode is worth less than one that does not.
  - Draft one put Real-SWE's 38.8% next to the public leaderboards with no
    explanation, which reads as a contradiction. It is two populations, so B
    now asks and A answers it explicitly, on screen, with the grey bar.
  - Every benchmark figure now carries its version out loud. Terminal-Bench
    4.0 replaced the 2.x line in September and the scales are not comparable,
    so the 2.x results on the page (Terminal-Universe, the Proactive Memory
    Agent) were cut rather than quoted beside 4.0 numbers.
  - Draft one had the ARC Prize numbers as a footnote to the strategies beat.
    They are the whole argument in one chart (same weights, both the score and
    the bill move, in opposite directions), so they got their own beat.
  - B was agreeing in draft one. B now has four turns and each one changes
    what A does next.

Every figure comes from the canonical page "Topic: agentic-harnesses", read
from Notion rather than the local mirror, which is behind on this material.

Numbers and names are spelled the way they are said, because text to speech
reads "SWE-bench", "ARC-AGI-3" and "62.7%" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: agentic-harnesses"
SUBTITLE = "what the loop around the model is actually doing, and what it costs"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Columns rather than a stack, because these are families
    # of product rather than layers: nothing sits on top of anything.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "terminal CLIs", "tone": "subject",
         "items": ["Claude Code", "Codex CLI", "OpenCode", "Goose", "Muse Code"]},
        {"head": "editors", "tone": "machinery",
         "items": ["Cursor", "Antigravity", "Devin Desktop", "Zed",
                   "Cline / Roo / Kilo"]},
        {"head": "cloud agents", "tone": "number",
         "items": ["Devin", "Codex cloud", "Jules", "Claude Code web"]},
        {"head": "personal agents", "tone": "verified",
         "items": ["OpenClaw", "Hermes Agent"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Same weights. 10 to 22 points.\nWhat is the harness actually doing?",
                 "note": "and it decides the bill even where it does not move the score"},

    "sees": {"kind": "compare", "sides": [
        {"head": "more machinery", "tone": "machinery", "items": [
            "a persistent Python session",
            "four levels of state",
            "it rewrites its own skills",
            "ARC-AGI-3: 30% to 95.5%"]},
        {"head": "checked state", "tone": "verified", "items": [
            "a fixed CLI agent",
            "inside a versioned state machine",
            "every transition enforced",
            "also beats the native harness"]},
    ]},

    "adapter": {"kind": "bars",
                "head": "GPT-6 Astra, ARC-AGI-3 Semi-Private, identical weights",
                "bars": [
        {"label": "standard harness", "text": "62.7%,  $26,098", "value": 62.7,
         "tone": "cost"},
        {"label": "Provider Adapter", "text": "99.9%,  $18,817", "value": 99.9,
         "tone": "verified"},
    ]},

    "cost": {"kind": "stat", "focus": "terminal CLIs", "tone": "number",
             "big": "44.7-49.0%",
             "caption": "of token traffic removed, at the same success rate",
             "note": "NVIDIA's SoL-Pi, over EdgeBench's 51 tasks: about a third "
                     "off the API bill, and 8.75 to 13.50 US dollars an hour "
                     "against native Codex and Claude Code"},

    "objection": {"kind": "points", "head": "the counterweight", "items": [
        "21 model-harness pairs, 7 models, 3 harnesses",
        "harness choice barely moved the success rate",
        "it moved the cost, a lot",
        "mini-SWE-agent: 100 lines, bash only, ~65% on SWE-bench Verified",
    ]},

    "real": {"kind": "bars",
             "head": "Real-SWE: 10 private enterprise tasks, 640 rollouts",
             "bars": [
        {"label": "Fable 5.1", "text": "38.8%", "value": 38.8, "tone": "verified"},
        {"label": "GPT-6 Astra", "text": "33.8%", "value": 33.8},
        {"label": "Gemini 3.8 Flash", "text": "31.2%", "value": 31.2},
        {"label": "GLM-5.3", "text": "28.8%", "value": 28.8},
        {"label": "Terminal-Bench 4.0", "text": "55.8-57.9%, public tasks",
         "value": 57.9, "tone": "context"},
    ]},

    "containment": {"kind": "compare", "focus": "personal agents", "sides": [
        {"head": "detection is not containment", "tone": "cost", "items": [
            "8 worlds, 16 days, 850,000 model calls",
            "no system was resilient",
            "it recognised the attack and carried on",
            "in cases, for another 46 hours"]},
        {"head": "assume it was fooled", "tone": "verified", "items": [
            "the agent never sees a credential",
            "a service outside the cell swaps the token in",
            "approvals are OS dialogs, not messages",
            "the browser reads the accessibility tree"]},
    ]},

    "take": {"kind": "claim",
             "text": "A benchmark number without a named harness\ncarries no information.",
             "note": "choose the model for capability. Choose the harness for "
                     "what it shows the model, what it lets it do, and what "
                     "that costs per hour"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of agentic harnesses. A harness is the product that "
        "wraps a language model in an agent loop with tools. It assembles the "
        "prompt, gates the permissions, and manages the context."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns the time because of one number. On identical weights, harness "
        "quality swings S W E bench scores by ten to twenty two points."),
]

# --- the inventory, named before anything is explained --------------------
SCRIPT["map"] = [
    (A, "Here is the field first, with nothing explained yet. Four families, "
        "grouped by where the agent lives."),
    (A, "Terminal command line tools are the centre of gravity. Claude Code, "
        "Codex C L I, OpenCode, Goose, Meta's Muse Code. Then editors: "
        "Cursor, Antigravity, Devin Desktop, Zed, and the open V S Code "
        "extensions, Cline, Roo and Kilo."),
    (A, "Then cloud agents you fire and forget, and read a pull request from "
        "later. Devin, Codex cloud, Jules, Claude Code on the web. And a "
        "family that is not about code: resident personal agents, OpenClaw and "
        "Hermes Agent, which act on your messaging accounts."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "Four families and thirty odd products. Which one do I pick?"),
    (A, "That is the wrong first question, and the line on the screen is why. "
        "Same model weights. Ten to twenty two points of S W E bench, "
        "depending only on the harness around them."),
    (A, "So this answers what the harness is actually doing to earn that, and "
        "what it costs you, because it decides the bill even where it does "
        "not move the score."),
]

# --- what the model sees --------------------------------------------------
SCRIPT["sees"] = [
    (A, "Start with the first thing a harness decides: what the model sees, "
        "and what it keeps between steps. Two projects attacked that from "
        "opposite ends, and both beat the vendor's own harness."),
    (A, "On the left, more machinery. Prime Agent swaps the fixed tool list "
        "for a persistent Python session, four levels of state, and an agent "
        "that rewrites its own skills. Arc A G I three, thirty percent to "
        "ninety five point five."),
    (A, "On the right, the opposite: a fixed command line agent inside a state "
        "machine, every transition enforced. That wins too. So the win is "
        "having a durable state layer at all."),
]

# --- the number -----------------------------------------------------------
SCRIPT["adapter"] = [
    (A, "Now the demonstration nobody can wave away, because it is a frontier "
        "model card. Arc Prize published two labelled numbers for G P T six "
        "Astra on one task set."),
    (A, "Through the standard, provider agnostic harness, sixty two point "
        "seven percent, for about twenty six thousand dollars. Through a new "
        "provider adapter harness, ninety nine point nine percent, for under "
        "nineteen thousand."),
    (A, "Same weights. The adapter does the one thing a neutral harness "
        "cannot: it keeps the model's reasoning state inside the provider "
        "between requests, instead of making it write its working out as "
        "notes. And read what is beside the second bar. The better score is "
        "also the cheaper one."),
]

# --- what it wastes -------------------------------------------------------
SCRIPT["cost"] = [
    (A, "Which is the half of the claim people skip. The harness decides the "
        "bill."),
    (A, "N Vidia's Sol Pi ran an improvement loop for cost rather than "
        "capability, because cost has a cheap verifier: did it get cheaper and "
        "still pass? Across fifty one tasks it removed between forty four and "
        "forty nine percent of the token traffic, at the same success rate."),
    (A, "About a third off the bill, against native Codex and Claude Code, lit "
        "up at the top of the map. Roughly half of what an agent spends is "
        "the harness being wasteful, not the model."),
]

# --- the objection --------------------------------------------------------
SCRIPT["objection"] = [
    (B, "I have seen the opposite claim, though. That the harness barely "
        "matters."),
    (A, "You have, and it is a real result. Twenty one model and harness "
        "pairs, seven models across three harnesses. Harness choice barely "
        "moved the success rate, and changed the cost a lot. Mini S W E "
        "agent points the same way: a hundred lines, bash as its only tool, "
        "about sixty five percent on S W E bench verified."),
    (A, "So on short, well specified, public tasks, the harness is where the "
        "money is rather than where the capability is."),
]

# --- which population -----------------------------------------------------
SCRIPT["real"] = [
    (A, "Note what those tasks are, though. Specific Labs licensed ten out of "
        "private enterprise codebases and scored six hundred and forty runs. "
        "The best is Fable five point one, at thirty eight point eight "
        "percent."),
    (B, "That is a long way under the leaderboards. Is one of them wrong?"),
    (A, "Neither. They are different populations, and a number has to say "
        "which: public, well specified issues, or private codebases."),
    (A, "The grey bar is Terminal Bench four point zero, which replaced the "
        "two point x line this month and is not comparable with it. Same "
        "models, days earlier, mid fifties. Twenty points of penalty for being "
        "real. And the commonest failure was missed requirements, not broken "
        "code, which is a harness problem: what the agent was shown."),
]

# --- what it is allowed to do ---------------------------------------------
SCRIPT["containment"] = [
    (A, "So much for what the model sees. The other half is what it is "
        "allowed to do, sharpest for the personal agents lit up at the end of "
        "the map."),
    (A, "Emergence World ran eight worlds of ten agents for sixteen days under "
        "attack. No system was resilient, and the left hand column is the "
        "finding to carry. Detection did not produce containment. Systems "
        "recognised hostile content and carried on interacting with it, in "
        "cases for another forty six hours."),
    (B, "So a detector is not a control."),
    (A, "No. The answer on the right is Meta's, in Muse Spark, and it assumes "
        "the injection already worked. The agent never sees a credential: a "
        "service outside the runtime cell swaps the real token in as the "
        "request leaves. Approvals arrive as operating system dialogs, so text "
        "in the context cannot manufacture consent."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So what is the map for? Choose the model for capability. Choose the "
        "harness for what it shows the model, what it lets the model do, and "
        "what that costs per hour."),
    (A, "And the line on the screen is the one to leave with. Any score you "
        "read, without the harness that produced it named beside it, tells "
        "you nothing at all. Arc Prize now labels both, because the same "
        "weights scored sixty two and ninety nine."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:14s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
