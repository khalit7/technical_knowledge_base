"""
Topic overview: the large language model landscape, as of 22 September 2026.

Source: the canonical Notion page "Topic: llms", read from Notion directly on
22 September 2026 rather than from the repo mirror. Every lab, model, figure
and date below is on that page. Nothing is imported from the model-family
pages or the two deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A comparison, and the field being compared is
providers. But the page's own six-sentence state of play says the thing that
makes the comparison interesting: they have stopped differing where you would
look first. "Sparse MoE is the default architecture everywhere", "every
flagship is now a reasoning model", "1M-token context is table stakes, which
drove every lab onto some form of trainable sparse or linear attention". So
the inventory is not a ranking, and the organising question is not who is
ahead. It is what is left to separate twenty families once the architecture
is shared.

The axis of the map itself is what you are allowed to do with the weights:
closed frontier, open weights, fully open. That is the page's own taxonomy
diagram, it is the grouping a viewer needs in order to place a name they half
know, and it is the axis the deleted cut found. Keeping it is a decision, not
an inheritance: the alternative, grouping by country, puts DeepSeek next to
Qwen and away from Mistral for a reason that does nothing in the rest of the
episode, and grouping by benchmark position builds a league table the page
spends a whole clause refusing.

A previous cut of this episode exists in git history, cleared in 74326b3, and
it was read at the outline. Its axis is kept and its docstring records it as
inherited from a hand-written version before that, so this is the third time
the same axis has survived. Four things from that cut are not kept:

  - It ran eleven beats and about 1,100 words. That is well past the seven
    minute wall where the encode ladder gives up 1080p. Eight beats here.
  - It gave each lab or pair its own beat: `control`, `google_meta`,
    `deepseek`, `china_open`. Four beats of "what this lab bets" is a tour of
    a directory. They are two beats now, organised by the bet rather than by
    the lab: where the thinking goes, and what it costs to serve. Nearly every
    lab the page discusses lands in one of the two, and Google now sits beside
    OpenAI and Anthropic because Deep Think is an answer to the same question
    rather than a hardware footnote.
  - Its `deepseek` beat was a `stat` and its `close` was a `claim`: two
    reveals each, over forty-second lines. That is the still-frame defect,
    twice in one episode. Both are `points` beats here, with six reveals.
  - Not one of its beats carried a `reserve`, so every panel finished
    revealing at the very end of its budget while the narration had already
    named the last item.

What the critique step changed:

  - Draft one had a `convergence` beat saying what they all do the same way,
    and a `question` beat saying the same thing thirty seconds earlier. The
    skeleton is stated once, in `question`, where it is the reason the
    question exists. The late beat is about where the competition went
    instead, which is the part a reader of the page skims: total parameters
    stopped being the number and active parameters became it, and two
    September releases attack that from opposite ends.
  - Draft one put Meta's collapse and Google's TPU hedge in a beat of their
    own. Neither does work on a spine about what separates labs now: the
    Meta story is about 2024 and 2025, and the TPU choice is a supply hedge
    rather than a model difference. Both cut rather than shrunk.
  - Draft one's `serving` beat had five labs in it and read as a list. Zhipu
    and Qwen stay because they attack the same cost from two different
    places, MiniMax stays because its reversal is the one thing on the page
    that says a bet can be wrong, and Moonshot's Muon was cut: it is a
    training result, not a serving one.
  - B was agreeing in draft one. B has two turns now, and each is the
    question the viewer is already forming: how many of these are there, and
    which open model is actually the strongest.

Reveal arithmetic, which is what set the length. `spread` puts reveal k of n
at `(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments: the first n-1 about one reveal each, and the last short
enough to fit inside the reserve. Every panel beat below records the segments
it was written to, and the last segment of every one is deliberately the
shortest. The map beat is budgeted at 115 words a minute rather than 150,
because an inventory of bare names is read slowly.

Lit state of the map, decided for every beat rather than left to inherit.
`map` builds with all three columns lit. `question` inherits that, which is
right: the question is about the whole board. `thinking` lights "closed
frontier". `serving` lights "open weights". `leads` passes no focus and
inherits that state deliberately, because the open-weight leader table is
about exactly the column `serving` already lit, and a redundant focus redraws
an identical frame at a cost of about a second of panel delay. `convergence`
lights all three, which is how this vocabulary says no emphasis. `close`
inherits that, and it is also true: the take is about the whole board.

Tones on the map, chosen so no column is `context` (a focus on the
de-emphasis colour is invisible) and so no pairing delivers a verdict the page
refuses. Closed frontier is `subject`, because that is where the episode
starts. Open weights is `machinery`, which is literally what that column is:
the systems-engineering column, where the KV cache and the attention kernels
are the product. Fully open is `verified`, because publishing the corpus and
the recipe is the precondition for anybody checking anything. Colouring open
against closed as `verified` against `cost` would say on screen that one is
right and the other a mistake, and the page takes no such position.

No contract beat, deliberately: an overview's contract is the map itself,
built whole before anything is explained, and the structure check exempts the
format for that reason. No resources card either, which is a deep dive's
obligation; the page carries three deep dives and a Best resources block, and
the close points at the page rather than reciting it.

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - The whole "what each family actually is" section below the four labs kept
    here: Meta's Llama collapse and the Chinchilla overshoot, Google's TPU
    and JAX hedge, Gemma's 5:1 local-to-global attention ratio, Constitutional
    AI, Mistral as the European counterweight, xAI's compute maximalism,
    Microsoft Phi's synthetic data. Eight labs, one clause each, which is a
    directory read aloud.
  - Astra's harness number: 99.9% on ARC-AGI-3 from OpenAI's card against
    62.7% through ARC Prize's provider-agnostic harness, 37 points apart on
    the same weights. It is one of the sharpest facts on the page and it
    belongs to the benchmarks and agentic-harness episodes, which is where
    the page itself cross-files it.
  - The three September releases that are inventory rather than argument:
    Tencent Hy4's 770B/49B and its 163-expert blind evaluation, K2 Horizon's
    six fully open models, Qwen3.8-Max-0902 and the dated-snapshot release
    convention. All named on the map; none explained.
  - Gemini 3.8 Live, which reasons and speaks at the same time, filling with
    verbal cues while tool calls run. The best single product idea on the
    page and it is about latency rather than about what separates labs.
  - Jev and the System One category: type-safe structured values with
    calibrated confidence, trained by reinforcement learning for calibrated
    decisions. The orchestrator half of that section survives as two lines of
    the close; this half wants its own episode.
  - The Nvidia acquisition of Hugging Face at $12.93 billion, which is what
    "open weights in practice" now depends on.
  - Atria Dawn Preview, a 744B model built as a post-training layer over
    GLM-5.2 by a national laboratory with no announcement. A genuinely
    strange fact and a whole argument about base models as public
    infrastructure, which this episode has no room to open.

  The obvious second episode from this page is the lab-by-lab one this cut
  refuses: the philosophies section on its own, eight labs at forty seconds
  each, with the bets rather than the product lines. It is one heading of the
  page and it gets two beats here.

One thing this episode says that the page did not, and which was back-ported
to Notion in the same session, because the page is the thing that lasts. The
page states the convergence and it states, separately, that "the competition
has moved from total parameter count to active-parameter efficiency and to
trainable attention sparsity". It also lays out, in the Astra paragraph, that
there are now three different places a test-time budget can be spent. What it
never says is that those are the two axes left: once the skeleton is shared,
what distinguishes one lab from another is where it spends the thinking and
what it costs to serve, and every remaining difference on the page is one or
the other. A reader can assemble that; a listener cannot, so the narration
says it in the opening and the page now says it too, in the paragraph under
the state of play. It is an instruction for reading what is already there
rather than a new claim, which is the only kind of thing a video may add.

The glosses the narration adds beyond that are already on the page in the
same words: the page defines the router, the caller-set token budget, opaque
recurrence, the encoder-decoder split and IndexPool's averaging step in full.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, two turns, each the question the viewer is forming

What the render actually found, in the order it found it.

Pace. `serving` and `convergence` both came back at exactly 165 words a
minute, which `check_timing` passes and a listener does not. The lever is
punctuation rather than the delete key: their commas became full stops, no
word was cut, and they read at 147 and 154. That cost about eight seconds
across the two, which this episode could afford and a seven minute one could
not.

Four text-to-speech defects passed the character gate and were caught by
reading the transcripts as text. Only the first is a class the gates are
built for.

  - A tail loop. The map beat ended on "G P T O S S" and the take repeated
    that phrase three times, at a character error of 0.029 and a no-speech
    probability of 0.29. Both gates passed it. The fix is the existing rule
    about fragile names read one step further: a lowercase compound should
    not be the LAST thing in a segment either, so the line now ends "G P T O
    S S. And Gemma four."
  - A dropped consonant at the head of the beat. "Whole board first" came
    back as "Hole. Board first.", which is a different word. The beat opens
    "Start with the whole board" now, which is the same rule again: the
    fragile word is no longer the first thing said.
  - A company renamed as its own product. "StepFun took that furthest" came
    back as "Step 5 took that furthest", immediately before a sentence about
    Step 5 Preview, so the lab and the model became the same name. The lab
    is not load-bearing in that sentence, so it is gone: "The furthest
    anybody has pushed that is Step five Preview."
  - A model renamed. "Meta, with Muse Spark one point three" arrived as
    "Meta with NewSpark 1.3" on two consecutive seeds, with the correct name
    on screen underneath it, which is the worst shape there is. Rerolling did
    not fix it, exactly as this method says about a name that fails in a
    given beat. Respelled "Mews Spark", which is the same phonemes, it came
    back correct, and the transcriber wrote it back as "Muse Spark".

One real screen reference, which `check_references` caught and nothing else
would have. The `leads` beat said "three different winners, all on the
screen" twelve seconds in, when `spread` had drawn one of the three rows. The
fix is the ordering rule this page already states: the sentence naming what
is on screen has to be the last thing said in the beat, so "All three on the
screen" now follows the third row rather than preceding it. The other two
hits, both "watch" in the close, are ordinary English.

Two things read as defects and are not. The transcriber has no spelling for
Qwen and produced "QN", "Quinn", "Kwon" and "Quen" across four takes; and it
writes Zhipu as "Xipu". Both are its spelling of a correct sound.

Timing re-cut, 23 September 2026, `VISUALS` only: no word, beat, take or
panel kind changed, and the audio is byte-identical. The first cut was fitted
before `check_leads` modelled the focus delay (0.25 seconds per map handle,
seventeen handles here, so 4.25 seconds at the head of `thinking`, `serving`
and `convergence`). Re-measured, it had three reveals named before they were
drawn: `close` "or whether the unit moves" 10.1s and "for predicting the next
move" 6.8s, and `convergence` "not total parameters" 4.3s, which the old tool
could not see. No reserve reaches either: `--reserves` asked for 14.5 and 11.3
against a cap of 5.5. Both beats spoke sentences near the end with nothing
drawn under them, so each gained two rows naming those sentences:
`convergence` "the smallest active count" and "it keeps 98% of the score",
`close` "Sakana: an orchestrator" and "which model stops mattering". Eight
reveals each re-spaces every landing and puts the last two where the words
are. Every reserve was then moved to the midpoint `--reserves` suggests
between the lead floor and the still-frame cap: map 6.6, question 3.2,
serving 3.3, convergence 2.8, close 3.9; thinking and leads stay 5.0. Worst
timed lead is now 3.0s (thinking, unchanged) and the worst still frame 5.47s,
against 5.6s before. One lead stays accepted rather than fixed: `serving`
names DeepSeek and Zhipu five to six seconds before their rows, in the
sentence that introduces each lab, while the claim each row carries (encoder
decoder, nine cents a task) is spoken after the row appears. The tool cannot
time those two rows at all, so that figure is by hand.

Length. 5 minutes 58 at 1080p and 4.55 MiB, on the second of three 1080p
rungs. That is the first episode in this series to come in under six minutes,
and it is finished rather than short: eight beats, and the ninth candidate
(the lab-by-lab philosophies) is recorded above as the second episode rather
than squeezed in. The margin is worth having, because the pace fix on two
beats cost eight seconds and there was room for it.

Numbers and names are spelled the way they should be said, because text to
speech reads "GPT-6", "GLM-5.3", "V4.1-Flash" and "1.76 bits" badly. Three
shapes were rewritten before the first render on the rules this method already
carries: "Zhipu" is left as written because it came back clean and is two
plain syllables; "gpt-oss" is written "G P T O S S", because a lowercase
compound is the shape that produced "LittleMul"; and no beat opens on a
fragile name, which is why the Astra segment opens "And G P T six Astra" and
the Bonsai segment opens "And Prism M L".
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: llms"
SUBTITLE = "who builds what, and what is left to separate them"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and why it earns the time -----------------
SCRIPT["ident"] = [
    (A, "This is the map of large language models. Who builds what, and what "
        "each lab is actually betting on. Twenty odd families on one page."),
    (A, "It earns the time because the field converged. Almost every model at "
        "this scale is the same shape now, so the differences that are left "
        "are somewhere else entirely. Current as of the twenty second of "
        "September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Three columns, three reveals, and `spread` puts the third at
# `beat_length - reserve`. So this is two long segments and one short one:
# about fifty words per column for the first two, and the third named inside
# the reserve. Budgeted at 115 words a minute, not 150, because a run of bare
# names is read slowly.
#
# The orphan check is what shapes the wording here. A pill like "DeepSeek:
# V4.1-Flash" passes on the shared word "DeepSeek", but "Tencent Hy4,
# StepFun" passes only because the line says both names, so what sits between
# them is kept to one word.
SCRIPT["map"] = [
    (A, "Start with the whole board. Nothing explained yet. Three columns, "
        "grouped by what you are allowed to do with the weights. The closed "
        "frontier. "
        "OpenAI, with G P T six Astra. Anthropic, with Fable five point one. "
        "Google DeepMind, with Gemini three point eight. Meta, with Mews "
        "Spark one point three. And SpaceXAI, with Grok four point six."),
    (A, "Open weights, mostly Chinese now. DeepSeek, with V four point one "
        "Flash. Alibaba's Qwen, three point eight Max, at two point four "
        "trillion. Moonshot, with Kimi K three. Zhipu, with G L M five point "
        "three. MiniMax and Mistral. Tencent and StepFun."),
    (A, "And the third column, fully open and small. Ai two's OLMo. K two "
        "Horizon. G P T O S S. And Gemma four."),
]

# --- the organising question ----------------------------------------------
# A `stack` of three, so three segments. The question itself opens segment
# one rather than sitting in a beat of its own: at three reveals there is no
# room for a fourth segment, and the question is what the first layer is the
# evidence for.
SCRIPT["question"] = [
    (B, "Twenty families, and I could not tell you what makes any two of them "
        "different."),
    (A, "On architecture, almost nothing does, any more. Nearly every model in "
        "those first two columns is a sparse mixture of experts, where a few "
        "percent of the parameters run on any one token."),
    (A, "Every flagship is also a reasoning model, deliberating on a budget "
        "somebody sets. The standalone reasoning category did not beat the "
        "mainline. It dissolved into it."),
    (A, "And all of them now use trained sparse attention, because a million "
        "token context became table stakes."),
]

# --- the first axis: where the thinking goes ------------------------------
# Six reveals, so six segments of roughly twenty five words: a head, four
# labs, and a short consequence that fits inside the reserve. The four are
# not four labs taking turns; they are four answers to one question, which is
# the page's own framing of recurrent depth as "a third way to spend a
# test-time budget".
SCRIPT["thinking"] = [
    (A, "The first thing left to separate them is where the thinking goes. "
        "They all spend extra compute when you ask, and who decides how much "
        "differs."),
    (A, "OpenAI hides it behind a router. A classifier reads your request and "
        "picks: answer at once, or spend a reasoning trace. Sol, Terra and "
        "Luna are cost bands."),
    (A, "Anthropic exposed it instead. Extended thinking is a token budget the "
        "caller sets, so the bill is predictable before you send anything."),
    (A, "Google spends it sideways. Deep Think runs parallel branches rather "
        "than one long trace, which pays where the answer can be checked."),
    (A, "And G P T six Astra opened a third way. It loops activations back "
        "through its own layers, so part of the deliberation happens in latent "
        "space."),
    (A, "Which no monitor can read. OpenAI says that use is limited so far."),
]

# --- the second axis: what it costs to serve ------------------------------
# Six reveals again. The open-weight labs compete here hardest, which is why
# this beat lights that column. Zhipu and Qwen are in it because they attack
# the same cost from two different places, and MiniMax because its reversal
# is the one line on the page saying a bet can turn out wrong.
SCRIPT["serving"] = [
    (A, "The second thing is what a model costs to serve. The open weight labs "
        "compete on that hardest."),
    (A, "DeepSeek changed the shape of the stack this month. V four point one "
        "Flash is an encoder decoder. Every other frontier model is a "
        "decoder."),
    (A, "The stated reason is not quality. It is the key value cache. That "
        "falls to roughly a quarter of the memory footprint."),
    (A, "Zhipu attacks the same cost from the other end. It averages every "
        "four lookup vectors together before it selects. Nine cents a task. "
        "Against two dollars for a closed model beside it."),
    (A, "Alibaba's Qwen made the selection hardware friendly. It chooses "
        "blocks of tokens rather than single ones. That is what cuts long "
        "context latency."),
    (A, "And MiniMax went all in on linear attention. Then partly back."),
]

# --- the correction that matters most -------------------------------------
# A table, header plus three rows, so four segments. The header row is the
# first reveal and B's question sits on it. No focus: `serving` left "open
# weights" lit, which is exactly the column this table is about.
SCRIPT["leads"] = [
    (B, "So which of those open models is actually the strongest?"),
    (A, "That question stopped having a single answer, and it is worth slowing "
        "down on. Three scopes, and three different winners."),
    (A, "Kimi K three is the highest placed open weight model on the aggregate "
        "intelligence indices, which is the number people usually quote at "
        "you."),
    (A, "But G L M five point three leads on private enterprise code, and on "
        "cost per index point."),
    (A, "And DeepSeek V four Pro leads S W E bench verified. All three on the "
        "screen. So: leads on what?"),
]

# --- where the competition went -------------------------------------------
# Eight reveals since the 23 September re-cut. The convergence itself was
# said in `question`, so this beat is
# about the consequence instead: which number the labs now compete on, and
# the two September releases that attack it from opposite ends.
SCRIPT["convergence"] = [
    (A, "Which brings us to the part worth more than the inventory. They "
        "converged. So the competition moved somewhere much narrower."),
    (A, "It is no longer total parameter count. It is how many of those "
        "parameters you switch on per token. That is what decoding one token "
        "costs you."),
    (A, "The furthest anybody has pushed that is Step five Preview. Six "
        "hundred billion parameters, with twenty seven billion active. The "
        "smallest active count in the frontier band."),
    (A, "The ratio is a different claim. DeepSeek V four Pro is about thirty "
        "three times sparser. That is the bigger number. It is not the "
        "cheaper one."),
    (A, "And Prism M L came from the other side. Bonsai two squeezes Qwen's "
        "twenty seven billion down to one point seven six bits a weight. It "
        "keeps ninety eight percent of the score."),
    (A, "The two compose. Fewer parameters running. And each one smaller."),
]

# --- the take -------------------------------------------------------------
# Eight reveals on the closing beat, deliberately. Every overview in this series
# before the still-frame check could fire ended on a card drawn once and then
# held motionless for fifteen to thirty seconds.
#
# No focus: `convergence` lit all three columns, which is this vocabulary's
# way of saying no emphasis, and the take is about the whole board.
SCRIPT["close"] = [
    (A, "So what is this map for? Not for picking a model. Any ranking on it "
        "is stale before you finish reading."),
    (A, "It is for predicting what a lab does next, because each one is "
        "running a bet it has run for years."),
    (A, "And bets move far more slowly than scores, which is what makes them "
        "worth learning."),
    (A, "What would redraw this map is not a benchmark result. DeepSeek "
        "shipped an encoder decoder while everybody else ships decoders. Watch "
        "whether anybody follows."),
    (A, "And watch whether the model stays the unit. Sakana sells a learned "
        "orchestrator that reads your query and routes it across a pool of "
        "other models."),
    (A, "If that holds the frontier, which model stops being the question."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame. Grouped by what you are allowed to do with the weights,
    # which is the page's own taxonomy and the grouping that lets a viewer
    # place a name they half know.
    #
    # Three columns is the comfortable number: `panel_columns` derives the pill
    # width from the column count, and the map beat draws at full frame width
    # rather than beside anything, so twenty four characters is safe here. It
    # would not be on a later beat.
    #
    # `reserve` is 6.6 rather than 3: a parked beat spends two seconds of
    # settle and a 0.7 second morph out of the FRONT of its reserve, so this
    # leaves a motionless finished board of about four seconds, which is the
    # format's premise. The value is checked against the rendered duration
    # below, not guessed.
    "map": {"kind": "columns", "park": True, "reserve": 6.6, "columns": [
        {"head": "closed frontier", "tone": "subject", "items": [
            "OpenAI: GPT-6 Astra",
            "Anthropic: Fable 5.1",
            "Google: Gemini 3.8",
            "SpaceXAI: Grok 4.6",
            "Meta: Muse Spark 1.3"]},
        {"head": "open weights", "tone": "machinery", "items": [
            "DeepSeek: V4.1-Flash",
            "Qwen: 3.8 Max, 2.4T",
            "Moonshot: Kimi K3",
            "Zhipu: GLM-5.3",
            "MiniMax M3, Mistral",
            "Tencent Hy4, StepFun"]},
        {"head": "fully open, and small", "tone": "verified", "items": [
            "Ai2: OLMo 3.1",
            "IFM: K2 Horizon",
            "Gemma 4, gpt-oss"]},
    ]},

    # A stack, because the order is the argument: the architecture underneath,
    # the reasoning mode on top of it, and the attention change that a million
    # token context forced. Layer names are short because `panel_stack`'s pill
    # is a fixed five units wide and does not derive from the content.
    "question": {"kind": "stack", "reserve": 3.2, "layers": [
        ("sparse MoE", "a few percent active per token"),
        ("a reasoning mode", "on a budget somebody sets"),
        ("sparse attention", "1M context is table stakes"),
    ]},

    # Toned `subject`, matching the column it lights. Four answers to one
    # question, and the fifth line is the consequence rather than a fifth lab.
    "thinking": {"kind": "points", "tone": "subject", "reserve": 5.0,
                 "focus": "closed frontier",
                 "head": "where the thinking goes",
                 "items": [
                     "OpenAI: a router decides",
                     "Anthropic: you set the budget",
                     "Deep Think: parallel branches",
                     "Astra: looped in latent space",
                     "so no monitor can read it",
                 ]},

    # Toned `machinery`, matching its column, and honestly: every line is a
    # piece of serving infrastructure rather than a capability claim.
    "serving": {"kind": "points", "tone": "machinery", "reserve": 3.3,
                "focus": "open weights",
                "head": "what it costs to serve",
                "items": [
                    "DeepSeek: an encoder-decoder",
                    "for the KV cache, not quality",
                    "Zhipu: $0.09 a task",
                    "Qwen: blocks, not tokens",
                    "MiniMax: linear, then back",
                ]},

    # The header's first cell is "open-weight leader" rather than blank: a
    # blank corner is the shape that slid a whole header one column left in an
    # earlier episode.
    #
    # Cells are kept short, because a two-column table has to fit the roughly
    # seven point eight units left beside the parked map.
    "leads": {"kind": "table", "reserve": 5.0,
              "head": ["open-weight leader", "leads on what"],
              "rows": [
                  ["Kimi K3", "the aggregate indices"],
                  ["GLM-5.3", "private enterprise code"],
                  ["DeepSeek V4 Pro", "SWE-bench verified"],
              ]},

    # Toned `number`: every line here is a measured figure from the page.
    "convergence": {"kind": "points", "tone": "number", "reserve": 2.8,
                    "focus": ["closed frontier", "open weights",
                              "fully open, and small"],
                    "head": "which number they compete on",
                    "items": [
                        "not total parameters",
                        "Step 5: 600B, 27B active",
                        "the smallest active count",
                        "V4 Pro: about 33x sparser",
                        "Bonsai 2: 1.76 bits a weight",
                        "it keeps 98% of the score",
                        "and the two compose",
                    ]},

    # The take, as seven lines that unfold with it rather than one card held
    # still for half a minute. No line here is the spoken sentence: each is
    # its spine.
    "close": {"kind": "points", "tone": "subject", "reserve": 3.9,
              "head": "what the map is for",
              "items": [
                  "not a ranking to pick from",
                  "for predicting the next move",
                  "bets outlast scores",
                  "watch who follows DeepSeek",
                  "or whether the unit moves",
                  "Sakana: an orchestrator",
                  "which model stops mattering",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    slow = sum(len(line.split()) for _, line in SCRIPT["map"])
    secs = (words - slow) / 150 * 60 + slow / 115 * 60 + len(SCRIPT) * 3
    print(f"about {secs / 60:.2f} minutes ({secs:.0f}s), map at 115 wpm")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        rate = 115 if key == "map" else 150
        print(f"  {key:13s} {len(t)} turns {w:3d} words  ~{w / rate * 60:4.0f}s")
