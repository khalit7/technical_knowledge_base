"""
Deep dive: mixture of experts, and why the parameter count you pay for is not
the one that runs.

The load-bearing idea on the page is one paragraph in the gating section: the
gate weight is the only path by which the router learns anything, selection is
discrete so no gradient goes through it, and therefore an expert that stops
being picked stops producing any evidence that it would have been good. Every
load-balancing technique on the page exists because of that sentence, so it is
the spine. The worked example carried the whole way is DeepSeek V3, 671B total
and 37B active, 256 routed experts with 8 active plus 1 shared.

The wrong model this replaces: that sparsity is a free lunch you should simply
crank, and that the router learns which expert is best. It cannot; it can only
learn about experts it already picks.

The outline that survived the revision step:

    ident       what a MoE layer is, in one sentence, and why it earns a video
    question    671 billion parameters, 37 billion of them running
    contract    arithmetic, then the router, then what it costs to serve
    arithmetic  capacity from all of them, compute from the few that run
    router      score, normalise, select, combine
    collapse    the gradient argument, and why routing eats itself
    balancing   the auxiliary loss, its quality tax, and how V3 removed it
    serving     one thirty-second of the batch, and two all-to-alls
    objection   if sparsity is this good, why stop at 33x
    sparsest    the two different claims that wear the word
    take        read the ratio, then the absolute active count
    resources   the page's own three best

What the step-4 critique changed:

  - Draft one asserted "about 33x is the current ceiling" and moved on. The
    page gives three named reasons for the ceiling (memory, communication,
    expert under-training), and a deep dive that does not say why a limit is
    a limit is a list of facts. That became the objection beat.
  - Draft one used "sparsest" for Step 5 Preview and for DeepSeek V4 Pro in
    the same breath, which is the silent conversion the page now warns
    about. The two claims are separated into their own beat: the ratio is
    drawn as bars, the absolute active count is spoken against it, and B is
    the one who asks for the second quantity.
  - Draft one had a separate beat for expert parallelism and another for what
    breaks at inference. They are the same story told from two ends, so they
    merged into one serving beat built on the k over N division, which is
    the only derivation the episode needs.
  - Draft one ran to eleven hundred words. Every beat lost its third turn
    where the third turn was restating the second.
  - B was agreeing in draft one. B now has four turns: what the idle
    parameters are for, why the bias trick is free, which quantity the bar
    chart is not showing, and one on the shared expert.

Every figure comes from the canonical page "Mixture-of-Experts (MoE) models",
read from Notion on 22 September 2026.

Numbers are spelled the way they are said, because text to speech reads
"671B/37B" and "top-k" badly.
"""

A = "A"
B = "B"

