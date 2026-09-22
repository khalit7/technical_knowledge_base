"""
Deep dive: reasoning models, and the three places a test-time budget can go.

The load-bearing idea on the page is one mechanical fact: a transformer
forward pass has fixed depth, so the serial computation available to produce
one next-token distribution is bounded by the layer count and cannot be raised
at inference. A chain of thought removes that bound, because each emitted
token is another full forward pass and the context window persists across
them. Everything else on the page, the training recipes, the budget
mechanisms, the point where scaling stops paying, is downstream of it, so it
is the spine.

The wrong model this replaces: that a reasoning model is a model that was
asked to show its working. It is a model trained by reinforcement learning
against a checker, and the difference is why backtracking emerges rather than
being imitated.

The outline that survived the revision step:

    ident       what a reasoning model is, and the second scaling axis
    question    fixed depth, and how a model thinks for longer than it
    contract    mechanism, training, control, where it stops paying
    depth       one forward pass against a chain of thought
    three_ways  sequential, parallel, latent: the home frame, parked
    training    supervised traces against RL on verifiable rewards
    budgets     the four control mechanisms, and what each costs
    harness     62.7 to 99.9 percent on the same weights
    monitor     what latent deliberation costs downstream of the transcript
    objection   the three places the scaling stops paying
    take        no test-time-compute number means anything without its harness
    resources   the page's own three best

What the step-4 critique changed:

  - Draft one had two ways to spend a budget, sequential and parallel, which
    is what this page used to say. It now carries three, and the third one,
    recurrent depth in latent space, is the one with the monitorability
    consequence. It became the parked home frame, so every later beat can
    point back at which of the three it is talking about, and the monitor
    beat exists only because of it.
  - Draft one opened on the ARC Prize 37-point gap, which is the best number
    on the page and therefore the worst thing to open on: a viewer who has
    not been told what is being measured hears a surprising number about
    nothing. It moved behind the mechanism, where it lands as evidence.
  - Draft one gave GRPO its own beat with the clipped surrogate, the group
    statistic and the four known biases. That is a training-mechanics page,
    not this one, and it pushed the episode past eight minutes. GRPO is now
    one clause inside the training beat and the page carries the rest.
  - Draft one's objection was "this is just prompting", which nobody
    knowledgeable actually thinks. The real objection is that more thinking
    is always better, so the beat now answers with the three measured places
    it stops paying, pass@k first.
  - B was narrating in draft one. B now has four turns: what the chain does
    not buy, whether the emergent behaviour is real, what the 37 points are
    measuring, and one on faithfulness.

Every figure comes from the canonical page "Reasoning models and test-time
compute", read from Notion on 22 September 2026.

Numbers are spelled the way they are said, because text to speech reads
"62.7%" and "pass@k" badly.
"""

A = "A"
B = "B"

