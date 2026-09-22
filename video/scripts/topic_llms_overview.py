"""
Topic overview: the large language model landscape, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: the field has
converged on one architecture, so the inventory is no longer a ranking. Every
model at scale is a sparse mixture of experts with a reasoning mode and some
form of trained sparse attention, and what is left to distinguish twenty
families is the bet each lab made on top of that skeleton. So the axis is
providers grouped by what you can actually do with them (closed frontier, open
weights, fully open), then what separates them, then what they all agree on.

That axis is inherited from the hand-written version of this episode, which
got it right. This file replaces that script and its bespoke scene with a
declarative one, and everything downstream of the axis was rewritten against
the current page: GPT-6 Astra is the OpenAI flagship, Gemini is at 3.8, Meta
is back in the frontier band with Muse Spark 1.3, DeepSeek has shipped a
frontier-scale encoder-decoder, and the open-weight lead has split three ways.

The outline that survived the revision step:

    ident       what this is, what the map covers, and the date
    map         every provider, grouped by what you can do with it, parked
    question    the shared skeleton, and therefore the real question
    control     who decides how long the model thinks: OpenAI against Anthropic
    google_meta the hardware hedge, and the cautionary story
    deepseek    the efficiency lab, and the encoder-decoder reversal
    china_open  breadth, systems research, price, and the linear-attention
                reversal
    open_leader there is no single open-weight leader: three scopes, three
                winners
    convergence what all of them are doing the same way, and why
    numbers     sparsity, and the two different claims that wear the word
                "sparsest"
    close       the take: the map predicts labs, not leaderboards

What the step-4 critique changed:

  - Draft one still said Kimi K3 was "currently the strongest open model
    there is", which the page no longer says and which is now false as
    stated. It became its own beat, because the interesting fact is that the
    question has three answers depending on the benchmark, and a video that
    says "strongest open model" without naming the scope puts a false claim
    on screen. This is the single largest change from the previous script.
  - Draft one called Step 5 Preview "the sparsest at the frontier band",
    silently converting the smallest absolute active count into the highest
    sparsity ratio. The page separates them, so the numbers beat now shows
    the ratio as bars and says out loud that the absolute active count ranks
    differently, with B flagging that the chart hides the number you pay for.
  - Draft one had a separate price beat. One stat panel was not worth
    twenty seconds at this length, so the price spread became a clause inside
    the numbers beat and the vendor-table caveat moved with it.
  - Draft one gave each lab its own beat, per the format's "one provider per
    beat" rule, and ran to nine and a half minutes. Labs are paired where the
    pairing is a genuine contrast (OpenAI against Anthropic on reasoning
    control, Moonshot against MiniMax on linear attention) rather than
    alphabetically. That is a deliberate departure from the rule, taken for
    length, and it is recorded here rather than hidden.
  - B was narrating in draft one. B now has five turns and each one is a
    question the viewer is forming: how many families is that, does the same
    prompt cost the same twice, which open model is actually strongest, why
    did everyone move at once, and what the bar chart is not showing.

Every provider, model and figure comes from the canonical page "Topic: llms",
read from Notion on 22 September 2026. If this video names something the page
does not, the page is the thing to fix.

Numbers are spelled the way they are said, because text to speech reads
"GPT-6" and "GLM-5.3" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: llms"
SUBTITLE = "who builds what, what each lab is betting, and what they all now agree on"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The map is the home frame: built once, parked, and lit up piece by piece
    # for the rest of the episode. Grouped by what you can do with a model,
    # which is the axis this topic wants, rather than by country or by score.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "closed frontier", "tone": "subject", "items": [
            "OpenAI: GPT-6 Astra",
            "Anthropic: Opus 5, Fable 5.1",
            "Google: Gemini 3.8",
            "SpaceXAI: Grok 4.6",
            "Meta: Muse Spark 1.3",
        ]},
        {"head": "open weights", "tone": "verified", "items": [
            "DeepSeek: V4 Pro, V4.1-Flash",
            "Qwen: 3.8 Max, 2.4T",
            "Moonshot: Kimi K3",
            "Zhipu: GLM-5.3",
            "MiniMax M3, Mistral Large 3",
            "Tencent Hy4, StepFun Step 5",
        ]},
        {"head": "fully open, and small", "tone": "machinery", "items": [
            "Ai2: OLMo 3.1",
            "IFM: K2 Horizon",
            "Gemma 4, gpt-oss",
            "Phi-4, Command A",
        ]},
    ]},

    "question": {"kind": "stack", "layers": [
        ("sparse mixture of experts", "a few percent active per token"),
        ("a reasoning mode", "on a budget somebody sets"),
        ("trained sparse attention", "because 1M context is table stakes"),
    ]},

    "control": {"kind": "compare", "focus": "Anthropic: Opus 5, Fable 5.1",
                "sides": [
        {"head": "OpenAI: a hidden router", "tone": "subject", "items": [
            "a classifier decides per request",
            "Sol, Terra and Luna are cost bands",
            "so cost and latency vary per call"]},
        {"head": "Anthropic: an exposed budget", "tone": "verified", "items": [
            "the caller sets the token budget",
            "so the bill is predictable",
            "and it leads the harness benchmarks"]},
    ]},

    "google_meta": {"kind": "points", "focus": "Google: Gemini 3.8",
                    "head": "the hedge, and the cautionary story", "items": [
        "Google: TPUs, JAX and Pathways, not Nvidia",
        "Deep Think spends the budget in parallel branches",
        "Meta: Llama 4 collapsed, the frontier line went closed",
        "Muse Spark 1.3 is back in the band, not back in the open",
    ]},

    "deepseek": {"kind": "stat", "big": "552B",
                 "focus": "DeepSeek: V4 Pro, V4.1-Flash",
                 "caption": "the first frontier-scale open encoder-decoder",
                 "note": "V4.1-Flash: a 20-layer encoder and a 20-layer "
                         "decoder, 8B active in prefill and 16B in decode. "
                         "Shipped for the KV cache, not for quality"},

    "china_open": {"kind": "points", "focus": "Moonshot: Kimi K3",
                   "head": "four bets on the open frontier", "items": [
        "Qwen: breadth, sub-1B to 2.4T, Apache 2.0",
        "Moonshot: the Muon optimiser, Kimi Delta Attention",
        "Zhipu: MIT licence, price, agentic coding",
        "MiniMax: all-in on linear attention, then partly back",
    ]},

    "open_leader": {"kind": "table",
                    "head": ["open-weight leader", "on what"],
                    "rows": [
        ["Kimi K3", "the aggregate intelligence indices"],
        ["GLM-5.3", "Real-SWE, and cost per index point"],
        ["DeepSeek V4 Pro", "SWE-bench verified"],
    ]},

    "convergence": {"kind": "points", "tone": "verified",
                    "head": "what all of them now do the same way", "items": [
        "sparse MoE at scale; dense only below about 40B",
        "every flagship reasons, on a budget or a router",
        "trained sparse or linear attention, in every lab",
        "so the competition moved to active parameters",
    ]},

    "numbers": {"kind": "bars",
                "head": "sparsity ratio: total parameters over active",
                "bars": [
        {"label": "DeepSeek V4 Pro", "text": "1.6T / 49B, about 33x",
         "value": 33, "tone": "number"},
        {"label": "Step 5 Preview", "text": "600B / 27B, about 22x",
         "value": 22, "tone": "number"},
        {"label": "Tencent Hy4", "text": "770B / 49B, about 16x",
         "value": 16, "tone": "context"},
    ]},

    "close": {"kind": "claim",
              "text": "This map is not for picking a model.\n"
                      "It is for predicting what a lab does next.",
              "note": "and what would redraw it is somebody breaking the "
                      "convergence, which DeepSeek just tried"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is. Name the subject, say what it is, say why it earns the time.
SCRIPT["ident"] = [
    (A, "This is the map of large language models. Who builds what, what each "
        "lab is actually betting on, and what all of them now agree about."),
    (A, "It earns the time because the field has converged. Nearly every model "
        "at this scale is now the same shape, so the differences that are left "
        "are the ones that decide what you can afford to run. Current as of the "
        "twenty second of September, twenty twenty six, and a landscape is "
        "worthless without a date on it."),
]

# 1. the inventory, before any explanation. This is the contract for an
#    overview: the viewer sees the whole scope rather than being told about it.
SCRIPT["map"] = [
    (A, "Here is the whole board first, grouped by what you can actually do "
        "with each one, and nothing explained yet."),
    (A, "The closed frontier. OpenAI, with G P T six Astra above the G P T five "
        "point six tiers. Anthropic, with Claude Opus five and Fable five point "
        "one. Google DeepMind, with Gemini three point eight. SpaceXAI, with "
        "Grok four point six. And Meta, with Muse Spark one point three."),
    (A, "The open weight frontier, which is mostly Chinese. DeepSeek, with V "
        "four Pro and the new V four point one Flash. Alibaba's Qwen, at two "
        "point four trillion. Moonshot, with Kimi K three. Zhipu, with G L M "
        "five point three. Then MiniMax, Mistral, Tencent's Hunyuan and "
        "StepFun's Step five."),
    (A, "And the fully open group, which matters for a different reason. Ai two, "
        "with OLMo, and K two Horizon from the Institute of Foundation Models "
        "in Abu Dhabi. Plus the small open models, Gemma four and G P T O S S."),
    (B, "That is twenty odd families on one screen."),
]

# 2. the organising question, spoken over the thing that justifies it.
SCRIPT["question"] = [
    (A, "It is. So the useful question is not who is on the list. It is what "
        "actually separates them, because on architecture they have stopped "
        "separating."),
    (A, "Look at the three things nearly every one of them now is. A sparse "
        "mixture of experts, so only a few percent of the parameters run per "
        "token. A reasoning model, with a thinking budget somebody sets. And "
        "some form of trained sparse or linear attention."),
    (A, "That is the shared skeleton. What differs is the bet each lab made on "
        "top of it. So we will go lab by lab, and then come back to why the "
        "skeleton is the same."),
]

# 3. the cleanest contrast in the field, and it is not about size.
SCRIPT["control"] = [
    (A, "Start with the closed frontier and the cleanest contrast in it, which "
        "is about who decides how long the model thinks."),
    (A, "OpenAI hides it. A classifier in front of G P T five point six reads "
        "your request and decides whether to answer straight away or to spend "
        "compute on a reasoning trace. Sol, Terra and Luna are cost bands, not "
        "different architectures."),
    (B, "So the same prompt can cost different amounts on different days."),
    (A, "And be answered by different amounts of compute, which means an "
        "evaluation is partly measuring the router. Anthropic went the other "
        "way and exposed it: extended thinking is a token budget the caller "
        "sets, so your application decides how much it deliberates and the bill "
        "is predictable. That, plus training on long agentic coding, is why "
        "Claude leads harness benchmarks rather than knowledge tests."),
]

# 4. two labs, one beat, because the pairing is the argument.
SCRIPT["google_meta"] = [
    (A, "Google DeepMind is the only frontier lab training end to end off N "
        "Vidia. Gemini runs on T P Us, through JAX and Pathways, and that is a "
        "hedge on supply and on cost rather than a hardware footnote."),
    (A, "It was also the long context pioneer, and Deep Think spends its budget "
        "in parallel branches instead of one long serial trace."),
    (A, "Meta is the cautionary story. Llama two and three were the open weights "
        "standard. Llama four's reception collapsed, the lab was reorganised, "
        "and the frontier line went closed. Muse Spark one point three has put "
        "Meta back in the frontier band. It has not put Meta back in the open."),
]

# 5. the efficiency lab, and the thing it did this month.
SCRIPT["deepseek"] = [
    (A, "DeepSeek is the efficiency lab, and almost every contribution is one "
        "idea applied at a different layer: make a frontier model cheap to "
        "serve. Multi head latent attention shrinks the key value cache by "
        "about an order of magnitude. Auxiliary loss free balancing removes the "
        "loss that normally fights the real training objective."),
    (A, "This month it applied that logic to the shape of the stack itself. V "
        "four point one Flash is five hundred and fifty two billion parameters, "
        "split into a twenty layer encoder and a twenty layer decoder. The "
        "first frontier scale open encoder decoder, when everyone else ships a "
        "decoder."),
    (A, "Eight billion parameters active during prefill, sixteen during decode. "
        "And the stated reason is not quality. It is the key value cache."),
]

# 6. the rest of the open frontier, by strategy rather than by score.
SCRIPT["china_open"] = [
    (A, "The rest of the open frontier splits by strategy. Qwen competes on "
        "breadth: a complete ladder from under a billion parameters to two "
        "point four trillion, nearly all Apache two point zero, which is why "
        "Qwen checkpoints are the most fine tuned base models anywhere."),
    (A, "Moonshot does the most distinctive systems research. A different "
        "optimiser, called Muon. A linear attention design called Kimi Delta "
        "Attention, hybridised with full attention, because pure linear "
        "attention loses exact recall."),
    (A, "Zhipu is the value play: M I T licence, aggressive pricing, agentic "
        "coding rather than benchmark maxima. And MiniMax is the instructive "
        "one, because it went hard on linear attention and then partially "
        "reversed, for exactly the reason Moonshot hybridised."),
]

# 7. the correction that matters most: "strongest open model" needs a scope.
SCRIPT["open_leader"] = [
    (B, "Hold on. Which of those is actually the strongest open model?"),
    (A, "That question no longer has one answer, and it is worth slowing down "
        "on. Kimi K three is the highest placed open weight model on the "
        "aggregate intelligence indices. G L M five point three leads on Real "
        "S W E, which runs against private codebases, and on cost per index "
        "point. DeepSeek V four Pro leads S W E bench verified."),
    (A, "Three scopes, three winners, all three on the screen. So when somebody "
        "tells you which open model is strongest, the useful reply is two words. "
        "On what."),
]

# 8. the convergence: the most valuable thirty seconds in an overview.
SCRIPT["convergence"] = [
    (A, "Which brings us to the part worth more than the inventory. What all of "
        "them are doing the same way."),
    (A, "Everything at scale is sparse mixture of experts, and dense models now "
        "survive only below about forty billion parameters. Every flagship is a "
        "reasoning model with an adjustable or routed budget, so the standalone "
        "reasoning category has dissolved into the mainline. And every lab has "
        "shipped some form of trainable sparse or linear attention."),
    (B, "Why all of them, and all at once?"),
    (A, "Because a million token context became table stakes, and quadratic "
        "attention over a million tokens is not affordable at any parameter "
        "count. So the competition moved off total parameters, onto active "
        "parameters and onto how cheaply you can serve a long conversation."),
]

# 9. the numbers, late and with the scope named. Two claims wear one word.
SCRIPT["numbers"] = [
    (A, "So, the numbers, and a word to stop trusting. Sparsest."),
    (A, "The bars are the sparsity ratio: total parameters divided by active "
        "ones. DeepSeek V four Pro leads at about thirty three times. Step five "
        "Preview is about twenty two. Tencent's Hunyuan four is a conservative "
        "sixteen."),
    (B, "But that chart is not showing the number I would be paying for."),
    (A, "It is not, and that is the point. The ratio tells you how much memory "
        "you buy per unit of decode speed. The absolute active count tells you "
        "what a token costs to decode, and there the leader is different: Step "
        "five Preview activates twenty seven billion of six hundred billion, "
        "the smallest active count yet shipped in the frontier band. It also "
        "charges about eighteen percent of Kimi K three's output price, on its "
        "own table, which is a claim rather than a measurement."),
]

# 10. the take.
SCRIPT["close"] = [
    (A, "So what is this map for? Not for picking a model. That changes monthly, "
        "and any ranking on it is stale before you finish reading it."),
    (A, "It is for predicting what a lab does next, because each of them is "
        "running a consistent bet, and the bets move far more slowly than the "
        "scores do."),
    (A, "And the thing that would redraw the map is not a benchmark result. It "
        "is somebody breaking the convergence. DeepSeek just tried, by shipping "
        "a frontier scale encoder decoder while everybody else ships decoders. "
        "The number to watch is whether anyone follows."),
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
        print(f"  {key:14s} {len(beat)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
