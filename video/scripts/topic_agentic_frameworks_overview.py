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

The 23 September re-cut, which changed the timing and nothing else
-----------------------------------------------------------------

The published cut had eleven reveals named before they were drawn, the worst
24.3 seconds, and two motionless frames, 22 seconds on `buy` and 15 on `take`.
The axis, the map, the beats and the take are unchanged. What moved:

  - Every beat now carries a fitted `reserve`, computed by `check_leads
    --reserves` from the rendered durations rather than guessed. Only `buy`
    had one before, and it was the cause of one of the two dead frames.
  - The root cause of the worst leads is arithmetic and worth stating once,
    because it is not obvious: the LAST reveal of a panel always lands at
    `beat_length - reserve`, whatever n is. So a panel whose final element is
    named two thirds of the way through a beat cannot be saved by a reserve,
    because the still-frame cap limits the reserve to 5.5 on an ordinary beat
    and 8.4 on a parked one. The fix is a row whose label is spoken near the
    end of the line. That is why three panels grew a third part and two
    changed kind, and why none of it is a change of argument.
  - `swarm` and `loops` are three-sided compares. The third side is the last
    thing each beat says: what the merge dropped, and what configuring rather
    than writing inverts. `loops` also says "Move right" where it used to say
    "On the right", because with three columns the middle one is no longer the
    right-hand one.
  - `converge` was two compare sides and is a six-row list. The narration
    walks observability and then memory rather than setting them against each
    other, so the list is the honest picture as well as the one that lands
    with the words; the map stays lit on both columns.
  - `buy` was a three step `flow` with a reserve of 22, which drew the axis in
    fourteen seconds and then held for twenty two. Its three positions are all
    named inside the first thirteen seconds, so no panel built from those
    three alone can keep the frame moving. It is a list that carries what is
    said after them. The arrows are the real loss. "a third position at the
    right of the screen" became "a third position on that line", because
    nothing sits at the right of a list.
  - `take` was a `claim`, which is one card and a note. It is a head and five
    rows, which is what the method prescribes for a closing beat and what
    turns fifteen seconds of dead frame into five. The rule itself is the
    head, not the first row: "that is the line on the screen" is spoken eight
    seconds in and the first row lands at nine, which `check_references`
    caught on the frame after the rest of the repair was done.
  - `map` is the one beat whose words moved. Its memory column is named at
    about two thirds of the beat and no legal reserve reaches that far, and a
    fifth column would be a group the page does not have. "Only that first
    layer is a real decision. The rest you add once the thing runs." used to
    close the beat and now sits between the third layer and the fourth. The
    position was picked by the arithmetic: in front of the gateways clause it
    fixes memory and draws the gateways column sixteen seconds early instead.

The worst remaining lead is 2.4 seconds, on `graph`, and it is structural:
the head segment of a beat is shorter than the segments after it, so the last
item is named a little after it is drawn. One reveal cannot be timed by
`check_leads` at all, the OpenRouter row on `gateways`, because a multi-word
row is timed only if its first significant word is one the narration also
says, and the line spells that row's second figure out as words. Hand-timed,
it is drawn 0.1 seconds after it is named.

