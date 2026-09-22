"""
Topic overview: generative and multimodal, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this is the broadest
inventory in the knowledge base, and one question cuts straight through it.
Some of these modalities have converged on a single architecture and some have
not, and the convergences are not all on the same family. Images and video
converged on latent diffusion with a transformer denoiser; audio converged on
something else entirely, next-token prediction over codec tokens; text is the
case where a real alternative exists, works, and still did not win. That is the
axis, and it is what stops the episode being five model lists read aloud.

The recent turn the page records is on the input side: native multimodality
stopped being a differentiator and became the expectation, which is why the
liveliest argument about this month's best open-weight image model is about its
licence rather than its architecture.

The outline that survived the revision step:

    ident     what this is, and the sentence the video answers
    map       three columns, built and parked: the families, the modalities,
              the understanding side
    question  which of these converged on one architecture, and which did not
    image     the converged recipe, and where the VAE and the GAN actually live
    video     the same recipe with time, and a world model as its conditioned
              form
    audio     the other convergence: the codec turns audio into tokens
    text      the alternative that is real and lost anyway
    eyes      encoder, projector, backbone, and the turn to native fusion
    numbers   the figures, late: Qwen-Image-2.1 timed
    caveat    the vendor's own benchmark, the version numbers, the licence
    close     the take

What the step-4 critique caught, and what changed:

  - Draft one gave VAEs and GANs a beat of their own, which made them sound
    like a history lesson. They are load-bearing components of the recipe the
    image beat describes, so they moved inside it and B's question in the map
    beat now sets that payoff up one beat early.
  - Draft one had a separate beat for world models and a separate beat for
    time series. The page's own framing is that a world model is an
    action-conditioned video generator, so it belongs in the video beat and
    not after it. Time series is one model with no deep dive, so it is named
    once on the map and not explained.
  - The ChatGPT Images 2.5 release was in draft one beside Qwen-Image-2.1.
    Two products in the numbers beat made it a roundup, so the Sketch mode and
    the Flare and Sunburst variants were cut. The Qwen release is the one the
    page carries with figures.
  - Draft one buried the licence point in the close. It is the sharpest thing
    on the page after the convergence claim, so it became the objection beat,
    with the version-numbering trap beside it.
  - B was agreeing in draft one. B now interrupts three times: to notice that
    two dead families are still on the map, to ask whether diffusion language
    models are a challenger or not, and to name what the licence actually
    costs.

Every family, model name, figure and licence claim comes from the canonical
page "Topic: generative-and-multimodal", read from Notion on 22 September 2026.
Nothing was invented for shape.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats

Numbers and names are spelled the way they should be said, because text to
speech reads "FLUX.2", "Qwen-Image-2.1" and "60.28" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: generative-and-multimodal"
SUBTITLE = "which modalities converged on one architecture, and which did not"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame: families on the left, modalities in the middle, the
    # understanding side on the right. The episode walks the middle column and
    # keeps pointing back at the left one, which is what the map is for.
    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "the families", "tone": "subject", "items": [
            "autoregressive",
            "diffusion and flow",
            "VAE",
            "GAN",
            "distillation"]},
        {"head": "the modalities", "tone": "number", "items": [
            "image",
            "video",
            "audio and speech",
            "3D and worlds",
            "time series"]},
        {"head": "understanding", "tone": "machinery", "items": [
            "vision encoders",
            "VLMs",
            "omni, any-to-any",
            "document parsing"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Which of these converged on one architecture,\n"
                         "and which did not?",
                 "note": "we walk the middle column, and ask what the default "
                         "recipe is each time"},

    "image": {"kind": "flow", "focus": "image", "tone": "subject",
              "steps": ["VAE latent space", "DiT over patches",
                        "rectified flow"]},

    "video": {"kind": "points", "focus": "video", "head": "video: add time",
              "items": [
        "a causal 3D VAE over blocks of frames",
        "the DiT attends in space and time",
        "Veo 3.1, Kling 3, Seedance 2.0",
        "Wan: the open-weight line",
        "condition it on actions: a world model",
    ]},

    "audio": {"kind": "points", "focus": "audio and speech", "tone": "machinery",
              "head": "audio converged on the other family", "items": [
        "an RVQ codec: waveform to discrete tokens",
        "EnCodec, then Mimi",
        "once it is tokens, it is next-token prediction",
        "so the whole LLM stack transfers",
        "diffusion survives in music, and as refinement",
    ]},

    "text": {"kind": "compare", "focus": "autoregressive", "sides": [
        {"head": "autoregressive", "tone": "subject", "items": [
            "one token at a time, left to right",
            "exact conditioning on everything before",
            "the reasoning frontier, all of it"]},
        {"head": "diffusion LMs", "tone": "context", "items": [
            "start fully masked",
            "unmask many positions per pass",
            "Mercury, LLaDA, Gemini Diffusion",
            "a speed play, not a rival"]},
    ]},

    "eyes": {"kind": "stack", "focus": "vision encoders", "tone": "machinery",
             "layers": [
        ("vision encoder", "ViT, CLIP, SigLIP 2, DINOv3, SAM"),
        ("projector", "into the backbone's token space"),
        ("the LLM backbone", "or one natively fused model instead"),
    ]},

    "numbers": {"kind": "bars",
                "head": "Qwen-Image-2.1: one 2K edit, timed",
                "bars": [
        {"label": "2.1, ten references", "text": "1.59 seconds", "value": 1.59,
         "tone": "verified"},
        {"label": "3.0, three references", "text": "79.5 seconds", "value": 79.5,
         "tone": "cost"},
    ]},

    "caveat": {"kind": "points", "tone": "cost",
               "head": "read the version numbers twice", "items": [
        "the benchmark is Qwen's own",
        "3.0 is closed, and shipped first, in July",
        "2.1 is the open line, and came after",
        "2.1 is research-licence: non-commercial only",
        "three licences across one image line",
    ]},

    "close": {"kind": "claim",
              "text": "The output side has converged.\n"
                      "The argument moved to the licence.",
              "note": "and on the input side, native multimodality is now "
                      "the floor rather than the feature"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is ---------------------------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of generative and multimodal models. Everything that "
        "produces something other than text, plus everything that lets a "
        "language model take pictures and sound as input."),
    (A, "It earns an episode because it is the broadest inventory here, and "
        "because one question cuts straight through it. Some of these have "
        "converged on a single architecture. Some have not. Current as of the "
        "twenty second of September, twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. Three columns."),
    (A, "The generative families. Autoregressive, next token over discrete "
        "tokens. Diffusion and flow matching, which denoise iteratively. "
        "Variational autoencoders. Generative adversarial networks. And "
        "distillation, which turns a slow diffusion teacher into a few step "
        "sampler."),
    (A, "The modalities. Image. Video. Audio and speech. Three D and "
        "interactive worlds. And time series, which is not generative at all "
        "but sits here because it is a sequence model over a non text "
        "modality."),
    (A, "And the understanding side. Vision encoders. Vision language models. "
        "Omni models, speech and vision in, speech and images out. And "
        "document parsing."),
    (B, "Two of those families are listed as if they still ship."),
    (A, "They do not. That is the first thing the next beat fixes."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (A, "So the question the map is arranged to answer. Which of these "
        "converged on one architecture, and which did not?"),
    (A, "We walk the middle column, modality by modality, asking two things "
        "each time. What is the default recipe, and is there a real "
        "alternative."),
]

# --- the most converged thing on the board --------------------------------
SCRIPT["image"] = [
    (A, "Image first, because it is the most converged thing here. The default "
        "recipe is the three boxes on screen, and essentially everybody uses "
        "it."),
    (A, "Denoise inside the compressed latent space of a variational "
        "autoencoder rather than on pixels. Use a diffusion transformer over "
        "patches of that latent as the denoiser. Train it with a rectified flow "
        "objective."),
    (A, "Which answers what you just asked. The variational autoencoder stopped "
        "shipping as a generator and became the compressor under every one of "
        "these, with its quantised cousin the tokenizer under the "
        "autoregressive ones. The adversarial network survives as a loss term, "
        "and it is what stops decoders and vocoders coming out blurry."),
    (A, "F L U X two, Stable Diffusion three point five and Qwen Image are the "
        "open weight leaders, and all three are that recipe."),
]

# --- the same recipe with time --------------------------------------------
SCRIPT["video"] = [
    (A, "Video is the same recipe with time compressed as well as space. A "
        "causal three D autoencoder whose latents span a block of frames, so "
        "the transformer attends over patches in space and time together."),
    (A, "Vay o three point one leads on cinematic quality, Kling three and "
        "Seedance two top the general rankings, and Wan is the open weight line "
        "you can fine tune. All of them lean hard on step distillation, because "
        "one denoising step here costs a whole clip of compute."),
    (A, "And the last line is the one to keep. An interactive world model is "
        "exactly this, conditioned on actions: predict the next frame from the "
        "previous frames plus a control input. Genie three is the reference, "
        "and moving around inside one feels like a game engine that is not "
        "there."),
]

# --- the other convergence ------------------------------------------------
SCRIPT["audio"] = [
    (A, "Audio converged too, and on the other family entirely. The enabling "
        "piece is a single object: the neural audio codec."),
    (A, "It is an autoencoder with residual vector quantisation that turns a "
        "waveform into a few parallel streams of discrete tokens at a low frame "
        "rate. EnCodec first, then Mimi."),
    (A, "And once audio is tokens, generation is next token prediction, so the "
        "whole language model stack transfers unchanged. That is why speech "
        "synthesis and realtime voice are autoregressive. Diffusion survives "
        "here in music, and as a refinement pass over the coarse tokens."),
]

# --- the alternative that lost --------------------------------------------
SCRIPT["text"] = [
    (A, "Text is the interesting case, because the alternative is real and lost "
        "anyway. Autoregressive transformers dominate, and diffusion language "
        "models are the only serious challenger."),
    (A, "They start from a fully masked sequence and unmask many positions per "
        "forward pass, trading exact left to right conditioning for "
        "parallelism. Mercury, the open L L A D A line, and Gemini Diffusion."),
    (B, "So is that a challenger or not?"),
    (A, "A speed play for latency sensitive work. Not a challenger at the "
        "reasoning frontier, and the page says so plainly."),
]

# --- the input side, and the turn -----------------------------------------
SCRIPT["eyes"] = [
    (A, "Now the input side, where the year's real change happened. The "
        "anatomy is the stack on screen. A vision encoder, V I T, CLIP, SigLIP "
        "two, DINO v three or S A M. A projector that maps its output into the "
        "backbone's token space. Then the backbone."),
    (A, "That is the adapter design, and the bottom line is replacing it. Fuse "
        "the modalities early, inside one model trained that way from the "
        "start, which is what open frontier releases now default to."),
    (A, "Which is the turn worth naming out loud. Being natively multimodal "
        "stopped being a differentiator and became the expectation. Nobody "
        "announces it any more."),
]

# --- the numbers, late ----------------------------------------------------
SCRIPT["numbers"] = [
    (A, "Numbers last, and with who measured them. Qwen Image two point one, "
        "out this month, is the open weight state of that recipe. Seven billion "
        "parameters, a single stream diffusion transformer, and a sixty four "
        "channel autoencoder carrying an alpha channel, so transparency is "
        "native rather than matted on afterwards."),
    (A, "One model now covers text to image, editing against up to ten "
        "reference images, transparent layers and subject extraction, which "
        "used to be four models. It scores sixty point two eight on Qwen's own "
        "benchmark, first among open weights."),
    (A, "And speed is the headline, which is the two bars. One point five nine "
        "seconds for a two K edit with ten reference inputs, against seventy "
        "nine and a half seconds."),
]

# --- the objection --------------------------------------------------------
SCRIPT["caveat"] = [
    (A, "Three caveats, and they are all about that one release."),
    (A, "The benchmark is the vendor's own. The version numbers are not a "
        "sequence: three point zero is a separate closed line that shipped in "
        "July, and two point one is the open line that came after it in "
        "September. The digit marks the product family, not the date."),
    (B, "And the open weights are not open."),
    (A, "Public, but under a research licence, non commercial only. Alibaba's "
        "image line now runs three licences at once. Apache on the older "
        "releases, research only on two point one, closed on three point zero. "
        "The language models have not moved. If they ever do, calling Alibaba "
        "the widest open family stops being true."),
]

# --- the take -------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what converged? Images and video are one recipe, latent diffusion "
        "with a transformer denoiser and a flow objective. Audio is one recipe "
        "too, and a completely different one: tokens through a codec, then next "
        "token prediction."),
    (A, "Text is the exception, because its alternative exists, works, and is "
        "a speed play rather than a rival. And on the input side, native "
        "multimodality is now the floor rather than the feature."),
    (A, "Which is why the liveliest argument about the best open image model "
        "this month is not about its architecture at all. It is about its "
        "licence."),
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