FORMAT = "deep dive"
TITLE = "Mixture-of-Experts (MoE) models"
SUBTITLE = "capacity from all of them, compute from the few that run"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "question": {"kind": "claim",
                 "text": "37 of DeepSeek V3's 671 billion parameters\n"
                         "run for any given token.\n"
                         "You still have to buy all 671.",
                 "note": "memory and quality come from the total; "
                         "latency and price from the active count"},

    "contract": {"kind": "flow", "tone": "machinery", "steps": [
        "the arithmetic", "the router", "what it costs to serve"]},

    "arithmetic": {"kind": "stat", "big": "671B / 37B",
                   "caption": "total parameters, and the ones that run",
                   "note": "Mixtral 8x7B, 47B total and 13B active, matched or "
                           "beat a dense Llama-2 13B at equal inference FLOPs"},

    "router": {"kind": "flow", "tone": "subject", "steps": [
        "score", "normalise", "select top k", "combine"]},

    "collapse": {"kind": "points", "tone": "cost",
                 "head": "why routing eats itself", "items": [
        "selection is discrete: no gradient goes through it",
        "the router only hears from experts it already picked",
        "an unpicked expert produces no evidence at all",
        "so the popular ones get the gradient, and stay popular",
    ]},

    "balancing": {"kind": "compare", "sides": [
        {"head": "an auxiliary loss", "tone": "cost", "items": [
            "a second objective beside language modelling",
            "pushes the traffic toward uniform",
            "and fights it wherever a token really does",
            "belong to one expert"]},
        {"head": "aux-loss-free bias", "tone": "verified", "items": [
            "a per-expert bias, for selection only",
            "never added to the gate weight",
            "so it never enters the gradient at all",
            "the decision boundary moves, not the objective"]},
    ]},

    "serving": {"kind": "stat", "big": "1/32",
                "caption": "of the batch reaches any one expert",
                "note": "256 routed experts, 8 active: k over N. And every "
                        "layer pays two all-to-all collectives, whose cost is "
                        "set by the slowest rank"},

    "objection": {"kind": "points", "tone": "cost",
                  "head": "so why is nobody at a hundred times?", "items": [
        "memory: every parameter is resident and paid for",
        "communication: fan-out per token grows with k",
        "under-training: each expert sees about 1/N of the tokens",
    ]},

    "sparsest": {"kind": "bars",
                 "head": "sparsity ratio: total parameters over active",
                 "bars": [
        {"label": "DeepSeek V4 Pro", "text": "1.6T / 49B, about 33x",
         "value": 33, "tone": "number"},
        {"label": "Step 5 Preview", "text": "600B / 27B, about 22x",
         "value": 22, "tone": "number"},
        {"label": "Tencent Hy4", "text": "770B / 49B, about 16x",
         "value": 16, "tone": "context"},
    ]},

    "take": {"kind": "claim",
             "text": "Read the ratio first. Then the absolute active count.\n"
                     "One is your memory bill. The other is your latency.",
             "note": "and the active count is no longer always one number"},

    "resources": {"kind": "resources", "items": [
        {"name": "Neptune.ai: Mixture of Experts LLMs",
         "gloss": "25 min, the best single explainer of gating and balancing"},
        {"name": "Hugging Face: Mixture of Experts Explained",
         "gloss": "30 min, Switch and GShard history, expert parallelism"},
        {"name": "The DeepSeek-V3 tech report",
         "gloss": "1h 30m, the modern template. Read the MoE and "
                  "infrastructure sections and leave the rest"},
    ]},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, before anything else.
SCRIPT["ident"] = [
    (A, "This is a deep dive on mixture of experts, the architecture underneath "
        "nearly every frontier model shipping today."),
    (A, "What it is: a mixture of experts layer replaces the single feed forward "
        "network in a transformer block with a few hundred of them, plus a tiny "
        "router that picks a handful per token. Everything else stays dense and "
        "shared. It is why a model can advertise trillions of parameters and "
        "still be affordable to run."),
]

# 1. the tension, and the sharp question.
SCRIPT["question"] = [
    (A, "DeepSeek V three is six hundred and seventy one billion parameters, and "
        "about thirty seven billion of them run for any given token. That is "
        "what six seventy one B total, thirty seven B active means on a card."),
    (B, "So what are the other six hundred and thirty four billion for?"),
    (A, "Capacity, and that is the question this answers. The two numbers "
        "predict different things. Memory and quality from the total. Latency "
        "and price from the active count."),
]

# 2. the contract.
SCRIPT["contract"] = [
    (A, "Three things, in order. The arithmetic, which is simple and is the "
        "whole trade. Then the router, a few thousand parameters that cause "
        "most of the trouble in the model. Then what it costs to serve, which "
        "is the part a model card skips. It gets harder as it goes."),
]

# 3. the arithmetic, and the evidence it works.
SCRIPT["arithmetic"] = [
    (A, "Operations per token come from the few experts that run. Knowledge "
        "capacity comes from all of them."),
    (A, "Mixtral eight by seven B is the clean evidence. Forty seven billion "
        "total, thirteen billion active, matching or beating a dense Llama two "
        "at thirteen billion on the standard tests. Same inference cost. The "
        "idle capacity was close to free quality."),
]

# 4. what the layer actually does.
SCRIPT["router"] = [
    (A, "So what does the layer do per token? Four steps, and they are on the "
        "screen."),
    (A, "Score: multiply the hidden state by one matrix, one number per expert. "
        "That matrix is well under a tenth of a percent of the layer, so the "
        "router is free in every sense except the trouble it causes. Normalise. "
        "Select the top k. Combine: add the chosen outputs, weighted by the "
        "router's own scores."),
]

