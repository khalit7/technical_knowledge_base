"""
Topic overview: the large language model landscape, as of 21 September 2026.

The overview shape from the skill: name everything first, then ask what
separates them, then one lab's philosophy per beat, then compare on one axis,
then the convergence, then the numbers, then the take.

Every provider, model and figure comes from the canonical page "Topic: llms".
If this video names something the page does not, the page is the thing to fix.

Written short-sentenced on purpose: pace comes from the writing.
"""

A = "A"
B = "B"

FORMAT = "overview"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of large language models. Who builds what, "
        "and what each of them is actually betting on."),
    (A, "Current as of the twenty first of September, twenty twenty six. "
        "A landscape moves, so the date matters."),
]

# --- the inventory, before any explanation ------------------------------
SCRIPT["map_closed"] = [
    (A, "Start with the whole board. Nothing explained yet. Just who is here."),
    (A, "The American closed frontier. OpenAI, with G P T five point six, "
        "in Sol, Terra and Luna tiers, and G P T six Astra above them."),
    (A, "Anthropic, with Claude. Haiku, Sonnet, Opus five, and Fable in the newer "
        "Mythos class."),
    (A, "Google DeepMind, with Gemini three point eight. "
        "SpaceXAI, with Grok four point six, at one and a half trillion parameters. "
        "And Meta, whose frontier line, Muse Spark, is now closed."),
]

SCRIPT["map_open"] = [
    (A, "Now the open weight frontier, and it is mostly Chinese."),
    (A, "DeepSeek, with V four Pro and V four point one Flash. "
        "Alibaba's Qwen, with Qwen three point eight, at two point four trillion. "
        "Moonshot, with Kimi K three, currently the strongest open model there is."),
    (A, "Z A I, formerly Zhipu, with G L M five point three. "
        "MiniMax, with M three. Mistral, with Large three. "
        "Tencent, with Hunyuan. And StepFun, with Step five."),
]

SCRIPT["map_research"] = [
    (A, "And a third group that matters for different reasons. "
        "Fully open research labs."),
    (A, "Ai two, with OLMo, which publishes everything. The corpus, the data "
        "mixture, the training code, the intermediate checkpoints, the logs."),
    (A, "The Institute of Foundation Models in Abu Dhabi, doing the same. "
        "Plus the small open models, Gemma four and G P T O S S."),
    (B, "That is about twenty model families on one screen."),
    (A, "It is. So the useful question is not who is on the list."),
]

# --- the organising question ---------------------------------------------
SCRIPT["question"] = [
    (A, "The question is what actually separates them."),
    (A, "Because they are converging on architecture. "
        "Almost everything at this scale is now a sparse mixture of experts "
        "with a reasoning mode."),
    (A, "What differs is the bet each lab is making. So let us go through them."),
]

# --- the philosophies -----------------------------------------------------
SCRIPT["openai_anthropic"] = [
    (A, "OpenAI and Anthropic made opposite choices about the same problem, "
        "and it is the cleanest contrast in the field."),
    (A, "The problem is: who decides how long the model thinks?"),
    (A, "OpenAI hides it. A router reads your request and decides whether to "
        "answer immediately or spend compute on a reasoning trace. "
        "The Sol, Terra and Luna tiers are cost bands, not different models."),
    (B, "Which means two identical prompts can cost different amounts."),
    (A, "And be served by different amounts of compute. That makes evaluation harder."),
    (A, "Anthropic exposes it instead. Extended thinking is a token budget "
        "the caller sets. Your application decides how much it deliberates, "
        "and the cost is predictable."),
    (A, "That, plus a training emphasis on long agentic coding, "
        "is why Claude tends to lead harness benchmarks rather than knowledge tests."),
]

