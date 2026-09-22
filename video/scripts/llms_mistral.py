"""
Provider overview: Mistral AI, as of 22 September 2026.

The load-bearing idea is that Mistral's interesting problem is strategic
rather than technical. Technically it is an honest fast follower: it takes an
efficiency idea that already works and is usually first to ship it at a size
people can actually run. What makes it worth an episode is the bet underneath
that. It gives its frontier-class flagship away under Apache 2.0, sells the
licence and the jurisdiction rather than the leaderboard row, and has just
raised the largest round in European tech to keep doing it. The open question
the page poses and does not answer is whether an open-weights lab can fund a
frontier line at all, which is exactly the question Meta answered by giving up.

Every figure comes from the canonical page "Mistral AI", read from Notion on
22 September 2026, because the local mirror is behind. Nothing was invented for
narrative shape.

The outline that survived the revision step:

    ident      name the lab, and what it is the only Western example of
    map        the five legs the bet stands on. Parked as the home frame;
               every later beat focuses one row
    question   can a lab that gives its flagship away fund the next one
    engineering  row three: fast follower, with the numbers that make it one
    licence    row one: the decision that is genuinely theirs, as a comparison
    line       the family as it stands, breadth being the other product
    money      row five: the raise, and what it is explicitly for
    objection  where they are plainly behind, and what they do not publish
    take       what the European counterweight is actually selling

What the step-4 critique caught, and what changed:

  - Draft one led with the catalogue. Thirty-plus releases read out is the
    list failure in its purest form. The catalogue is now one table, late,
    four rows, with the specialists named in narration rather than on screen.
  - Sliding-window attention had a beat to itself, including the stacked
    receptive field argument. Mistral relaxed or dropped it in later models,
    so a minute on it explains a 2023 model rather than the lab. Two lines now.
  - The licence was one sentence in draft one. It is the actual product, so it
    is now the compare panel: what a community licence attaches against what
    Apache two point zero does not.
  - The money beat did not exist in draft one, and without it the episode asks
    whether Mistral can fund a frontier line and never says what they raised.
    Adding it also gave the take something to be uncertain about.
  - Draft one said "not a top-five lab" in the take, which is a downbeat
    ending disguised as a verdict. It moved into the objection beat, where it
    belongs, and the take now says what you actually buy instead.
  - B was agreeing. B now pushes back on "fast follower" being a criticism,
    and asks whether three billion euros settles the funding question, which
    is the question the episode exists to leave open.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"8x7B", "Apache 2.0" and "EUR 21B" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Mistral AI"
SUBTITLE = "the open-weights bet, and the question of who pays for it"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Not a lineage and not a stack of mechanisms: the five
    # legs the strategy stands on, because the strategy is the subject.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("the licence", "Apache 2.0, on the flagship"),
        ("the jurisdiction", "EU sovereignty, defence, on-prem"),
        ("the engineering", "fast follower: SWA, GQA, sparse MoE"),
        ("the full stack", "Le Chat, La Plateforme, Mistral Compute"),
        ("the money", "the largest round in European tech"),
    ]},

    "question": {"kind": "claim",
                 "text": "Can a lab that gives its flagship away "
                         "fund the next one?",
                 "note": "the question Meta answered by giving up, "
                         "asked again by the lab that inherited the role"},

    "engineering": {"kind": "points", "focus": "the engineering",
                    "head": "three borrowed ideas, shipped small", "items": [
        "sliding-window attention: a 4096-token window, a rolling KV cache",
        "the window stacks: layer k reaches about k x W tokens back",
        "GQA: 8 query heads per KV head, so an eighth of the cache",
        "Mixtral: top 2 of 8 experts, 47B held, ~13B active per token",
    ]},

    "licence": {"kind": "compare", "focus": "the licence", "sides": [
        {"head": "a community licence", "tone": "cost", "items": [
            "an acceptable-use annex attached",
            "a monthly-active-user threshold",
            "obligations that follow your derivatives",
            "so legal reads it before engineering ships it"]},
        {"head": "Apache 2.0", "tone": "verified", "items": [
            "no annex, no user threshold",
            "no obligation to publish what you build",
            "fine-tune it, embed it, never mention Mistral",
            "a technical fact, not only a legal one"]},
    ]},

    "line": {"kind": "table", "head": ["model", "role"], "rows": [
        ["Mistral Large 3", "open-weight flagship MoE, Apache 2.0"],
        ["Medium 3.5 / Small 4", "price-performance tiers"],
        ["Magistral", "reasoning, trained with RLVR"],
        ["Devstral 2 / Small 2", "agentic coding, open"],
    ]},

    "money": {"kind": "stat", "focus": "the money",
              "big": "EUR 3B", "caption": "Samsung-led Series D, "
                                          "September 2026",
              "note": "the largest round in European tech. Values Mistral "
                      "above EUR 21B, against roughly $14B when ASML "
                      "anchored the previous one"},

    "objection": {"kind": "points", "tone": "cost",
                  "head": "read the position honestly", "items": [
        "not a top-five frontier lab on capability, and does not claim to be",
        "weights first, papers occasionally: recipes inferred from artefacts",
        "Magistral's RLVR write-up is the one openly documented method",
        "every expert resident in VRAM, even the idle ones",
    ]},

    "take": {"kind": "claim",
             "text": "You buy the licence and the jurisdiction, "
                     "not the leaderboard row.",
             "note": "and the open question is whether that revenue can "
                     "fund the model that keeps it frontier-adjacent"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is Mistral A I, a Paris lab founded in twenty twenty three by "
        "researchers out of Meta and DeepMind. It is the only Western lab "
        "still shipping open weights near frontier scale, a role it inherited "
        "when Meta stepped back from it."),
    (A, "It earns an episode because the interesting thing about it is not "
        "technical. It is a bet about who pays. Current to the twenty second "
        "of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "So the map is the bet, not the catalogue. Five legs."),
    (A, "The licence. The jurisdiction. The engineering, which is a fast "
        "follower's engineering and they would not dispute that. The full "
        "stack they pivoted to build. And the money, which arrived this "
        "month and changes the arithmetic."),
    (A, "That column stays up. Every beat after this is one row of it."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "Here is the question the whole thing answers, and it is a "
        "commercial one. Can a lab that gives its flagship away fund the "
        "next one?"),
    (A, "This is the same question Meta faced, and Meta answered it by "
        "closing its frontier line. Mistral inherited the role and is "
        "answering it differently, so far."),
]

# --- row three: the engineering -------------------------------------------
SCRIPT["engineering"] = [
    (A, "Take the engineering first, because it is the least surprising "
        "part. Mistral seven B let each layer attend only over the last four "
        "thousand tokens, so the cache becomes a fixed size rolling buffer. "
        "Information still travels further, because the window stacks: a "
        "token at layer k reaches roughly k times the window back."),
    (A, "Add grouped query attention, eight query heads sharing one key "
        "value head, so an eighth of the cache. Then Mixtral, which "
        "mainstreamed open mixture of experts: top two of eight, forty seven "
        "billion parameters held, thirteen billion active per token."),
    (B, "None of those were Mistral's ideas, though."),
    (A, "No. They were first to ship each one at a size people could actually "
        "run on their own hardware, which turned out to matter more."),
]

# --- row one: the decision that is genuinely theirs ------------------------
SCRIPT["licence"] = [
    (A, "The decision that is genuinely theirs is a licence. Mixtral, and "
        "now Mistral Large three, ship under Apache two point zero."),
    (A, "Read the two columns against each other. A community licence, on "
        "the left, attaches an acceptable use annex, a monthly active user "
        "threshold, and obligations that follow whatever you build. Apache "
        "two point zero, on the right, attaches none of them. Fine tune it, "
        "embed it in a product, never mention Mistral."),
    (B, "Does a licence really decide a deal?"),
    (A, "In the deals they are chasing, yes. Sovereign and defence "
        "deployments, regulated on-premises installs, and anyone who cannot "
        "legally send tokens to a U S A P I. That is the second row of the "
        "map, and the licence is what unlocks it."),
]

# --- the line as it stands ------------------------------------------------
SCRIPT["line"] = [
    (A, "The line itself. Mistral Large three, from December, is the current "
        "flagship: the largest open weight mixture of experts model from a "
        "Western lab, Apache two point zero, frontier class. The licence "
        "rather than the benchmark row is what made it notable."),
    (A, "Under it, price performance tiers, the Magistral reasoning line, "
        "and Devstral for agentic coding. Off the table, a specialist for "
        "nearly every shape: Codestral for code completion, Pixtral for "
        "vision, Voxtral for audio, Ministral for a phone. Breadth is the "
        "other half of the product."),
]

# --- row five: the money ---------------------------------------------------
SCRIPT["money"] = [
    (A, "Which brings us to the number that changed this month. A three "
        "billion euro Series D, led by Samsung, the largest round in European "
        "tech. It values Mistral above twenty one billion euros, against "
        "roughly fourteen billion dollars when A S M L anchored the previous "
        "round."),
    (A, "The pitch was explicitly sovereign A I: research, compute and "
        "international expansion. Distribution moved with it. Mistral models "
        "now ship inside Mozilla's Firefox Smart Window, sold on private "
        "multilingual browsing, which is the sovereignty argument reaching a "
        "consumer surface rather than a procurement one."),
]

# --- the objection --------------------------------------------------------
SCRIPT["objection"] = [
    (B, "Three billion euros buys a lot of compute. Does that settle it?"),
    (A, "Not yet, and the list is the honest version. They are not a top five "
        "frontier lab on capability and do not claim to be. They publish "
        "weights first and papers occasionally, so the recipes are mostly "
        "inferred from the artefacts rather than documented."),
    (A, "Magistral's reinforcement learning write-up is the one exception, "
        "and a good one: rollouts scored by mechanically checking the answer, "
        "with no reasoning traces distilled from a larger model. The "
        "expensive path, and the one that shows the capability was trained "
        "rather than copied."),
]

# --- the take -------------------------------------------------------------
SCRIPT["take"] = [
    (A, "So, the take. You do not choose Mistral because it tops a "
        "leaderboard. You choose it for the licence, the jurisdiction or the "
        "price per token, and those are real reasons that a benchmark table "
        "cannot show you."),
    (A, "The bet is that enterprise revenue earned that way pays for the next "
        "frontier model, which then has to be given away again to keep "
        "earning it. Nobody has proved that loop closes. Meta stopped before "
        "finding out, and this is the lab still running the experiment."),
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
