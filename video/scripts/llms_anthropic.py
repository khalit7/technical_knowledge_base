"""
Provider overview: Anthropic's Claude family, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: every other lab is
deciding for you how much the model thinks. Anthropic hands the dial to the
caller, in tokens, and then spends its real money somewhere a benchmark table
does not show, on the sandboxed environments an agent is trained inside. That
is one bet made twice, and it explains the whole shape of the family: one
checkpoint with two modes rather than a fast model and a reasoning model, an
evaluation target that moved to Terminal-Bench and SWE-bench, a price list
whose interesting line is cached input, and a lab that publishes a great deal
about what its models do and nothing about how they are built.

The outline that survived the revision step:

    ident          what this is, the date, and the bet in one sentence
    map            the line built and parked: Mythos class, the ladder, the
                   agent surface, the alignment stack
    question       who decides how long the model thinks, and where we go
    budget         decision one: budget_tokens against a hidden router
    interleaved    decision two: thinking between tool calls, and the
                   constraint that creates for a harness
    environments   decision three: where the money goes, and why the
                   environments are the moat
    jump           the 5.1 numbers, and that they are all long-horizon
    tiers          what it costs, and the line item that actually matters
    cost           what the bet gives up
    close          the take

What the step-4 critique changed:

  - Draft one opened on the cached-input price cut. It is the most useful fact
    on the page and it means nothing to somebody who has not yet been told
    what a Claude agent spends its input tokens on, so it moved into the price
    beat, behind interleaved thinking, which is what explains it.
  - Constitutional AI had a beat of its own and it was history, not bet. It is
    now one rung of the environments beat, where it does work: the whole
    alignment stack is a sequence of moves away from human labels and towards
    something that checks itself.
  - The Claude 3 tier names, computer use and the 100K context were three
    separate lineage facts in draft one. Only the ones the bet needs survived.
  - AutomationBench and CursorBench were in the chart. Four bars is a chart
    and eight is a wall, so they are spoken over it instead.
  - B was agreeing in draft one. B now catches the cost of the exposed dial,
    and reads the one thing the price list hides.

Every figure traces to the canonical page "Anthropic: Claude family", read
from Notion on 22 September 2026. The flagship is Fable 5.1 in the Mythos
class, not Fable 5. Nothing was invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"$0.25" and "budget_tokens" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Anthropic: Claude family"
SUBTITLE = "the dial you set yourself, and the environments nobody can see"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the Mythos class", "tone": "subject",
         "items": ["Fable 5.1", "Mythos 5.1"]},
        {"head": "the ladder", "tone": "number",
         "items": ["Opus 5", "Sonnet 5", "Haiku 4.5"]},
        {"head": "the agent surface", "tone": "machinery",
         "items": ["extended thinking", "interleaved thinking",
                   "memory tools", "computer use"]},
        {"head": "the alignment stack", "tone": "verified",
         "items": ["Constitutional AI", "RLAIF", "RLVR", "agentic RL"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Who decides how long the model thinks?\n"
                         "Here, you do, and you say it in tokens.",
                 "note": "the deliberate counter-design to a router you "
                         "cannot inspect"},

    "budget": {"kind": "compare", "focus": "the agent surface", "sides": [
        {"head": "a hidden router", "tone": "cost", "items": [
            "a classifier picks, per request",
            "two identical prompts, two costs",
            "a capability step between the fast and slow paths"]},
        {"head": "budget_tokens", "tone": "verified", "items": [
            "one checkpoint, both modes",
            "the caller caps the thinking block",
            "cost per task is a dial, not a discovery"]},
    ]},

    "interleaved": {"kind": "flow", "tone": "machinery",
                    "steps": ["call a tool", "read what came back",
                              "think again", "call the next one"]},

    "environments": {"kind": "points", "focus": "the alignment stack",
                     "head": "where the money actually goes", "items": [
        "Constitutional AI: the model critiques itself against a written document",
        "RLAIF: the model labels the preference pairs",
        "RLVR: a test suite decides, not a learned judge",
        "agentic RL: one episode is a whole task, with real tools",
    ]},

    "jump": {"kind": "bars",
             "head": "Fable 5.1: the jump is all long-horizon", "bars": [
        {"label": "Terminal-Bench 4.0, before", "text": "42.0%",
         "value": 42.0, "tone": "context"},
        {"label": "Terminal-Bench 4.0, Fable 5.1", "text": "55.8%",
         "value": 55.8, "tone": "verified"},
        {"label": "Terminal-Bench-Science, before", "text": "24.7%",
         "value": 24.7, "tone": "context"},
        {"label": "Terminal-Bench-Science, Fable 5.1", "text": "52.6%",
         "value": 52.6, "tone": "verified"},
    ]},

    "tiers": {"kind": "table", "focus": "the ladder",
              "head": ["model", "context", "$ per 1M in / out"],
              "rows": [
                  ["Haiku 4.5", "200K", "$1 / $5"],
                  ["Sonnet 5", "1M", "$2 / $10"],
                  ["Opus 5", "1M", "$5 / $25"],
                  ["Fable 5.1", "1M", "$10 / $50, cached in $0.25"],
              ]},

    "cost": {"kind": "points", "tone": "cost",
             "head": "what the bet gives up", "items": [
        "you have to know when a task needs thinking",
        "thinking blocks must be passed back across every tool call",
        "no parameter count, no architecture, ever",
        "no voice, no image generation, no consumer surface",
    ]},

    "close": {"kind": "claim",
              "text": "Anthropic is not selling the cleverest answer.\n"
                      "It is selling something that survives a long job.",
              "note": "so watch the environments, and watch Opus absorb "
                      "Fable a quarter later at half the price"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the bet
SCRIPT["ident"] = [
    (A, "This is Anthropic's Claude family, as the knowledge base has it on "
        "the twenty second of September, twenty twenty six."),
    (A, "The bet, in one sentence. Anthropic hands you the dial. You say how "
        "long the model may think, in tokens, and everything expensive they do "
        "is aimed at work that runs for hours rather than answers that arrive "
        "in one shot."),
]

# 1. the inventory, before any explanation
SCRIPT["map"] = [
    (A, "The line first, nothing explained yet. At the top, the Mythos class, "
        "which broke the three name ladder in June. Fable five point one is "
        "the generally available one, and Mythos five point one is that same "
        "model under more permissive safeguards, for vetted organisations."),
    (A, "Then the ladder. Opus five for complex agentic work, Sonnet five as "
        "the default, Haiku four point five fast and cheap."),
    (A, "Beside them the agent surface, which is the part that is really "
        "theirs. And underneath, the alignment stack, four steps away from "
        "human labels."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (A, "Every lab on this shelf answers one question, and they answer it "
        "differently. Who decides how long the model thinks?"),
    (A, "Anthropic's answer is: you do, and you say it in tokens. So we take "
        "that decision, then the one underneath it, then where the money "
        "actually goes, then the numbers, then what the bet costs."),
]

# 3. decision one
SCRIPT["budget"] = [
    (A, "Claude three point seven was the turn. Not a separate reasoning "
        "model. One checkpoint that either answers immediately or thinks "
        "first, with the caller setting the token budget."),
    (A, "Compare the sides. A router decides for you, so two identical "
        "prompts can cost different amounts, and there is a capability step "
        "between the fast path and the slow one. A budget you set has "
        "neither."),
    (B, "And the cost is that I have to know which tasks need it."),
    (A, "That is exactly the cost, and it is the honest one to name."),
]

# 4. decision two
SCRIPT["interleaved"] = [
    (A, "The second decision is where the thinking happens. Interleaved "
        "thinking means the model reasons between tool calls, not only before "
        "the first, so it can respond to what a command returned instead of "
        "committing to a plan made blind."),
    (A, "Watch the loop. Call a tool, read the result, think again, call the "
        "next one. Add memory tools, file backed notes that outlive the "
        "context window, and that is the agentic design."),
]

# 5. decision three
SCRIPT["environments"] = [
    (A, "Which tells you where the money goes. Look at the four rungs."),
    (A, "Constitutional A I: the model critiques its own answers against a "
        "written constitution you can read and argue with. Then A I feedback, "
        "where the model labels the preference pairs a human used to. Then "
        "verifiable rewards, where a test suite decides instead of a learned "
        "judge."),
    (A, "And then the expensive one. Agentic reinforcement learning, where an "
        "episode is a whole task in a sandboxed environment with real tools, "
        "and the reward is whether it ended up done. The environments are the "
        "moat, not the objective."),
]

# 6. the numbers
SCRIPT["jump"] = [
    (A, "So look at what the September release moved. Terminal Bench four "
        "point zero, forty two percent to fifty five point eight. Terminal "
        "Bench Science, twenty four point seven to fifty two point six, more "
        "than double."),
    (B, "All of which are Anthropic measuring Anthropic."),
    (A, "They are. The one that is not is Real S W E, run against private "
        "enterprise codebases, and it puts Fable five point one first at "
        "thirty eight point eight percent. Every benchmark in this beat is a "
        "long horizon agentic one, and that is the pattern."),
]

# 7. what it costs
SCRIPT["tiers"] = [
    (A, "Prices. Haiku at a dollar and five, Sonnet at two and ten, Opus at "
        "five and twenty five, Fable at ten and fifty per million tokens. "
        "Everything above Haiku carries a million token context."),
    (B, "The interesting number there is not in the headline column."),
    (A, "It is not. Cached input fell seventy five percent, to twenty five "
        "cents per million, against ten dollars standard. An agent re-reads a "
        "large prefix every turn, so that one line dominates the bill."),
]

# 8. what the bet gives up
SCRIPT["cost"] = [
    (A, "Now the honest side. The dial costs you knowing when to turn it, and "
        "thinking blocks have to be passed back into every later request to "
        "keep the chain intact, which constrains how you manage context."),
    (A, "And the weights are closed, with no architecture published at all. "
        "Anthropic will tell you a great deal about what these models do and "
        "nothing about how they are built. The revenue skews to A P I and "
        "enterprise, so voice, image generation and consumer reach are not "
        "being contested."),
]

# 9. the take
SCRIPT["close"] = [
    (A, "So what does the bet predict? Two things worth watching."),
    (A, "The environments, because that is where the lead came from and "
        "nobody outside can inspect them. And the ladder, because the pattern "
        "is set: Opus five landed at near Fable capability for half the price, "
        "a quarter after Fable. Expect that again."),
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
        print(f"  {key:14s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