SCRIPT["google_meta"] = [
    (A, "Google DeepMind is the only frontier lab training end to end off N Vidia. "
        "Gemini runs on T P Us, through JAX and Pathways."),
    (A, "That is a hedge on supply and on cost, not a hardware detail. "
        "Gemini was also the long context pioneer, and Gemma is the open distillate."),
    (A, "Meta is the cautionary story of the era. "
        "Llama two and three were the open weights standard."),
    (A, "Then Llama four's reception collapsed, the lab was reorganised, "
        "and the frontier line went closed. "
        "Muse Spark one point three is back in the frontier band. "
        "It is not back in the open."),
    (B, "So the open crown moved to China."),
]

SCRIPT["deepseek_qwen"] = [
    (A, "DeepSeek is the efficiency lab. Almost every contribution is one idea "
        "applied at a different layer. Make a frontier model cheap to serve."),
    (A, "Multi head latent attention compresses the key value cache by about "
        "an order of magnitude. Auxiliary loss free load balancing removes "
        "the loss that normally fights the real objective."),
    (A, "Qwen competes on breadth instead. A complete ladder, "
        "from under a billion parameters to two point four trillion, "
        "nearly all Apache two point zero."),
    (A, "Which is why Qwen checkpoints are the most fine tuned base models "
        "in the ecosystem. If somebody is training a specialist, "
        "they usually start there."),
]

SCRIPT["moonshot_others"] = [
    (A, "Moonshot does the most distinctive systems research in the open frontier. "
        "A different optimiser, called Muon. A linear attention design, "
        "called Kimi Delta Attention, hybridised with full attention "
        "because pure linear attention loses exact recall."),
    (A, "Z A I is the value play. M I T licence, aggressive pricing, "
        "and a focus on agentic coding rather than benchmark maxima."),
    (A, "MiniMax is the attention efficiency lab, and its trajectory is the "
        "instructive part. It went hard on linear attention, then partially "
        "reversed, because reasoning workloads need exact recall."),
    (A, "Mistral is the European counterweight, with an Apache two flagship. "
        "And Ai two is the only lab releasing genuinely everything, "
        "which costs it the capability frontier and buys the research "
        "everyone else's contamination audits depend on."),
]

# --- the convergence ------------------------------------------------------
SCRIPT["convergence"] = [
    (A, "Now the part worth more than the inventory. What they all agree on."),
    (A, "Everything at scale is sparse mixture of experts. Dense models survive "
        "only at small sizes."),
    (A, "Every flagship is a reasoning model now, with an adjustable thinking budget. "
        "The standalone reasoning category has dissolved into the mainline."),
    (A, "And every lab has shipped some form of trainable sparse or linear attention. "
        "DeepSeek, MiniMax, Moonshot, Qwen, all of them."),
    (B, "Why all of them, all at once?"),
    (A, "Because a million token context is table stakes, and quadratic attention "
        "over a million tokens is not affordable at any parameter count. "
        "So the competition moved from total parameters to active parameters, "
        "and to how cheaply you can serve a long conversation."),
]

# --- the numbers ----------------------------------------------------------
SCRIPT["numbers"] = [
    (A, "Which brings us to the numbers, and to how sparse these things now are."),
    (A, "Step five preview is the sparsest at the frontier band. "
        "Six hundred billion parameters in total. Twenty seven billion active."),
    (A, "Kimi K three is two point eight trillion total, "
        "a hundred and four billion active. "
        "DeepSeek V four Pro, one point six trillion, forty nine billion active."),
    (A, "And the price spread is wider than the capability spread. "
        "Step five charges two dollars seventy per million output tokens. "
        "That is about eighteen percent of what Kimi K three charges."),
    (B, "All of those are vendor reported, presumably."),
    (A, "Most of them are, yes. Treat a lab's own table as a claim, "
        "not as a measurement."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So, what is this map for?"),
    (A, "Not for picking a model. That changes monthly. "
        "It is for knowing what a lab is likely to do next, "
        "because each of them is running a consistent bet."),
    (A, "And the thing that would redraw it is not a benchmark score. "
        "It is somebody breaking the convergence. "
        "DeepSeek already tried, by shipping a frontier scale encoder decoder "
        "when everybody else ships decoders."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
