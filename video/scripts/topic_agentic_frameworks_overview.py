"""
Topic overview: agentic frameworks, as of 22 September 2026.

Source: the canonical Notion page "Topic: agentic-frameworks". Every figure,
name and claim below is on that page; nothing is invented for shape, and no
number is imported from a neighbouring page.

Which kind of overview this is. The page looks like a comparison, a shelf of
libraries that do the same job differently, and it is not. It already tells one
story, in its own "framework vs plain API calls" section: there is a single
axis, how much of the agent loop you own, and every name on the page is a
position on it. That is a through-line the page tells rather than a thesis
invented for the video, which is the only condition the skill puts on using
one. So the map is built first, and then toured along that axis.

The outline that survived the revision step:

    ident       what this is: libraries you build an agent out of, not the
                finished agents you buy
    map         the inventory, named and explained nowhere: orchestration,
                gateways, observability, memory. Parked as the home frame
    question    not which framework. How much of the loop do you own?
    graph       orchestration lit up, and the honest answer to "why not a
                while loop": what the checkpoint buys
    swarm       what did not survive AutoGen becoming the Microsoft Agent
                Framework, and why that is the transferable part
    loops       the axis in miniature: own the loop against borrow it
    gateways    model choice as configuration, and who owns the router now
    converge    the convergence beat: whatever loop you chose, you add these
                two, and the wire format is settling
    buy         the third position, September 2026: the loop as a product
    take        the rule of thumb, and what the far end now costs

What the critique step changed:

  - Draft one walked the four layers in the page's own order, a beat each.
    That is a table of contents read aloud, and it buried the axis. The axis
    is now the spine and the layers hang off it.
  - Draft one had no convergence beat, because the obvious reading of
    "convergence" here is which orchestration school won, and none has. The
    real convergence on this page is one layer down: whatever loop you chose,
    you end up adding a trace per run and a memory store outside the context
    window, and the wire format for the first is settling on OpenTelemetry.
    That is the beat a practitioner needs and a reader skims.
  - CrewAI, AutoGen and the Microsoft Agent Framework had a beat each. They
    are one story with one lesson, so they merged into a before and after.
  - The hosted-loop beat was a footnote in draft one. It is the last thing
    before the take, because it is the only item on this page that changes a
    decision the viewer has already made.
  - Three figures were cut rather than shrunk, because they did no work in
    speech: the number of OpenAI Agents SDK primitives, Zep's LongMemEval
    standing, and the Fugu release dates. Fugu is named in the inventory and
    glossed in one clause, because the page treats it as a third kind of
    gateway rather than as a story of its own.
  - Draft one let "frameworks add abstraction" stand as an opinion. B now
    puts the concrete version, and A answers with the checkpoint.

Beats deliberately not written, so the next person knows it was a decision.
There is no contract beat: an overview builds the whole map on screen before
explaining any of it, which is a stronger promise than a list of steps, and
the structure check exempts the format for that reason. There is no resources
card: that is a deep dive's obligation, and the take points at the page.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, four turns, and A always does something different because
     of them

Names are spelled the way they should be said. Text to speech reads "AG2",
"A2A" and "Mem0" badly, so the first two do not appear in a spoken line at
all and the third is said as "Mem zero".
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: agentic-frameworks"
SUBTITLE = "one axis: how much of the agent loop do you own?"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of agentic frameworks. The libraries you build an "
        "agent out of, rather than the finished agents you buy."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns six minutes because the oldest argument in this field, whether "
        "to use a framework at all, quietly grew a third answer this month."),
]

# -- the inventory, named before anything is explained ---------------------
SCRIPT["map"] = [
    (A, "Four layers, and I am explaining none of them yet. Here is the "
        "whole shelf."),
    (A, "Orchestration, where the real design choice lives. LangGraph. Crew A "
        "I, which describes a system as roles. Pydantic A I. smolagents. And "
        "the Claude agent S D K."),
    (A, "Gateways, between your code and the providers: Lite L L M, a proxy "
        "you run; OpenRouter; Sakana's Fugu. Observability: Langfuse, "
        "LangSmith, Braintrust, Arize Phoenix. And memory: Mem zero, which "
        "files facts; Zep, which stores them as a graph; Letta, a runtime."),
    (A, "Only the first layer is a real decision. The other three you add once "
        "the thing runs."),
]

# -- the organising question -----------------------------------------------
SCRIPT["question"] = [
    (B, "I already have a while loop. It calls a tool. It reads the result. "
        "What do any of those give me that my loop does not?"),
    (A, "Good question. And it is the only axis on this map. The choice is "
        "not between those frameworks. It is how much of the loop is yours."),
    (A, "Every name up there sits somewhere on one line. Write it all "
        "yourself, at one end. Hand it all over, at the other. Until this "
        "month, that line had two ends."),
]

# -- why not a while loop --------------------------------------------------
SCRIPT["graph"] = [
    (A, "Orchestration first, lit up on the map. Four schools, differing in "
        "exactly one thing: how much of the loop they write for you."),
    (A, "The graph school answers your question directly. LangGraph models an "
        "agent as a directed graph. Its nodes are ordinary functions over one "
        "typed state object, and it snapshots that state after every step."),
    (A, "Look at what that checkpoint buys. A run that survives the process "
        "dying. A pause that waits days for a human. Replay from the step "
        "before it went wrong. None of it is free in a while loop, and all of "
        "it is miserable to retrofit."),
]

# -- the lesson from the crew school ---------------------------------------
SCRIPT["swarm"] = [
    (B, "And roles and crews? That sounds like prompt engineering with extra "
        "steps."),
    (A, "Fast to sketch, hard to control, because the prompts are generated "
        "from those fields. But watch what happened to its best known member. "
        "That is the transferable part."),
    (A, "AutoGen made multi agent work a conversation. Agents post into a "
        "shared chat, a manager picks who speaks next, a code executor runs "
        "whatever they write. Its successor, the Microsoft agent framework, "
        "kept those patterns and added enterprise plumbing. What it dropped "
        "is the point. The swarm is no longer the default shape, because "
        "unconstrained agent to agent messaging proved undebuggable in "
        "production."),
]

# -- the two ends of the orchestration shelf -------------------------------
SCRIPT["loops"] = [
    (A, "The last two schools are the whole axis in miniature."),
    (A, "On the left, you own it. Pydantic A I makes your type hints the "
        "contract, and a validation failure goes back to the model as a retry "
        "rather than being raised at you. smolagents changes the action "
        "language: the model writes Python instead of a tool call, so several "
        "calls collapse into one step."),
    (A, "On the right, you borrow it. The Claude agent S D K ships the whole "
        "Claude Code loop as a library. Tools, compaction, permissions, "
        "hooks, subagents. You configure what it can see and do rather than "
        "writing the loop, which inverts everything to its left."),
]

# -- gateways --------------------------------------------------------------
SCRIPT["gateways"] = [
    (A, "One layer down, and lit up on the map. Gateways turn model choice, "
        "credentials and spend into configuration rather than code."),
    (A, "Lite L L M is a proxy you host, presenting one OpenAI shaped endpoint "
        "over a hundred odd providers. The control side is the value. Virtual "
        "keys per team, with budgets, and a fallback chain, so an outage is "
        "absorbed below your application."),
    (B, "And OpenRouter is the one I do not have to run."),
    (A, "One key, three hundred plus models, a margin on every token. Stripe "
        "bought it in August, above seven billion dollars. The open question "
        "is whether the largest neutral routing marketplace stays neutral "
        "inside a payments company."),
]

# -- the convergence -------------------------------------------------------
SCRIPT["converge"] = [
    (A, "Now the part worth more than any choice above it, because this is "
        "where everybody ends up regardless of the choice."),
    (A, "Whatever loop you picked, you add the two now lit on the map. "
        "Observability is one "
        "trace per run holding a tree of spans, and the spans that call a "
        "model carry the tokens and the cost. So a failed run replays, and a "
        "bill is attributed to a feature. The field is settling on "
        "OpenTelemetry conventions as the wire format."),
    (A, "And memory, because a context window is no place to keep anything. "
        "Mem zero files facts in layers. Zep stores them as graph edges with "
        "validity intervals, so something true in March is superseded rather "
        "than overwritten. Letta lets the agent page its own memory, like an "
        "operating system."),
]

# -- the third position ----------------------------------------------------
SCRIPT["buy"] = [
    (A, "Back to the line, and the thing that changed this month. Write the "
        "loop yourself. Configure a framework that writes it for you. And "
        "since September, a third position at the right of the screen: buy "
        "the loop."),
    (A, "OpenAI's agents A P I runs the loop on their own infrastructure, "
        "with managed sessions and sandboxes. Anthropic's managed agents move "
        "permission evaluation onto the server."),
    (B, "So what am I actually giving up?"),
    (A, "Precisely what the own your control flow argument was always about. "
        "Which is why this is the far end of the same line, and not a fourth "
        "school."),
]

# -- the take --------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So, the rule of thumb. Start with direct A P I calls, routed "
        "through your gateway. That is the line on the screen, and it still "
        "holds. Adopt a framework the moment a specific capability, "
        "checkpointed state, interrupts or replay, would otherwise have to be "
        "built by hand."),
    (A, "What is new is the far end, where you own none of it, sold by the "
        "people who also sell you the model. Own your control flow used to be "
        "free advice. It is now something you choose to pay for."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Four layers, which is how the page groups the field, and
    # the two later beats that discuss a layer light its heading up.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "orchestration", "tone": "subject", "items": [
            "LangGraph", "CrewAI: roles", "Pydantic AI", "smolagents",
            "Claude Agent SDK"]},
        {"head": "gateways", "tone": "machinery", "items": [
            "LiteLLM: a proxy", "OpenRouter", "Sakana Fugu"]},
        {"head": "observability", "tone": "verified", "items": [
            "Langfuse", "LangSmith", "Braintrust", "Arize Phoenix"]},
        {"head": "memory", "tone": "number", "items": [
            "Mem0: facts", "Zep: a graph", "Letta: a runtime"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Not which framework.\nHow much of the loop is yours?",
                 "note": "until this month, that line had two ends"},

    "graph": {"kind": "points", "tone": "machinery", "focus": "orchestration",
              "head": "what the checkpoint buys", "items": [
                  "a run that survives the process",
                  "a pause that waits days",
                  "replay from the step before",
                  "none of it free in a while loop",
              ]},

    "swarm": {"kind": "compare", "sides": [
        {"head": "AutoGen", "tone": "context", "items": [
            "a shared chat",
            "a manager picks next",
            "a code executor runs it"]},
        {"head": "its successor", "tone": "verified", "items": [
            "patterns kept",
            "plumbing added",
            "the swarm dropped"]},
    ]},

    "loops": {"kind": "compare", "sides": [
        {"head": "own it", "tone": "subject", "items": [
            "Pydantic AI: type hints",
            "a failure goes back",
            "smolagents: writes Python"]},
        {"head": "borrow it", "tone": "machinery", "items": [
            "Claude Agent SDK",
            "tools, compaction, hooks",
            "you configure, not write"]},
    ]},

    "gateways": {"kind": "points", "focus": "gateways",
                 "head": "model choice as configuration", "items": [
                     "LiteLLM: one endpoint, a proxy you host",
                     "virtual keys, budgets, a fallback chain",
                     "OpenRouter: 300+ models, one key",
                     "Stripe bought it in August, above $7B",
                 ]},

    "converge": {"kind": "compare", "focus": ["observability", "memory"],
                 "sides": [
        {"head": "observability", "tone": "verified", "items": [
            "one trace per run",
            "a tree of spans",
            "tokens and cost",
            "OpenTelemetry conventions"]},
        {"head": "memory", "tone": "number", "items": [
            "Mem0: layered facts",
            "Zep: validity intervals",
            "Letta: the agent pages"]},
    ]},

    # The three positions are named in the first sentence, so they are
    # revealed in the first third of the beat rather than spread across all of
    # it. Without the reserve the narrator points at "the right of the screen"
    # twelve seconds before anything is drawn there.
    "buy": {"kind": "flow", "tone": "machinery", "focus": "orchestration",
            "reserve": 22, "head": "how much of the loop is yours",
            "steps": ["write the loop", "configure a framework",
                      "buy the loop"]},

    # The closing frame lights the whole map again: the take is about all
    # four layers, and leaving the last beat's single highlight burning would
    # point at one of them while the line points at every one.
    "take": {"kind": "claim",
             "focus": ["orchestration", "gateways", "observability", "memory"],
             "text": "Direct API calls first,\nbehind your gateway.",
             "note": "adopt a framework when checkpoints, interrupts or "
                     "replay would otherwise be hand-built"},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:12s} {w:3d} words  ~{w / 148 * 60:4.0f}s")