FORMAT = "deep dive"
TITLE = "Reasoning models and test-time compute"
SUBTITLE = "what thinking longer buys, and the three places the budget can go"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "question": {"kind": "claim",
                 "text": "A forward pass has a fixed number of layers.\n"
                         "So how does a model deliberate for longer\n"
                         "than its own depth?",
                 "note": "and what does the extra deliberation actually buy"},

    "contract": {"kind": "flow", "tone": "machinery", "steps": [
        "the mechanism", "how it is trained", "how much to spend",
        "where it stops paying"]},

    "depth": {"kind": "compare", "sides": [
        {"head": "one forward pass", "tone": "cost", "items": [
            "serial steps bounded by the layer count",
            "intermediate state discarded every token",
            "no way to reread and revise"]},
        {"head": "a chain of thought", "tone": "verified", "items": [
            "each token is another full forward pass",
            "the context window is working memory",
            "so it can notice a contradiction and restart"]},
    ]},

    # The home frame. Every later beat points back at which of the three it
    # is talking about, which is what makes the latent column land at all.
    "three_ways": {"kind": "columns", "park": True, "columns": [
        {"head": "sequential", "tone": "subject", "items": [
            "one longer trajectory",
            "self-correction inside it",
            "latency you cannot parallelise"]},
        {"head": "parallel", "tone": "number", "items": [
            "many samples, one selector",
            "capped by verifier quality",
            "Deep Think, the heavy tiers"]},
        {"head": "latent: recurrent depth", "tone": "cost", "items": [
            "activations looped through the layers",
            "never becomes text",
            "nothing left to monitor"]},
    ]},

    "training": {"kind": "compare", "focus": "sequential", "sides": [
        {"head": "supervised traces", "tone": "context", "items": [
            "keep the chains that got it right",
            "cheap, stable, no rollout stack",
            "bounded by the teacher",
            "filtered for success: no errors to learn from"]},
        {"head": "RL on verifiable rewards", "tone": "verified", "items": [
            "a program scores the final answer",
            "the trajectories are the model's own",
            "so backtracking emerges, rather than being shown"]},
    ]},

    "budgets": {"kind": "table",
                "head": ["depth control", "who decides", "what it costs"],
                "rows": [
        ["two modes in one checkpoint", "the caller, per turn",
         "capacity shared between them"],
        ["a token budget", "the caller, in advance",
         "truncation, unless trained for it"],
        ["interleaved thinking", "the harness, per step",
         "the agent pattern, hard to evaluate"],
        ["a router", "a classifier you cannot see",
         "predictability"],
    ]},

    "harness": {"kind": "stat", "big": "62.7% to 99.9%",
                "focus": "activations looped through the layers",
                "caption": "the same weights, on ARC-AGI-3",
                "note": "a provider-agnostic harness against a Provider "
                        "Adapter that keeps opaque reasoning state between "
                        "requests. 37 points, and the higher score was 49% "
                        "cheaper in tokens"},

    "monitor": {"kind": "points", "tone": "cost", "focus": "never becomes text",
                "head": "what latent deliberation costs", "items": [
        "a monitor cannot read what was never written",
        "a harness cannot reconstruct the working state",
        "the serving stack has to carry the recurrent state",
        "and the visible trace was never a faithful window anyway",
    ]},

    "objection": {"kind": "points", "tone": "cost",
                  "head": "where the scaling stops paying", "items": [
        "overthinking: longer chains lose accuracy on easy inputs",
        "RLVR sharpens, it does not extend: watch pass@k",
        "cost is linear in tokens, accuracy roughly logarithmic",
    ]},

    "take": {"kind": "claim",
             "text": "No test-time-compute number means anything now\n"
                     "without its harness named.",
             "note": "the open question is when and how much to think, "
                     "not whether"},

    "resources": {"kind": "resources", "items": [
        {"name": "OpenAI: Learning to reason with LLMs",
         "gloss": "15 min, the announcement that defined the category and "
                  "published the test-time scaling curve"},
        {"name": "The DeepSeek-R1 paper",
         "gloss": "about an hour, the openly documented recipe for "
                  "RL-induced reasoning"},
        {"name": "Sasha Rush: Speculations on Test-Time Scaling",
         "gloss": "40 min of video, the best technical lecture on the "
                  "design space"},
    ]},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is.
SCRIPT["ident"] = [
    (A, "This is a deep dive on reasoning models and test time compute."),
    (A, "What one is: a model that writes a long chain of thought before its "
        "answer, and that was trained by reinforcement learning to use that "
        "chain well, on problems where a program can check the answer. "
        "Mathematics with a reference answer. Code with a test suite."),
    (A, "It earns a video because it opened a second scaling axis. You can buy "
        "accuracy at inference time now, not only at training time."),
]

# 1. the sharp question, and it is more mechanical than it sounds.
SCRIPT["question"] = [
    (A, "Here is the question underneath all of it. A transformer forward pass "
        "has a fixed depth. The serial computation available to produce one next "
        "token is bounded by the layer count, and you cannot raise it at "
        "inference."),
    (A, "So how does a model deliberate for longer than its own depth? And what "
        "does the extra deliberation actually buy?"),
]

# 2. the contract.
SCRIPT["contract"] = [
    (A, "Four steps. The mechanism, which is one idea. Then how the behaviour is "
        "trained, because this is not prompting. Then how much to spend, which "
        "is the live product question. And last, where the scaling stops paying, "
        "which the marketing does not cover."),
]

# 3. the mechanism.
SCRIPT["depth"] = [
    (A, "The mechanism is on the screen and it is one idea. Each emitted token is "
        "another full forward pass, conditioned on everything written so far. "
        "Serial steps become unbounded, and the context window becomes working "
        "memory that persists across them."),
    (A, "Three things follow. Decomposition: a problem needing more serial steps "
        "than the model has layers becomes reachable. Externalised state, written "
        "down instead of discarded. And revision, because the model can read what "
        "it wrote, notice a contradiction and start again."),
    (B, "And what does it not buy?"),
    (A, "Knowledge. Nothing that is not already in the weights or reachable by a "
        "tool."),
]

# 4. the home frame: three ways to spend the budget, not two.
SCRIPT["three_ways"] = [
    (A, "There are three ways to spend a test time budget. Until this year there "
        "were two, and everything after this points back at these columns."),
    (A, "Sequential: one longer trajectory with self correction inside it. The o "
        "one and R one pattern, and the axis reinforcement learning scales. It "
        "costs latency you cannot parallelise, because tokens come out in order."),
    (A, "Parallel: sample many solutions and select one. Wall clock need not "
        "grow, but the token bill does, and it lives or dies on the selector. "
        "Deep Think and the heavy tiers are this."),
    (A, "And latent, which is new. G P T six Astra loops activations back through "
        "its own layers, so some of the deliberation happens in activations and "
        "never becomes text at all."),
]