One thing worth carrying to the next repair. `check_leads` gained a model of
the `focus` delay while this one was in flight, and it changed the answer: a
focus costs 0.25 seconds per handle, `compact` registers a handle per item as
well as per heading, and this map has nineteen of them, so every focus beat
starts drawing 4.8 seconds in. That is what took the head off `buy`, whose
first item is named at four seconds and therefore has to be the first reveal.
Re-run the tools before believing a clean report from an hour ago.
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
        "LangSmith, Braintrust, Arize Phoenix."),
    # This turn used to close the beat, and seventeen seconds of narration
    # after the word "memory" is more than any legal reserve on a parked beat
    # can hold back: `spread` lands the last column at `beat - reserve`. It
    # sits between the third layer and the fourth instead. The same words,
    # earlier, and the position was chosen by the arithmetic rather than by
    # taste: put in front of the gateways clause it fixes the memory column
    # and draws the gateways one sixteen seconds before anything names it.
    (A, "Only that first layer is a real decision. The rest you add once the "
        "thing runs."),
    (A, "And the last of them is memory. Mem zero, which files facts; Zep, "
        "which stores them as a graph; Letta, a runtime."),
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
    (A, "Move right, and you borrow it. The Claude agent S D K ships the whole "
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
        "since September, a third position on that line: buy the loop."),
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
    "map": {"kind": "columns", "park": True, "reserve": 6.5, "columns": [
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

    "question": {"kind": "claim", "reserve": 2.5,
                 "text": "Not which framework.\nHow much of the loop is yours?",
                 "note": "until this month, that line had two ends"},

    "graph": {"kind": "points", "tone": "machinery", "focus": "orchestration",
              "reserve": 4.5,
              "head": "what the checkpoint buys", "items": [
                  "a run that survives the process",
                  "a pause that waits days",
                  "replay from the step before",
                  "none of it free in a while loop",
              ]},

    # Three sides, not two. The last reveal always lands at `beat - reserve`,
    # so with the successor as the final side its heading was drawn fifteen
    # seconds after the line named it, and no reserve inside the still-frame
    # cap could close that. Splitting what the merge kept from what it dropped
    # gives the beat a third landing, at the words that actually close it.
    "swarm": {"kind": "compare", "reserve": 3.0, "sides": [
        {"head": "AutoGen", "tone": "context", "items": [
            "a shared chat",
            "a manager picks next",
            "a code executor runs it"]},
        {"head": "its successor", "tone": "verified", "items": [
            "patterns kept",
            "plumbing added"]},
        {"head": "the swarm dropped", "tone": "cost", "items": [
            "agent to agent messaging",
            "undebuggable in production"]},
    ]},

    # A third side for the same reason as `swarm`: "borrow it" is spoken at
    # twenty five seconds of a forty one second beat, so as the final reveal it
    # was drawn fifteen seconds late. The inversion is the beat's punchline and
    # is said last, so it earns the last landing. Both right-hand sides are
    # machinery-toned: they are one position seen twice, not a verdict.
    "loops": {"kind": "compare", "reserve": 4.5, "sides": [
        {"head": "own it", "tone": "subject", "items": [
            "Pydantic AI: type hints",
            "a failure goes back",
            "smolagents: writes Python"]},
        {"head": "borrow it", "tone": "machinery", "items": [
            "Claude Agent SDK",
            "tools, compaction, hooks"]},
        {"head": "what it inverts", "tone": "machinery", "items": [
            "you configure, not write",
            "everything to its left"]},
    ]},

    # A fifth row, because everything after the Stripe line had nothing left
    # to land on: the acquisition was drawn nine seconds after it was named.
    # The open question is the last thing said and now has a row of its own.
    # The first two rows are respelled so `check_leads` can time them at all.
    "gateways": {"kind": "points", "focus": "gateways", "reserve": 4.0,
                 "head": "model choice as configuration", "items": [
                     "LiteLLM: a proxy you host",
                     "virtual keys, budgets, a fallback chain",
                     "OpenRouter: 300+ models, one key",
                     "Stripe bought it in August, above $7B",
                     "open question: stays neutral?",
                 ]},

    # This was two compare sides, and a two-reveal panel cannot work here: the
    # line says "memory" at thirty seconds and the second side was drawn at
    # forty eight, an eighteen second lead that no reserve could reach. The
    # narration walks the two layers one after the other rather than setting
    # them against each other, so a list drawn in that order is both the
    # honest picture and the one that lands with the words. The map stays lit
    # on both columns, which is what carries the two-layer structure.
    "converge": {"kind": "points", "focus": ["observability", "memory"],
                 "reserve": 4.0, "head": "whatever loop you picked", "items": [
                     "one trace per run",
                     "spans carry tokens and cost",
                     "OpenTelemetry conventions",
                     "Mem0: files facts",
                     "Zep: validity intervals",
                     "Letta: the agent pages",
                 ]},

    # This was a three step `flow` with a reserve of 22, which drew the axis
    # in the first fourteen seconds and then held a motionless frame for
    # twenty two, the defect `check_timing` scores as `still`. The three
    # positions are all named inside the first thirteen seconds of a thirty
    # seven second beat, so no panel whose only reveals are those three
    # positions can keep the frame moving: the arithmetic puts the last one at
    # `beat - reserve` whatever the reserve is. A list can carry what is said
    # after them as rows of its own, so the picture keeps arriving with the
    # line. The arrows are the loss, and they are paid for with a frame that
    # moves for the whole beat instead of a fifth of it.
    #
    # No head, and that is forced rather than chosen. A `focus` costs 0.25
    # seconds per handle and `compact` registers one per item as well as per
    # heading, so this map's nineteen handles delay the panel by 4.8 seconds.
    # Nothing can be drawn before then, and this beat names its first item at
    # four seconds, so the first item has to BE the first reveal. A head would
    # take that slot and push the first item to ten seconds.
    "buy": {"kind": "points", "tone": "machinery", "focus": "orchestration",
            "reserve": 1.5, "items": [
                "write it, or configure a framework",
                "buy the loop",
                "managed sessions and sandboxes",
                "permission evaluation on the server",
                "own your control flow",
                "the far end, not a fourth school",
            ]},

    # The closing frame lights the whole map again: the take is about all
    # four layers, and leaving the last beat's single highlight burning would
    # point at one of them while the line points at every one.
    #
    # It was a `claim`, and a claim has two reveals: the card and its note. On
    # a thirty five second take that is one card drawn at the top of the beat
    # and a note twenty four seconds after the words that name it, followed by
    # fifteen seconds of a motionless frame. The skill names this as the
    # closing beat's default defect and gives the fix: a head and six rows, a
    # small reserve, something unfolding with every sentence of the take.
    "take": {"kind": "points",
             "focus": ["orchestration", "gateways", "observability", "memory"],
             # The rule itself is the head rather than the first row, because
             # the line "that is the line on the screen" is spoken eight
             # seconds in and a row lands at nine. A head is drawn at the top
             # of the beat, so the thing the line points at is there when it
             # points. `check_references` is what found this, on the frame.
             "reserve": 4.5, "head": "direct API calls, your gateway", "items": [
                 "adopt a framework the moment",
                 "checkpointed state, interrupts",
                 "the far end, where you own none",
                 "own your control flow",
                 "something you choose to pay for",
             ]},
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
