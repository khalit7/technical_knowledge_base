"""
Topic overview: JAX and TPU, as of 22 September 2026.

Source: the canonical Notion page "Topic: jax-and-tpu", read from Notion
directly on 22 September 2026 rather than from the repo mirror. The mirror was
diffed against it afterwards and is identical in substance, so nothing here
depends on which copy was read. Every name, figure and status claim below is on
that page. Nothing is imported from the four deep dives underneath it, and
nothing is invented for shape.

Which kind of overview this is. Neither of the two clean cases. It is not a
comparison, because the things on this page do not compete with each other:
they stack. And it is not purely a mental model either, because the page is
explicitly a translation track from somewhere the viewer already lives. So the
organising question is the one the page's own framing puts in the room and no
other topic in this knowledge base has hanging over it: PyTorch already trains
models on thousands of GPUs, so what is the extra explicitness buying? The page
answers that itself, in the word it uses for it: "The price: functions must be
pure, and state (params, optimiser, RNG) is threaded explicitly." That is a
trade, the page states both halves of it, and the episode is built as one
instalment plan on it rather than as a tour. The skill allows a single story
through an overview when the page already tells it; this one does.

The axis, which is most of the work of a new overview. The page's "Map of the
space" has six bullets and the map panel comfortably holds four columns, so the
map is a stated selection: JAX core, sharding, the training stack, the TPU.
Those are the four things you have to hold at once to read a JAX training
script. The two bullets left off the map are named in the docstring below.

The cut cleared in 74326b3 found the same four-column axis independently, and
it is kept, because it is the page's own bullets minus the two that do not fit.
Five things from that cut are not kept:

  - It ran eleven beats. At this vocabulary's reveal pacing that is about eight
    and a half minutes, one rung above where the encode ladder gives up 1080p
    and near where the render fails outright. Nine beats here.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the very end of its budget and several lines named things long before
    they existed.
  - Its `sharding` beat, the payoff and the longest in the episode, was a
    `compare`. A `compare` has exactly two reveals, so a fifty second beat on
    it is a twenty second motionless frame. It is a `points` with six reveals
    here, walked in the order `spread` draws it.
  - It split the hardware across two long beats, `chip` and `pod`, and left
    Pallas hanging off the end of one of them with no reveal of its own to land
    on. One `points` beat of six reveals here, chip then wiring, with Pallas as
    the sixth.
  - Its close was a `claim`: two reveals over a forty five second take, which
    is the motionless closing card every early overview in this series shipped.
    Six reveals here, and a small reserve.

One claim from that cut is deliberately dropped rather than reworded: "on a
single accelerator it is all price and no payoff". The page does not say it and
it is not obviously true, since `jit`, `grad` and `vmap` are worth having on
one chip. A video may add explanation and may not add conclusions, so the close
says what the page says instead: explicit, compiler-driven, and here is the
goal state.

The outline that survived the revision step:

    ident      what this is, how current, and the question that hangs over it
    map        four columns, everything named, parked as the home frame
    question   the trade, flat: what you give up and what you get
    price      the price in detail, and the four transformations it permits
    sharding   the payoff: Mesh, NamedSharding, GSPMD, and one program
    hardware   what the annotations talk to: the MXU, the memory, the torus,
               a pod, and the kernel escape hatch
    stack      what you actually write the model in
    close      the take: a translation track, and the cheapest way to try it

What the critique step changed:

  - Draft one opened on the taxonomy and reached the trade at minute four. On
    the one page where the viewer is deciding whether to bother at all, that is
    the wrong way round. The trade is beat three, and every beat after it is
    introduced as an instalment on it.
  - Draft one gave the neural-net libraries a `table` of four rows keyed on
    status, and optax, orbax and grain a `columns` beat of their own. Two beats
    for the training stack in a seven minute overview is a page read aloud.
    They are one `points` beat now: NNX and Linen get a row each because
    choosing between them is a decision the viewer has to make, and Equinox and
    Haiku are a clause with no row, because "do not start there" does not need
    a picture.
  - Draft two put the MXU on a `stat`, as its own beat, because the figure
    deserves a card. A `stat` has exactly two reveals, so it is a twenty five
    second beat whatever you want from it, and the hardware is sixty seconds of
    material. Splitting it into a short `stat` and a long `fabric` gave a page
    whose spine is a compiler trade two hardware beats out of nine. It is one
    beat now, and the figure is written as a figure in a `points` row instead.
    The four hardware generation names went with it: a list of four version
    numbers does no work in speech.
  - B was agreeing in draft one. B has two turns now and both change what A
    does next: the question the whole episode exists to answer, and the
    push-back on the sharding claim when it starts sounding too easy.

Reveal arithmetic, which set the length. `spread` puts reveal k of n at
`(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments, the first n-1 naming one reveal each and the last short
enough to sit inside the reserve. That couples the word count to the panel
choice rather than to taste, and it is why this is eight beats and not eleven.
Every beat below records the segments it was written to.

Lit state of the map, decided for every beat rather than left to inherit,
because `focus` is a state and persists until something changes it:

    map        builds with all four columns lit
    question   inherits all four, which is right: the trade is the whole board
    price      lights "JAX core"
    sharding   lights "sharding"
    hardware   lights "the TPU"
    stack      lights "the training stack"
    close      lights all four, which is how this vocabulary says no emphasis

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour. That forces four
distinct tones, and `number` on the sharding column is the weakest fit of the
four. It is chosen over `cost`, which would say on screen that the sharding
model is a mistake, a verdict the page does not take.

No contract beat, deliberately: an overview's contract is the map itself, built
whole before anything is explained, and `check_structure.py` exempts the format
for exactly that reason. No resources card either, which is a deep dive's
obligation; the close points at the page and the page carries four deep dives,
a six step learning path and a topic-level Best resources block.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - The LLM codebases bullet in full: MaxText, Tunix, big_vision and levanter,
    with what each one is for. It is a fifth column the map cannot hold at a
    legible pill width, and a beat of its own is a bibliography rather than an
    argument. MaxText is named once in the close as the thing to read after the
    syntax stops being in the way.
  - The RL trainers inside Tunix: PPO, GRPO and GSPO, each of which the page
    defines properly. They are the best-written paragraph on the page and they
    are off-axis in a video about a compiler and a torus. They belong with the
    codebases, in that second episode, or to the RL topic.
  - The four TPU generations, v5e, v5p, v6e Trillium and v7 Ironwood. Named as
    one clause in `chip`. A list of four version numbers read aloud tells a
    listener nothing they can use.
  - `pmap` being legacy. Worth one clause on the page and nothing in speech: a
    viewer who has never seen `pmap` learns a name they will not use, and one
    who has will not hear it here and keep using it.
  - The learning path's middle steps, and the Best resources block, including
    the scaling book. The close names the goal state and the cheap hardware,
    which are its two ends; the page carries the rest and the video says so.

  The obvious second episode from this page is the codebases: MaxText's decoder
  and train step as the reference for what good sharded JAX looks like, Tunix
  and its RL trainers, big_vision as the cleanest surviving Linen, and levanter
  as the non-Google reading with bitwise-reproducible resumption. That is a
  whole bullet of the page and it gets one clause here.

Two things this episode says that the page did not, both back-ported to Notion
in the same session, because the page is the thing that lasts and a listener
cannot follow a link:

  - "pytree". The page used the word three times and never said what one is. A
    reader can click through to the deep dive; a listener hears a word and has
    nothing. The narration says "a pytree, which is JAX's word for an
    arbitrarily nested container of arrays", and the page now carries that
    gloss at first use.
  - "TRC". The learning path ended "Colab v5e, Kaggle v5e-8, then TRC", with
    the three letters never unfolded anywhere on the page. It now reads "TRC
    (the TPU Research Cloud)", which is what the narration says.

Both are expansions rather than claims, which is the line: the video may make
something easier to follow and may not assert anything the page does not.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, two turns, both of which change what A does next

Numbers and names are spelled the way they should be said, because text to
speech reads "128x128", "v6e", "shard_map", "NamedSharding" and "GSPMD" badly.
Four shapes were rewritten before the first render on rules this method already
carries: "NamedSharding" is said "Named Sharding", because a welded compound is
the shape that produced "LittleMul" and "postgres cool"; "VMEM" is written
"V mem" rather than spelled out, because an all-caps name that is nearly an
ordinary word loses a syllable; "optax" and "orbax" never open a sentence,
because a fragile lowercase name at the head of a sentence is the shape that
failed four seeds running; and every acronym expansion is given its own clause
and a verb rather than an appositive, because an appositive is the most
deletable thing a line can carry and the character gate cannot see it go.

Pace, which was the expensive part of this episode. `hardware` came back at
171, 173 and 169 words a minute across fifteen seeds and two rewrites. The
punctuation lever was genuinely exhausted: the beat is twenty four sentences
averaging under eight words, and there was not a comma left to turn into a full
stop. Selection did not save it either. What did was **splitting the beat's
turns**: the same words, redistributed from seven turns into eleven, all still
spoken by A. `render.py` builds a beat as a VibeVoice conversation with one
item per turn, so more turns means more prosodic boundaries, and the same text
came back at 159. That is a third pace lever alongside punctuation and seed
selection, and it costs no words and no seconds of narration.

Part of the 169 was measurement rather than delivery. This beat carries
eighteen spelled acronym letters ("T P U", "M X U", "V mem", "I C I", "G P Us")
out of 185 tokens, and a letter takes well under the time an average word does.
Counting each letter as a third of a word puts the same take at about 154.
`check_timing` divides raw tokens by duration, so an acronym-heavy beat reads
as a gallop it is not. The gate was satisfied honestly rather than argued with,
but the effect is real and worth knowing before rewriting a beat that is
already fine.

Four defects got through the character gate and were caught by reading the
transcripts as text. Only one is a class the gate is built for:

  - A single real word swapped for another, on the episode's hinge line.
    "Everything else on this map follows from that trade" came back as "that
    train", at a character error of 0.012. A clause after it, "That is the
    whole of it", took the sentence off the end of the beat and it reads
    correctly.
  - A trailing phrase eaten. "Pallas is the Triton analogue for T P Us and
    G P Us" arrived as "PALIS is the Triton analog for TPU", losing the GPU
    half of a claim the page makes. It is its own sentence now, with "both" in
    front of the pair to signal that two things are coming.
  - An invented word spliced in. "Continuum." appeared between two sentences in
    `close`, at 0.028. The gap was after "And more compiler driven", a verbless
    fragment, which is the shape this method already warns fills get poured
    into. It has a verb now.
  - A fragile name opening a sentence. "Grad differentiates a pure function"
    came back as "Grrr. Differentiates a pure function". "Then grad
    differentiates" reads correctly.
Two more shapes were changed pre-emptively and came back clean: "JAX and T P Us"
opening the episode transcribed as "TPOS", and is the singular now; and the
transcriber consistently writes a spelled plural acronym as "TPS" or "GPS",
which is its convention rather than a defect, confirmed by the words around it
being intact.

Reserve arithmetic, corrected against the rendered frames. On an ordinary beat
`still` came out at **reserve + 0.4**, not at the reserve, so 6.0 trips the six
second cap and 5.5 is the real ceiling. On the parked map `still` was
**reserve - 2.35**, so 8.3 is the ceiling there. Every reserve below was fitted
by least squares from the rendered durations, so that reveal k lands about two
seconds after the segment that names it.

Timing re-cut, 23 September 2026. Once `check_leads` learned to model the
focus delay (0.25s per handle at the head of a focus beat, and this map has
twenty handles, so five seconds), nine reveals were named before they were
drawn, worst 6.0s. The repair kept the axis, the map, the beats, the take and
all but one sentence's word order:

  - `price`, `sharding` and `close` lost their `points` heads. A head is drawn
    at the top and spends a reveal slot, and on top of five seconds of map
    lighting that put every early row three to six seconds behind its line.
  - Reserves swept to the midpoint `--reserves` suggests: `question` 4.0,
    `price` 5.0, `sharding` 4.2, `hardware` 3.2, `stack` 5.0 (it was 1.5,
    which left Flax Linen 4.2s early), `close` 5.0.
  - Four items reworded so the check can time them rather than skip them:
    the Mesh row, the ICI row, the pod row, Flax NNX and grain.
  - The one spoken change, a pure reorder in `map`: "Then five libraries, which
    is the training stack" rather than "Then the training stack, which is five
    libraries". The parked reserve was at its cap and the third column was
    still 3.1s early; every word is the same. Only `map` was re-voiced.

What the check cannot see, measured by word timestamps on the new take: the
fourth column's heading is "the TPU" while the line says "on the right, the
hardware", so no label matches and the check times the column from "H B M and
V mem". The real lead is about three seconds, down from 3.3 on the old take;
the M X U itself is named after the column lands. The map's reserve sits at
8.0, above the 6.7 the tool suggests, because on a parked map more reserve
draws every column earlier and that pointer is the binding one.

Length: 6 minutes 37 after the timing re-cut (6:41 before it), 1080p, 4.19
MiB, on the third and last 1080p rung of the encode ladder. 140 words a minute
overall by `check_timing`. The trim lever, if a future cut needs
one, is `stack`: Equinox and Haiku are the two rows it does not have, and the
close already carries the "which one do I use" conclusion.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: jax-and-tpu"
SUBTITLE = "purity is the price; a compiler that shards a pod is the payoff"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and the question --------------------------
SCRIPT["ident"] = [
    (A, "This is the map of JAX and the T P U, the Google side of the stack. JAX "
        "is functional array programming, compiled through X L A, the "
        "accelerated linear algebra compiler. Then the libraries on top, and "
        "the hardware underneath. Current as of the twenty second of "
        "September, twenty twenty six."),
    (A, "The page frames it as a translation track from PyTorch. Everything "
        "you know has an equivalent here, usually a more explicit one. So the "
        "question is what that explicitness buys."),
]

# --- the inventory, named before anything is explained --------------------
# Four columns, four reveals, so four segments of about twenty five words. The
# fourth names the hardware column, which is the line that has to survive the
# collapse into headings, so the beat hands over on the hardware rather than on
# a summary. `reserve` is 6.0 because a parked beat spends two of those seconds
# letting the finished board stand still and 0.7 more on the morph, leaving a
# motionless tail of about three and a half.
#
# Item spellings are chosen so the orphan check can match them, which on a page
# of acronyms constrains the narration rather than the panel. "HBM and VMEM"
# matches only on its squashed spelling, so the line has to say "H B M and V
# mem" as one uninterrupted run rather than gloss it in the middle.
SCRIPT["map"] = [
    (A, "Whole board first, in four groups. Nothing explained yet. On the "
        "left, JAX core. Four transformations that compose over anything you "
        "write. Jit. Grad. Vmap. And shard map."),
    (A, "Next to it, sharding. You declare a device Mesh, and attach a Named "
        "Sharding to each array. A partitioner called G S P M D does the "
        "rest."),
    (A, "Then five libraries, which is the training stack. Flax N N X and "
        "Flax Linen, for the models themselves. Then optax, orbax and grain "
        "underneath them."),
    (A, "And on the right, the hardware. The M X U, where the arithmetic "
        "happens. The memory, which is H B M and V mem. The I C I torus. And "
        "Pallas."),
]

# --- the organising question ----------------------------------------------
# A `claim` has two reveals, so twenty five seconds is its whole honest budget.
# The note lands at `beat_length - reserve`, so the sentence it paraphrases is
# the last thing said in the beat rather than the middle of it.
SCRIPT["question"] = [
    (B, "Hold on. PyTorch already trains models on thousands of G P Us. What "
        "is actually missing?"),
    (A, "That is the question this topic hangs on, so here is the answer "
        "flat. You give up mutable state. In exchange you get a compiler that "
        "shards one single device program across a whole pod."),
    (A, "Everything else on this map follows from that trade. That is the "
        "whole of it."),
]

# --- the price -------------------------------------------------------------
# Five reveals, so five segments: the head, then one per transformation, with
# the last naming vmap and shard map because that is the reveal `spread` draws
# last. Toned `subject`, because this is the column the episode keeps coming
# back to and it is the left of the map made concrete.
SCRIPT["price"] = [
    (A, "The price first. It is what makes people bounce off JAX. Every "
        "function has to be pure."),
    (A, "So the parameters, the optimiser state and the random number keys are "
        "threaded through your code by hand. Nothing hides inside an object."),
    (A, "What you get back is composition. Jit traces your function into an "
        "intermediate form called a jaxpr. X L A compiles that."),
    (A, "Then grad differentiates a pure function in reverse mode. It returns "
        "gradients shaped like your parameters, as a pytree, which is JAX's "
        "word for a nested container of arrays."),
    (A, "And vmap and shard map compose with both. Vmap vectorises for you. "
        "Shard map hands you the per device body."),
]

# --- the payoff ------------------------------------------------------------
# Six reveals over the longest beat in the episode, which is right: this is the
# page's centre of gravity and the whole reason the price is worth paying.
# B's turn sits on the fifth reveal, where the claim starts sounding too easy.
SCRIPT["sharding"] = [
    (A, "Now the payoff. It is the reason the trade exists at all, and it "
        "starts with something that sounds far too simple."),
    (A, "You write a single device program. One. As though there were one "
        "chip in the world, and the whole model fitted on it."),
    (A, "Then you declare a Mesh, your devices arranged into named axes. And "
        "you attach a Named Sharding to each array: that Mesh, plus a "
        "partition spec saying which axis the array splits along."),
    (A, "G S P M D takes it from there. Wherever two annotations disagree, the "
        "partitioner inserts the collectives. You never write an all "
        "reduce."),
    (B, "So data parallel, F S D P and tensor parallel are all the same "
        "program?"),
    (A, "The same program. Different partition specs. That is the strongest "
        "claim this topic makes. And shard map is the escape hatch, when you "
        "want the per device code yourself."),
]

# --- what the annotations are actually talking to -------------------------
# The chip and the fabric were two beats in draft one, which over-weighted the
# hardware on a page whose spine is a compiler trade, and put the MXU on a
# `stat`. A `stat` has exactly two reveals, so it is a twenty five second beat
# whatever you want from it, and this material is sixty. One `points` beat with
# six reveals instead, walked chip first and then the wiring, so the figure is
# still written as a figure and still sits on screen when the line names it.
# B's turn opens the last segment, which is where Pallas is drawn.
SCRIPT["hardware"] = [
    (A, "So what are those annotations actually talking to? Two things. One "
        "chip, and the way the chips are joined."),
    (A, "At the centre of the chip sits the M X U, which is the matrix "
        "multiply unit."),
    (A, "It is a systolic array. And the screen has its shape. One hundred and "
        "twenty eight square."),
    (A, "It is fed from high bandwidth memory, staged through V mem."),
    (A, "V mem is a scratchpad the software manages, rather than a cache that "
        "guesses."),
    (A, "The chips are joined by the I C I, the inter chip interconnect. Each "
        "one is wired straight to its neighbours."),
    (A, "They sit in a two or three dimensional torus. There are no switches "
        "in the path. So ring and torus collectives are cheap."),
    (A, "And a pod is what results. Hundreds to thousands of chips. One job "
        "treats them as one machine."),
    (B, "And when the compiler is not good enough?"),
    (A, "Then you write the kernel yourself. Pallas is the Triton analogue."),
    (A, "It writes kernels for both T P Us and G P Us. It lowers through "
        "Mosaic, which is the T P U backend compiler."),
]

# --- what you actually write the model in ----------------------------------
# Five reveals. Equinox and Haiku are a clause inside the Linen segment with no
# row of their own: "do not start there" does not need a picture, and a fifth
# row would have pushed this beat past sixty seconds. Neither optax nor orbax
# opens a sentence, because a fragile lowercase name at the head of a sentence
# is the shape that fails seed after seed.
SCRIPT["stack"] = [
    (A, "Back up a level, to what you actually write the model in. The page "
        "is clear about which one to start with. It is not the one most code "
        "uses."),
    (A, "Flax N N X is the recommended one now. Pythonic, stateful modules, "
        "close enough to a PyTorch module that porting one is mechanical."),
    (A, "Linen is the older functional A P I, still maintained, and what "
        "most code you read uses. Equinox is the minimal research option, "
        "where models are pytrees. Haiku is legacy: DeepMind moved to "
        "Flax."),
    (A, "Then optax expresses optimisers as chainable pure gradient "
        "transformations. Clipping, moving averages, accumulation, per "
        "parameter masks, Lion and Muon become links in a chain."),
    (A, "Underneath it, orbax does asynchronous, sharded, multi host "
        "checkpointing, which is what makes saving a whole pod slice "
        "practical."),
    (A, "And grain gives deterministic, checkpointable input, so a preempted "
        "run resumes mid epoch."),
]

# --- the take --------------------------------------------------------------
# Six reveals and a small reserve, because the closing beat is where this
# series kept shipping a motionless card: four published overviews ended on
# still frames of fifteen to thirty seconds. A take that unfolds needs six or
# seven parts, not one claim held.
#
# The cheap hardware is the fifth reveal and the goal state the sixth, rather
# than the other way round, so the episode ends on something concrete to do
# instead of on a list of places to get a chip.
SCRIPT["close"] = [
    (A, "So what is the map for? One decision, and the page is direct about "
        "it."),
    (A, "It frames all this as a translation track, not a rival. Every idea "
        "you have from PyTorch lands on this board."),
    (A, "It just lands more explicitly. You thread the state yourself, and "
        "that is the purity price, paid once."),
    (A, "And it lands more compiler driven. You annotate, the partitioner "
        "inserts the collectives, and that half is what pays you back, once "
        "per device."),
    (A, "The cheap way in is on the page. A v five e on Colab, then Kaggle, "
        "then the T P U Research Cloud, T R C."),
    (A, "Which leaves the goal state. Port a small PyTorch language model to "
        "Flax N N X, and train it on a T P U."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: the page's own "Map of the space" bullets,
    # minus the two that will not fit at a legible pill width. Four columns is
    # the marginal number rather than the comfortable one, so every item is
    # kept short: `panel_columns` derives the pill width from the column count,
    # about 2.5 units at four, and one long item widens every pill in its
    # column and scales the whole board down.
    #
    # Tones. Subject for JAX core, which the episode keeps returning to.
    # Machinery for the training stack, which is literally apparatus bolted
    # under a model. Verified for the hardware, which is the one part of this
    # board that physically exists. Number for sharding, the weakest of the
    # four and chosen over `cost`, which would deliver a verdict the page does
    # not take. None is `context`, so every column has somewhere to brighten
    # from when a later beat lights it.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "JAX core", "tone": "subject", "items": [
            "jit",
            "grad",
            "vmap",
            "shard_map"]},
        {"head": "sharding", "tone": "number", "items": [
            "Mesh",
            "NamedSharding",
            "GSPMD"]},
        {"head": "the training stack", "tone": "machinery", "items": [
            "Flax NNX",
            "Flax Linen",
            "optax",
            "orbax",
            "grain"]},
        {"head": "the TPU", "tone": "verified", "items": [
            "MXU",
            "HBM and VMEM",
            "ICI torus",
            "Pallas"]},
    ]},

    # The card carries the trade's spine; the narration says the full sentence,
    # so they share their key words without either reading the other out.
    # No focus: the map was built one beat ago with all four columns lit, which
    # is exactly the state a claim about the whole board wants.
    "question": {"kind": "claim", "reserve": 4.0,
                 "text": "Give up mutable state.\n"
                         "Get a compiler that shards one program across a pod.",
                 "note": "everything else on the map follows from that trade"},

    # No head. On a focus beat the map's lighting spends five seconds at the
    # top of the beat, and a head spent one more reveal slot on top of that,
    # so every row landed three to five seconds after the line named it. The
    # opening line says "every function has to be pure" over the lighting.
    "price": {"kind": "points", "tone": "subject", "reserve": 5.0,
              "focus": "JAX core",
              "items": [
                  "state threaded by hand",
                  "jit traces, XLA compiles",
                  "grad returns a pytree",
                  "vmap and shard_map compose",
              ]},

    # No head, for the same reason as `price`: it put the single device row
    # six seconds behind the line naming it.
    "sharding": {"kind": "points", "tone": "number", "reserve": 4.2,
                 "focus": "sharding",
                 "items": [
                     "you write a single-device program",
                     "declare a Mesh + NamedSharding",
                     "GSPMD inserts the collectives",
                     "DP, FSDP, TP: the same program",
                     "shard_map is the escape hatch",
                 ]},

    # The figure is written as a figure, so "the screen has its shape" is a
    # true sentence and the row is scannable. Toned `verified`, matching the
    # hardware column of the map, which is the one part of this board that
    # physically exists.
    "hardware": {"kind": "points", "tone": "verified", "reserve": 3.2,
                 "focus": "the TPU",
                 "head": "the TPU: a chip, and a fabric",
                 # Seven rows rather than five. The beat's narration falls
                 # into eight natural segments, and six reveals spread them so
                 # unevenly that the ICI row arrived nearly nine seconds after
                 # the line named it. Splitting the wiring into two rows, and
                 # the kernel escape hatch into two, gives every segment its
                 # own reveal, which is what the arithmetic asks for.
                 "items": [
                     "MXU: a 128x128 systolic array",
                     "HBM staged through VMEM",
                     "ICI: wired to its neighbours",
                     "a torus, and no switches",
                     "a pod: many chips, one machine",
                     "Pallas: kernels for TPU and GPU",
                     "lowering through Mosaic",
                 ]},

    "stack": {"kind": "points", "tone": "machinery", "reserve": 5.0,
              "focus": "the training stack",
              # Not "the training stack": that is the map heading this beat
              # lights, and printing the same words twice on one frame makes
              # the panel repeat the map instead of adding to it. Found on a
              # preview frame; no check looks at a `head`.
              "head": "what you write the model in",
              "items": [
                  "Flax NNX: the recommended one",
                  "Flax Linen: what you will read",
                  "optax: optimisers as a chain",
                  "orbax: save a whole pod slice",
                  "grain: resumes mid-epoch",
              ]},

    # Lighting every column is how this vocabulary says no emphasis, and it is
    # also true: the close is about the whole board.
    # No head: the five second focus lighting plus a head slot put all three
    # of the first rows four to six seconds behind their lines.
    "close": {"kind": "points", "tone": "subject", "reserve": 5.0,
              "focus": ["JAX core", "sharding", "the training stack", "the TPU"],
              "items": [
                  "a translation track, not a rival",
                  "more explicit: you thread state",
                  "more compiler-driven: you annotate",
                  "Colab, Kaggle, then TRC",
                  "goal: a small LM on a TPU",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    # An inventory beat reads 30 to 40 words a minute slower than prose, so the
    # map is estimated at 115 and everything else at 150. Add three seconds a
    # beat for the per-beat tail and each clip's leading silence, which a
    # words-over-rate estimate does not model.
    words = word_count()
    total = 0.0
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        rate = 115 if key == "map" else 150
        secs = w / rate * 60 + 3
        total += secs
        print(f"  {key:10s} {len(turns)} turns  {w:3d} words  ~{secs:4.0f}s")
    print(f"{len(SCRIPT)} beats, {words} words, "
          f"about {int(total // 60)}:{total % 60:02.0f}")
