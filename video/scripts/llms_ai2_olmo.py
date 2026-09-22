"""
Topic overview: Ai2's OLMo line, the fully open models, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: "open weights" and
"open source" are used interchangeably and are not remotely the same thing. A
normal open-weights release hands you one artefact, the final parameter
tensors, and keeps everything that produced them. Ai2 releases the production
process instead of the product: the corpus, the data tooling, the mixture and
its order, the training code, every intermediate checkpoint, the logs including
the failures, and the post-training data. Each item unlocks a kind of research
that is otherwise impossible, and the whole list costs them the capability
frontier, because you cannot publish a corpus you have no clear right to
publish. The page was corrected in September 2026: Ai2 is no longer the only
lab doing this, and that sharpens the story rather than weakening it. One
example of a practice is a curiosity. Two, on two continents, under different
funders, is a norm forming.

The outline that survived the revision step:

    ident       what this is, the date, and the distinction in one sentence
    map         what actually ships, built and parked, in four groups
    question    what can you do with a model if you also have everything
                that made it, plus where the tour goes
    gap         open weights against fully open, side by side
    research    what each item buys, with Ettin as the worked case
    flow        OLMo 3's "model flow": you can fork the path, not just the end
    cost        the trade, and the efficiency claim that answers it
    second      the correction: K2 Horizon, and why two is different from one
    close       the take: this is the control group everyone else's numbers
                are checked against

What the step-4 critique changed:

  - Draft one opened on the list of things Ai2 publishes. A list is not an
    opening: the viewer has no reason to care that a data mixture is released
    until they know that a claim about data is untestable without it. The
    opening now states the distinction and the map shows the list, in that
    order.
  - The "why each matters" beat was five abstract benefits in a row, which is
    the failure mode this format is most prone to. It now leads with Ettin,
    a real experiment that could not otherwise exist: encoders against
    decoders with data, scale, recipe and tokeniser all held fixed. Concrete
    first, then the general statement.
  - Two beats of training science (post-norm, QK-norm, the Dolmino anneal)
    were cut down to the anneal alone, inside the flow beat, because the
    curriculum is the part the flow diagram is actually showing. The
    stability fixes belong to the training-science page.
  - The cost beat asserted "it costs them capability" with no number. It now
    carries the 6x token-efficiency claim, which is the family's own answer
    to that charge and lets the viewer weigh both at once.
  - The K2 Horizon correction was a footnote in draft one and is now a beat,
    because "Ai2 is no longer alone" is the most recent fact on the page and
    it changes the take rather than qualifying it.
  - B was decorative. B now puts the obvious objection ("why not just
    fine-tune somebody else's open weights?"), and pushes on whether a second
    fully open lab undercuts Ai2, and A answers both directly.

Everything traces to the canonical page "Ai2: OLMo (fully open models)", read
from Notion on 22 September 2026. Nothing here is invented for narrative shape.

Numbers are spelled the way they are said, because text to speech reads
"OLMo 3.1", "6x" and "0.9B" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Ai2: OLMo (fully open models)"
SUBTITLE = "what you can do with a model when you also have everything that made it"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the corpus", "tone": "subject",
         "items": ["Dolma", "the data tooling", "Dolmino anneal mix"]},
        {"head": "the recipe", "tone": "machinery",
         "items": ["the exact mixture", "the order it was fed", "code and configs"]},
        {"head": "the trajectory", "tone": "number",
         "items": ["every checkpoint", "the training logs", "spikes and restarts"]},
        {"head": "after training", "tone": "verified",
         "items": ["Tulu", "Dolci", "OlmoRL"]},
    ]},

    "question": {"kind": "claim",
                 "text": "What can you do with a model\n"
                         "if you also have everything that made it?",
                 "note": "the answer is a class of experiment, not a better "
                         "score"},

    "gap": {"kind": "compare", "sides": [
        {"head": "open weights", "tone": "context", "items": [
            "the final parameter tensors",
            "a model card",
            "a table of scores",
            "everything that produced them stays inside the lab"]},
        {"head": "fully open", "tone": "subject", "items": [
            "the corpus, as downloadable documents",
            "the mixture, the order, the code, the configs",
            "every intermediate checkpoint and the logs",
            "the post-training data, not a paragraph about it"]},
    ]},

    "research": {"kind": "points", "focus": "the trajectory",
                 "head": "what that makes possible", "items": [
        "Ettin: encoders vs decoders, everything else held fixed",
        "ablate a data source, retrain small, measure the difference",
        "watch when a capability appears, and fork the run mid-training",
        "grep the corpus for the eval set, so a score is falsifiable",
    ]},

    "flow": {"kind": "flow", "tone": "machinery", "steps": [
        "broad web mixture", "Dolmino anneal", "Base",
        "Dolci + OlmoRL", "Think 32B",
    ]},

    "cost": {"kind": "stat", "big": "6x", "tone": "number",
             "caption": "fewer training tokens for Think 32B to match "
                        "Qwen3-32B on maths, code and reasoning",
             "note": "the trade: a corpus you can publish is a corpus you have "
                     "the right to publish, and that alone caps the scores"},

    "second": {"kind": "table",
               "head": ["lab", "funded from", "what it ships"],
               "rows": [
                   ["Ai2 / OLMo", "Seattle, US",
                    "OLMo 3.1, Molmo, Dolma, Tulu, Dolci"],
                   ["IFM / K2 Horizon", "Abu Dhabi",
                    "six Apache 2.0 models, 0.9B to 375B"],
               ]},

    "close": {"kind": "claim",
              "text": "Somebody has to be the control group.\n"
                      "Everyone else's contamination audit depends on it.",
              "note": "and as of September 2026 there are two of them, on two "
                      "continents, under different funders"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the distinction the whole page turns on
SCRIPT["ident"] = [
    (A, "This is Ai two's OLMo line, as the knowledge base has it on the "
        "twenty second of September, twenty twenty six. Ai two is the Allen "
        "Institute for A I, in Seattle, and OLMo is its family of fully open "
        "language models."),
    (A, "Fully open is not the same as open weights, and that distinction is "
        "the whole page. A normal open-weights release hands you one thing: "
        "the final parameter tensors. Everything that produced them stays "
        "inside the lab."),
]

# 1. the inventory: what ships, before why any of it matters
SCRIPT["map"] = [
    (A, "Here is what Ai two ships instead, in four groups, with nothing "
        "explained yet. The corpus itself, Dolma, as downloadable documents, "
        "plus the tooling that turned raw crawl into it."),
    (A, "The recipe: the exact proportions of each source, the order they "
        "were fed in, the training code and the full configs. The trajectory: "
        "every intermediate checkpoint, and the logs, including the loss "
        "spikes and the restarts. And the post-training stack, as real "
        "datasets rather than a description."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "Every lab publishes a paper. Why does shipping the rest change "
        "anything?"),
    (A, "That is the question. What can you actually do with a model if you "
        "also have everything that made it?"),
    (A, "So: the gap between the two kinds of open, what it buys, what it "
        "costs, and then the correction this page got last week."),
]

# 3. the two kinds of open, side by side
SCRIPT["gap"] = [
    (A, "Put them next to each other. On the left, what Llama, Qwen, Mistral "
        "and DeepSeek give you. Weights, a model card, a table of scores. You "
        "can serve it and you can fine-tune it, and that is genuinely useful."),
    (A, "On the right, the production process. And the item that matters most "
        "is the dullest-sounding one: the exact data mixture. Two models with "
        "identical architectures and different mixtures are different models, "
        "and the mixture is the part every lab guards hardest."),
]

# 4. what it buys, concrete first
SCRIPT["research"] = [
    (A, "Take one real example. Ettin is a set of paired encoders and "
        "decoders trained identically on the OLMo two recipe. The two had "
        "never been compared with data, scale, recipe and tokeniser all held "
        "fixed, so every earlier comparison confounded the objective with "
        "everything else."),
    (A, "With only the objective varying, encoders win on retrieval, decoders "
        "win on generation, and training across objectives closes neither "
        "gap. A usable answer, and it needed the whole stack to exist."),
    (B, "Could you not just fine-tune somebody else's open weights and "
        "compare?"),
    (A, "Not as a controlled experiment. You would be varying the base model, "
        "its unknown corpus and your intervention at once. Forking a released "
        "checkpoint with the released mixture holds the first two fixed. "
        "That is the difference between a result and an anecdote."),
]

# 5. the checkpoints as a path rather than a point
SCRIPT["flow"] = [
    (A, "OLMo three makes that literal, and calls it the model flow. Not a "
        "model: the whole path, published at every point along it."),
    (A, "Bulk pretraining on the broad web mixture. Then an annealing phase "
        "on Dolmino, a much smaller high-quality mix, fed while the learning "
        "rate decays, which lifts downstream scores far more than spreading "
        "the same tokens through the run. Then Base, then the reinforcement "
        "learning stage, then Think thirty two B. You can fork it anywhere on "
        "that line, not only at the end."),
]

# 6. the price, and the answer to it
SCRIPT["cost"] = [
    (B, "And the catch? Nobody gives all that away for nothing."),
    (A, "The catch is a ceiling. Publishing your corpus means you cannot "
        "train on data you have no clear right to publish, and that "
        "constraint alone caps OLMo against labs that train on whatever they "
        "can reach."),
    (A, "Their answer is the number on the screen. Think thirty two B matched "
        "Qwen three thirty two B on maths, code and reasoning with roughly "
        "six times fewer training tokens. Curation and staged curricula "
        "instead of more compute."),
]

# 7. the correction, which sharpens the story
SCRIPT["second"] = [
    (A, "Now the correction this page took in September. Until then, OLMo was "
        "the only line doing any of this. It is not any more."),
    (A, "The Institute of Foundation Models, in Abu Dhabi, published K two "
        "Horizon: six Apache two point zero models from under a billion "
        "parameters to three hundred and seventy five billion, with weights, "
        "training code, training data and methodology."),
    (B, "Does a second one not take the story away from Ai two?"),
    (A, "The opposite. One example of a practice is a curiosity. Two, on two "
        "continents, under different funders, is a norm forming."),
]

# 8. the take
SCRIPT["close"] = [
    (A, "So what is this family for? Not for serving. Treat it as the "
        "reference stack, and as the control group."),
    (A, "Every benchmark number from a closed corpus is unfalsifiable in "
        "principle, because you cannot search the training data for the "
        "evaluation set. Here you can. Somebody has to be the place where "
        "that check is possible, and it turns out to be worth funding twice "
        "over, on two continents."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
