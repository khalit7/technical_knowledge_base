"""
Provider overview: xAI, now SpaceXAI, and the Grok family, as of
22 September 2026.

The load-bearing idea is that xAI is the least algorithmic and most industrial
lab in the set. It publishes almost no method. What it demonstrates instead is
that a datacentre built in months, plus a willingness to spend reinforcement
learning compute at pretraining scale, is enough to stay in the top five
without an obvious architectural edge. This page earns a video because it is
the counter-example to every other provider episode: there is no clever
mechanism to walk down, and saying that plainly is more useful than pretending
there is one. Its two durable differentiators are not in the model at all, they
are a real-time data firehose and an alignment posture, and the page now
records what the second one costs.

Every figure comes from the canonical page "xAI / SpaceXAI: Grok", read from
Notion on 22 September 2026, because the local mirror is behind. Nothing was
invented for narrative shape.

The outline that survived the revision step:

    ident      name the lab, the merger, and the one-sentence strategy
    map        the five things that are actually xAI. Parked as the home
               frame; every later beat focuses one row
    question   how much of a frontier lab is method, and how much is
               construction
    colossus   row one: 122 days, and why coherence rather than count is the
               achievement
    rl         row two: RL compute at pretraining scale, and Heavy's parallel
               test-time compute
    line       row five: the family as it stands, with the price
    posture    rows three and four together: the firehose, the looser posture,
               and the injection that survived the summer
    cost       where the index rank does not transfer
    take       what an industrial lab is actually betting

What the step-4 critique caught, and what changed:

  - Draft one opened on Colossus and the 122 days. That is opening on a
    surprising number about a subject the viewer has not been told is the
    subject, which is the opening rule's named failure. The ident now names
    the lab and the SpaceX merger first, and 122 days is the fourth beat.
  - Draft one had a lineage beat walking Grok-1 through Grok 4.6. Six model
    names in sequence with no argument is the list failure. The map is now the
    five things that are actually xAI, and the model names arrive in a table,
    late, where they can be read rather than remembered.
  - Draft one treated the alignment posture as a brand fact and left it at
    that. The page gives it a concrete cost, so the beat is now the attack
    itself, drawn as a flow, and the take turns on it rather than on the
    compute.
  - The lagging open-weights pattern (Grok-1 opened in 2024, Grok 2 in 2025)
    was a beat of its own. It is one sentence inside the line beat, because
    the pattern is the whole point and the dates are not.
  - Draft one let "intelligence index around 61" stand unglossed. B now says
    what a composite index is for, in the beat where the number appears.
  - B agreed once. B now asks what two hundred thousand cards buy that twenty
    thousand do not, and flags that eleven weeks unpatched is a decision.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"200K", "$2/$6" and "ARC-AGI-2" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "xAI / SpaceXAI: Grok"
SUBTITLE = "capital into datacentre into models, faster than anyone"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Not a lineage: the five things that actually are this
    # lab. Getting that axis right is most of the work of a provider map.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("the datacentre", "Colossus, and the next one"),
        ("RL at pretraining scale", "post-training as a second axis"),
        ("the data firehose", "real-time X, and DeepSearch on top"),
        ("the alignment posture", "deliberately looser than rivals"),
        ("the line", "Grok 4.6, and what sits under it"),
    ]},

    "question": {"kind": "claim",
                 "text": "How much of a frontier lab is method, "
                         "and how much is construction?",
                 "note": "xAI has published very little method, and is "
                         "in the top five anyway"},

    "colossus": {"kind": "stat", "focus": "the datacentre",
                 "big": "122 days", "caption": "to stand up Colossus, "
                                               "~200K H100s in Memphis",
                 "note": "the count is not the achievement. Training one "
                         "model across them needs them behind a single "
                         "high-bandwidth fabric, powered and cooled together"},

    "rl": {"kind": "points", "focus": "RL at pretraining scale",
           "head": "where Grok 4's gains came from", "items": [
        "as much compute on RL as on pretraining, reportedly",
        "rollouts on verifiable tasks: maths, code, tool use",
        "scored by checking the outcome, not by a preference model",
        "Heavy: several attempts in parallel, answers reconciled",
        "topped ARC-AGI-2 and Humanity's Last Exam at launch",
    ]},

    "line": {"kind": "table", "focus": "the line",
             "head": ["model", "role"], "rows": [
        ["Grok 4.6", "flagship, ~1.5T params, $2 in / $6 out per 1M"],
        ["Grok 4.1 Fast", "cheap agentic workhorse, 2M context"],
        ["Grok Code Fast", "coding at volume"],
        ["Grok 5", "in training, no date"],
    ]},

    "posture": {"kind": "flow", "tone": "cost", "steps": [
        "a page carries an AES-encrypted payload",
        "static filters cannot read it",
        "Grok decrypts it in its own Python runtime",
        "chat history posted to the attacker's URL",
    ]},

    "cost": {"kind": "bars", "head": "Real-SWE: private enterprise codebases",
             "bars": [
        {"label": "Claude Fable 5.1", "text": "38.8%", "value": 38.8,
         "tone": "verified"},
        {"label": "Grok 4.6", "text": "23.8%", "value": 23.8, "tone": "cost"},
        {"label": "Muse Spark 1.3", "text": "23.8%", "value": 23.8,
         "tone": "cost"},
    ]},

    "take": {"kind": "claim",
             "text": "Construction buys you the band. It does not buy trust.",
             "note": "input filtering cannot secure a model that is allowed "
                     "to execute code, and that is a design decision"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is x A I, the lab behind Grok, merged into SpaceX in February "
        "of this year to form SpaceXAI. The Grok brand was kept."),
    (A, "It earns an episode for an unusual reason. Every other frontier lab "
        "has a technique you can explain. This one has a construction "
        "schedule, and that is worth understanding on its own terms. Current "
        "to the twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "So the map is not a list of models. It is the five things that "
        "actually are this lab."),
    (A, "The datacentre. Reinforcement learning at pretraining scale. The "
        "real-time data firehose. The alignment posture. And, last, the "
        "product line, which is the part everyone starts with and the part "
        "that explains the least."),
    (A, "That column stays up. Every beat after this is one row of it."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "Here is the question this lab poses to the rest of the field. How "
        "much of a frontier lab is method, and how much is construction?"),
    (A, "Where DeepSeek optimises cost per token, x A I optimises the rate at "
        "which it turns capital into training compute, and training compute "
        "into shipped models. It has published very little method, and it is "
        "in the top five anyway."),
]

# --- row one: the datacentre ----------------------------------------------
SCRIPT["colossus"] = [
    (A, "Row one, and this is the number that matters. Colossus, the Memphis "
        "cluster, roughly two hundred thousand H one hundreds, stood up in a "
        "hundred and twenty two days."),
    (B, "What does two hundred thousand cards buy that twenty thousand "
        "does not?"),
    (A, "Coherence, which is the line under the number. Training one model "
        "across that many accelerators means having them behind a single high "
        "bandwidth fabric, with the power and cooling to run them together. "
        "The achievement is the construction timeline, not the purchase "
        "order."),
]

# --- row two: reinforcement learning --------------------------------------
SCRIPT["rl"] = [
    (A, "Row two is the one methodological commitment they have made "
        "visible. Grok four reportedly spent as much compute on reinforcement "
        "learning as on pretraining."),
    (A, "That is the concrete form of the field's realisation that post "
        "training is a second scaling axis rather than a finishing step. Very "
        "large volumes of rollouts on verifiable tasks, maths, code and tool "
        "use, scored by checking the outcome. Which is why reasoning improved "
        "faster than raw knowledge."),
    (A, "Grok four Heavy added the other lever on the list. Instead of one "
        "longer chain of thought, several attempts run at once and their "
        "answers are reconciled. That trades money for accuracy without "
        "adding serial latency, because errors in independent rollouts are "
        "only partly correlated."),
]

# --- the line as it stands ------------------------------------------------
SCRIPT["line"] = [
    (A, "Row five, the line itself. Grok four point six is the flagship, at "
        "roughly one and a half trillion parameters. Artificial Analysis puts "
        "it around sixty one, tying G P T five point six Sol and overtaking "
        "Kimi K three, at two dollars per million input tokens and six per "
        "million output."),
    (B, "Around sixty one on what, though?"),
    (A, "A composite. It averages a fixed basket of benchmarks into one "
        "number, useful for coarse ranking and nothing finer. The product "
        "claim is the price next to the position: frontier adjacent quality "
        "at about a third of what the top two charge. Frontier weights stay "
        "closed, and a generation is sometimes opened once it is commercially "
        "spent."),
]

# --- rows three and four: the data, and the posture -----------------------
SCRIPT["posture"] = [
    (A, "That leaves the two differentiators that are not in the model at "
        "all. The X firehose gives recency and a conversational corpus "
        "competitors have to license or scrape, and DeepSearch turns it into "
        "live retrieval at inference time."),
    (A, "And the alignment posture, deliberately looser than every rival. "
        "Its concrete cost is on the screen. Adversa A I disclosed this on "
        "the third of June. A web page carries an encrypted payload static "
        "filters cannot read. Grok decrypts it in its own Python runtime, "
        "follows the instructions inside, and posts your chat history, name, "
        "coarse location and subscription tier to an attacker's U R L. "
        "Roughly a forty percent success rate."),
    (B, "Eleven weeks unpatched is a decision, not an oversight."),
    (A, "It is. And the technique is the clearest demonstration anyone has "
        "given that input filtering cannot secure a model you have allowed to "
        "execute code."),
]

# --- the objection --------------------------------------------------------
SCRIPT["cost"] = [
    (A, "One more thing the index placing hides. These bars are Real S W E, "
        "run against private enterprise codebases rather than public ones."),
    (A, "Grok four point six resolves twenty three point eight percent, level "
        "with Meta's Muse Spark one point three, and well behind Claude Fable "
        "five point one at thirty eight point eight. A composite rank and "
        "somebody's actual repository are different questions."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So, the take. Construction really does buy you a place in the band. "
        "Nobody built a cluster that fast, nobody shipped that often, and the "
        "models are competitive with no public recipe behind them."),
    (A, "What it does not buy is trust, and the two differentiators that are "
        "not compute are exactly where that shows. Grok five has slipped "
        "three target dates. What to watch is whether the next one arrives "
        "with a method attached, or just with more cards."),
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
        print(f"  {key:12s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
