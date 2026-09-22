"""
Topic overview: agentic harnesses, as of 22 September 2026.

Source: the canonical Notion page "Topic: agentic-harnesses". Every figure,
name and claim below is on that page; nothing is invented for shape, and no
number is imported from a neighbouring page.

Which kind of overview this is. Both, and that is the whole problem with this
page. The first third is a comparison, a shelf of products that do the same
job differently. The rest is a research programme about what a harness is for.
A tour of the shelf alone would be a catalogue; a tour of the research alone
would leave a viewer unable to place a single name they have heard. So the
map is the products, and the axis along which it is toured is the page's own
second sentence: the model supplies the reasoning, the harness decides what
the model sees and what it is allowed to do. Two things, and every beat after
the question beat answers one of them. That is a through-line the page states
outright rather than a thesis invented for the video, which is the only
condition the skill puts on using one.

The outline that survived the revision step:

    ident       what a harness is, and the one number that makes the layer
                worth six minutes: same weights, ten to twenty two points
    map         the inventory, named and explained nowhere: terminal agents,
                editors, cloud, resident. Parked as the home frame
    question    not which harness. What does it do with the model? Two
                things, and only two
    cli         the shelf where most of this happens, and what each one bets
    surfaces    the other three shelves, on one axis: what you can still
                check. The trust boundary, not the loop
    sees        what the model sees, part one: two opposite research
                philosophies, both beating the vendor harness on the same
                weights, and what that actually proves
    adapter     what the model sees, part two, and the version no harness
                author can implement: state kept inside the provider
    allowed     what the model may do: detection is not containment, an
                architecture that assumes it gets fooled, and the convergence
    numbers     what harnesses actually score once the tasks are private
    take        what the map is for, and the rule that outlives it

What the critique step changed:

  - Draft one walked the page's headings in order and was a table of contents
    read aloud. The sees / allowed split is the page's own sentence, and once
    it was the spine, four sections collapsed into two beats.
  - Draft one opened the ARC Prize beat on the number. The skill's inverted
    pyramid is a news rule, but the same defect applies here: 62.7 against
    99.9 means nothing until somebody says both are the same model on the same
    tasks. The actor and the action now come first, then the figures.
  - The ARC Prize bars were nearly published without ARC Prize's own framing,
    that the two numbers measure different things. That is not a footnote; it
    is the reason both are on the leaderboard. B now asks and A answers.
  - `sees` was three research strategies. Three is a list. Two opposite ones
    plus the finding they share is an argument, so JIT-Agent came out.
  - Two lines were reworded after reading the transcripts the voice gate
    produces, which is the only way to check narration without listening.
    "That turns the whole question into review" came back as "Zed turns the
    whole question into review", a one-word substitution that scored a word
    error rate of 0.01 and misattributed cloud review to an editor; and a
    line ending on a bare "ninety nine point nine" grew an invented syllable
    after it. Both now end on a word the model cannot run past.
  - B opened the numbers beat with "who measured these", one second into a
    beat whose chart had not been drawn yet. `check_references` pulled the
    frame and it was empty. A beat's first line cannot point at its own
    panel, so the question lost its deictic instead.
  - `surfaces` and `numbers` were rewritten after the first voice render
    reported both above a hundred and sixty five words a minute. Nothing was
    cut: the commas became full stops, which is the lever the skill says
    actually works.
  - The cost counterweight moved out of the numbers beat and into the take.
    Spoken over a finished bar chart it meant twenty five seconds of static
    frame, which is where these videos die; in the take it is the thing a
    viewer should actually do differently.

Beats deliberately not written, so the next person knows it was a decision.
There is no contract beat: an overview builds the whole map on screen before
explaining any of it, which is a stronger promise than a list of steps, and
the structure check exempts the format for that reason. There is no resources
card: that is a deep dive's obligation, and the take points at the page.

What was cut for length, which on a 5,838-word page is a lot, and is worth
recording because every one of these would carry an episode of its own:
Z.ai's feedback-design account (dense local verifiable signals, 3.22x in
thirteen days) and Nous Research's 1,393 subagents, which together are the
page's "running agents at scale" section; the skills-and-environments supply
chain (WikiSkill, Repo-To-Skill, Terminal-Universe, HarnessDev); JIT-Agent;
Sierra's 23.9 against 82.2 autonomy figure; Fugu as orchestration sold as a
model; Origin; and the AGENTS.md settlement. This page arguably wants two
episodes, one on the shelf and one on harness scaling. It got one.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, four turns, and A always does something different because
     of them

Names are spelled the way they should be said. Text to speech reads "ACP",
"Z.ai", "3.22x" and "GPT-5.6" badly, so acronyms are spaced out, model
versions are spoken as words, and anything that could not be said cleanly was
kept off the spoken line entirely.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: agentic-harnesses"
SUBTITLE = "what the model sees, and what it is allowed to do"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of agentic harnesses. A harness wraps a language "
        "model in an agent loop with tools. The model supplies the reasoning. "
        "The harness decides what it sees, and what it is allowed to do."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns six minutes for one reason. Hold the weights fixed, change "
        "only the harness, and swee bench scores move by ten to twenty two "
        "points."),
]

# -- the inventory, named before anything is explained ---------------------
SCRIPT["map"] = [
    (A, "Four shelves, and I am explaining none of them yet. Here is the "
        "whole board."),
    (A, "Terminal agents, where the centre of gravity has been since twenty "
        "twenty five. Claude Code. Codex. OpenCode. Goose. And Muse Code, "
        "which is Meta's, and shipped this month."),
    (A, "Editors, where the same loop runs inside your code editor. Cursor. "
        "Antigravity. Zed, which wrote the agent client protocol. Copilot. "
        "And the open extensions: Cline, Roo and Kilo."),
    (A, "Cloud agents, which you fire and forget and read back as a pull "
        "request. Devin. Codex cloud. Jules. Claude Code on the web."),
    (A, "And a fourth shelf that is not about code. Resident agents. "
        "OpenClaw. Hermes Agent. Daemons that sit on your messaging accounts "
        "for months and act on them."),
]

# -- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "But the model is the thing that got better. Same weights, same "
        "abilities. How much can the wrapper matter?"),
    (A, "That is the intuition, and this topic exists because it is not "
        "right. The choice is not which harness. It is what the harness does "
        "with the model."),
    (A, "And there are only two things it does. It decides what the model "
        "sees. And what it is allowed to do. Everything after this answers "
        "one of those."),
]

# -- the shelf where most of this happens ---------------------------------
SCRIPT["cli"] = [
    (A, "Start with the shelf now lit on the map. These are bets, not feature "
        "lists."),
    (A, "Claude Code bets on extension. A memory file, skills, hooks, "
        "subagents, plugins, a software development kit. Codex bets on the "
        "sandbox, enforced down at the kernel. OpenCode bets on neutrality: "
        "one client, whichever provider you like. Goose went to the Linux "
        "Foundation in April."),
    (A, "And Muse Code does something none of the others do. It runs in the "
        "build pipeline rather than your terminal. Nobody is sitting there to "
        "approve anything, so approval becomes policy. Hold that thought."),
]

# -- the other three shelves, on one axis ---------------------------------
SCRIPT["surfaces"] = [
    (A, "Now the other three shelves, lit together. What separates them is "
        "not the loop. It is the trust boundary."),
    (A, "Watch the right hand column. In an editor, you see every edit as it "
        "lands. Zed turned that into a standard. The agent client protocol. "
        "Any agent plugs into any editor now."),
    (A, "In the cloud, you do not watch. You read a pull request. Later. The "
        "question becomes review."),
    (A, "The resident ones are the sharp end. Their inputs are reachable by "
        "anybody who can message you. And by the time you look, it has "
        "already acted."),
]

# -- what the model sees, part one ----------------------------------------
SCRIPT["sees"] = [
    (A, "So. What the model sees. Two teams went to opposite extremes this "
        "August, and both beat the vendor's own harness."),
    (A, "Prime Agent goes maximal. A live Python session instead of a fixed "
        "tool schema, state in four layers, and the agent rewrites its own "
        "skills between runs. On arc a g i three, best of one goes from "
        "thirty percent to ninety five point five."),
    (A, "StateM goes the other way. It wraps a fixed agent inside a versioned "
        "state machine where every transition is checked before it commits. "
        "And it also wins."),
    (A, "The useful finding is that the gain is not a philosophy about "
        "control. It comes from having a durable state layer at all. Either "
        "extreme will do."),
]

# -- what the model sees, part two ----------------------------------------
SCRIPT["adapter"] = [
    (A, "There is a version of that idea nobody outside a lab can copy. Arc "
        "Prize published two scores for one model on one set of tasks, "
        "labelled by harness. Through the harness neutral setup: sixty two "
        "point seven percent. Through a provider adapter: ninety nine point "
        "nine percent."),
    (B, "That gap is too big. Those cannot be the same thing."),
    (A, "Arc Prize say so themselves, and put both on the leaderboard with "
        "labels. The adapter keeps the model's reasoning state inside the "
        "provider between requests, rather than making it write its working "
        "out as notes. So there is a class of capability a neutral harness "
        "cannot reach."),
]

# -- what the model is allowed to do, and the convergence -----------------
SCRIPT["allowed"] = [
    (A, "That is one half. Here is the other: what it is allowed to do."),
    (A, "Emergence ran eight worlds of ten agents for sixteen days, and "
        "attacked them. Nothing was resilient. And the finding that matters "
        "is this. Detection did not produce containment. Systems noticed the "
        "hostile content and kept talking to it, for as long as forty six "
        "hours."),
    (B, "So a detector is not a control."),
    (A, "No. Meta's answer is to assume the model gets fooled. In Muse Spark "
        "the agent never sees the token: a service outside the runtime swaps "
        "the real one in. Approvals arrive as operating system dialogs, so "
        "text in the context window cannot manufacture consent."),
    (A, "And that is the convergence. Both frontier vendors shipped policy "
        "evaluated tool calls in the same week: unattended operation needs a "
        "policy, not a person. Emergence adds that the policy also needs a "
        "stop condition."),
]

# -- what they actually score ---------------------------------------------
SCRIPT["numbers"] = [
    (B, "Hold on. Before any of that. Who is doing the measuring?"),
    (A, "Specific Labs. And it matters. They licensed ten tasks out of "
        "private enterprise codebases. Then ran eight model and harness "
        "pairs, each in its own native harness. Six hundred and forty "
        "rollouts."),
    (A, "Fable five point one is the best of them. Thirty eight point eight "
        "percent. G P T six Astra, thirty three point eight. G P T five point "
        "six Sol, sixteen point two."),
    (A, "The same models reported fifty five point eight on a public "
        "benchmark, days earlier. So the private codebase penalty is about "
        "twenty points. And the dominant failure was missed requirements, not "
        "broken code. That is a harness problem. Not a model one."),
]

# -- the take --------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So what is the map for? Choose the surface before you choose the "
        "product. Terminal, editor, cloud or resident, because that is what "
        "sets how much you can still check."),
    (A, "Then treat the harness as the thing you tune, not the thing you "
        "install. It is where the state layer lives, where the permission "
        "policy lives, and where the money goes. Twenty one pairs, evaluated: "
        "the success rate barely moves, the cost moves a lot."),
    (A, "And the rule that outlives all of it. A benchmark number with no "
        "named harness carries no information. You just watched one model "
        "score sixty two point seven, and ninety nine point nine, on the same "
        "tasks."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Four of the page's five taxonomy groups: research
    # scaffolds are not products you can run, so SWE-agent and its successors
    # are left to the research beats where the ideas belong, rather than being
    # put on a shelf beside Claude Code. Five columns is also the
    # coloured-blocks failure at this width.
    #
    # Tones. Terminal agents are the subject of the topic. Editors are
    # machinery, the loop hosted inside something else. Cloud agents are
    # verified in the literal sense the page gives them: the work is checked
    # after the fact rather than watched. Resident agents are the cost colour
    # because the page's own framing of the category is risk: inputs anybody
    # can reach, actions that are usually irreversible.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "terminal CLIs", "tone": "subject", "items": [
            "Claude Code", "Codex CLI", "OpenCode", "Goose", "Muse Code"]},
        {"head": "editors", "tone": "machinery", "items": [
            "Cursor", "Antigravity", "Zed: ACP", "Copilot", "Cline, Roo, Kilo"]},
        {"head": "cloud agents", "tone": "verified", "items": [
            "Devin", "Codex cloud", "Jules", "Claude Code web"]},
        {"head": "resident agents", "tone": "cost", "items": [
            "OpenClaw", "Hermes Agent"]},
    ]},

    "question": {"kind": "claim",
                 "text": "what the model sees\nwhat it is allowed to do",
                 "note": "the harness decides both, the weights decide "
                         "neither"},

    "cli": {"kind": "points", "tone": "subject", "focus": "terminal CLIs",
            "head": "what each one is betting on", "items": [
                "Claude Code: extension",
                "Codex: the kernel sandbox",
                "OpenCode: any provider",
                "Goose: the Linux Foundation",
                "Muse Code: runs in the pipeline",
            ]},

    # A table rather than three compare columns. Three sides beside a parked
    # map leaves under five units for the text of all three, which drives the
    # labels under the legibility floor; and the axis here genuinely is a
    # grid, one row per surface against one question. The narration has to
    # name the load-bearing column out loud, because the panel cannot mark it.
    "surfaces": {"kind": "table",
                 "focus": ["editors", "cloud agents", "resident agents"],
                 "head": ["surface", "what you can still check"],
                 "rows": [
                     ["editor", "every edit, as it lands"],
                     ["cloud", "a pull request, later"],
                     ["resident", "nothing: it already acted"],
                 ]},

    # The map goes back to neutral here and stays that way for the research
    # half. Without it the previous beat's highlight burns through four beats,
    # so the map says "we are discussing editors, cloud and resident agents"
    # while the narration is discussing none of them. Lighting everything is
    # the honest reading: what follows is about harnesses generally.
    "sees": {"kind": "compare",
             "focus": ["terminal CLIs", "editors", "cloud agents",
                       "resident agents"],
             "sides": [
        {"head": "more machinery", "tone": "machinery", "items": [
            "a live Python session",
            "state in four layers",
            "rewrites its skills",
            "30% to 95.5%"]},
        {"head": "checked state", "tone": "verified", "items": [
            "a state machine",
            "checked transitions",
            "a fixed agent inside",
            "it also wins"]},
    ]},

    # Two bars, one model, one task set, two harnesses. This is exactly the
    # comparison bars are for, and the reason the values are given rather
    # than the widths: the gap is the argument.
    "adapter": {"kind": "bars", "head": "one model, one task set", "bars": [
        {"label": "neutral harness", "value": 62.7, "text": "62.7%",
         "tone": "context"},
        {"label": "provider adapter", "value": 99.9, "text": "99.9%",
         "tone": "verified"},
    ]},

    "allowed": {"kind": "compare", "sides": [
        {"head": "detection", "tone": "cost", "items": [
            "8 worlds, 16 days",
            "none was resilient",
            "noticed, kept talking",
            "up to 46 hours"]},
        {"head": "containment", "tone": "verified", "items": [
            "never sees the token",
            "the swap is outside",
            "approvals via the OS",
            "policy, not a person"]},
    ]},

    # The bars complete a little before the line does, so the last figure is
    # not still arriving while the narrator has moved on to what it means.
    "numbers": {"kind": "bars", "reserve": 9.0,
                "head": "Real-SWE: ten private enterprise tasks", "bars": [
                    {"label": "Fable 5.1", "value": 38.8, "text": "38.8%",
                     "tone": "verified"},
                    {"label": "GPT-6 Astra", "value": 33.8, "text": "33.8%"},
                    {"label": "GPT-5.6 Sol", "value": 16.2, "text": "16.2%",
                     "tone": "cost"},
                ]},

    # The closing frame lights the whole map again: the take is about all
    # four shelves, and leaving one highlight burning would point at one of
    # them while the line points at every one.
    "take": {"kind": "claim",
             "focus": ["terminal CLIs", "editors", "cloud agents",
                       "resident agents"],
             "text": "Choose the surface,\nthen tune the harness.",
             "note": "a benchmark number with no named harness carries no "
                     "information"},
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
