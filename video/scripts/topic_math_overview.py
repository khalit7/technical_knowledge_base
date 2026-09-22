"""
Topic overview: math for machine learning, as of 22 September 2026.

The load-bearing idea is that "what maths do I need" is the wrong question,
because it has no answer short of all of it, and because it makes four living
subjects sound like a prerequisite list. The page itself already refuses that
framing: its central section is called "What each area buys you". So the video
asks the page's question instead. What does each branch let you say about a
network that you could not otherwise say? Linear algebra gives you the geometry
of a representation, calculus the mechanism of learning, probability the
language of uncertainty and loss, information theory the account of what a bit
of data is worth. Four answers, one per beat, each with the concrete place it
shows up. Then the part only visible with all four in view: cross entropy is
one object wearing four hats, and curvature is one object read three ways.

The outline that survived the revision step:

    ident       what the topic is, and why the prerequisite framing is wrong
    map         four areas on screen, everything named, nothing explained
    question    what does each area let you say that you could not otherwise
    walk        linear algebra: rank, and why LoRA works
                -> calculus: VJPs, and why activations are the constraint
                -> curvature: one object read three ways
                -> probability: the distribution picks the loss
                -> statistics: whether a one-point gain is real
                -> information theory: cross entropy as a code length
                -> forward against reverse KL
    converge    cross entropy wearing four hats
    take        which area to reach for when you are stuck

What the step-4 critique caught, and what changed:

  - Draft one had a beat per area and then a separate beat for each area's
    "and here is the interesting bit". Eight beats saying the same thing twice.
    Merged to one beat per area, with the interesting bit as the beat.
  - The Hessian material was scattered across the calculus beat and a second
    beat on normalisation. Both were really about curvature, so they became one
    beat built on the page's own line: the Hessian of a loss, the condition
    number of a matrix and the Fisher information of a model are one object.
  - Draft one said reverse KL is why "an aligned model gives you the same
    answer five times in a row". The page says it costs output diversity, and
    nothing about five. Cut to what the page says.
  - "and usually it is not" was attached to the one-point-gain figure. The page
    says the shrinkage decides whether the gain is real, not which way it
    usually goes. Cut.
  - The perplexity and bits-per-byte contrast was its own beat and was two
    sentences long. Folded into the information theory beat, where it is the
    downstream consequence of the code-length reading anyway.
  - B was absent until the eighth beat. B now pushes the framing at the
    question beat, which is where the viewer is forming it.

Every claim traces to the canonical page "Topic: math". The only figures on
that page are the one-point gain on a five hundred example evaluation and the
one over root n shrinkage, which is why exactly one beat is a `stat`.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: math"
SUBTITLE = "what each branch lets you say about a network"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "linear algebra", "tone": "subject", "items": [
            "rank",
            "eigen, SVD, QR, Cholesky",
            "low-rank, and LoRA",
            "matrix calculus layout",
        ]},
        {"head": "probability and statistics", "tone": "number", "items": [
            "likelihood to loss",
            "MLE, MAP, Bayesian",
            "bias and variance",
            "tests, CLT, bootstrap",
        ]},
        {"head": "calculus and optimisation", "tone": "machinery", "items": [
            "gradients worked out",
            "backprop as VJPs",
            "Hessians and Newton",
            "convexity, Lagrange",
        ]},
        {"head": "information theory", "tone": "verified", "items": [
            "entropy, cross-entropy, KL",
            "mutual information, InfoNCE",
            "perplexity, bits-per-byte",
        ]},
    ]},

    "question": {"kind": "claim",
                 "text": "What does each area let you say about a network\n"
                         "that you could not otherwise say?",
                 "note": "four areas, four answers, and each one has a place it shows up"},

    "linalg": {"kind": "points", "focus": "linear algebra",
               "head": "four ideas that pay off daily", "items": [
        "rank: how many directions a map really uses",
        "SVD and Eckart-Young: truncation as arithmetic",
        "condition number: is this a long narrow valley?",
        "layout: why the paper's gradient is transposed",
    ]},

    "calculus": {"kind": "flow", "focus": "calculus and optimisation",
                 "tone": "machinery", "steps": [
        "vector-Jacobian products",
        "backward costs 2x forward",
        "activations are the constraint",
    ]},

    "curvature": {"kind": "points",
                  "head": "curvature, read three ways", "items": [
        "the Hessian of a loss",
        "the condition number of a matrix",
        "the Fisher information of a model",
    ]},

    "probability": {"kind": "table", "focus": "probability and statistics",
                    "head": ["assume p(y | x) is", "and the loss is"],
                    "rows": [
                        ["Gaussian", "MSE"],
                        ["Bernoulli", "binary cross entropy"],
                        ["categorical", "softmax cross entropy"],
                        ["Poisson", "Poisson loss"],
                    ]},

    "statistics": {"kind": "stat", "big": "1 point / 500 examples",
                   "caption": "the gain you cannot check by eye",
                   "note": "error bars shrink like 1 over root n, and that is "
                           "what decides whether the point is real"},

    "information": {"kind": "points", "focus": "information theory",
                    "head": "what a bit of data is worth", "items": [
        "cross entropy is a code length",
        "KL is the gap, so loss floors at the data's entropy",
        "perplexity: tokenizer-dependent, not comparable",
        "bits-per-byte: tokenizer-free, used in scaling laws",
    ]},

    "kl": {"kind": "compare", "sides": [
        {"head": "forward KL", "tone": "verified", "items": [
            "what MLE minimises",
            "mode covering",
            "it covers every mode of the data",
        ]},
        {"head": "reverse KL", "tone": "cost", "items": [
            "what an RLHF penalty uses",
            "mode seeking",
            "it costs you output diversity",
        ]},
    ]},

    "converge": {"kind": "table",
                 "head": ["read it as", "and cross entropy is"],
                 "rows": [
                     ["probability", "a maximum-likelihood estimator"],
                     ["information theory", "a code length"],
                     ["calculus", "the thing whose gradient is p - y"],
                     ["contrastive learning", "InfoNCE"],
                 ]},

    "close": {"kind": "claim",
              "text": "Not four subjects to work through.\nFour places to look when you are stuck.",
              "note": "and where two of them answer with the same object, "
                      "you were carrying two copies of one idea"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is
    "ident": [
        (A, "This is the mathematics behind machine learning. Four areas. Linear "
            "algebra, probability and statistics, calculus and optimisation, and "
            "information theory."),
        (A, "The usual way to present that is as a prerequisite list, which is boring "
            "and slightly dishonest, because nobody learns all of it first. So we ask "
            "the question the page asks instead."),
    ],

    # 2. the inventory, named before anything is explained
    "map": [
        (A, "The whole board first, and nothing explained yet."),
        (A, "Linear algebra. Rank, the decompositions, low rank and Lora, and matrix "
            "calculus layout."),
        (A, "Probability and statistics. How a likelihood becomes a loss. Maximum "
            "likelihood, maximum a posteriori and Bayesian. Bias and variance. And "
            "the tests that let you compare two models honestly."),
        (A, "Calculus and optimisation. Gradients worked out, backpropagation as "
            "vector Jacobian products, Hessians and Newton, convexity and Lagrange."),
        (A, "And information theory. Entropy, cross entropy and K L. Mutual "
            "information. Perplexity and bits per byte."),
    ],

    # 3. the organising question
    "question": [
        (A, "Now the question. Not what maths do I need, because that has no answer "
            "short of all of it."),
        (B, "What does each one actually buy me?"),
        (A, "Right. Four areas, four answers. Linear algebra gives you the geometry "
            "of a representation. Calculus gives you the mechanism of learning. "
            "Probability gives you the language of uncertainty and loss. And "
            "information theory tells you what a bit of data is worth."),
    ],

    # 4. linear algebra: the geometry of a representation
    "linalg": [
        (A, "Linear algebra is the notation all of it is written in. A layer is a "
            "matrix, an attention head a pair of contractions, a batch one more axis. "
            "Four ideas pay off daily."),
        (A, "Rank is how many independent directions a map actually uses. And the "
            "observation that a fine tune moves the weights in far fewer directions "
            "than the weights have is exactly what Lora exploits. Low rank K V "
            "compression aims it at the cache."),
        (A, "The S V D, through Eckart Young, turns truncation into arithmetic. The "
            "condition number predicts whether your problem is a long narrow valley. "
            "And layout convention is why a gradient in a paper and the one autograd "
            "hands you are transposes."),
    ],

    # 5. calculus: the mechanism of learning
    "calculus": [
        (A, "Calculus is the mechanism. How the thing actually trains."),
        (A, "Backpropagation is reverse mode automatic differentiation, and the "
            "important detail is what it refuses to do. It never materialises a "
            "Jacobian. It only ever asks each operation for a vector Jacobian "
            "product."),
        (A, "Follow the arrows and two facts stop being folklore. A backward pass "
            "costs roughly twice a forward pass. And the binding constraint on a "
            "large run is not floating point operations, it is the activations you "
            "kept to do the backward pass at all."),
        (A, "Which is why activation checkpointing exists. You throw them away and "
            "recompute them, because memory ran out, not arithmetic."),
    ],

    # 6. curvature, one object read three ways
    "curvature": [
        (A, "Second derivatives are where the practical intuitions live, and here the "
            "page does something useful. Curvature is one object read three ways."),
        (A, "The Hessian of a loss. The condition number of a matrix. The Fisher "
            "information of a model. Three names, three areas, one thing."),
        (A, "And a pile of separate rules collapses. Gradient descent diverges above "
            "a learning rate of two over lambda max. Ill conditioning is what "
            "normalisation and good initialisation really fix. Adam's second moment "
            "is a crude diagonal estimate of the same quantity. And X G Boost's leaf "
            "weights are literally per leaf Newton steps."),
    ],

    # 7. probability: why this loss and not another
    "probability": [
        (A, "Probability does something quieter. It turns a loss from an arbitrary "
            "choice into a consequence."),
        (A, "Here is the move, and it is one move. Choose a distribution for p of y "
            "given x. Take the negative log likelihood. The standard loss falls out."),
        (A, "Gaussian gives you mean squared error. Bernoulli gives you binary cross "
            "entropy. Categorical gives you softmax cross entropy. Poisson gives you "
            "the Poisson loss."),
        (A, "So why this loss is never a matter of taste. It is which distribution "
            "you assumed. And these are proper scoring rules, whose optimum is the "
            "true conditional probability, which is what makes calibration a "
            "meaningful question at all."),
    ],

    # 8. statistics: the honesty half, and the one number on the page
    "statistics": [
        (A, "The statistics half does a different job. It is what makes an evaluation "
            "result honest. Paired tests, and bootstrap confidence intervals on a "
            "benchmark delta."),
        (A, "And the number on the screen. A one point gain on a five hundred example "
            "evaluation. Error bars shrink like one over the square root of n, and "
            "that shrinkage is what decides whether the point is real at all."),
        (B, "Which is exactly the kind of claim people quote at me."),
        (A, "Constantly. And checking it is the cheapest honesty in this whole topic."),
    ],

    # 9. information theory: what a bit is worth
    "information": [
        (A, "Information theory is the measurement layer, and it is what makes a "
            "language model number mean anything."),
        (A, "Cross entropy, read as a code length, is the bits you pay when the code "
            "was built for your model but the data came from reality. K L is the gap. "
            "Which is slightly deflating, because your loss does not floor at zero. "
            "It floors at the data's own entropy."),
        (A, "And that decides how you read evaluations. Perplexity depends on the "
            "tokenizer, so you cannot compare it across models with different "
            "vocabularies. Bits per byte is tokenizer free, which is why scaling law "
            "work uses it."),
    ],

    # 10. the asymmetry that explains a behaviour
    "kl": [
        (A, "One asymmetry inside K L is worth its own frame, because it explains a "
            "behaviour you have noticed."),
        (A, "Forward K L is what maximum likelihood minimises. It is mode covering. "
            "The model is punished for putting no mass where the data has some, so it "
            "covers every mode, including the odd ones."),
        (A, "Reverse K L is what an R L H F penalty uses, and it is mode seeking. It "
            "concentrates, and it costs you output diversity. Not a side effect. It "
            "is what you asked for."),
    ],

    # 11. the convergence
    "converge": [
        (A, "And now the part that only exists with all four areas in view."),
        (A, "Cross entropy is one object wearing four hats. To probability it is a "
            "maximum likelihood estimator. To information theory it is a code length."),
        (A, "To calculus it is the thing whose gradient collapses to p minus y, which "
            "is why that expression shows up for mean squared error, for binary cross "
            "entropy with a sigmoid, and for softmax cross entropy."),
        (B, "And Info N C E is the fourth row."),
        (A, "An N way softmax over one positive. Same object. Four mental boxes for "
            "that is four times the work."),
    ],

    # 12. the take
    "close": [
        (A, "So what is this map for?"),
        (A, "Not for working through in order. It is for knowing which of the four to "
            "reach for when you are stuck."),
        (A, "Cannot see why the loss is that loss. Probability. Cannot see why the "
            "run ran out of memory. Calculus, and the backward pass. Cannot see why a "
            "representation collapsed. Linear algebra, and rank. Cannot read the "
            "evaluation number. Information theory."),
        (A, "And when two of them answer with the same object, as they do for cross "
            "entropy and for curvature, keep it. You were carrying two copies of one "
            "idea."),
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
