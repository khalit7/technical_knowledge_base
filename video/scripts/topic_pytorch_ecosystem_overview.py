"""
Topic overview: the PyTorch ecosystem, as of 22 September 2026.

Source: the canonical Notion page "Topic: pytorch-ecosystem", read from Notion
directly on 22 September 2026, not from the repo mirror. Every name, number
and date below is on that page: its "Map of the stack" prose, its mermaid
diagram, its "Version status" table and its "Governance and repo shuffle worth
knowing" list. Nothing is imported from the four child deep dives.

Which kind of overview this is. A mental model, not a comparison. Nothing on
this page competes with anything else on it: it is one subject with structure,
six bands of it, and a tensor passes through them in order. So the organising
question is the one the method gives that kind of overview, what seeing the
whole board at once lets you say that a list of names cannot.

The axis, and it is the page's own. The page opens by calling itself a "Map of
the stack, in the order a tensor meets it, because the diagram below is
otherwise a wall of proper nouns." That sentence is the episode: the order a
tensor meets it is the map, and the wall of proper nouns is the thing the
episode has to defeat.

The through-line, also the page's own, said twice on it at two different
levels and never once joined up:

  - of the dispatcher: "the extension point every backend, every custom op and
    every tensor subclass hooks into; understanding it is what makes torchao
    and DTensor stop looking like magic"
  - of DTensor: "FSDP2, tensor parallel, pipelining and distributed
    checkpointing are all expressed in terms of DTensor, which is precisely
    why they compose with each other and with compile"

Two narrow interfaces, and everything else is a user of one of them. That is
why this stack composes, and it is also the test that sorts the settled parts
from the churning ones: the pieces that are interfaces survive, and the
pieces that only wrap them get discontinued. The governance section supplies
the other half of that (torchtune discontinued, torchforge paused, FSDP1
deprecated) without ever connecting it to the first half.

Joining those two halves is a connection the page does not make in one place,
so it was back-ported to the page in the same session rather than asserted
only here. See the note at the foot of this docstring.

A previous cut exists in git history, cleared in 74326b3, and it was read at
the outline. Two things are kept from it, both because they are right and the
page's own: the four-column map, and the decision to leave the training
frameworks off that map. Four things are not:

  - It built its penultimate beat on the Nvidia / Hugging Face acquisition,
    which is on this page's *child*, not on this page. Its own docstring said
    so and called it a page defect. The method is explicit that a figure
    living only on a page below does not belong in the overview, so it is
    gone, and the episode is not poorer for it.
  - Its spine was "build on the bottom, recheck the top". True, but it is a
    piece of advice rather than an idea, and it makes the middle six beats a
    tour with no argument running through them. The two-interfaces reading
    does the same work and explains *why* the bottom is the bottom.
  - Eleven beats and no `reserve` anywhere, so every panel finished revealing
    at the exact end of its budget. Nine beats here, every one fitted.
  - A three-step `flow` for the compiler, beside a parked map. That is about
    eighteen units of pill and arrow in the seven point eight that are free,
    which renders as unreadable coloured blocks and passes the layout audit
    cleanly. `points` here.

What the critique step changed, and what the checks then changed again:

  - Draft one had a `moving` beat toned `cost` with FSDP1, torchtune and
    torchforge in it, and nothing else. Three dead things in a row is a
    graveyard, not an argument. It is now the beat that *tests* the
    two-interfaces claim: FSDP1 died because DTensor arrived underneath it,
    torchtune died because it was never an interface at all. Same three rows,
    doing work.
  - Draft one spent a beat on the version table, five release headlines read
    out. That is a changelog read aloud, which is the "narrating a list"
    failure by name. Four release facts survive, each inside the beat it
    belongs to: FSDP1's deprecation in 2.11 and differentiable collectives in
    the distributed beat, the CuTeDSL Inductor backend in the compilation
    beat, FlashAttention-4 in the performance beat. The cadence, one minor
    release a quarter, survives into the take, because it is the only release
    fact that tells the viewer what to *do*.
  - Draft one's `close` was a two-line `claim`. Measured across the first four
    overviews of this series, every closing beat is a motionless card for
    fifteen to thirty seconds, because a take draws its claim in one move and
    then has half a minute of speech left. Four reveals here.
  - Helion was a beat's worth of draft one and is gone entirely, on length.
    It is the one item on this page that is neither an interface nor a
    wrapper, so the episode's argument had nothing to say about it, and it
    cost forty-odd words to introduce properly. It is the obvious first thing
    to restore if this is ever recut longer. Its B turn ("why not just write
    Triton?") went with it, and B's third appearance moved to the dispatcher
    beat, where "nobody writes dispatcher code, though" is the objection a
    viewer actually forms.
  - Length was the binding constraint throughout and it took four passes.
    Nine beats at four or five reveals each wants about 1,150 words, which is
    7.7 minutes and past the wall where the encode ladder gives up 1080p.
    1,024 here, about 6.8 minutes. Nothing was cut for shape; `perf` lost its
    fourth idea and every beat lost its padding.
  - `check_leads --estimate` found eleven reveals named before they were
    drawn, up to ten seconds, in a draft that read perfectly well. The fix is
    arithmetic, not taste, and it is worth writing down because it is not
    obvious: with n equal segments and a reserve of r, the last reveal lands
    `(W/n) x 0.4 - r` seconds after its segment starts, so **each item has to
    be named a few words into its own segment, further in for each later
    one**. Concretely, offset k is `(k-1)/(n-1) x (L - 2.5r)` words, where L
    is the segment length. Every panel item here is also a phrase the
    narration says verbatim, because the check matches a reveal's label as a
    contiguous squashed run: an item worded differently from the line is not
    checked at all, which looks like a pass.
  - `check_references` caught two things in the map beat that nothing else
    would have, and both needed the voice to exist first. "Here is the board"
    was spoken over an empty frame, because `spread` starts the first column
    at the top of the beat and the pointer landed two tenths ahead of it; the
    line now describes the board going up rather than asserting it is there.
    And "c ten d underneath, D Tensor above it" was flatly contradicted by
    the picture, where a column reads top to bottom and c10d is the top pill.
    The narration now runs *from* c10d *through* DTensor and claims nothing
    about up or down. One beat re-rendered for both.
  - A last pass gave every one of those verbatim phrases a verb around it.
    "Torch A O: quant, F P eight, sparsity." on its own is the run of short
    noun phrases with no verb that the voice model fills in with inventions;
    inside "then comes precision, which is a different kind of saving and the
    same bargain: torch A O: quant, F P eight, sparsity", it is a clause.

Deliberate omissions, so the next person can see they were decisions. The
deployment band (ExecuTorch 1.0, ONNX export, vLLM) is one clause in the
compilation beat, where `torch.export` earns it, and is not a beat of its
own: it is where a model *leaves* this ecosystem, so it is the one band the
composition argument has nothing to say about. Helion, as above. The
Foundation's six projects are one line in the take rather than a beat, and
monarch, DDP, HSDP, Axolotl, Lightning and Composer are not mentioned at all.

Back-ported to the Notion page in the same session: a sentence joining the
dispatcher and DTensor as the two extension points the rest of the stack is
expressed in, which the page said separately in two paragraphs and never
together. The video may add explanation but not claims, and that connection
was doing enough work here to have to exist there first.

Speakers:
  A  narrator, owns the spine and the visuals
  B  the listener, asks what the viewer is thinking, never chats
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: pytorch-ecosystem"
SUBTITLE = "two narrow interfaces, and everything else"
UPDATED = "22 September 2026"

# Reserves. Every one of these is fitted to the rendered durations, not
# guessed: reveal k of n lands at `(k-1)/(n-1) x (beat_length - reserve)`, so
# the reserve is what decides whether the last item is drawn before or after
# the narration names it, and how long the finished panel then sits still.
#
# `map` is the exception to "fit it": a parked beat spends two seconds of
# settle and a 0.7 second morph out of the FRONT of its reserve, so anything
# under about 2.7 leaves the finished board no motionless time at all, and the
# whole premise of this format is that the viewer sees the size of the field
# before any part of it means anything.

VISUALS = {
    "ident": {"kind": "title"},

    # Four columns, in the order a tensor meets them, which is the page's own
    # ordering and the first line of its own map section.
    #
    # The training frameworks and the deployment edge are the fifth and sixth
    # bands and they are deliberately NOT here. Five columns is the
    # coloured-blocks failure, and past four the pill stops shrinking and the
    # whole board scales down instead; more to the point, the frameworks are
    # what the episode argues about, so putting them in the parked inventory
    # spends the argument before the question has been asked. They are named
    # in the opening and again in the take, which is where they do work.
    #
    # At four columns the item budget is about fifteen characters, the same as
    # beside a parked map. Everything here is at or under it.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "core", "tone": "subject", "items": [
            "ATen",
            "the dispatcher",
            "autograd",
            "backends"]},
        {"head": "compilation", "tone": "machinery", "items": [
            "TorchDynamo",
            "AOTAutograd",
            "TorchInductor",
            "torch.export"]},
        {"head": "distributed", "tone": "verified", "items": [
            "c10d",
            "DTensor",
            "FSDP2",
            "pipelining"]},
        {"head": "performance", "tone": "number", "items": [
            "SDPA backends",
            "FlexAttention",
            "torchao",
            "profiler"]},
    ]},

    # A stack, because the order is the argument: what the board looks like,
    # what is actually underneath it, and the question that only exists once
    # you have seen both.
    "question": {"kind": "stack", "reserve": 4.0, "tone": "machinery", "layers": [
        ("a wall of names", "how a stack diagram reads"),
        ("two narrow interfaces", "the rest are users of one"),
        ("which parts churn?", "what the board can answer"),
    ]},

    # The first interface. Lights `core`.
    #
    # Every item here is a phrase the narration says verbatim, as an
    # appositive at the head of its own segment. That is not style: the lead
    # check matches a reveal's label as a contiguous squashed run inside the
    # narration, so an item worded differently from the line is simply not
    # checked, and the one defect this series keeps shipping is a narrator
    # five seconds ahead of the picture.
    "dispatcher": {"kind": "points", "tone": "subject", "reserve": 5.0,
                   "focus": "core",
                   "head": "the dispatcher", "items": [
                       "picks by device and dtype",
                       "every backend, op, subclass",
                       "torchao and DTensor are users"]},

    # `points`, not `flow`. Three flow steps beside a parked map want about
    # twelve units in the six and a half that are free, which renders the step
    # labels at a third of body size with no visible arrows at all, and passes
    # the layout audit cleanly because nothing overlaps.
    "compile": {"kind": "points", "tone": "machinery", "reserve": 5.0,
                "focus": "compilation",
                "head": "three stages, and a strict one", "items": [
                    "Dynamo: bytecode and guards",
                    "AOTAutograd: one joint graph",
                    "Inductor: Triton and CuTeDSL",
                    "torch.export: no graph breaks"]},

    # The second interface, one band higher. Lights `distributed`.
    "distributed": {"kind": "points", "tone": "verified", "reserve": 5.0,
                    "focus": "distributed",
                    "head": "DTensor: a mesh, a placement", "items": [
                        "FSDP2 and tensor parallel",
                        "they compose, and with compile",
                        "autograd flows through it now"]},

    # Lights `performance`, and is toned `number` to match that column: an
    # idea keeps its colour for the whole video.
    "perf": {"kind": "points", "tone": "number", "reserve": 5.0,
             "focus": "performance",
             "head": "the opt-in layer", "items": [
                 "FlexAttention: your own mask",
                 "torchao: quant, fp8, sparsity",
                 "the profiler and the snapshot"]},

    # The test of the claim, so the three rows are three deaths with three
    # different causes rather than a graveyard.
    #
    # It lights the whole map rather than one column, because the beat is
    # about the band ABOVE the map, and a `focus` naming every label is how
    # this vocabulary says no emphasis. Without it the map would still show
    # `performance` lit from the beat before, which is a quiet lie about what
    # is being discussed.
    "moving": {"kind": "table", "tone": "cost", "reserve": 5.0,
               "focus": ["core", "compilation", "distributed", "performance"],
               "head": ["if you reach for", "it is", "reach for"],
               "rows": [
                   ["FSDP1", "deprecated in 2.11", "fully_shard"],
                   ["torchtune", "discontinued", "torchtitan"],
                   ["torchforge", "paused", "torchtitan"]]},

    # Six reveals, deliberately. Measured across the first four overviews of
    # this series, every closing beat is a motionless card for fifteen to
    # thirty seconds, because a take draws its claim in one move and then has
    # half a minute of speech left over. The map stays lit whole from
    # `moving`, so no `focus` here: a redundant one buys nothing and costs
    # about a second of panel delay.
    "close": {"kind": "points", "tone": "subject", "reserve": 5.0,
              "head": "what the board is for", "items": [
                  "the interfaces are the bottom",
                  "the wrappers are the churn",
                  "recheck the top every quarter"]},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {
    # 1. what this is, what it actually is, why it earns the time, and the
    #    context the first real beat needs.
    "ident": [
        (A, "This is the PyTorch ecosystem. Not the library, but the whole "
            "stack around it: a compiler, a distributed layer, a performance "
            "layer, and the frameworks people train with. The current "
            "stable release is two point thirteen, from July twenty twenty "
            "six."),
        (A, "The page this comes from admits the problem in its own first "
            "line. Drawn as a diagram, it says, this is a wall of proper "
            "nouns. But two pieces here are what all the rest is expressed "
            "in."),
    ],

    # 2. the inventory. Four segments, one per column, each naming its column
    #    as that column is drawn, and a tail short enough to fit the reserve.
    "map": [
        (A, "The board goes up in the order a tensor meets it, nothing "
            "explained yet. Core is the eager runtime: A Ten, the C plus plus "
            "tensor library, then the dispatcher, then autograd, then the "
            "device backends."),
        (A, "Compilation replaces running those operations one at a time with "
            "generated code, in four pieces: Torch Dynamo, A O T Autograd, "
            "Torch Inductor, and torch export."),
        (A, "Distributed runs from c ten d, the process group layer, "
            "through D Tensor, to F S D P two and pipelining."),
        (A, "Performance is the attention and precision layer: S D P A "
            "backends, Flex Attention, torch A O, and the profiler as well."),
    ],

    # 3. the organising question. Three segments, one per layer of the stack.
    "question": [
        (A, "Read as an inventory, that board is a wall of names, which is "
            "how a stack diagram reads. Nobody learns a subject that way."),
        (A, "But underneath it sit two narrow interfaces, and almost "
            "everything else on it is a user of one of them rather than a "
            "thing in itself."),
        (A, "So there is one question worth asking of a stack this size, and "
            "it is not what these names are. It is this. Which parts churn?"),
    ],

    # 4. the first interface. Four segments, one per reveal.
    "dispatcher": [
        (A, "Start at the bottom, because the bottom does not move. A Ten is "
            "the tensor library every operator is written against. Autograd "
            "is the tape that replays those calls backward. Between them sits "
            "the dispatcher."),
        (B, "Nobody writes dispatcher code, though. Why start there?"),
        (A, "Nobody writes it, and everything you do write goes through it. "
            "For any operator you call, it picks by device and dtype, and by "
            "whether autograd is recording."),
        (A, "Which sounds like plumbing, and it is the most important "
            "plumbing here. Every backend, op, subclass hooks in there: CUDA, "
            "Rock M, Apple's M P S, and whatever anybody writes."),
        (A, "Which is the sentence worth carrying away. Once you have seen "
            "the dispatcher, torch A O and D Tensor are users of it, not "
            "special cases. They stop looking like magic."),
    ],

    # 5. the compiler. Five segments, one per reveal.
    "compile": [
        (A, "One band up is compilation: three stages, and a strict one, and "
            "they fail in different ways. Knowing which of the three is "
            "failing is most of the skill of using any of it."),
        (A, "So, first up is Dynamo: bytecode and guards. It captures Python "
            "bytecode into a graph, and the guards say when that capture "
            "stays valid."),
        (A, "Whatever it captured then goes into A O T Autograd: one joint "
            "graph, forward and backward together, so the backward pass gets "
            "compiled too."),
        (A, "Stage three is where the kernels themselves get written, by "
            "Torch Inductor: Triton and Cute D S L. Triton runs on the card, "
            "C plus plus on the processor, and Cute reaches Blackwell "
            "features Triton cannot."),
        (A, "And the strict one is a mode rather than a stage. Torch export: "
            "no graph breaks, which is what leaving the ecosystem is built "
            "on."),
    ],

    # 6. the second interface, one band higher. Four segments; B's question
    #    opens the third, which is why that segment reads short.
    "distributed": [
        (A, "The distributed band is the same design one layer higher. Under "
            "it is c ten d, the process group layer over N C C L and Gloo. "
            "Above it sits D Tensor: a mesh, a placement, and nothing else."),
        (B, "Which sounds like bookkeeping. Why does that earn a layer?"),
        (A, "Because of what gets expressed in it. F S D P two and tensor "
            "parallel are expressed in it, and so are pipelining and "
            "distributed checkpointing."),
        (A, "Which is precisely why they compose, and with compile too. Four "
            "separate implementations became one idea with four uses."),
        (A, "There is a newer piece of this as well. An all gather written by "
            "hand used to sever your backward pass, and it does not any more, "
            "because autograd flows through it now."),
    ],

    # 7. the opt-in band. Five segments; B's question opens the fifth.
    "perf": [
        (A, "The performance band changes fastest and breaks least, because "
            "nearly all of it is the opt-in layer. S D P A already picks your "
            "attention backend for you."),
        (A, "Flash Attention four is one of its options on Blackwell now. "
            "Past that, the step up is Flex Attention: your own mask. Write "
            "it in Python and still get one fused kernel."),
        (A, "Then comes precision, which is a different kind of saving and "
            "the same bargain: torch A O: quant, F P eight, sparsity."),
        (A, "And when you cannot tell which of those you needed, the profiler "
            "and the snapshot are how you find out."),
    ],

    # 8. the test of the claim. Four segments: the head row, then one row
    #    each. torch titan is deliberately not named until the last segment,
    #    because it is a cell of the last row as well as the middle one.
    "moving": [
        (A, "Now put that claim under strain, because three things on this "
            "page are dead or dying, not one of them looks it from outside, "
            "and the useful question about each is why."),
        (A, "Start with the easy one, which everybody knows. F S D P one is "
            "deprecated, as of two point eleven, in favour of fully shard. It "
            "did not die of neglect. D Tensor arrived underneath and "
            "expressed it better."),
        (A, "The second has a different cause, and it is the one that tests "
            "the claim. Torch tune, Meta's fine tuning recipes, is "
            "discontinued."),
        (B, "So a project I start on torch tune today is a dead branch."),
        (A, "A dead branch. It was never an interface anything was built on, "
            "and wrappers get replaced. Torch forge, its intended successor, "
            "is paused too, and both arrows point at torch titan."),
    ],

    # 9. the take. Five segments, one per reveal.
    "close": [
        (A, "So what is this board actually for? Not for reading top to "
            "bottom in the order the diagram draws it, which teaches you "
            "nothing."),
        (A, "Here is what it is for. The interfaces are the bottom: the "
            "dispatcher, and D Tensor a layer above it. Everything else is "
            "expressed in one of those two."),
        (A, "Which makes them the thing to learn properly, and the place to "
            "debug from. The wrappers are the churn: the band above this "
            "board is where libraries get discontinued, and where the "
            "Foundation runs six projects rather than one."),
        (A, "Cadence is about one minor release a quarter. So the habit that "
            "keeps this map true is not reading more of it. Recheck the top "
            "every quarter, and never the bottom."),
    ],
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    print(f"about {words * 0.40 / 60:.1f} minutes at 0.40 seconds a word")
    for key, beat in SCRIPT.items():
        w = sum(len(line.split()) for _, line in beat)
        print(f"  {key:16s} {len(beat)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
