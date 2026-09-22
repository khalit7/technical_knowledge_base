"""
Topic overview: ml-fundamentals, as of 22 September 2026.

The load-bearing idea is that this topic is the one place in the knowledge base
where the map is worth more than any page on it. Ten children, almost all of it
review material, and read as ten pages it is a syllabus nobody retains. Read as
four threads that cut across the ten, it is a much smaller subject: cross
entropy is one object in three places, gating is one construction in two eras,
vanishing gradients is one problem seen from four directions, and weight decay
belongs to two bands at once, which is exactly why AdamW exists. None of that
is visible from inside a single page, which is what earns this a video.

The outline that survived the revision step:

    ident       what the topic is, and that the map beats the pages
    map         all ten children on screen, grouped, nothing explained
    question    what do the ten say together that none says alone
    walk        cross entropy in three places
                -> gating, the same construction twice
                -> the lineage, because the transformer is what is left of it
                -> vanishing gradients, one thread through four pages
                -> weight decay, the boundary case, and why AdamW exists
                -> metrics, where the distinction is a denominator
                -> classical ML, whose machinery keeps resurfacing
    take        four threads, and the disagreements are the interesting part

What the step-4 critique caught, and what changed:

  - Draft one walked the ten children in the order the page lists them. That is
    the "narrating a list" failure the skill names, and on a topic with no live
    argument in it, it is the only failure that matters. Rebuilt on the
    cross-cutting threads instead; the children now appear only where a thread
    passes through them.
  - Draft one had a beat per child for optimisers, normalisation and
    contrastive learning. All three were saying "here is what that page
    covers". Optimisers were merged into the weight-decay beat (AdamW is the
    interesting thing either way), normalisation into the vanishing-gradients
    beat (it is one of the four directions), and contrastive learning into the
    cross-entropy table, where InfoNCE is one of the three rows.
  - "LSTM gate, 1997" and "twenty years apart" were in the gating beat. Neither
    date is on the canonical page, so both were cut rather than sourced
    elsewhere.
  - "the ancestor of every vector database you have used this year" overstated
    the page, which says "the ancestor of vector retrieval". Restored.
  - B was agreeing in three of four turns. B now asks whether the cross-entropy
    coincidence is real, asks which page to open when the loss goes flat, and
    names the consequence of the classical-ML thread before A does.

Every claim traces to the canonical page "Topic: ml-fundamentals". The page
carries no figures at all, which is why no beat here is a `bars` or a `stat`:
there is nothing honest to put in one.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: ml-fundamentals"
SUBTITLE = "what ten pages say together that none of them says alone"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "training components", "tone": "subject", "items": [
            "losses",
            "activations",
            "regularisation",
            "optimisers",
            "normalisation and init",
        ]},
        {"head": "evaluation and paradigms", "tone": "number", "items": [
            "metrics",
            "classical ML",
            "contrastive and SSL",
        ]},
        {"head": "history and practice", "tone": "verified", "items": [
            "sequence models",
            "debugging training",
        ]},
    ]},

    "question": {"kind": "claim",
                 "text": "What do these ten pages say together\nthat none of them says alone?",
                 "note": "a list of ten is a syllabus, and you can already read a syllabus"},

    "cross_entropy": {"kind": "table", "focus": "losses",
                      "head": ["on the page", "called", "what it is"],
                      "rows": [
                          ["losses", "cross entropy", "the objective"],
                          ["metrics", "entropy, CE, KL", "the same thing, measured"],
                          ["contrastive", "InfoNCE", "N-way CE, one positive"],
                      ]},

    "gating": {"kind": "compare", "focus": "activations", "sides": [
        {"head": "the LSTM gate", "tone": "verified", "items": [
            "two projections",
            "one multiplies the other",
            "how much signal gets through",
        ]},
        {"head": "SwiGLU, the transformer FFN default", "tone": "subject", "items": [
            "two projections",
            "one gates the other",
            "the slope is learned per neuron",
        ]},
    ]},

    "lineage": {"kind": "points", "focus": "sequence models",
                "head": "the lineage, still load-bearing", "items": [
        "attention removed seq2seq's fixed-vector bottleneck",
        "the LSTM cell state is updated by addition",
        "which is a skip connection through time",
    ]},

    "vanishing": {"kind": "points", "focus": "debugging training", "tone": "cost",
                  "head": "vanishing gradients, on four pages", "items": [
        "activations: saturation flattens the derivative",
        "initialisation: the scale is wrong at step zero",
        "normalisation: placement decides the variance",
        "sequence models: a product of Jacobians through time",
    ]},

    "boundary": {"kind": "flow", "focus": "regularisation", "tone": "machinery",
                 "steps": [
        "a regulariser by intent",
        "an optimiser property by implementation",
        "so AdamW decouples it",
    ]},

    "metrics": {"kind": "compare", "focus": "metrics", "sides": [
        {"head": "ROC", "tone": "context", "items": [
            "denominator: the whole negative class",
            "flattering when negatives dominate",
        ]},
        {"head": "PR curve", "tone": "verified", "items": [
            "denominator: the model's own positives",
            "the one to use when positives are rare",
        ]},
    ]},

    "classical": {"kind": "points", "focus": "classical ML",
                  "head": "classical machinery, resurfacing", "items": [
        "hinge loss and the kernel trick",
        "nearest neighbours, the ancestor of vector retrieval",
        "boosting's use of second-order information",
        "which is why some losses need a defined Hessian",
    ]},

    "close": {"kind": "claim",
              "text": "Ten pages. Four threads.\nThe threads are the topic.",
              "note": "when two pages disagree about where a thing belongs, "
                      "that is the interesting part"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is
    "ident": [
        (A, "This is machine learning fundamentals. Ten pages of the building blocks "
            "every network is assembled from. Losses, activations, optimisers, "
            "normalisation, metrics, and the older ideas they came out of."),
        (A, "Almost all of it is review material. So the reason to spend six minutes "
            "here is not the ten pages. It is what you can only see when all ten are "
            "on the screen at once."),
    ],

    # 2. the inventory, named before anything is explained
    "map": [
        (A, "Here is the whole board. Nothing explained yet."),
        (A, "Training components. Losses. Activations. Regularisation. Optimisers. "
            "And normalisation and initialisation."),
        (A, "Then evaluation and paradigms. Metrics. Classical machine learning. "
            "And contrastive and self supervised learning."),
        (A, "And history and practice. The sequence models that came before the "
            "transformer, and a cookbook for debugging training when it goes wrong."),
        (B, "That is the whole topic, then."),
        (A, "That is the whole topic. Now forget the order it is listed in."),
    ],

    # 3. the organising question
    "question": [
        (A, "Because a list of ten pages is a syllabus, and you can already read a "
            "syllabus. What you cannot get from any one of these pages is the thing "
            "that runs through several of them at once."),
        (A, "So there is only one question worth asking at this altitude. What do "
            "these ten say together that none of them says alone?"),
    ],

    # 4. thread one: cross entropy, in three places
    "cross_entropy": [
        (A, "Start with the one that appears three times. Cross entropy."),
        (A, "On the losses page it is the objective. Every classification loss in "
            "common use is cross entropy with the terms reweighted. Label smoothing. "
            "Class weights. Focal loss. Not different losses."),
        (B, "And the entropy on the metrics page. Same thing, or just the same word?"),
        (A, "Same thing. Entropy, cross entropy and K L on the metrics page are that "
            "loss read as a measurement rather than as an objective."),
        (A, "And the third row is the contrastive page. Info N C E is cross entropy "
            "again, an N way classification of one positive against the other "
            "examples in the batch. Which is why batch size matters so much there "
            "and nowhere else here."),
    ],

    # 5. thread two: gating, the same construction twice
    "gating": [
        (A, "Second thread. Gating, which you meet on two pages that look unrelated."),
        (A, "On the sequence models page, the L S T M gate. Two projections, one of "
            "them multiplying the other, so the network learns how much signal to "
            "let through."),
        (A, "On the activations page, the gated variants. Swiglu is the default feed "
            "forward block in a modern transformer, and it is the same construction. "
            "Two projections, one gating the other."),
        (A, "Side by side, they are the same picture. What differs is what it buys. "
            "In the recurrent net it was memory through time. In the transformer the "
            "slope of the activation is learned per neuron rather than fixed."),
    ],

    # 6. why the history page is not history
    "lineage": [
        (A, "Which is the case for that whole sequence models page, because it "
            "otherwise reads as history."),
        (A, "It is not history. The transformer is what is left of it. Attention was "
            "not invented for transformers. It was invented to remove the fixed "
            "vector bottleneck in sequence to sequence models, where a whole input "
            "was squeezed into one vector before decoding started."),
        (A, "And the cell state is updated by addition rather than by multiplication, "
            "which makes it a skip connection through time. You already know that "
            "trick from residual networks. This is where it came from."),
    ],

    # 7. thread three: one problem, four directions
    "vanishing": [
        (A, "Third thread, and it runs furthest. Vanishing gradients, on four pages, "
            "looking like a different problem on each one."),
        (A, "On activations it is saturation. A sigmoid that has flattened out has "
            "almost no derivative left to hand back."),
        (A, "On normalisation and initialisation it is scale. Those two chase one "
            "invariant between them. Roughly constant activation and gradient "
            "variance across every layer, at step zero and forever after."),
        (A, "On sequence models it is a product of Jacobians, multiplied once per "
            "time step, heading for zero."),
        (B, "So when my loss goes flat, which of those pages do I open?"),
        (A, "Debugging training, and that is why it reads the way it does. It is a "
            "symptom to cause path back through all of them. Not a separate subject. "
            "The index."),
    ],

    # 8. thread four: the boundary case
    "boundary": [
        (A, "Fourth thread, the smallest, and it explains something you have typed a "
            "hundred times. Weight decay belongs to two bands at once."),
        (A, "By intent it is a regulariser. You penalise large weights to stop the "
            "model overfitting, which puts it on the regularisation page."),
        (A, "By implementation it is a property of the optimiser, applied inside the "
            "update step, mixed in with the adaptive scaling."),
        (A, "Put those next to each other and Adam W stops being trivia. It exists to "
            "decouple the decay from that scaling, so the regulariser does what you "
            "meant rather than what the optimiser did to it."),
    ],

    # 9. the one distinction on the metrics page worth carrying
    "metrics": [
        (A, "The metrics page has one distinction worth carrying away, and it turns "
            "out to be a denominator."),
        (A, "R O C and the precision recall curve look like two versions of one "
            "picture. They are not. R O C measures against the whole negative class."),
        (A, "So if negatives massively outnumber positives, that denominator is "
            "enormous, and a useless model still looks excellent. The P R curve "
            "measures against the model's own positive predictions instead."),
        (A, "The page puts it in one line. Rare positives, P R curve, not R O C."),
    ],

    # 10. the page people skip
    "classical": [
        (A, "One more, and it is the page people skip. Classical machine learning."),
        (A, "It still owns tabular data. Boosted trees are the thing to beat there, "
            "and for hyperparameters, random search beats grid search."),
        (A, "But the reason it sits in this topic is that its machinery keeps coming "
            "back elsewhere. Hinge loss and the kernel trick. Nearest neighbours, the "
            "ancestor of vector retrieval. And boosting's use of second order "
            "information, which is why some losses have to have a defined Hessian."),
        (B, "So the losses page carries a rule that only makes sense if you have read "
            "this one."),
        (A, "That is the shape of the entire topic."),
    ],

    # 11. the take
    "close": [
        (A, "So what is this map for?"),
        (A, "Read as ten pages it is a syllabus, and you will forget it. Read as four "
            "threads cutting across it, the subject is far smaller than it looks."),
        (A, "Cross entropy is one object in three places. Gating is one construction "
            "in two eras. Vanishing gradients is one problem from four directions. "
            "And weight decay belongs to two bands at once, which is why Adam W had "
            "to exist."),
        (A, "Keep that last habit. When two pages here disagree about where something "
            "belongs, that is usually the interesting part, and not a filing error."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 148:.1f} minutes at 148 words per minute")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:16s} {len(beat)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
