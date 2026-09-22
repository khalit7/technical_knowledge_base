"""
Topic overview: inference and serving, as of 22 September 2026.

The load-bearing idea, and the reason this page earns a video more than any
other topic in the knowledge base: a serving stack is fast for exactly one
reason at a time. Prefill is compute bound, decode is bandwidth bound, and
batch size one is bound by neither, it is bound by the cost of launching
kernels. Every technique on the page is an answer to one of those three, and
applying the wrong one returns nothing at all. The engines are the inventory;
which bottleneck each was designed to attack is the axis.

The outline that survived the revision step:

    ident       what the stack is, and that the price of a token is decided
                here rather than in training
    map         engines, orchestration, techniques: everything named, parked
    question    fast for exactly one reason at a time. Which one are you?
    regimes     the three places a request gets stuck, and the one piece of
                arithmetic underneath them
    prefill     compute bound: chunked prefill, prefix caching, the P/D split
    decode      bandwidth bound: paged attention, MLA, continuous batching
    bytes       the number: 890 bytes of KV cache per token
    weights     the other half of bytes per token, down to 1.485 bits each
    overhead    batch size one: a megakernel, against a wafer
    engines     vLLM and SGLang as the two sides of the same argument
    objection   an algorithmic saving is not a systems-realisable one
    close       which question are you answering, and Baseten's frontier test

What the step-4 critique caught, and what changed:

  - Draft one was the page's own order: engines, then servers, then a list of
    techniques. That is an inventory read aloud. The bottleneck axis was
    promoted from a paragraph in the middle to the spine, and the engines
    demoted to one beat late on, where they finally mean something.
  - Draft one had a beat per technique, eight of them, all the same length.
    Merged into prefill and decode, because the technique is not the story,
    the stage it attacks is.
  - Three numbers were doing no work and were cut rather than shrunk: the
    vLLM and SGLang contributor counts, DFlash2's 3.43x, and REFRAG's 30.75x.
    The megakernel and the ternary packing survived because each one is a
    different regime rather than a bigger version of the same one.
  - The AgentX "67x better performance per dollar" figure was in draft one.
    The page itself flags it as an extreme operating point that should not be
    quoted, so it is out. The whole AgentX beat went with it, for length.
  - B was agreeing. B now asks the question that turns each beat (how do you
    know which one you are, what does BITCOS buy, is there a cheap control)
    and A does something different because of it.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Every figure comes from the canonical page "Topic: inference-and-serving".
Numbers are spelled the way they should be said.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: inference-and-serving"
SUBTITLE = "a stack is fast for one reason at a time, and which one depends on where you are stuck"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "engines", "tone": "subject",
         "items": ["vLLM", "SGLang", "TensorRT-LLM", "llama.cpp", "MLX"]},
        {"head": "orchestration", "tone": "machinery",
         "items": ["NVIDIA Dynamo", "llm-d", "Triton Inference Server",
                   "Ray Serve", "KServe"]},
        {"head": "techniques", "tone": "verified",
         "items": ["paged KV cache", "continuous batching", "prefix caching",
                   "speculative decoding", "prefill/decode split"]},
    ]},

    "question": {"kind": "claim",
                 "text": "A serving stack is fast for\nexactly one reason at a time.",
                 "note": "and which reason depends on where the request is stuck"},

    "regimes": {"kind": "table",
                "head": ["stage", "what binds it", "what you attack"],
                "rows": [
                    ["prefill", "compute", "chunk it, or split it off"],
                    ["decode", "HBM bandwidth", "bytes touched per token"],
                    ["batch size 1", "launch overhead", "kernel count, or silicon"],
                ]},

    "prefill": {"kind": "points", "focus": "orchestration",
                "head": "prefill: compute bound", "items": [
        "chunked prefill: a 100K prompt stops stalling",
        "prefix caching: 60-90% of agent input is shared",
        "the largest time-to-first-token win there is",
        "P/D split: separate pools, KV over RDMA",
    ]},

    "decode": {"kind": "points", "focus": "techniques",
               "head": "decode: bandwidth bound", "items": [
        "paged attention: 60-80% waste, recovered",
        "MLA: 10-30x smaller than caching per head",
        "continuous batching: about 10x on mixed lengths",
        "speculation: lossless, and it fades with batch",
    ]},

    "bytes": {"kind": "stat", "big": "890 bytes", "tone": "number",
              "caption": "of KV cache per token",
              "note": "DeepSeek V4.1-Flash, from an independent breakdown"},

    "weights": {"kind": "points", "tone": "verified",
                "head": "the other half: the weights", "items": [
        "a ternary weight holds 1.585 bits",
        "standard packing rounds up to 1.625",
        "but zeros reach 51.5% of all weights",
        "BITCOS: 2 minus zero density, so 1.485 bits",
        "1.18x faster on CPU, 1.27x on GPU",
    ]},

    "overhead": {"kind": "bars", "span": 3.4,
                 "head": "batch size one: two answers", "bars": [
        {"label": "Cohere megakernel", "text": "292 tok/s",
         "value": 292, "tone": "machinery"},
        {"label": "Cerebras, Qwen3.8-27B", "text": "1,500-1,850 tok/s",
         "value": 1850, "tone": "number"},
    ]},

    "engines": {"kind": "compare", "focus": "engines", "sides": [
        {"head": "vLLM", "tone": "subject", "items": [
            "built for the decode side",
            "paged KV, continuous batching",
            "the broadest model coverage",
            "argue against it, do not assume it"]},
        {"head": "SGLang", "tone": "verified", "items": [
            "built for the prefill side",
            "RadixAttention: prefix reuse",
            "the fastest structured output",
            "agent loops, RAG, shared prefixes"]},
    ]},

    "objection": {"kind": "compare", "sides": [
        {"head": "algorithmic", "tone": "cost", "items": [
            "evict from a cache you already built",
            "so the prefill still happened",
            "masked entries, same sequence length",
            "mostly unsupported in vLLM"]},
        {"head": "systems-realisable", "tone": "verified", "items": [
            "shorten the input before the decoder",
            "LCLM: 5 to 9x faster first token",
            "peak memory flat, 128K to 512K",
            "and paged attention still applies"]},
    ]},

    "close": {"kind": "claim",
              "text": "Which question are you answering?",
              "note": "along the frontier, or pushing the frontier out: Baseten's test"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is
    "ident": [
        (A, "This is the map of inference and serving. The stack that turns a "
            "folder of model weights into tokens per second, on hardware you "
            "pay for by the hour."),
        (A, "Three layers. The engine, which owns the graphics card. The server "
            "layer above it, routing across engines and machines. And the "
            "techniques both of them implement."),
        (A, "Current as of the twenty second of September, twenty twenty six. "
            "It earns your time because a model's speed and its price are "
            "settled here, not in training."),
    ],

    # 2. the inventory, before any explanation
    "map": [
        (A, "The whole board first. Nothing explained yet."),
        (A, "Engines, which own a card and turn it into a token factory. "
            "V L L M, S G Lang, TensorRT L L M, llama dot C P P, and M L X on "
            "Apple silicon."),
        (A, "Orchestration above them, routing across engines and nodes. "
            "N Vidia's Dynamo, L L M dash D, Triton Inference Server, Ray "
            "Serve, K Serve."),
        (A, "And underneath both, the techniques. A paged key value cache. "
            "Continuous batching. Prefix caching. Speculative decoding. "
            "Splitting prefill apart from decode."),
    ],

    # 3. the organising question
    "question": [
        (A, "Now the sentence this whole topic rests on. A serving stack is "
            "fast for exactly one reason at a time."),
        (A, "Every technique on that map answers a different question. Apply "
            "the wrong one and you do not get a small gain. You get nothing, "
            "and you spend a week finding that out."),
        (B, "So how do you know which one you are?"),
        (A, "You find where the request is stuck. There are three places, and "
            "no more."),
    ],

    # 4. the three regimes, and the arithmetic underneath
    "regimes": [
        (A, "Prefill is the prompt. The model reads all of it at once, one "
            "large matrix multiply, so prefill is compute bound."),
        (A, "Decode is the generation. One token at a time, each one streaming "
            "the weights and the cache past the same units, so decode is "
            "bandwidth bound."),
        (A, "Underneath both is the arithmetic worth keeping. Decode speed is "
            "roughly memory bandwidth, divided by bytes touched per token."),
        (A, "The third row is the one the literature under serves. At batch "
            "size one neither binds, and what is left is the cost of launching "
            "kernels."),
    ],

    # 5. the compute-bound stage
    "prefill": [
        (A, "Long prompts, users waiting on the first token: that is prefill. "
            "Chunked prefill co schedules pieces of a long prompt with everyone "
            "else's decoding, so a hundred thousand token prompt stops stalling "
            "everyone."),
        (A, "Prefix caching is the larger win. On agent traffic, sixty to "
            "ninety percent of input tokens are shared with something you "
            "already served. Reusing those blocks is the biggest first token "
            "saving there is."),
        (A, "At datacentre scale the two stages get separate pools, cache "
            "shipped over R D M A. That is what the orchestration layer is "
            "for."),
    ],

    # 6. the bandwidth-bound stage
    "decode": [
        (A, "Decode is short of bytes, not arithmetic. Paged attention manages "
            "the key value cache the way an operating system manages memory: "
            "fixed size blocks, a block table per sequence. That turned sixty "
            "to eighty percent waste into usable memory."),
        (A, "Multi head latent attention compresses keys and values into one "
            "low rank latent per token per layer. Ten to thirty times smaller "
            "than caching per head, which is how DeepSeek serves long context "
            "cheaply."),
        (B, "And speculative decoding? Everyone quotes that one."),
        (A, "Lossless, which is the nice part. But the gain fades as the batch "
            "grows, because other sequences claim the idle arithmetic."),
    ],

    # 7. the number
    "bytes": [
        (A, "You can see how seriously the field takes that, because DeepSeek "
            "led a release with cache footprint rather than a capability "
            "score."),
        (A, "V four point one Flash lands at eight hundred and ninety bytes of "
            "key value cache per token. That is the number on the screen, and "
            "about a quarter of the footprint of the model before it."),
        (A, "Head pruning, selective layer caching, adaptive compression, the "
            "cache itself in F P four: mechanisms stacked, for one number."),
    ],

    # 8. the other half of bytes per token
    "weights": [
        (A, "Cache is one half of the bytes. Weights are the other half. A "
            "ternary weight takes three values, so information theory puts it "
            "at one point five eight five bits, and standard packing rounds up "
            "to one point six two five."),
        (B, "Why would you round up?"),
        (A, "It assumes the three symbols turn up equally often. Across twenty "
            "nine models they do not: zeros reach fifty one and a half percent. "
            "BITCOS exploits that, reaching one point four eight five bits and "
            "inference one point two seven times faster on graphics cards."),
    ],

    # 9. the overhead-bound regime
    "overhead": [
        (A, "Now the third regime. One person, one prompt, nothing to batch "
            "against, which is the case the throughput literature skips."),
        (A, "Cohere published a decode megakernel this month: the whole decode "
            "step fused into one kernel launch. Two hundred and ninety two "
            "tokens a second at batch size one, sixty two percent of speed of "
            "light, one point five eight times faster than V L L M."),
        (B, "The other bar is about six times longer."),
        (A, "It is, and it is not software. Cerebras serves Qwen three point "
            "eight, twenty seven billion, at roughly fifteen hundred to "
            "eighteen hundred and fifty tokens a second, weights held in on "
            "chip memory. Everything else attacks the denominator. That changes "
            "the numerator."),
    ],

    # 10. the engines, finally, on the axis
    "engines": [
        (A, "Which turns the engine choice into a real question. V L L M is the "
            "decode side: paged attention, continuous batching, the broadest "
            "model coverage there is. It is the default, so argue against it "
            "rather than assume it."),
        (A, "S G Lang is the prefill side. Radix attention is prefix caching "
            "arranged as a tree, plus the fastest structured output. If your "
            "traffic is agent loops or retrieval, that matches your bottleneck."),
        (A, "TensorRT L L M is neither: it goes after the kernels, on N Vidia "
            "parts. Llama dot C P P goes after the bytes, which is why that one "
            "runs on your laptop."),
    ],

    # 11. the objection
    "objection": [
        (A, "Now the objection, and it is the most useful paragraph on the "
            "page. A lot of published cache savings are not savings. Cache "
            "compression prefills normally and evicts by heuristic, so the "
            "expensive part already happened."),
        (A, "Several evict unevenly across heads and layers, so they cannot "
            "shrink the sequence at all, and mask entries instead. A method "
            "evaluated that way has shown you the quality of a compressed cache "
            "and nothing about wall clock."),
        (B, "Is there a cheap control for that?"),
        (A, "Salesforce found that keeping a uniformly random subset of cache "
            "entries matches or beats learned importance eviction. Run it "
            "before adopting anybody's policy."),
    ],

    # 12. the take
    "close": [
        (A, "So what is the map for? Not for picking an engine. It is for "
            "knowing which question you are answering, because the technique "
            "that doubles throughput at batch size sixty four does nothing at "
            "batch size one."),
        (A, "Baseten's framing is the test I would carry out of here. Latency, "
            "throughput and quality are one frontier, not three knobs. Ask "
            "whether a change moves you along it, or pushes the frontier out. "
            "Most write ups blur the two."),
    ],
}


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
