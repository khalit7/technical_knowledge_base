"""
Topic overview: data curation and datasets, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: it carries the sharpest
single claim in the knowledge base, and unlike most such claims it has been
quantified. Data decisions move benchmarks more than most architecture
decisions at fixed compute, and the decomposition behind it puts the data
contribution at 3.24x the model contribution over 2019 to 2025, with the two
largely independent. That claim is the spine. The pipeline (corpora, filtering,
mixing, synthetic) is the inventory that answers "which decisions", and the new
material is that the inventory grew by a whole category: environments and
trajectories, manufactured rather than crawled.

The outline that survived the revision step:

    ident          what this is, and the claim that earns the time
    map            three columns, built and parked: the corpora, the pipeline,
                   manufactured data
    question       how much by, and which decisions
    decomposition  the number: 3.24x, and the sub-finding that matters more
    corpora        the lineage, and what actually separates the generations
    filtering      the live disagreement: DCLM against Nemotron-CC
    mixing         domain weights, and the death of the static mixture
    synthetic      rephrasing, SFT, preference, verifiable rewards
    environments   the third kind of data, manufactured two ways
    caveat         one decomposition, and model collapse read honestly
    close          the take

What the step-4 critique caught, and what changed:

  - Draft one opened on the corpus lineage and kept the 3.24x for the middle.
    That is backwards: the decomposition is the only reason the lineage is
    worth knowing, so it moved to beat four, immediately behind the question
    it answers, and the lineage became its evidence rather than its preamble.
  - Draft one had a tooling beat, a table of datatrove against the Dolma
    toolkit against NeMo Curator. It is a good table on the page and it is a
    catalogue in a video, because nothing about it is an argument. Cut to one
    clause inside the filtering beat.
  - The CMR scaling law was a beat of its own. It is the same idea as the rest
    of the mixing beat (fit a law on cheap probe runs, solve for the ratio),
    so it became a sentence there rather than a fourth named method.
  - Draft one let the 3.24x stand unqualified. It is one decomposition by one
    analyst over one window, and saying so is the difference between citing it
    and selling it. That became half the objection beat.
  - B was agreeing in draft one. B now interrupts three times: to say which
    column people actually talk about, to point out that "small models" means
    almost everybody, and to ask the obvious question about training on
    model output.

Every figure, corpus name, method and claim comes from the canonical page
"Topic: data-curation-and-datasets", read from Notion on 22 September 2026.
Nothing was invented for shape.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers and names are spelled the way they should be said, because text to
speech reads "3.24x", "C4" and "Nemotron-CC v2.1" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: data-curation-and-datasets"
SUBTITLE = "the decisions that move benchmarks more than architecture does"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Three columns, and they are three stages of one process
    # rather than three separate subjects, which is why the episode can walk
    # them left to right without changing altitude.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the corpora", "tone": "verified", "items": [
            "C4 and the Pile",
            "RefinedWeb",
            "FineWeb and DCLM",
            "Dolma 3, Nemotron-CC"]},
        {"head": "the pipeline", "tone": "machinery", "items": [
            "extraction",
            "filtering",
            "dedup",
            "mixing and staging"]},
        {"head": "manufactured data", "tone": "subject", "items": [
            "synthetic pretraining",
            "SFT and preference",
            "verifiable rewards",
            "environments and trajectories"]},
    ]},

    "question": {"kind": "claim",
                 "text": "If data really does beat architecture\n"
                         "at fixed compute: by how much, and which decisions?",
                 "note": "there is a number for the first half"},

    "decomposition": {"kind": "stat", "big": "3.24x",
                      "caption": "more compute-efficiency gain from data "
                                 "than from models, 2019 to 2025",
                      "note": "and the two are largely independent: very "
                              "little interaction between them"},

    "corpora": {"kind": "flow", "focus": "C4 and the Pile", "tone": "verified",
                "steps": ["C4, 2019", "RefinedWeb, 2023",
                          "FineWeb and DCLM, 2024", "Dolma 3, Nemotron-CC"]},

    "filtering": {"kind": "compare", "focus": "filtering", "sides": [
        {"head": "DCLM", "tone": "subject", "items": [
            "aggressive selection",
            "keep the good, discard the rest",
            "the controlled benchmark for all of this"]},
        {"head": "Nemotron-CC", "tone": "number", "items": [
            "sort into quality tiers",
            "rephrase the low tiers instead",
            "~4x more unique tokens, same quality"]},
    ]},

    "mixing": {"kind": "stack", "focus": "mixing and staging",
               "tone": "machinery", "layers": [
        ("the bulk phase", "a broad mixture, most of the tokens"),
        ("mid-training", "the last 10-30%: maths, code, reasoning"),
        ("long context", "a short final stage"),
    ]},

    "synthetic": {"kind": "points", "focus": "synthetic pretraining",
                  "head": "text nobody crawled", "items": [
        "from scratch: works, narrows style",
        "rephrasing: rewrite a real document",
        "SFT: distillation, traces verified first",
        "preference: on-policy, scored by a judge",
        "RLVR: (prompt, verifier) pairs",
    ]},

    "environments": {"kind": "compare", "focus": "environments and trajectories",
                     "sides": [
        {"head": "invert the generation", "tone": "subject", "items": [
            "build a verified tool chain first",
            "then write the question that needs it",
            "correct by construction"]},
        {"head": "reconstruct it", "tone": "machinery", "items": [
            "take a recorded trajectory",
            "rebuild the environment around it",
            "replayable, and checkable"]},
    ]},

    "caveat": {"kind": "points", "tone": "cost",
               "head": "before you act on any of that", "items": [
        "3.24x is one decomposition, one window",
        "model collapse is real in its own experiment",
        "which assumed recursion replacing human data",
        "accumulate rather than replace",
        "ground synthetic text in real documents",
    ]},

    "close": {"kind": "claim",
              "text": "Your next gain is probably not in the model.\n"
                      "It is in the mixture.",
              "note": "and the smaller the model, the more true that is"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of data curation and datasets. Where pretraining "
        "tokens come from, how a raw web crawl becomes a corpus, and how the "
        "post training data gets built."),
    (A, "It earns an episode because of one claim, and it is the sharpest claim "
        "in this knowledge base. At fixed compute, data decisions move "
        "benchmarks more than most architecture decisions do. Current as of the "
        "twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. Three columns, and they are "
        "three stages of one process rather than three subjects."),
    (A, "The corpora. Nearly everything descends from Common Crawl, and the "
        "lineage runs C four, the Pile, RefinedWeb, then FineWeb and D C L M, "
        "then Dolma three and Nemotron C C."),
    (A, "The pipeline that turns one of those into the next. Extraction, "
        "filtering, deduplication, then mixing and staging."),
    (A, "And the third column, which is data nobody crawled. Synthetic "
        "pretraining text. Fine tuning and preference data. Verifiable reward "
        "data. And environments and trajectories, which is the newest thing "
        "here."),
    (B, "The first column is the one everybody talks about."),
    (A, "And the second is the one that separates the generations."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So the question the map is arranged to answer. If data really does "
        "beat architecture at fixed compute, by how much, and which decisions?"),
    (A, "We go left to right. And for the first half of that there is now an "
        "actual number."),
]

# --- the number the whole page rests on -----------------------------------
SCRIPT["decomposition"] = [
    (A, "A decomposition published this month split the compute efficiency "
        "gains between twenty nineteen and twenty twenty five into two piles. "
        "Improvements to the data, and improvements to the model, meaning "
        "architecture and optimisation."),
    (A, "Data contributed three point two four times more than the model did. "
        "And the two are largely independent, which is what makes the number "
        "usable. You are not trading one against the other."),
    (A, "The sub finding is the one to act on. Small models gain most from data "
        "quality, so curation effort has its highest marginal return exactly "
        "where compute is scarcest."),
    (B, "Which is almost everybody outside a frontier lab."),
    (A, "Which is why this page is the one I would read first."),
]

# --- the corpora ----------------------------------------------------------
SCRIPT["corpora"] = [
    (A, "So, the corpora, and the flow on screen is the whole history. C four "
        "in twenty nineteen. RefinedWeb in twenty twenty three. FineWeb and "
        "D C L M in twenty twenty four. Dolma three and Nemotron C C now."),
    (A, "What separates each generation from the one before is not more raw "
        "data. Every one of them is Common Crawl underneath. It is a better "
        "model based quality classifier, and that is the highest leverage stage "
        "in the topic."),
]

# --- the live disagreement ------------------------------------------------
SCRIPT["filtering"] = [
    (A, "Which leads to the live disagreement, and both sides are on screen. "
        "How hard should you filter?"),
    (A, "D C L M, DataComp for Language Models, argues for aggressive "
        "selection. Keep what scores well, discard the rest. Nemotron C C sorts "
        "into quality tiers instead and rephrases the low tiers, which keeps "
        "roughly four times more unique tokens at comparable quality."),
    (A, "That second column only matters once your token horizon is the binding "
        "constraint. One other stage moves almost as much: recovering text from "
        "Common Crawl's raw archived pages rather than its prefab text dumps. "
        "Datatrove, the library behind FineWeb, runs all of it."),
]

# --- mixing and staging ---------------------------------------------------
SCRIPT["mixing"] = [
    (A, "Third stage. What share of the token budget each domain gets, web, "
        "code, maths, papers, books, measurably changes downstream ability at "
        "fixed compute, and you can answer it without paying for the real run. "
        "DoReMi reads domain weights off a small proxy model. Data Mixing Laws "
        "fit loss against the proportions. RegMix is the cheap regression over "
        "tiny runs."),
    (A, "But the bigger change is the shape on screen. The static mixture is "
        "gone. A broad bulk phase. Then a mid training phase over the last ten "
        "to thirty percent of tokens, upweighting maths, code and reasoning "
        "while the learning rate decays. Then often a short long context "
        "stage."),
    (A, "Two reasons it works. Scarce high quality tokens do not get diluted "
        "across ten trillion tokens of web. And good patterns stick when the "
        "learning rate is already low."),
]

# --- manufactured text ----------------------------------------------------
SCRIPT["synthetic"] = [
    (A, "Third column, and nobody crawled any of it. Generating documents from "
        "scratch, the textbooks are all you need line, works, but it narrows "
        "style and shapes skills towards benchmarks."),
    (A, "What went mainstream instead is the second line. Rephrasing. Have a "
        "model rewrite a real web document into a cleaner register, keeping the "
        "information diversity of the real source and fixing only the form."),
    (A, "Below it, fine tuning data moved from self instruct to curated "
        "distillation from a strong teacher, with reasoning traces verified "
        "before anything trains on them. Preference data is now mostly on "
        "policy, scored by a judge model. And verifiable reward training swaps "
        "the reward model for a deterministic checker, so its dataset is prompt "
        "and verifier pairs."),
]

# --- the new category -----------------------------------------------------
SCRIPT["environments"] = [
    (A, "Which points at the newest thing on the page, and it is not text at "
        "all. If verifiable reward training consumes environments rather than "
        "documents, somebody has to manufacture the environments."),
    (A, "Two ways, both on screen. Invert the generation: build a verified tool "
        "chain first, then write the question that asks for it, so the answer "
        "is correct by construction. Or take a trajectory that was recorded "
        "inside an environment and reconstruct the environment around it."),
    (A, "That is a third kind of training data, beside text and preferences, "
        "and it has the least settled practice of anything here."),
]

# --- the objection --------------------------------------------------------
SCRIPT["caveat"] = [
    (A, "Two caveats before the take. The three point two four figure is one "
        "decomposition, by one analyst, over one window. It is the best "
        "quantification of the claim that exists, and nobody has replicated "
        "it."),
    (B, "And is training on model output not the thing that ruins models?"),
    (A, "Model collapse. It is real in the experiment that named it, and that "
        "experiment assumed indiscriminate recursion replacing human data. The "
        "three lines under it all avoid that. Accumulate rather than replace. "
        "Ground the synthetic text in real documents. Filter."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? It says where to spend your next week. If the "
        "decomposition is even roughly right, then at fixed compute the "
        "mixture, the filter and the staging are worth more than the "
        "architecture, and the smaller your model the more true that is."),
    (A, "And the inventory grew by a whole category this year, from documents "
        "to environments. Which is the part with the least settled practice, "
        "and that is usually where the next gain is hiding."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {words} words ({b_turns} for B), "
          f"about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:14s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
