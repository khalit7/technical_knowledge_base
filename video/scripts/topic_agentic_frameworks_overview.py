"""
Topic overview: agentic frameworks, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this is not a shelf of
competing libraries, it is a spectrum with one axis, how much of the agent loop
you own. Write it yourself, configure a framework that owns it for you, or, as
of September 2026, buy the loop from a vendor who runs it in their own process.
That third position arrived from two frontier labs in the same week and it is
what makes the page worth a video now: it changes what the "own your control
flow" argument is an argument about.

The outline that survived the revision step:

    ident       what this is: frameworks for building agents, not harnesses
                you buy ready made
    map         the four layers, named and parked as the home frame:
                orchestration, gateways, observability, memory
    question    not which framework. How much of the loop do you own?
    graph       the four schools named, then what the checkpoint buys, which
                is the honest answer to "why not a while-loop"
    swarm       what did not survive AutoGen becoming the Microsoft Agent
                Framework, and why
    loops       own the loop against borrow it: minimal typed loops against
                the Claude Agent SDK
    gateways    model choice as configuration, and who owns the router now
    keeping     the two things you end up adding: traces and memory
    buy         the third position, September 2026: hosted agent loops
    take        the rule of thumb, and what the far end of the spectrum costs

What the step-4 critique changed:

  - Draft one was organised as the page is, four layers in order, one beat
    each. That is a table of contents read aloud, and it buried the spectrum.
    The spectrum is now the spine and the layers hang off it.
  - The hosted-loop beat was a footnote at the end of draft one. It is the
    closing turn, because it is the only thing on this page that changes the
    reader's existing decision, so it now has the flow panel and the last
    B turn before the take.
  - Draft one gave CrewAI, AutoGen and the Microsoft Agent Framework a beat
    each. They are one story with one lesson (the peer-to-peer chat swarm did
    not survive contact with production, because it was undebuggable), so they
    merged into a single before-and-after.
  - Three figures were doing no work in speech (LiteLLM's provider count, the
    number of OpenAI Agents SDK primitives as a number rather than as "short
    enough to read", LongMemEval) and were cut rather than shrunk.
  - A taxonomy table of the four orchestration schools was cut outright. It
    said what the parked map and the three beats after it already say, and it
    cost forty seconds an eight-minute episode could not spare.
  - Draft one let "frameworks add abstraction" stand as an opinion. The page
    has the concrete version, that they hide prompts and complicate debugging,
    so B now says it and A answers with the checkpoint.
  - No benchmark scores appear in this episode. The page carries none of its
    own, and importing one from a neighbouring page would be the video
    out-claiming the page.

Every figure comes from the canonical page "Topic: agentic-frameworks", read
from Notion rather than the local mirror, which is behind on this material.

Numbers and names are spelled the way they are said, because text to speech
reads "LiteLLM", "AG2", "A2A" and "Mem0" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: agentic-frameworks"
SUBTITLE = "one axis: how much of the agent loop do you own?"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Four layers of library, which is how the page groups
    # them, and every later beat lights one of these headings up.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "orchestration", "tone": "subject",
         "items": ["LangGraph", "CrewAI", "Pydantic AI", "OpenAI Agents SDK",
                   "Claude Agent SDK"]},
        {"head": "gateways", "tone": "machinery",
         "items": ["LiteLLM", "OpenRouter", "Sakana Fugu"]},
        {"head": "observability", "tone": "verified",
         "items": ["Langfuse", "LangSmith", "Braintrust", "Arize Phoenix"]},
        {"head": "memory", "tone": "number",
         "items": ["Mem0", "Zep", "Letta"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Not which framework.\nHow much of the loop do you own?",
                 "note": "and since September that is a three-way choice"},

    "graph": {"kind": "points", "tone": "machinery", "focus": "orchestration",
              "head": "what the checkpoint buys", "items": [
        "durable execution: the run survives the process",
        "human-in-the-loop pauses lasting days",
        "time-travel replay of a run that went wrong",
        "none of which a hand-rolled while-loop gives you",
    ]},

    "swarm": {"kind": "compare", "sides": [
        {"head": "AutoGen", "tone": "context", "items": [
            "agents post into a shared chat",
            "a manager picks who speaks next",
            "a code executor runs what they write",
            "now in maintenance mode"]},
        {"head": "Microsoft Agent Framework", "tone": "verified", "items": [
            "typed plugins, connectors, telemetry",
            "durable threads",
            "the peer-to-peer swarm did not survive",
            "undebuggable in production"]},
    ]},

    "loops": {"kind": "compare", "sides": [
        {"head": "own the loop", "tone": "subject", "items": [
            "Pydantic AI: types are the contract",
            "a validation failure is fed back as a retry",
            "smolagents: the model writes Python",
            "so several calls collapse into one step"]},
        {"head": "borrow the loop", "tone": "machinery", "items": [
            "Claude Agent SDK",
            "the whole Claude Code loop, imported",
            "tools, compaction, permissions, hooks, subagents",
            "you configure what it can see and do"]},
    ]},

    "gateways": {"kind": "points", "focus": "gateways",
                 "head": "model choice as configuration, not code", "items": [
        "LiteLLM: a proxy you host, one OpenAI-shaped endpoint",
        "virtual keys with budgets, fallback chains, one logging callback",
        "OpenRouter: one key, 300+ models, and a margin on every token",
        "Stripe bought it in August 2026, above $7B",
    ]},

    "keeping": {"kind": "columns", "columns": [
        {"head": "observability", "tone": "verified", "items": [
            "one trace per run",
            "a tree of spans",
            "generations carry tokens and cost",
            "OTel gen_ai is becoming the wire format"]},
        {"head": "memory", "tone": "number", "items": [
            "Mem0: facts, filed in layers",
            "Zep: a graph with validity intervals",
            "Letta: the agent pages its own memory"]},
    ]},

    "buy": {"kind": "flow", "tone": "machinery",
            "steps": ["write the loop", "configure a framework", "buy the loop"]},

    "take": {"kind": "claim",
             "text": "Start with direct API calls, behind your gateway.",
             "note": "adopt a framework when checkpointed state, interrupts or "
                     "replay would otherwise be built by hand. The far end of "
                     "the spectrum now sells you the loop itself"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of agentic frameworks. Not the ready made agents you "
        "buy, like Claude Code or Cursor. The libraries you build one out of."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns the time because the oldest argument in this space, whether to "
        "use a framework at all, acquired a third answer this month."),
]

# --- the inventory, named before anything is explained --------------------
SCRIPT["map"] = [
    (A, "Here is the whole shelf first, nothing explained yet. Four layers."),
    (A, "Orchestration, where the real design choice lives: LangGraph, Crew "
        "A I, Pydantic A I, OpenAI's agents S D K, the Claude agent S D K. "
        "Then gateways, which sit between your code and the providers: Lite "
        "L L M, OpenRouter, Sakana's Fugu."),
    (A, "Then observability: Langfuse, LangSmith, Braintrust, Arize Phoenix. "
        "And memory: Mem zero, Zep and Letta, which all exist because a "
        "context window is no place to keep anything."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "I already have a while loop that calls tools. What do any of these "
        "give me that it does not?"),
    (A, "That is the right question, and it is the only axis on this map. The "
        "choice is not between those boxes. It is how much of the loop ends "
        "up yours."),
    (A, "Every box up there is a position on that line, and until September "
        "the line had two ends. Write it yourself, or let a framework write it "
        "for you."),
]

# --- why not a while-loop -------------------------------------------------
SCRIPT["graph"] = [
    (A, "Start with orchestration, lit up on the map, because the other three "
        "layers bolt on afterwards. It has four schools, and they differ in "
        "how much of the loop they write for you."),
    (A, "The first is the graph and state machine school, and it answers your "
        "while loop question directly. LangGraph is the most installed of "
        "these, and one feature earns it: a checkpointer that snapshots the "
        "state after every step."),
    (A, "Read the list. Durable execution, so a run survives the process "
        "dying. Pauses that wait days for a human. Replay of a run that went "
        "wrong. None of that comes free from a while loop, and all of it is "
        "painful to retrofit."),
]

# --- the lesson from the crew school --------------------------------------
SCRIPT["swarm"] = [
    (B, "And the second school, roles and crews? That sounds like prompt "
        "engineering with extra steps."),
    (A, "It is fast to sketch and hard to control precisely, because the "
        "prompts are generated from those fields. But look at what happened to "
        "the school's best known member."),
    (A, "AutoGen made multi agent work a conversation. Agents post into a "
        "shared chat, a manager picks who speaks next, a code executor runs "
        "whatever they write. Its successor, the Microsoft agent framework, "
        "kept the orchestration patterns and the plumbing, and dropped the "
        "swarm as the default shape. Unconstrained agent to agent messaging "
        "proved undebuggable in production."),
]

# --- the two ends of the orchestration shelf ------------------------------
SCRIPT["loops"] = [
    (A, "Which leaves the last two schools, and they are the axis in "
        "miniature."),
    (A, "On the left, you own the loop. Pydantic A I makes your type hints the "
        "contract, and a validation failure goes back to the model as a retry "
        "rather than being raised at you. Smol agents changes the action "
        "language: the model writes a Python snippet instead of a tool call, "
        "so several calls and the control flow between them collapse into one "
        "step."),
    (A, "On the right, you borrow it. The Claude agent S D K ships the entire "
        "Claude Code loop as a library: tools, compaction, permissions, hooks, "
        "subagents. You do not write the loop, you configure what it can see "
        "and do."),
]

# --- gateways -------------------------------------------------------------
SCRIPT["gateways"] = [
    (A, "One layer down, gateways, whose job is to turn model choice, "
        "credentials and spend into configuration rather than code."),
    (A, "Lite L L M is a proxy you host yourself, presenting one OpenAI shaped "
        "endpoint over a hundred odd providers. The second line is where its "
        "value is: virtual keys per team with budgets attached, a fallback "
        "chain so an outage is absorbed below your application, one logging "
        "callback that traces the lot. OpenRouter is the managed version: one "
        "key, three hundred plus models, a margin on every token."),
    (B, "And Stripe bought it in August. Does that matter?"),
    (A, "Possibly. Product, name and roadmap continue unchanged. The open "
        "question is whether the largest neutral routing marketplace stays "
        "neutral inside a payments company."),
]

# --- what you bolt on -----------------------------------------------------
SCRIPT["keeping"] = [
    (A, "The last two layers are what you add once the thing actually runs."),
    (A, "Observability, on the left, is one trace per run holding a tree of "
        "spans, and the spans that call a model carry the prompt, the tokens "
        "and the cost. So a failed run can be replayed and a bill can be "
        "attributed to a feature."),
    (A, "Memory, on the right, is one problem three ways. Mem zero distils the "
        "conversation into discrete facts, filed in layers. Zep stores facts "
        "as graph edges carrying validity intervals, so something true in "
        "March is superseded rather than overwritten. Letta lets the agent "
        "page its own memory, the way an operating system pages to disk."),
]

# --- the third position ---------------------------------------------------
SCRIPT["buy"] = [
    (A, "Now the thing that changed this month. There is a third position on "
        "that line, on the right of the screen."),
    (A, "On the tenth of September, both frontier labs made the loop itself a "
        "hosted product. OpenAI's agents A P I runs the loop on OpenAI's own "
        "infrastructure, coordinating model calls, tool use and context, with "
        "managed sessions. Anthropic shipped the control surface for the same "
        "shape: managed agents, with permission evaluation moved onto the "
        "server."),
    (B, "So what do I actually give up?"),
    (A, "Precisely what the own your control flow argument was about, which is "
        "why this is the far end of the same spectrum rather than a fourth "
        "school."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So the rule of thumb on the screen still holds. Begin with plain "
        "A P I calls, routed through your gateway, and reach for a framework "
        "only when a specific capability, checkpointed state, interrupts, "
        "replay, would otherwise have to be built by hand."),
    (A, "What is new is the far end, where you own none of it, sold by the "
        "people who sell you the model. Own your control flow used to be free "
        "advice. It is now something you choose to pay for."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
