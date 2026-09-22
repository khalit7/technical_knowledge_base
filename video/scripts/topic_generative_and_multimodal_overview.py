"""
Topic overview: generative and multimodal, as of 22 September 2026.

Source: the canonical Notion page "Topic: generative-and-multimodal", read from
Notion directly on 22 September 2026 rather than from the repo mirror. Every
family, model name, figure and licence claim below is on that page. Nothing is
imported from the six deep dives underneath it, and nothing is invented for
shape.

Which kind of overview this is. A comparison, and an unusual one: the things
compared are not competitors, they are modalities, and what is compared is the
architecture each one settled on. So the organising question is the convergence
question the format normally saves for late: which of these landed on a single
default recipe, and which did not. It is asked at the top because it is the
only thing that stops this page being five model lists read aloud.

The axis, which is most of the work of a new overview. The page's own second
heading is "How families map to modalities", and that mapping is the axis: the
left column of the map is the families, the middle is the modalities, the right
is the understanding side. The episode walks the middle column and keeps
pointing back at the left one. The alternative axis, a tour of image models
against video models against speech models, would have been a product roundup,
and the page is not a product roundup.

The cut cleared in 74326b3 found the same axis independently, and it is kept,
because it is the page's own. Three things from that cut are not kept:

  - It ran eleven beats, which at this vocabulary's reveal pacing is about
    eight and a half minutes, one rung below the length where the render fails
    outright. Nine beats here, and four of its beats were merged or cut.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the end of its budget and several of its lines named things minutes
    before they existed. The `image` beat named all three boxes of a `flow` in
    its first sentence, which `spread` draws two thirds of the way in.
  - Its `focus` values were item names inside the middle column ("image",
    "video", "audio and speech"). Against a parked map every item resolves to
    its column heading, so three consecutive beats would have lit the same
    heading and produced the identical frame three times. Focus is decided at
    column level here.

The outline that survived the revision step:

    ident      what this is, how current, and the question that cuts through it
    map        three columns, everything named, parked as the home frame
    question   converged or not, and onto which family?
    pixels     image and video: one recipe, and where the VAE and GAN went
    audio      the other convergence, and it is not diffusion
    text       the alternative that is real and lost anyway
    eyes       the input side: encoder, projector, backbone, or fuse early
    qwen       the numbers, late, and what to read twice
    close      the take: what the map is for when the next model lands

What the critique step changed:

  - Draft one gave VAEs and GANs a beat of their own, which made two live
    components sound like a history lesson. They are load-bearing parts of the
    recipe the image beat describes, so they are inside it now, and the map
    beat sets the payoff up one beat early by saying that two of the five no
    longer ship as generators.
  - Draft one had a separate beat for world models and a separate beat for
    time series. The page's own framing is that an interactive world model is
    an action-conditioned video generator, so it is the last line of the video
    half rather than a beat after it. Time series is one model with no deep
    dive of its own, and the page says so; it is named once on the map and not
    explained.
  - `text` was a `compare` in draft one, which is the right picture and the
    wrong arithmetic: a `compare` has exactly two reveals, so the second side
    lands at `beat_length - reserve` and the whole beat has to talk about the
    first side before naming the second. It is a `table` now, four reveals
    walked row by row, which is also the order `spread` draws it in.
  - Draft one buried the licence point in the close in eight words. It is the
    sharpest recent thing on the page, so it has the numbers beat, with the
    version-numbering trap beside it, and the close ends on it.
  - B was agreeing in draft one. B now has one turn, and it is the wrong
    assumption the whole episode is arranged to correct: that everything has
    converged on the same thing by now. A answers "half right", which is the
    episode.

Reveal arithmetic, which is what actually set the length. `spread` puts reveal
k of n at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals
wants n narration segments: the first n-1 about one reveal each, and the last
one short enough to fit inside the reserve. That couples word count to panel
choice rather than to taste, and it is why this episode has nine beats and not
eleven. Every beat below records the segment sizes it was written to.

Reserves are the motionless tail at the end of a beat, and `map` carries the
extra two seconds `beat()` spends letting the finished board stand before it
collapses into its headings.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns lit. `question` inherits that, which is
right: the convergence question is a claim about the whole board. `pixels`
lights the families and the modalities, because the walk is those two columns
against each other, and `audio` and `text` inherit that state deliberately and
pass no focus, since they are the same two columns and a redundant focus
redraws an identical frame at a cost of about a second of panel delay. `eyes`
lights "understanding". `qwen` lights "the modalities". `close` lights all
three, which is how this vocabulary says no emphasis, and is also true.

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour, so the narration would
say to look at something that does not move.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the close points at the page, and the page carries six deep dives
and a Best starting resources block.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - ChatGPT Images 2.5: the Sketch mode, the fifty percent latency cut, and
    the Flare and Sunburst API variants. Two product releases in one numbers
    beat turns it into a roundup, and the Qwen release is the one the page
    carries with figures and with a story attached.
  - The speed comparison, 1.59 seconds against 79.5. It is a real figure and
    the honest picture for it is `bars`, which has two reveals and therefore
    wants a beat of about twenty five seconds. There was no twenty five second
    slot left, and a figure squeezed into a `points` row alongside four
    caveats reads as a fifth caveat. The independent five seconds per
    megapixel on a 4090 went with it.
  - Nano Banana 2.0 at 59.82, which is what 60.28 is ahead of. The comparison
    needs both numbers and a sentence about who Google is, and the beat had
    room for one figure.
  - The document-parsing VLMs, Cohere Parse 5 and Reducto r-1. They are the
    fourth item in the understanding column and the case where the encoder is
    the product, which is genuinely interesting and is a `eyes`-sized subject
    of its own. Named on the map, not explained.
  - TimesFM-3, its 330M parameters and its 1T training time points. The page
    names time series to mark the axis, and says outright that one model does
    not justify a topic page. It gets one clause on the map for the same
    reason.
  - The related papers, DDPM, latent diffusion, ViT and CLIP. Four papers is
    a beat, and it would be a bibliography rather than an argument. The page
    keeps them, and the close points at the page.

  The obvious second episode from this page is the understanding side on its
  own: vision encoders as a field (ViT, CLIP, SigLIP 2, DINOv3, SAM), what
  current VLMs actually use as eyes, and document parsing as the case where
  the encoder is the product. It is two of the page's six deep dives and it
  gets one beat here.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts: the
page writes the image recipe as "a DiT denoiser over latent patches" and
never says what the three letters unfold to. A reader can follow the link to
the deep dive; a listener cannot, so the narration says "a diffusion
transformer, that is what a D I T is", and having written the plain version it
belongs on the page too. The page now reads "a DiT (diffusion transformer)
denoiser", which is the house shape already used two bullets down for "an RVQ
(residual vector quantisation) autoencoder". Nothing else was added: rectified
flow is left unexplained on both the page and in the narration, because
explaining it properly is a claim rather than a gloss and it belongs to the
Diffusion and Flow Models deep dive.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, one turn, carrying the assumption the episode corrects

Numbers and names are spelled the way they should be said, because text to
speech reads "FLUX.2", "Qwen-Image-2.1", "60.28", "RVQ" and "SigLIP 2" badly.
Three shapes were rewritten before the first render on the rules this method
already carries: "Veo" is written "Vay o", because a three letter name that is
also a spelling of nothing comes back mangled; "EnCodec" is written "En Codec",
because a welded compound is the shape that produced "LittleMul"; and "SAM" is
written "S A M", because an all-caps name that is also an ordinary word loses
a syllable. All three came back correct.

Six defects got through the character gate anyway and were caught by reading
the transcripts as text. The classes are worth setting out, because only one
of them is a class the gate is built for:

  - A hallucinated phrase in a twelve word closing turn. "Condition that on
    actions and you have a world model" came back as "Condition that on its
    own. Actions, and you have a world model", at a character error of 0.026.
    The burst detector cannot see it: "on its own" is three ordinary words.
    The turn is a sentence with a subject and a verb now.
  - A fragile name opening a sentence. "Autoregressive transformers do one
    token at a time" arrived as "All crotaggressive transformers". The rule
    about not opening on the fragile name is already on the page; "On one
    side, autoregressive transformers" reads correctly.
  - The same word mid-list, in `map`, came back as "auto-aggressive" on two
    consecutive seeds while reading correctly in two other beats. It is
    spelled "auto regressive" here, and the orphan check still matches the
    panel's "autoregressive" on its squashed spelling.
  - "Omni models, any to any" came back as "omni models ne2 any". Cut to
    "Omni models"; the panel still reads "omni: any-to-any", which the check
    accepts on the shared word "omni".
  - A single real word swapped for another, which is the class neither gate
    can see. "The trade is exact conditioning on everything before, against
    parallelism" came back as "...on everything before. That's parallelism",
    which says the opposite. Two clauses with a verb each fixed it, and read
    the table better anyway: "So one side buys exact conditioning. The other
    buys parallelism."
  - A dropped clause, which is the same shape as the deleted acronym
    expansion this method already warns about. "Whose latents span a block of
    frames" lost "of frames", which is the entire point of the sentence. It
    has its own sentence and a contrast now, "rather than one image".
Four rerolls, and the loop is not monotonic, exactly as the method says: the
`map` reroll that fixed "auto-aggressive" introduced two stray monosyllables
at sentence boundaries at a *better* character error, and the fourth take is
the clean one. Every take was copied aside before the next roll.

Pace. `pixels` came back at 170 words a minute by `check_timing`'s count, over
the gallop threshold, and the lever is punctuation rather than the delete key:
its commas became full stops, no word was cut, and it reads at 147. That cost
fifteen seconds, because a slower read of the same material is a longer beat,
and it is the whole reason this episode lands where it does.

Reserves were set from the rendered durations rather than from the word-count
estimate, using reveal k of n landing at `(k-1)/(n-1) x (beat_length -
reserve)`. Eight of the nine held. `map` did not: it is the slowest beat in the
episode at 118 words a minute, because it is a list of short names read
deliberately, so 109 words bought 55 seconds rather than the 43 the estimate
assumed, and at a reserve of 4.5 the narration named the understanding side
five and a half seconds before it was drawn. At 6.0, the cap `check_timing`
allows, the lead is about four seconds, which is where the rest of the episode
sits.

Length. 6 minutes 41 at 1080p and 4.31 MiB, on the third and last 1080p rung of the encode
ladder. The first render came in at 6:28 and the punctuation fix on `pixels`
added the rest. The trim lever, if a future cut needs one, is `qwen`: it is
the only beat that is not about convergence, and the close already carries its
conclusion.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: generative-and-multimodal"
SUBTITLE = "which modalities converged on one architecture, and which did not"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and the question --------------------------
SCRIPT["ident"] = [
    (A, "This is the map of generative and multimodal models. Everything that "
        "makes something other than text, and everything that lets a language "
        "model see and hear."),
    (A, "Current as of the twenty second of September, twenty twenty six. One "
        "question cuts through all of it. Some of these converged on a single "
        "architecture. Some did not. And the ones that did, did not converge "
        "on the same family."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, three reveals, and `spread` puts the third at
# beat_length - reserve. So the narration is two long segments and one short
# one: about forty words per column for the first two, and the third column
# named in the last few seconds. The second segment opens on the VAE and GAN
# setup rather than on the modalities, because it needs the length and because
# that sentence is the one `pixels` pays off two beats later.
SCRIPT["map"] = [
    (A, "Whole board first, nothing explained yet. Three columns. On the left, "
        "the generative families. Next token prediction over discrete tokens, "
        "which is auto regressive. Diffusion and flow matching, which denoise "
        "iteratively. The variational autoencoder, V A E. The adversarial "
        "network, G A N. And distillation."),
    (A, "Two of those five no longer ship as generators, and we come back to "
        "that. In the middle, the modalities. Image. Video. Audio and speech. "
        "Three D and interactive worlds. And time series, not generative, but "
        "a sequence model over a non text signal."),
    (A, "And on the right, the understanding side. Vision encoders. Vision "
        "language models, V L Ms. Omni models. And document parsing."),
]

# --- the organising question ----------------------------------------------
# A `claim` has two reveals, so twenty five seconds is its whole honest budget
# and this is the hinge rather than a section. The turns are ordered so the
# sentence the note carries is spoken last: the note does not appear until
# beat_length - reserve, and draft one said it eight seconds in.
SCRIPT["question"] = [
    (B, "Surely they have all converged on the same thing by now."),
    (A, "Half right. So here is the question the map is arranged to answer. "
        "Which of these landed on one default architecture, and which did "
        "not? We walk the middle column, asking two things each time."),
    (A, "What is the recipe. Is there a real alternative. And the answer is "
        "not one family."),
]

# --- the most converged thing on the board --------------------------------
# Seven reveals, so seven segments: six of about twenty five words and a short
# last one that fits inside the reserve. Item k is named in segment k+1, which
# is where `spread` draws it. The VAE and the GAN live in segments three and
# four rather than in a beat of their own, because they are components of this
# recipe and not a history lesson.
SCRIPT["pixels"] = [
    (A, "Image first. It is the most converged thing here. Video is the same "
        "recipe, with one more axis."),
    (A, "You do not denoise pixels. You denoise a compressed latent. That "
        "happens inside a variational autoencoder. Which is where the V A E "
        "lives now. Not as a generator."),
    (A, "It is the compressor under all of this. The adversarial network "
        "survives the same way, as a loss term. It stops these decoders "
        "looking blurry."),
    (A, "The denoiser over that latent is a diffusion transformer. That is "
        "what a D I T is. It works over patches. And it trains on a rectified "
        "flow objective."),
    (A, "The open weight leaders are F L U X two, Stable Diffusion three "
        "point five, and Qwen Image two point one. All three are that "
        "recipe."),
    (A, "Video compresses time as well as space. It uses a causal three D "
        "autoencoder. Its latents span a block of frames, rather than one "
        "image. The leaders are Vay o three point one, Kling three, Seedance "
        "two, Wan."),
    (A, "Condition the same generator on actions, and you have a world model. "
        "Genie three is the reference."),
]

# --- the other convergence ------------------------------------------------
# Four reveals, so three segments of about thirty words and a short fourth.
# No focus: `pixels` left the families and the modalities lit, which is the
# state this beat wants, and a redundant focus redraws an identical frame and
# costs about a second of panel delay.
SCRIPT["audio"] = [
    (A, "Audio converged too, onto the other family entirely. The enabling "
        "piece is one object. A neural audio codec, with residual vector "
        "quantisation. En Codec first, then Mimi."),
    (A, "It turns a waveform into a few parallel streams of discrete tokens, "
        "at a low frame rate. Audio stops being a signal and becomes a "
        "vocabulary."),
    (A, "And once it is tokens, generation is next token prediction, so the "
        "whole language model stack transfers unchanged. That is why speech "
        "synthesis and realtime voice are autoregressive."),
    (A, "Diffusion survives here in music, and as a refinement pass."),
]

# --- the alternative that lost --------------------------------------------
# A table, because the grid is genuinely the content: one structure drawn
# twice with the two approaches swapped. Header plus three rows is four
# reveals, walked row by row, which is the order `spread` draws it in. Said
# side by side, as a `compare` would force, the second column of row three is
# spoken twenty seconds before row three exists.
#
# No focus: the same two columns are lit as in the two beats before this one.
SCRIPT["text"] = [
    (A, "Text is the interesting case, because here the alternative is real "
        "and lost anyway. Read it across. How each one works, what that buys, "
        "what it comes to."),
    (A, "On one side, autoregressive transformers do one token at a time, left "
        "to right. A diffusion language model starts fully masked, and unmasks "
        "many positions at once on every forward pass."),
    (A, "So one side buys exact conditioning on everything before it. The "
        "other buys parallelism. Mercury, the open L L A D A line, and Gemini "
        "Diffusion are the ones shipping."),
    (A, "And the verdict is blunt. A speed play for latency, not a rival at "
        "the frontier."),
]

# --- the input side -------------------------------------------------------
# A stack, because the vertical order is the argument and the fourth layer is
# the thing that replaces the three above it. Four reveals, three segments of
# about twenty five words and a short fourth.
SCRIPT["eyes"] = [
    (A, "Now the input side, where the year's real change happened. The "
        "classic design is three pieces. First a vision encoder. V I T, CLIP, "
        "Sig Lip, DINO, S A M."),
    (A, "Then a projector. A small learned layer mapping the encoder's output "
        "into the token space the backbone already understands. That is the "
        "whole trick of an adapter."),
    (A, "Then the language model backbone, where the reasoning happens. It was "
        "trained on text, and it is handed something that now looks like "
        "text."),
    (A, "Or skip all three. Fuse the modalities early, inside one model "
        "trained that way."),
]

# --- the numbers, late, and with who measured them ------------------------
# Toned `cost` throughout, and every line on the panel is a caveat, because a
# list toned as a cost with neutral facts in it delivers a verdict the page
# does not. The specifications and the score are spoken; only the things to
# read twice are drawn.
SCRIPT["qwen"] = [
    (A, "Numbers last, and with who measured them. Qwen Image two point one "
        "scores sixty point two eight. Seventh overall, and first among open "
        "weights. On Qwen's own benchmark."),
    (A, "Then the version numbers, which are not a sequence. Three point zero "
        "is a separate closed line, shipped in July with no weights. Two point "
        "one is the open line, and it came after."),
    (A, "So the digit marks which product family a release belongs to, not "
        "when it shipped. And the weights are public, under the Qwen Research "
        "License. Non commercial only."),
    (A, "That image line now runs three licences at once. The language models "
        "have not moved."),
]

# --- the take -------------------------------------------------------------
# Five reveals on the closing beat, deliberately. Every overview in this series
# before the still-frame check could fire ended on a card that drew itself once
# and then sat motionless for fifteen to thirty seconds while the take was
# spoken over it. A head plus four habits unfolds with the line instead.
SCRIPT["close"] = [
    (A, "So what is the map for? Not for memorising model names, because those "
        "change every month. It is for knowing what you are looking at."),
    (A, "An image or video model announced next month is almost certainly that "
        "recipe. Latent space, transformer denoiser, flow objective. The name "
        "changes. The recipe does not."),
    (A, "A new voice model is almost certainly a codec, with a language model "
        "over its tokens. Which makes the useful question a narrow one."),
    (A, "Not what it can do. Which of those pieces it changed. And on the "
        "input side that is settled. Native multimodality became the floor "
        "rather than the feature."),
    (A, "Nobody announces it any more. What moves now is the licence, not the "
        "architecture."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: the page's own second heading is "How
    # families map to modalities", so the families are the left column, the
    # modalities the middle, and the understanding side the right. The episode
    # walks the middle and keeps pointing back at the left.
    #
    # Three columns is the comfortable number. `panel_columns` derives the pill
    # width from the column count, so three at full frame width gives about
    # 3.5 units each, and every item is kept short enough to sit in one without
    # growing the pill and shrinking the whole group.
    #
    # Tones. Subject for the families, which are what the episode keeps
    # returning to. Number for the modalities, which is the column being
    # walked. Machinery for the understanding side, which is literally
    # apparatus bolted onto a language model. None is `context`, so every
    # column has somewhere to brighten from when a later beat lights it.
    #
    # "VLMs" rather than "vision-language models", found at the preview step:
    # `pill` takes `max(width, label.width + 0.6)`, so one long item widens
    # every pill in its column and the map stops being three equal columns.
    # The narration says the expansion and then the letters, which is also
    # what the orphan check needs, since it matches a name on its squashed
    # spelling.
    #
    # `reserve` is 6.0 rather than 2.5 because a parked beat spends two of
    # those seconds letting the finished board stand still before it collapses
    # into its headings, and the format's premise is that the viewer sees the
    # whole field before any part of it means anything. It was 4.5 until the
    # voice existed. This beat came back at 114 words a minute, the slowest in
    # the episode, because it is a list of short names read deliberately, so
    # 108 words bought 56.8 seconds rather than the 42 the estimate assumed.
    # With three reveals that puts the third column at `length - reserve`, and
    # at 4.5 the narration named the understanding side five and a half seconds
    # before it was drawn. Six is the cap `check_timing` allows and it leaves a
    # motionless tail of about three and a half seconds, because the two second
    # settle and the 0.7 second morph come out of the front of it.
    "map": {"kind": "columns", "park": True, "reserve": 6.0, "columns": [
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
            "omni: any-to-any",
            "document parsing"]},
    ]},

    # A claim, and a short beat to match its two reveals. The card carries the
    # question's spine; the narration says the full sentence, so they share
    # their key words without either reading the other out.
    #
    # No focus: the map was built one beat ago with all three columns lit, and
    # that is exactly the state a question about the whole board wants.
    "question": {"kind": "claim", "reserve": 2.5,
                 "text": "Converged, or not?\nAnd if converged, onto which family?",
                 "note": "the recipes are not all the same family"},

    # Seven reveals over the longest beat in the episode, which is right: this
    # is the page's own centre of gravity, and the two families that stopped
    # shipping as generators are components of it rather than a beat of their
    # own.
    #
    # Toned `subject`: this is the recipe the whole episode keeps comparing
    # things against, and it is the left column of the map made concrete.
    "pixels": {"kind": "points", "tone": "subject", "reserve": 5.0,
               "focus": ["the families", "the modalities"],
               "head": "image and video: one recipe",
               "items": [
                   "denoise inside a latent space",
                   "the GAN survives as a loss term",
                   "a DiT over latent patches",
                   "FLUX.2, SD3.5, Qwen-Image-2.1",
                   "video: compress time as well",
                   "add actions: a world model",
               ]},

    # Machinery, because a codec is apparatus: the whole point of the beat is
    # that one piece of plumbing turns a signal into a vocabulary and the
    # language model stack then transfers unchanged.
    "audio": {"kind": "points", "tone": "machinery", "reserve": 4.5,
              "head": "audio: the other convergence",
              "items": [
                  "an RVQ codec, EnCodec then Mimi",
                  "a waveform becomes tokens",
                  "so it is next-token prediction",
              ]},

    # The blank corner cell is the shape that slid a header one column left in
    # an earlier episode. It is fixed in `panel_table` now, and this table has
    # one, so the frame is checked at the preview step rather than assumed.
    "text": {"kind": "table", "reserve": 4.5,
             "head": ["", "autoregressive", "diffusion LMs"],
             "rows": [
                 ["how", "one token at a time", "unmask many at once"],
                 ["buys", "exact conditioning", "parallelism"],
                 ["so", "the frontier", "a speed play"],
             ]},

    # Glosses are kept short on purpose: `panel_stack`'s pill is a fixed five
    # units wide whatever the label, so the row is five plus a gutter plus the
    # gloss, and the free region beside a parked map is about seven point
    # eight. A long gloss scales the whole group down rather than wrapping.
    "eyes": {"kind": "stack", "tone": "machinery", "reserve": 5.0,
             "focus": "understanding",
             "layers": [
                 ("vision encoder", "ViT, CLIP, SigLIP, DINO, SAM"),
                 ("projector", "into the token space"),
                 ("the LLM backbone", "where the reasoning happens"),
                 ("or: native early fusion", "one model, trained that way"),
             ]},

    # Every line here is something to read twice, so `cost` is honest for all
    # four rather than a verdict on the release. The heading renders in the
    # subject colour whatever the tone says, which is a known limitation of
    # this panel kind and is harmless here.
    "qwen": {"kind": "points", "tone": "cost", "reserve": 4.0,
             "focus": "the modalities",
             "head": "what to read twice",
             "items": [
                 "the benchmark is Qwen's own",
                 "3.0 is closed, and shipped first",
                 "research licence: non-commercial",
             ]},

    # The take, as five things that unfold with the line rather than one card
    # held still for half a minute, which is what every overview in this series
    # did before the still-frame check could fire.
    #
    # One tone throughout. Colouring the first three as `verified` and the
    # licence line as `cost` would deliver a verdict the page does not: the
    # page records the licence and says it is worth watching, it does not call
    # it a mistake.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.5,
              "focus": ["the families", "the modalities", "understanding"],
              "head": "what the map is for",
              "items": [
                  "a new image model is that recipe",
                  "a new voice model is codec plus LM",
                  "ask which piece actually changed",
                  "native multimodality is the floor",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words / 147.5 + len(SCRIPT) * 3 / 60:.2f} minutes")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        print(f"  {key:13s} {w:3d} words  ~{w / 150 * 60:4.0f}s")
