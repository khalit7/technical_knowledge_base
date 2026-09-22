"""
Provider overview: Google DeepMind's Gemini and Gemma, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: Google is the only lab
on this shelf that is not really competing on the model. It owns the silicon,
the compiler, the orchestration layer and the surfaces the model ends up on,
and every decision on the page reads as a consequence of owning the ends
rather than the middle. Training end to end on TPUs buys freedom from Nvidia
and costs transferability. One distillation pipeline yields Pro, Flash and
Gemma, which is why the open models track the closed ones. And the strategic
asset is distribution: Search, Workspace, Android, Vertex, and now a rival's
own assistant. A list of Gemini version numbers cannot tell that story.

The outline that survived the revision step:

    ident        what this is, the date, and the bet in one sentence
    map          built and parked: Gemini closed, Gemma open, the stack
                 underneath, the surfaces on top
    question     what Google is actually competing on, and where we go
    tpu          decision one: TPUs, JAX and Pathways, and what it costs
    pipeline     decision two: one distillation pipeline, three products
    context      decision three: sparse and natively multimodal from 1.0
    spend        how this lab spends a test-time budget: Deep Think's width,
                 and Live Extended Thinking's answer to latency
    flash        the number that reframes the price list: +40% per task
    honest       where the bet is behind
    close        the take: the app is not the asset

What the step-4 critique changed:

  - Draft one had a beat for Gemini's lineage from PaLM. It was dates, not
    bet, and the one load-bearing fact in it (PaLM proved Google could train
    at frontier scale on its own silicon) moved into the TPU beat, where it
    is evidence rather than chronology.
  - T5Gemma had a beat. It is genuinely interesting and it is not this lab's
    bet, so it survives as one clause on the map and nothing more.
  - Deep Think and Live Extended Thinking were separate beats in draft one,
    which made the episode a product tour. They are one argument, so they
    share a compare panel: two ways of spending a test-time budget that only
    a lab with its own serving stack would try.
  - The 3.8 Flash beat was a list of six benchmark wins. Only the one that
    reframes the price list survived: cost per task rose about 40% while the
    per-token price did not move.
  - B was absent from draft one entirely. B now asks the question the map
    provokes, catches what "works harder" means for a Flash tier, and names
    the cost of a stack nobody else can run.

Every figure traces to the canonical page "Google DeepMind: Gemini and Gemma",
read from Notion on 22 September 2026. Nothing was invented for narrative
shape.

Numbers are spelled the way they are said, because text to speech reads
"$0.58" and "26b-a4b" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Google DeepMind: Gemini and Gemma"
SUBTITLE = "own the silicon, own the surfaces, and rent out the middle"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "Gemini, closed", "tone": "subject",
         "items": ["3.8 Flash", "3.8 Flash Cyber", "3.8 Live",
                   "3.1 Pro", "Deep Think"]},
        {"head": "Gemma, open", "tone": "verified",
         "items": ["Gemma 4 26b-a4b", "Gemma 4 31b", "E2B / E4B edge",
                   "T5Gemma 2"]},
        {"head": "the stack", "tone": "machinery",
         "items": ["TPUs", "JAX", "Pathways"]},
        {"head": "the surfaces", "tone": "number",
         "items": ["Search", "Workspace", "Android", "Vertex", "Siri"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Google is not trying to own the best model.\n"
                         "It is trying to own both ends of it.",
                 "note": "the silicon underneath, and the surfaces on top"},

    "tpu": {"kind": "stack", "focus": "the stack", "tone": "machinery",
            "layers": [
        ("TPU pods", "no Nvidia supply, pricing or allocation politics"),
        ("JAX", "sharding as annotations on arrays, traced into XLA"),
        ("Pathways", "one program driving many pods asynchronously"),
    ]},

    "pipeline": {"kind": "flow", "focus": "Gemma, open", "tone": "verified",
                 "steps": ["Pro trains at the frontier",
                           "Flash distilled from it",
                           "Gemma, the open end"]},

    "context": {"kind": "points", "focus": "Gemini, closed",
                "head": "designed in from 1.0, not added later", "items": [
        "sparse MoE: cost scales with active parameters",
        "one sequence for text, images, audio and video",
        "1M tokens GA, 10M demonstrated, retrieval across the whole window",
        "Gemma 3 shows the instinct openly: 5 of every 6 layers local",
    ]},

    "spend": {"kind": "compare", "sides": [
        {"head": "Deep Think", "tone": "number", "items": [
            "several reasoning threads at once",
            "width, not depth",
            "IMO gold: 35 of 42, 5 problems of 6"]},
        {"head": "3.8 Live Extended Thinking", "tone": "machinery", "items": [
            "reasons and speaks at the same time",
            "fills with speech while tool calls run",
            "first on the speech-to-speech index, 82.6"]},
    ]},

    "flash": {"kind": "stat", "big": "+40%", "tone": "cost",
              "caption": "cost per task, 3.7 Flash to 3.8 Flash",
              "note": "the per-token price did not move. 59 on the "
                      "Intelligence Index, level with GPT-5.6 Sol, at about "
                      "$0.58 per task"},

    "honest": {"kind": "points", "tone": "cost",
               "head": "where the bet is behind", "items": [
        "Real-SWE: 31.2%, third behind Fable 5.1 and GPT-6 Astra",
        "$0.75 / $3.75 is introductory, and doubles in the new year",
        "none of JAX, Pathways or TPU practice transfers outward",
        "no latency figure published for Live",
    ]},

    "close": {"kind": "claim", "focus": "the surfaces",
              "text": "The app is not the asset.\n"
                      "The stack that can fill anyone's app is.",
              "note": "Gemini 4 is in pretraining, with no announced date"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# 0. what this is, and the bet
SCRIPT["ident"] = [
    (A, "This is Google DeepMind's model families, Gemini and Gemma, as the "
        "knowledge base has them on the twenty second of September, twenty "
        "twenty six."),
    (A, "The bet, in one sentence. Google is the only frontier lab training "
        "end to end off N Vidia hardware, and the only one that already owns "
        "the places the model ends up. It competes on the ends, not the "
        "middle."),
]

# 1. the inventory, before any explanation
SCRIPT["map"] = [
    (A, "The board first, nothing explained yet. Closed Gemini on the left. "
        "Three point eight Flash is the volume model and the line's highest "
        "index score. Flash Cyber is that model tuned for vulnerability work. "
        "Live does voice. Three point one Pro leads on long documents, and "
        "Deep Think is the hardest problem mode."),
    (A, "Then Gemma, the open family. A small mixture of experts at twenty six "
        "billion, a dense thirty one billion, and edge variants."),
    (A, "Underneath, the stack Google owns outright. On top, the surfaces. "
        "Those two columns are the episode."),
]

# 2. the organising question, with the route inside it
SCRIPT["question"] = [
    (B, "Nobody else has those bottom and top columns at all."),
    (A, "Which is the question. Google is not trying to own the best model. It "
        "is trying to own both ends of it."),
    (A, "So: the silicon, then the pipeline it feeds, then what was designed "
        "in from the start, then how this lab spends a thinking budget."),
]

# 3. decision one
SCRIPT["tpu"] = [
    (A, "Everything trains on T P Us. Not some things. PaLM's five hundred "
        "and forty billion parameter run proved it at frontier scale."),
    (A, "Read the column down. T P U pods, so no exposure to graphics card "
        "supply, pricing or allocation politics. Jax, where sharding is an "
        "annotation on an array rather than a wrapper round your model. And "
        "Pathways, one program driving many pods at once."),
    (B, "None of which helps me, because I do not have a pod."),
    (A, "That is the cost. None of it carries outward the way PyTorch and "
        "N C C L do, which is why Google's published work is the hardest in "
        "the field to reproduce."),
]

# 4. decision two
SCRIPT["pipeline"] = [
    (A, "The second decision is what that stack feeds. One pipeline, three "
        "products on the end of it."),
    (A, "Pro trains at the frontier. Flash and Flash Lite are distilled from "
        "it, a smaller student trained to match the teacher's whole output "
        "distribution, which is how Google prices the middle of the market so "
        "hard. And Gemma is the open end of that same pipeline, which is why "
        "the open models behave like the closed ones."),
]

# 5. decision three
SCRIPT["context"] = [
    (A, "Third, the two things designed in from version one point zero rather "
        "than bolted on. Sparse mixture of experts, so cost tracks active "
        "parameters rather than total, which is what keeps a very long context "
        "affordable."),
    (A, "And native multimodality. Text, images, audio and video tokenised "
        "into one sequence and trained jointly, which is why an hour of video "
        "is just more tokens in the same window."),
    (A, "One point five Pro made a million tokens generally available, with "
        "retrieval that held up across the whole window. Three point one Pro "
        "is still the one people reach for on long documents."),
]

# 6. how this lab spends a budget
SCRIPT["spend"] = [
    (A, "Now two ways of spending a test time budget, side by side."),
    (A, "Deep Think explores several reasoning threads at once, then picks or "
        "combines. Width rather than depth. It reached the official olympiad "
        "gold standard, thirty five points of forty two, under the "
        "competition's own conditions."),
    (A, "Live Extended Thinking does something stranger. It reasons and speaks "
        "at the same time, filling with speech while tool calls run in the "
        "background. Every other way of spending a budget makes you wait. This "
        "one covers the wait."),
]

# 7. the number
SCRIPT["flash"] = [
    (A, "Which brings us to the number on the screen, and it is about pricing "
        "rather than intelligence. Three point eight Flash scores fifty nine "
        "on the Artificial Analysis index, level with Sol."),
    (A, "Google's own framing is that the model works harder. More reasoning "
        "steps, more tool calls, for the same question. So cost per task rose "
        "about forty percent over three point seven Flash, even though the "
        "per token price did not move."),
    (B, "A Flash tier that quietly spends more. That blurs the tier "
        "distinction the price list implies."),
    (A, "It does. It is still about fifty eight cents per index task, the "
        "cheapest anywhere at that level."),
]

# 8. where the bet is behind
SCRIPT["honest"] = [
    (A, "The honest column. On Real S W E, against private enterprise "
        "codebases, Gemini resolves thirty one point two percent, third behind "
        "Claude Fable five point one and G P T six Astra."),
    (A, "The seventy five cent pricing is introductory and doubles in the new "
        "year. Flash Cyber is not sold openly at all. And no millisecond "
        "latency figure has been published for a product whose entire pitch is "
        "real time."),
]

# 9. the take
SCRIPT["close"] = [
    (A, "So, the take, and it is the top column. Search, Workspace, Android "
        "and Vertex ship Gemini by default, and the Gemini app passed seven "
        "hundred and fifty million users this year."),
    (A, "Then look at Siri. Apple's rebuilt assistant went to public beta this "
        "month on custom Google models. Google supplies the assistant on the "
        "phones it competes with, which tells you the app was never the asset. "
        "The stack that can fill anybody's app is."),
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
        print(f"  {key:12s} {len(spoken)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
