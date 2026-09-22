"""
Topic overview: how a language model is actually built, as of 22 September 2026.

The load-bearing idea is that "training" names five different things that buy
five different capabilities, and almost every expensive mistake in this area is
reaching for the wrong one. So the inventory here is not a field of
competitors: it is the column of stages a model goes through, from a pile of
text to something being sampled from in production, with the distributed
training, precision and infrastructure machinery running underneath all of it.
The organising question is what each stage is actually buying. This page earns
a video because it is the only place in the knowledge base that carries real
budgets attached to real stages, and a budget is what turns a taxonomy into a
decision.

Every figure comes from the canonical page "Topic: llm-training-and-post-training",
read from Notion on 22 September 2026. Nothing was invented for shape.

The outline that survived the revision step:

    ident        name the subject, say what it is, say why it earns the time
    map          the five stages, named, nothing explained. Parked as the home
                 frame, and every later beat focuses one layer of it
    question     what is each stage actually buying?
    pretraining  it buys what the model knows. Chinchilla split parameters
                 against tokens and said nothing about token quality; the
                 Dwarkesh decomposition is the bar chart that says so
    machinery    the composition problem under all of it
    midtraining  it buys a domain. The first real budget: Thomson Reuters
    posttraining it buys behaviour. SFT -> preference optimisation -> RLVR,
                 as a pipeline of three things each buying what the last could
                 not, plus reward hacking as the failure mode of all of it
    rl_case      the RL stage at frontier scale: Mercor with SkyRL
    cheap_end    the same stage three orders of magnitude down, and what the
                 two ends share
    compression  it buys affordability: PEFT, precision, distillation
    close        the take: which stage you need is a diagnosis

What the step-4 critique caught, and what changed:

  - Draft one explained GRPO and RLVR mechanically. That is the RL topic's
    job, and the two pages were deliberately split so that "RL for LLMs" owns
    those mechanics. Rewritten so alignment is a stage in a pipeline here,
    named and costed rather than derived, with one line saying out loud whose
    job the derivation is.
  - The four production case studies were four beats of equal weight, which is
    the "narrating a list" failure. Thomson Reuters and Mercor stayed, because
    they price the two different paths (mid-train for domain, post-train for
    behaviour). The Postgres planner and Periodic's Neon were merged into one
    comparison beat, because they are one story: the same recipe at opposite
    ends of a budget, and the thing they share is the point.
  - Cognition SWE-2 and the Meta FAIR preference models were cut whole rather
    than shrunk. Both are good, neither answers "what is this stage buying",
    and an overview that mentions everything on the page is the page read
    aloud.
  - A separate objection beat was cut and its work given to B, who now asks
    who reported the budget at the moment the budget appears on screen. The
    provenance caveat lands harder next to the number than in a list at the
    end.
  - The machinery beat originally ran to a sixth layer of the parked map. It
    is not a stage, it runs underneath all of them, and putting it in the
    column would have made the column's order stop being the argument.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers are spelled the way they should be said, because text to speech reads
"3.24x" and "$40M" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: llm-training-and-post-training"
SUBTITLE = "the stages a model goes through, and what each one buys"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. A stack rather than columns, because the order top to
    # bottom IS the argument: each stage can only buy what the one above it
    # already paid for.
    "map": {"kind": "stack", "park": True, "tone": "machinery", "layers": [
        ("pretraining", "the objective, the data, the scaling laws"),
        ("mid-training", "the anneal, long context, domain adaptation"),
        ("post-training", "SFT, preference optimisation, RLVR"),
        ("compression", "distillation, pruning, quantization"),
        ("serving", "sampling and decoding"),
    ]},

    "question": {"kind": "claim",
                 "text": "What is each stage actually buying?",
                 "note": "they are not interchangeable, and the wrong one is expensive"},

    "pretraining": {"kind": "bars", "focus": "pretraining",
                    "head": "where the compute-efficiency gain came from, 2019 to 2025",
                    "bars": [
        {"label": "better data", "text": "3.24x the gain", "value": 3.24,
         "tone": "number"},
        {"label": "better models", "text": "the baseline", "value": 1.0,
         "tone": "context"},
    ]},

    "machinery": {"kind": "points", "tone": "machinery",
                  "head": "the machinery under every stage", "items": [
        "FSDP2 and HSDP: sharded data parallelism",
        "TP inside a node, PP across nodes",
        "EP for the experts, CP for the sequence",
        "bf16 to fp8, now NVFP4 and MXFP4 for training",
        "SLURM, torchtitan, checkpointing",
    ]},

    "midtraining": {"kind": "stat", "focus": "mid-training",
                    "big": "$40M", "caption": "three months, mid-training on Qwen3.5",
                    "note": "200B curated tokens selected from a 19T pool, DPO against "
                            "an open-source constitution, a 35B open-weights sibling "
                            "released alongside. Reported, not audited."},

    "posttraining": {"kind": "flow", "focus": "post-training", "tone": "machinery",
                     "steps": ["SFT", "preference optimisation", "RLVR"]},

    "rl_case": {"kind": "stat", "big": "+70%", "tone": "verified",
                "caption": "relative, APEX-Agents Pass@1",
                "note": "Mercor with SkyRL, RL on Qwen3.5-397B-A17B over 1,928 expert "
                        "knowledge-work tasks. Their argument: token accounting, "
                        "asynchronous RL, environment robustness and harness design "
                        "decide it as much as the algorithm does."},

    "cheap_end": {"kind": "compare", "sides": [
        {"head": "hundreds of dollars", "tone": "verified", "items": [
            "SFT on 420 trajectories distilled from GPT-6 Astra",
            "LoRA adapters, about 21M parameters, consumer GPUs",
            "then agentic RL, an anchored GRPO variant",
            "a 4B model beat a hand-tuned production planner"]},
        {"head": "a laboratory budget", "tone": "number", "items": [
            "midtraining plus RL on real experimental data",
            "beats GPT-6 Astra and Claude Fable 5.1 on hard analysis",
            "lower cost per analysis, deployed in working labs"]},
    ]},

    "compression": {"kind": "points", "focus": "compression",
                    "head": "efficiency: three axes, one page each", "items": [
        "PEFT: freeze the base, train adapters. LoRA, QLoRA",
        "precision: bf16 to fp8, now 4-bit formats for training",
        "distillation: off-policy on the teacher, or on-policy on the student",
        "then serving, which is sampling and decoding",
    ]},

    "close": {"kind": "claim",
              "text": "Which stage you need is a diagnosis,\nnot a budget.",
              "note": "does not know it: pretraining. Knows it, wrong shape: SFT. "
                      "Right in general, wrong on your task, and checkable: RL."},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of how a language model actually gets built. "
        "Every stage between a pile of text and something that answers you."),
    (A, "It earns an episode because people say training when they mean five "
        "different things, and those five buy completely different capabilities. "
        "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "The whole column first. Nothing explained yet."),
    (A, "Pretraining. The next token objective, run over an enormous corpus. "
        "That is where nearly all the compute goes."),
    (A, "Then mid training. The high quality anneal, long context extension, and "
        "domain adaptation, which has a name of its own, continued pretraining."),
    (A, "Then post training. Supervised fine tuning, preference optimisation, "
        "and reinforcement learning against a verifier."),
    (A, "Then compression. Distillation, pruning, quantisation. "
        "And finally serving, which is sampling and decoding."),
    (A, "That column stays on screen, because everything else is a detour "
        "off one of those rows."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So here is the question the rest of this answers. "
        "What is each of those stages actually buying you?"),
    (A, "They are not interchangeable, and the commonest expensive mistake here "
        "is reaching for the wrong one. We will go down the column in order, "
        "and stop twice, where somebody published a real budget."),
    (B, "Which is the thing practitioners never publish."),
    (A, "Almost never. Which is why those two are worth the detour."),
]

# --- pretraining ----------------------------------------------------------
SCRIPT["pretraining"] = [
    (A, "Pretraining buys what the model knows. Nothing later in the column "
        "puts knowledge in that this stage did not."),
    (A, "For years the allocation rule was Chinchilla, which fixed the split "
        "between parameters and tokens. Everybody now trains far past it."),
    (A, "And a decomposition published this month says why. Look at the two bars. "
        "Across twenty nineteen to twenty twenty five, better data contributed "
        "three point two four times more compute efficiency gain than better models."),
    (A, "Chinchilla said nothing about the quality of those tokens. "
        "The two turn out to be largely independent, "
        "and small models gain the most from data quality."),
]

# --- the machinery, which is not a stage ----------------------------------
SCRIPT["machinery"] = [
    (A, "Underneath every row sits the machinery, and it is a composition "
        "problem rather than a choice. Sharded data parallelism with F S D P two. "
        "Tensor parallelism inside a node, pipeline parallelism across nodes, "
        "expert parallelism for the experts, and context parallelism for the "
        "sequence dimension, which is what makes a long context run fit at all."),
    (A, "Precision sits beside it. B F sixteen gave way to F P eight, "
        "and N V F P four and M X F P four now arrive for training "
        "rather than just for storage."),
]

# --- mid-training, and the first budget -----------------------------------
SCRIPT["midtraining"] = [
    (A, "Mid training buys a domain. The anneal on high quality data, "
        "the context extension, and adapting a general model to a specific corpus."),
    (A, "And here is the first real budget. Thomson Reuters mid trained on top of "
        "Qwen three point five, for a reported forty million dollars, "
        "in three months."),
    (A, "Two hundred billion curated tokens, selected out of a pool of nineteen "
        "trillion. D P O alignment against an open source constitution. "
        "And a thirty five billion parameter open weights sibling alongside it."),
    (B, "Reported by whom?"),
    (A, "Reported, not audited. The number came from the people who spent it. "
        "Hold the figure loosely and the shape firmly."),
]

# --- post-training --------------------------------------------------------
SCRIPT["posttraining"] = [
    (A, "Post training buys behaviour, and it has converged on the three step "
        "flow on the screen."),
    (A, "S F T, supervised fine tuning, buys the format. The model answers an "
        "instruction instead of continuing your text."),
    (A, "Preference optimisation buys taste. Which of two acceptable answers a "
        "person prefers. R L H F, or the D P O family, which skips both the "
        "reward model and the reinforcement learning loop."),
    (A, "And R L V R, reinforcement learning with verifiable rewards, buys "
        "correctness on anything a program can check, with G R P O as the "
        "workhorse. How those algorithms work is the reinforcement learning "
        "topic's job. Here they are a stage with a price."),
    (B, "And the failure mode?"),
    (A, "Reward hacking. The policy climbs the proxy while the thing you wanted "
        "stalls or degrades. K L penalties, reward ensembles and hidden test "
        "splits all exist because of it."),
]

# --- that stage at frontier scale -----------------------------------------
SCRIPT["rl_case"] = [
    (A, "So what does that last box cost? Two answers, at opposite ends."),
    (A, "At frontier scale, Mercor used Sky R L to run reinforcement learning on "
        "Qwen three point five, three hundred and ninety seven billion parameters, "
        "over one thousand nine hundred and twenty eight expert knowledge work "
        "tasks. Seventy percent relative improvement on A P E X Agents pass at one."),
    (B, "And that is the algorithm doing the work?"),
    (A, "That is the thing. The number on the screen is not the interesting part. "
        "Most of that write up is exact token accounting, asynchronous "
        "reinforcement learning, environment robustness and harness design, "
        "and it argues those decide the outcome as much as the algorithm does."),
]

# --- and the same stage, cheap --------------------------------------------
SCRIPT["cheap_end"] = [
    (A, "Now the same recipe, three orders of magnitude down the budget."),
    (A, "A Postgres query planner. Supervised fine tuning on four hundred and "
        "twenty trajectories distilled from G P T six Astra, using LoRA adapters "
        "of about twenty one million parameters. Then agentic reinforcement "
        "learning with an anchored G R P O variant. A four billion parameter "
        "model beat a hand tuned production planner, for hundreds of dollars."),
    (A, "On the right, the same shape at a laboratory budget. Periodic's Neon mid "
        "trained and ran reinforcement learning on real experimental data, "
        "and beats G P T six Astra and Claude Fable five point one on hard "
        "scientific analysis, at lower cost per analysis."),
    (B, "What do those two share?"),
    (A, "A verifier the domain already had. You can time a query plan, "
        "and an instrument tells you whether the analysis was right."),
]

# --- the bottom of the column ---------------------------------------------
SCRIPT["compression"] = [
    (A, "The bottom of the column buys affordability rather than capability, "
        "and it splits into three axes, one page each."),
    (A, "P E F T freezes the base and trains a small set of new parameters. "
        "LoRA, and Q LoRA, which runs a four bit base underneath B F sixteen adapters."),
    (A, "And distillation, off policy on the teacher's samples or on policy on "
        "the student's own, which is the main reason the one to eight billion "
        "parameter tier is genuinely capable now."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the column for?"),
    (A, "It is a diagnosis. If the model does not know something, that is "
        "pretraining or continued pretraining, and that is the expensive answer. "
        "If it knows it and will not say it in the shape you need, "
        "that is supervised fine tuning, and that is cheap."),
    (A, "And if it is right in general, wrong on your task, and a program can "
        "check the answer, that is reinforcement learning against a verifier. "
        "Both ends of that budget agreed on one precondition. "
        "A verifier the domain already has."),
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
        print(f"  {key:14s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