# 5. how the behaviour is trained. GRPO is one clause; the page has the rest.
SCRIPT["training"] = [
    (A, "Now how that behaviour is trained, because it is not prompting. Two "
        "answers, and production uses both of them."),
    (A, "Supervised traces: generate long chains, keep the ones that got the "
        "right answer, train on them as ordinary next token prediction. Cheap "
        "and stable. But the student is bounded by the teacher, and a set "
        "filtered for success contains almost no errors, so it teaches nothing "
        "about recovering from one."),
    (A, "The other is reinforcement learning on verifiable rewards. The model "
        "generates its own trajectories and a program scores the final answer. "
        "Because the trajectories are its own, what gets reinforced is behaviour "
        "this model can actually produce."),
    (B, "Which is why the backtracking emerged rather than being demonstrated."),
]

# 6. the control problem, once every flagship reasons.
SCRIPT["budgets"] = [
    (A, "Once every flagship reasons, the question is how much. Four mechanisms "
        "are in production, on the screen with who decides and what it costs."),
    (A, "Two modes in one checkpoint, chosen per turn. A token budget the caller "
        "sets, where the naive implementation truncates and hands you a "
        "derivation with no conclusion. Interleaved thinking between tool calls, "
        "which is the agent harness pattern. And a router, where a classifier "
        "decides for you and the cost is predictability."),
]

# 7. the number, and it is a harness number.
SCRIPT["harness"] = [
    (B, "What are those two numbers measuring?"),
    (A, "The same weights, twice. ARC Prize ran G P T six Astra through its "
        "standard provider agnostic harness and got sixty two point seven "
        "percent. Through a Provider Adapter that preserves opaque reasoning "
        "state between requests, the same model got ninety nine point nine."),
    (A, "Thirty seven points on identical weights, and the higher score was also "
        "forty nine percent cheaper in tokens. Once part of the deliberation "
        "lives outside the transcript, the adapter that carries it is worth "
        "points."),
]

# 8. what the latent column costs, which is the reason it matters.
SCRIPT["monitor"] = [
    (A, "Which is the cost of that third column, and it is not mostly an "
        "efficiency story."),
    (A, "A monitor cannot read deliberation that was never written. An evaluation "
        "harness cannot reconstruct the working state. And the serving stack has "
        "to persist the recurrent state or recompute it. Buck Shlegeris warned "
        "that scaling opaque recurrence could totally destroy chain of thought "
        "monitorability."),
    (B, "Was the visible chain ever a faithful window?"),
    (A, "No, and that is the sharper way to put it. A model can reach an answer "
        "for reasons its stated reasoning does not reflect. An unfaithful trace "
        "distorts. Latent deliberation is no window at all."),
]

# 9. the objection.
SCRIPT["objection"] = [
    (A, "So the objection you should be forming is that more thinking is always "
        "better. It is not, and there are three measured places it stops paying."),
    (A, "Overthinking is real: on easy inputs, longer chains reduce accuracy, "
        "because the model revisits a correct answer and argues itself out of it. "
        "Reinforcement learning sharpens rather than extends, and the evidence is "
        "pass at k: it wins decisively at one sample, and as the sample count "
        "grows the base model catches up and can overtake. And the economics are "
        "unfavourable by construction: cost is linear in thinking tokens, "
        "accuracy roughly logarithmic."),
]

# 10. the take.
SCRIPT["take"] = [
    (A, "So, the take. The standalone reasoning category has dissolved. There are "
        "essentially no non reasoning flagships left, so the open problem is when "
        "and how much to think, not whether."),
    (A, "And no test time compute number means anything now without its harness "
        "named. If somebody quotes you a score on a reasoning benchmark, the "
        "useful question is what was holding the state between requests."),
]

# 11. where to go properly.
SCRIPT["resources"] = [
    (A, "The page has all of it with the sources, and three places to go "
        "properly. OpenAI's Learning to reason with large language models "
        "defined the category, and published the test time scaling curve. "
        "Fifteen minutes."),
    (A, "The DeepSeek R one paper is the openly documented recipe, about an hour. "
        "And Sasha Rush's Speculations on Test Time Scaling is forty minutes of "
        "video, and the best technical tour of the design space."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 148 * 60:.0f} seconds at 148 words per minute")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:12s} {len(beat)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