# 5. the load-bearing idea: the gradient argument.
SCRIPT["collapse"] = [
    (A, "Now the sentence everything else is downstream of, and it is hiding in "
        "that last step. The gate weight is the only path by which the router "
        "learns anything."),
    (A, "Selection is discrete, so no gradient flows through it. The router only "
        "hears from experts it chose, and an expert that stops being selected "
        "stops producing any evidence that it would have been good."),
    (A, "So the router does not learn which expert is best. It only learns about "
        "the ones it already picks. An expert chosen slightly more often gets "
        "more gradient, gets better, gets chosen more often still, and the rest "
        "starve."),
]

# 6. the fix, and the tax it used to charge.
SCRIPT["balancing"] = [
    (A, "The first fix was an auxiliary balancing loss: a term minimised when "
        "traffic is even. It works, and it charges a quality tax, because it is "
        "a second objective that fights language modelling wherever a token "
        "really does belong to one expert."),
    (A, "DeepSeek V three removed the tax. Keep a per expert bias, add it to the "
        "score for selection only, never to the gate weight. Overloaded expert, "
        "nudge it down. Underloaded, nudge it up."),
    (B, "And because it never touches the output, it never reaches the gradient."),
    (A, "Right. The decision boundary moves instead of the objective. That is "
        "why aux loss free is on nearly every open card since."),
]

# 7. serving, and the derivation that explains the whole pattern.
SCRIPT["serving"] = [
    (A, "Serving is where the downsides live. With N routed experts and top k "
        "selection, the share of a batch reaching any one expert is k over N. "
        "Put V three in: eight active of two hundred and fifty six. One thirty "
        "second."),
    (A, "Decode already gives you one token per sequence, so those matrices were "
        "small, and sparsity divides them again. And every layer pays two all to "
        "all collectives, whose cost is set by the slowest rank. One hot expert "
        "stalls the layer."),
]

# 8. the objection a knowledgeable viewer is already forming.
SCRIPT["objection"] = [
    (A, "At which point, the objection. If adding total parameters at a fixed "
        "active count keeps improving the loss, and it does, why stop at thirty "
        "three times?"),
    (A, "Three ceilings. Memory, because every parameter is resident and paid "
        "for. Communication, because fan out grows with k. And under training: "
        "each expert sees about one N th of the tokens, so at very high N it may "
        "not see enough to specialise."),
    (B, "Is that what the shared expert is for?"),
    (A, "Partly. An always on expert absorbs what every token needs, so the "
        "routed ones can actually specialise."),
]

# 9. the word to stop trusting.
SCRIPT["sparsest"] = [
    (A, "Which brings us to a word to stop trusting, because two quantities wear "
        "it. The bars are the sparsity ratio, total over active. DeepSeek V four "
        "Pro leads at about thirty three times. Step five Preview, about twenty "
        "two. Tencent's Hunyuan four, a conservative sixteen."),
    (B, "And the other quantity?"),
    (A, "The absolute active count, which is what a token costs to decode. There "
        "the leader is Step five Preview: twenty seven billion of six hundred "
        "billion, the smallest in the frontier band, on an unremarkable ratio. A "
        "vendor claiming sparsest is quoting whichever one it wins."),
]

# 10. the take.
SCRIPT["take"] = [
    (A, "So, the take. When a model card lands, read the ratio first: it is the "
        "gap between the memory you must buy and the latency you get. Then the "
        "absolute active count, because that is what a token costs."),
    (A, "And stop assuming the active count is one number. V four point one "
        "Flash is an encoder decoder that activates eight billion in prefill and "
        "sixteen in decode, so one total over active figure does not describe it."),
]

# 11. where to go properly.
SCRIPT["resources"] = [
    (A, "The page has all of it with the sources, and three places to go "
        "properly. Neptune's piece is the best single explainer of gating and "
        "load balancing, twenty five minutes. Hugging Face's is the classic "
        "reference, with the Switch and G Shard history."),
    (A, "And the DeepSeek V three report is the template itself. Ninety minutes, "
        "and a report rather than a paper, so read the mixture of experts "
        "section and the infrastructure section."),
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
