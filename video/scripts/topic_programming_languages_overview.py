"""
Topic overview: programming languages, as of 22 September 2026.

Source: the canonical Notion page "Topic: programming-languages", read from
Notion directly on 22 September 2026 rather than from the repo mirror. Every
name, figure and date below is on that page. Nothing is imported from the
seven deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. Nominally a comparison, five languages side by
side, and that framing is the trap: read as a comparison the page becomes
"which language should I learn", which it never asks and cannot answer. It is
closer to a mental model. The page's own sentence is that all five are written
zero to expert, and its own five-stage ladder exists so that progress means the
same thing across all of them. So the inventory is the five languages, and the
organising question is what each one is FOR, because they are not alternatives:
they sit at different depths of one stack and you meet each for a different
reason. Python because you work in it, C++ and Rust because the substrate is
written in them, JavaScript and TypeScript because the harnesses are.

The cut cleared in 74326b3 found that same axis and it is kept, because it is
the page's own. Five things from that cut are not kept:

  - Ten beats and no `reserve` on any of them, so every panel finished
    revealing at the very end of its budget and the narration ran ahead of the
    picture throughout. Eight beats here, every one with a fitted reserve.
  - Its `question` was a two-reveal `claim` and its `mojo` beat a two-reveal
    `stat` on a seventy-word line. Both are the still-frame defect. The
    question is merged into the ladder beat, which is where it is answered,
    and Mojo is one row of the closing inventory rather than a beat.
  - Its `systems` beat was a `compare`, two reveals over a hundred and fifty
    word line. `compare` is a short beat's panel. It is a `table` here.
  - Its `close` was a `claim` card held motionless for the length of the take.
    Five reveals here, which is what the still-frame check asks for.
  - Its map toned C++ `cost` against Rust `verified`. That is a verdict on
    screen that the page does not deliver: the page keeps C++ as "the substrate
    under every inference engine, kernel, and binding layer". See the tone note
    on the map below.

The outline that survived the revision step:

    ident      five languages, how current, and why five is the problem
    map        the four columns, everything named, parked
    question   not which to learn but which you are on: the shared ladder
    python     the working language: the parts you can miss for years
    systems    C++ and Rust answering one question in opposite ways
    js_ts      the harness layer, as rules rather than surprises
    frontier   the newest material: who gets to write a GPU kernel
    close      the take: five ladders, and you are not climbing five

What the critique step changed:

  - Draft one had `question` as a `claim` card and `ladder` as a separate
    `stack`. That is fifty seconds spent asking the question and then not
    answering it, and it put the episode at nine beats and past seven minutes.
    They are one beat: the question is "which ladder are you on" and the ladder
    is the thing that makes that answerable.
  - Draft one gave Mojo a beat of its own, as a `stat` on "1.0". Mojo is the
    page's "Adjacent (not a track)" section, and a beat of its own promotes it
    above the five things the page actually teaches. It is the third row of
    `frontier` now, where it lands as a third answer to the question the two
    Rust tracks are already answering.
  - Draft one measured 1,306 words and 9.1 minutes, which is the rung at which
    the render fails outright rather than merely dropping to 720p. Every beat
    was rewritten shorter and `python` lost a panel item: descriptors are now a
    clause inside the data-model item rather than a reveal of their own.
  - Draft one's `python` beat ended on the specialising interpreter, which is
    the densest thing in it, and put asyncio in the middle. The last item lands
    at `beat_length - reserve`, so whatever is said after it has to fit inside
    the reserve: about twelve words. The interpreter needs thirty and asyncio's
    punchline needs twelve, so they swapped.
  - Draft one's `frontier` ran cutile-rs, then cuda-oxide, then Mojo, and put
    the tile track's answer in the middle of the beat. The rows are reordered
    so the beat ends on the sidestep, which is both the better close and the
    only order in which the last row's line fits inside the reserve.
  - Three figures were doing no work in speech and are cut: the per-track
    reading times, the C++26 paper names, and the nine hundred and sixty eight
    Hacker News points on the Rust GPU story. The last one was the old cut's
    closing line, and it is a popularity number rather than a fact about the
    subject.
  - B had five turns in draft one and two of them were agreement. Three now,
    each one the question the viewer is forming: nobody climbs five ladders,
    does Rust simply refuse to compile it, and does the tile track sidestep the
    whole question.

Reveal arithmetic, which is what set the length. `spread` puts reveal k of n at
`(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments and the last of them has to fit inside the reserve. Every
beat below records the segments it was written to, and the first segment is
written as long as the others rather than as a short orienting line, because
`spread` gives the head an equal slice of time whatever it carries.

Budgeted at 150 words a minute, which is `words x 0.40 seconds`, except `map`,
which is an inventory and was budgeted at 100. Every `reserve` below started as
a placeholder and was refitted from the real durations once the voice existed.
Delivered: 6 minutes 54 seconds, 141 words a minute overall, 1080p at 4.13 MiB
on the third and last 1080p rung of the encode ladder.

Two things the per-beat budget got wrong, both worth the next author knowing.
The map was budgeted at 100 words a minute on the method's "an inventory beat
runs 30 to 40 slower than prose", and it came back at 139 and 145 on two seeds.
That rule, and the newer note that four column maps read slowest of all, both
describe a map beat that is a list of bare product names. This one is not: it
is four ordinary sentences with the names inside them, and it reads at prose
pace. The thing that slows a map beat is the syntax, not the column count.

And the draft estimate was 30 to 40 seconds short across the episode, because
the 0.40 seconds a word figure is a median and this narration came back at
0.42. The delivered per-beat rates were 134, 131, 128, 144, 148, 150, 141 and
154, so the fast beats are the short ones.

One lead is accepted rather than fixed, which the method allows between two
seconds and six. `frontier` names cuda-oxide 3.4 seconds before its row is
drawn. Neither lever is available: the reveal count is fixed by the data, and
closing it wants a reserve of 6.7 against a still-frame ceiling of 5.6, while
moving the words means opening a sentence with a fragile name and re-rolling
an otherwise clean beat at a character error of 0.005.

Lit state of the map, decided for every beat rather than left to inherit:

  map        builds with all four columns lit.
  question   no focus, inheriting that deliberately. The shared ladder is about
             all five languages at once, which is the state the map is already
             in, and a redundant focus costs about a second of panel delay to
             redraw an identical frame.
  python     Python.
  systems    C++ and Rust. The one beat that genuinely lights two columns,
             because the beat is the comparison between them.
  js_ts      JS and TS.
  frontier   Rust. Mojo is not on the map, because the page files it under
             "Adjacent (not a track)" and the map is the page's structure.
  close      all four, which is how this vocabulary says no emphasis.

Tones on the map, which took three attempts. No column is `context`, because a
focus on a context-toned column is invisible and the narration would be telling
the viewer to look at something that does not move. No column is `cost`: the
cleared cut drew C++ in the cost colour against Rust in the verified colour,
and two languages drawn that way say on screen that one is right and the other
is a mistake, which is a verdict this page refuses. It keeps C++ as the
substrate under every inference engine and every kernel. So C++ and JS/TS share
`machinery`, which is what both of them are here, infrastructure you work
through rather than in, and Rust takes `verified` because the page's organising
fact about Rust is that safety is proved before the program runs rather than
tested for afterwards. Two columns sharing a tone is deliberate; they are
separated on screen by Rust's green sitting between them.

What was cut, so the next person can see the second episode rather than
rediscover it:

  - The whole of "Staying current" for both Python and C++: 3.12 to 3.15,
    free-threading as the officially supported GIL-free build, the
    copy-and-patch JIT shipped but off by default, the uv / ruff / ty stack at
    one to two orders of magnitude faster than what it replaces, and on the C++
    side C++20's concepts, ranges, coroutines and modules, C++23's
    std::expected and std::mdspan, C++26's static reflection, contracts and
    std::execution, and which compilers actually implement each. That is two
    companion pages and it is a whole episode: "what changed in the two
    languages you already write".
  - The Rust ML ecosystem as a subject rather than a clause: uv, ruff, ty,
    tokenizers, polars, pydantic-core, and PyO3 as the mechanism by which all
    of them reach Python as wheels. The episode says "you already run it" in
    one row of `systems`. The full version is the episode about why the Python
    toolchain got rewritten in another language.
  - JavaScript's prototypes and V8's optimisation model: hidden classes and
    inline caches, and why building objects by adding properties in varying
    order makes them slow. Two of the page's five JavaScript ideas, cut so the
    other three could be said properly.
  - TypeScript's type-level programming in full: conditional types with
    `infer`, mapped types, variance, and the deliberate unsoundness (bivariant
    method parameters, covariant arrays, `any`, assertions). The episode
    carries the one sentence that matters operationally, which is that the
    types are erased and therefore validate nothing at a boundary. TS 7.0's
    missing stable programmatic API goes with it.
  - The Modular acquisition by Qualcomm, closed late July 2026, and the ModCon
    "open source, open cloud, open silicon" pitch. Company news, and the
    frontier beat is about who writes the kernel.
  - The deep dives table and the cross-links. The close points at the page.

The one back-port. The page writes "MCP servers" without expanding MCP anywhere
on it. A reader can follow that; a listener cannot, and this method requires
every acronym expanded on first use in speech. Saying "Model Context Protocol
servers" out loud made the page the weaker of the two, so the expansion went
into the page in this session, before this script was rendered.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, three turns, each of which turns the beat

What reading the transcripts caught, none of which any gate rejected, and all
three of them on beats that passed at a character error under 0.06:

  - `ident` grew the invented word "Disadvance" out of nothing, straight
    after "Working knowledge is assumed nowhere", at a character error of
    0.055. One word is not a burst, so the invented-word detector could not
    see it. A seed reroll on the same text cleared it.
  - "asyncio" came back as "a CO" on the map beat and "a CCO" on the Python
    beat, two different seeds, two different beats. It is the lowercase
    compound this docstring predicted would be the one to watch, and the
    prediction was right. Written "async I O" the transcriber returns
    "asyncIO" and "asyncio", which is the name. Both panels were respelled
    "async IO" to keep the orphan check's squashed contiguous match, since
    the narration's squashed spelling is now "asyncio" either way.
  - "the ladder" came back as "the latter" in the Python beat, and then, once
    that beat was rewritten, in the map beat instead. Every word is ordinary
    English and no gate fires, which is the unadjudicable case: the plural
    "five ladders" transcribes correctly in three other beats, so the
    singular after a wh-word is what invites it. Written "whose ladder is
    aimed at" it was correct first time. Do not try to decide whether the
    voice or the transcriber was wrong; write it so neither can be.

One defect was judged and left. `frontier` ends on "at one point zero" and the
transcript reads "at one point. And zero." That is one inserted function word
at a character error of 0.005 and a no-speech probability of 0.19, most likely
the transcriber segmenting a number, and a reroll forced on a clean take has no
fallback. It is the exposed position the method warns about and the next
revision should end that beat on a word rather than a version number.

Names are spelled the way they should be said. "C++" is written "C plus plus"
throughout. "RAII" is written "R A I I", which is also what makes the map pill
match: the orphan check drops single letters from the word set, so that item
passes only on the squashed contiguous run "raii". "CPython" is written
"C Python", because a word welded to an acronym is the shape that produced
"postgres cool". "cutile-rs" is "Cutile R S" and "mistral.rs" is "Mistral R S",
both for the same reason and both needing their letters contiguous for the row
to match. "MLIR" is "M L I R". "asyncio" is written "async I O", after it
failed on two beats: the squashed spelling is still "asyncio", so the panels
spell it "async IO" and the orphan check's contiguous match still holds.

Neither "Cutile R S" nor "Cuda oxide" opens or closes its segment, because a
fragile name at either end of a segment is the position the model mangles.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: programming-languages"
SUBTITLE = "five ladders, and which one you are standing on"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, how current, and why it earns the time -----------------
# The title card's reserve is fixed at 2.4 inside `title_card` and is not
# settable from VISUALS.
SCRIPT["ident"] = [
    (A, "This is the map of programming languages, as this knowledge base "
        "treats them. Five of them. Python. C plus plus. Rust. JavaScript. "
        "And TypeScript. Each one written from zero to expert. Working "
        "knowledge is assumed nowhere."),
    (A, "Current as of the twenty second of September, twenty twenty six. It "
        "earns your time because five complete curricula is a syllabus. Not "
        "a plan. So the useful question is not how to climb five ladders. It "
        "is which one you are standing on."),
]

# --- the inventory, named before anything is explained --------------------
# Four columns, four reveals, so four segments, written roughly 35 / 30 / 37 /
# 13. Three long ones and a short last one, because everything said after the
# final column is named has to fit inside the reserve. The JS and TS column's
# three items are therefore named in thirteen words with no room for the reason
# those two share a column, which is why that reason is the first thing the
# `js_ts` beat says instead.
#
# The squashed-match constraint is why "R A I I" runs with nothing between the
# letters: the orphan check drops single letters from the word set, so the pill
# reading "RAII" passes only on the contiguous run.
SCRIPT["map"] = [
    (A, "Whole board first, and nothing explained yet. Four columns. Python, "
        "whose ladder is aimed at the data model, at async I O, and at "
        "the way hot code specialises itself while the program runs."),
    (A, "Then C plus plus, the substrate under every inference engine and "
        "every kernel. Organised around object lifetime, around R A I I, "
        "and around undefined behaviour."),
    (A, "Rust, organised around ownership. It ends at unsafe, and at Miri, the "
        "interpreter that reads unsafe code. And since this month, Rust writes "
        "G P U kernels as well."),
    (A, "And JavaScript with TypeScript. Closures and this. The event loop. "
        "Types, then erased."),
]

# --- the organising question, and the thing that answers it ---------------
# Five reveals, one per stage, and six segments. The opening segment carries
# the question and is deliberately the longest: `spread` gives reveal one the
# head of the beat whatever it carries, so a long opening draws the ladder
# ahead of the words, which is the acceptable direction. A short one would put
# the narrator ahead of the picture, which is not.
#
# The cleared cut split this in two, a `claim` card asking the question and a
# `stack` answering it, which spent a whole beat saying the question twice.
#
# The refresher trick, read the stage three gate first, does not live here. It
# is the last line of the episode, where it has a reveal of its own.
SCRIPT["question"] = [
    (B, "Five complete curricula, all zero to expert. Nobody climbs five "
        "ladders."),
    (A, "No. And the page never asks you to. The question is not which "
        "language to learn. It is which one you are already standing on. "
        "These five are not alternatives. They sit at different depths of one "
        "stack."),
    (A, "What makes them comparable is the ladder on screen. The same five "
        "stages on every page. Stage zero is setup, plus the one idea the "
        "language is built around."),
    (A, "Stage one is foundations. Correct small programs. And every stage "
        "ends in a gate. A question you should answer cold before you move "
        "on."),
    (A, "Stage two is working proficiency. Idiomatic code somebody else can "
        "maintain."),
    (A, "Stage three, advanced, is the hard parts. Concurrency, performance, "
        "memory, and the failure modes."),
    (A, "And stage four is expert. Explain the behaviour from the spec, and "
        "teach it."),
]

# --- the working language -------------------------------------------------
# Four reveals: the head, then one item each. Segments about 29 / 33 / 34 / 17.
# The specialising interpreter is item three rather than item four, because it
# needs thirty words and the tail after the last reveal holds about twelve.
# asyncio's two-clause punchline fits there and the interpreter does not.
#
# Descriptors lost their own item in the length pass. They are a clause of the
# data-model item instead, which is also what the page says they are: the
# protocol behind property, classmethod and bound methods.
SCRIPT["python"] = [
    (A, "Python first, because it is the working language. And that changes "
        "what its ladder aims at. Not the syntax. The parts you can use "
        "daily for years without ever meeting."),
    (A, "The data model is the set of dunder protocols that every built in "
        "operation dispatches through. Length. Iteration. Equality. And "
        "descriptors are the get and set protocol behind property, and behind "
        "bound methods themselves."),
    (A, "C Python's specialising adaptive interpreter rewrites hot bytecode "
        "into type specialised forms while the program runs. Which is why a "
        "loop over stable types gets faster on its own, and why breaking type "
        "stability is expensive."),
    (A, "And async I O is cooperative concurrency on one thread. Right for "
        "input output. Wrong for C P U work."),
]

# --- the two systems languages, on one axis -------------------------------
# Four reveals: the head row, then one row each. A `table` rather than the
# cleared cut's `compare`, which is a two-reveal panel and cannot carry a fifty
# second line.
#
# The row labels are checked as claims by the orphan check, so they are phrased
# as things the narration actually says rather than as grammar: "who owns it",
# "what a bug means", "a tool for the gap". No cell carries an acronym, because
# the narration spells acronyms out and single letters are dropped from the
# word set, which would orphan the cell.
SCRIPT["systems"] = [
    (A, "Underneath Python, two languages answer one question in opposite "
        "ways. Who owns the lifetime of an object? When is it created, when "
        "destroyed, and whose job is that? Read the table across."),
    (A, "First row. In C plus plus the job is the programmer's. R A I I "
        "ties a release to a destructor at end of scope, and that is the "
        "language's entire answer. In Rust it is the compiler's. Exactly one "
        "owner per value, tracked."),
    (A, "Second row, the other organising fact on the C plus plus side: "
        "undefined behaviour. The optimiser may assume your program never "
        "invokes it. So a bug there is not a wrong answer. It is a program "
        "with no defined meaning at all."),
    (B, "And in Rust it will simply not build?"),
    (A, "Proved before it runs, not tested afterwards. Third row is the tool "
        "for the gap. Miri detects undefined behaviour inside unsafe code. "
        "C plus plus has none."),
]

# --- the harness layer ----------------------------------------------------
# Five reveals: the head and four rules. The reason JS and TS share one column
# of the map is the first thing said here, because the map beat's last segment
# had thirteen words and no room for it.
SCRIPT["js_ts"] = [
    (A, "Then JavaScript with TypeScript, sharing a column because TypeScript "
        "is a type language over JavaScript. You need them because the agent "
        "harnesses, the Model Context Protocol servers and the dev tooling "
        "all live there."),
    (A, "Four ideas explain almost every surprise here. Closures capture "
        "variables rather than values from the defining scope. That is the "
        "source of the classic loop variable bug."),
    (A, "This is bound by the call site rather than by the definition. Which "
        "is why passing a method as a callback silently loses it."),
    (A, "The event loop is a single thread draining a task queue, with "
        "promise callbacks drained completely between tasks. Which is why "
        "one blocking call stalls the entire process."),
    (A, "And TypeScript is erased before anything runs. So it never validates "
        "data arriving from a network."),
]

# --- the newest material on the page --------------------------------------
# Four reveals: the head row, then one row each. All three rows are about who
# writes a GPU kernel, which is a grouping the page supports rather than a
# thesis imposed on it: the page says Mojo aims squarely at the slot currently
# filled by writing kernels in CUDA C++ and calling them from Python, and it
# says Rust now writes GPU kernels in two tracks that disagree.
#
# Row order is cuda-oxide, then cutile-rs, then Mojo, which is not the page's
# order and is deliberate. The tile track's answer, keep ownership and change
# the unit of work, is the best thing in the beat and belongs at its end rather
# than in its middle; and Mojo's line is the only one short enough to fit
# inside the reserve, so it has to be the last row.
#
# Mojo is not lit on the map because it is not on the map: the page files it
# under "Adjacent (not a track)".
SCRIPT["frontier"] = [
    (A, "One more thing, and it is the newest material on this page. Since "
        "September, Rust writes G P U kernels, in two N Vidia tracks, and "
        "the two disagree about how to handle the race."),
    (A, "At thread level, Cuda oxide is still early alpha. It extends the "
        "claim that a data race is a type error across the host device "
        "boundary, into a kernel launch with thousands of threads racing "
        "inside it. First time the ownership model has been asked to carry "
        "that."),
    (B, "And the tile track sidesteps that entirely?"),
    (A, "At tile granularity, Cutile R S keeps ordinary ownership and changes "
        "the unit of work, so the question never arises. It is already in "
        "production. Inside Hugging Face's Grout, and inside Mistral R S."),
    (A, "And a third answer, adjacent rather than a track, that targets "
        "C P U and G P U from one file. Modular's Mojo went open source "
        "at one point zero."),
]

# --- the take -------------------------------------------------------------
# Five reveals on the closing beat, deliberately. Every overview in this series
# before the still-frame check could fire ended on a card that drew itself once
# and then sat motionless for fifteen to thirty seconds.
#
# One tone throughout, and it is `subject`. A `points` panel takes one tone for
# every item, so toning this list anything else would deliver a verdict on
# whichever lines happen not to fit it.
SCRIPT["close"] = [
    (A, "So what is this map for?"),
    (A, "Not a curriculum. Closer to a router. It tells you which ladder you "
        "are already on."),
    (A, "Five ladders. And you are not climbing five."),
    (A, "Reading it as a syllabus is the reliable way to get nothing out of "
        "it."),
    (A, "Python is where you work."),
    (A, "So its ladder aims at what you will miss. Not at what you meet on "
        "day one."),
    (A, "One systems language is the one you read the machine in."),
    (A, "The page gives you two of those. And its newest material is all "
        "about one slot. The slot currently filled by writing kernels in "
        "C plus plus."),
    (A, "And wherever you start, start at the stage three gate. Not at the "
        "beginning."),
]

VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the page's own top-level structure: the five tracks,
    # with JavaScript and TypeScript in one column because the page treats
    # TypeScript as a type language over JavaScript rather than a sixth track.
    #
    # Four columns is NOT the roomy case, which is the thing to know here.
    # `panel_columns` derives the pill from the column count,
    # `max(2.5, min(4.2, (free - 0.7 x (n-1)) / n))`, and 2.5 is a floor, so a
    # four column map beat is exactly as tight as one sitting beside a parked
    # map: about fifteen characters, not the twenty-two that has shipped on
    # three column maps. Every item here is inside sixteen except one.
    #
    # The exception is "undefined behaviour", at nineteen, kept deliberately.
    # It is the C++ column's load-bearing item and every shortening of it is
    # either cryptic ("UB", which the orphan check would also reject, since
    # the narration says the words rather than the letters) or wrong. Its
    # column is visibly a little wider than the other three on the frame and
    # the board does not scale down; that was checked on a frame rather than
    # assumed, because the layout audit passes an over-wide pill cleanly.
    #
    # Tones: see the note in the docstring. No column is `context`, so every
    # column has somewhere to brighten from, and no column is `cost`.
    #
    # `reserve` is 8.0 rather than 5.0 because a parked beat spends two seconds
    # of settle and a 0.7 second morph out of the FRONT of the reserve. The
    # format's premise is that the viewer sees the whole field standing still
    # before any part of it means anything, and at 8.0 the finished board is
    # motionless for about five and a half seconds.
    "map": {"kind": "columns", "park": True, "reserve": 8.0, "columns": [
        {"head": "Python", "tone": "subject", "items": [
            "the data model",
            "async IO",
            "code specialises"]},
        {"head": "C++", "tone": "machinery", "items": [
            "object lifetime",
            "RAII",
            "undefined behaviour"]},
        {"head": "Rust", "tone": "verified", "items": [
            "ownership",
            "unsafe and Miri",
            "GPU kernels"]},
        {"head": "JS and TS", "tone": "machinery", "items": [
            "closures, this",
            "the event loop",
            "types, erased"]},
    ]},

    # The shared ladder, as a stack, because the order of the stages is the
    # whole argument. A stack pill is a fixed five units wide, so the layer
    # names are short and the glosses carry the content.
    #
    # No focus: the map was built one beat ago with all four columns lit, which
    # is exactly the state a beat about all five languages wants, and a
    # redundant focus redraws an identical frame at a cost of about a second of
    # panel delay.
    "question": {"kind": "stack", "tone": "machinery", "reserve": 5.0,
                 "layers": [
                     ("0. setup", "the one organising idea"),
                     ("1. foundations", "correct small programs"),
                     ("2. proficiency", "idiomatic, maintainable"),
                     ("3. advanced", "concurrency, memory, failure"),
                     ("4. expert", "explain it from the spec"),
                 ]},

    # Three items beside the parked map, each inside the thirty character
    # budget a `points` item has in the seven point eight units left over.
    "python": {"kind": "points", "tone": "subject", "reserve": 5.0,
               "focus": "Python",
               "head": "the parts you can miss for years",
               "items": [
                   "dunders, and descriptors",
                   "hot bytecode specialises",
                   "async IO, not CPU",
               ]},

    # The head row is a reveal of its own, so this is four reveals rather than
    # three. The corner cell is filled rather than blank: an empty corner cell
    # slid a whole header one column left in an earlier episode.
    #
    # The cells stay inside eighteen characters, which is what fits beside the
    # parked map.
    "systems": {"kind": "table", "reserve": 5.0, "focus": ["C++", "Rust"],
                "head": ["the question", "C++", "Rust"],
                "rows": [
                    ["whose job it is", "the programmer", "the compiler"],
                    ["what a bug means", "no defined meaning", "it will not build"],
                    ["a tool for the gap", "none", "Miri, on unsafe"],
                ]},

    # Four rules and a head. Toned `machinery`, matching the column it lights,
    # and because these are rules about how a runtime behaves rather than
    # measured figures or verdicts. The heading draws in the subject colour
    # whatever the tone, which is a known limitation of `points`.
    "js_ts": {"kind": "points", "tone": "machinery", "reserve": 5.0,
              "focus": "JS and TS",
              "head": "the rules behind the surprises",
              "items": [
                  "closures capture variables",
                  "this is bound by the caller",
                  "one thread, one task queue",
                  "types erased before it runs",
              ]},

    # Three answers to one question, and the grid is the content: what you
    # write, at what granularity, and how far along it is.
    "frontier": {"kind": "table", "reserve": 5.5, "focus": "Rust",
                 "head": ["what is new", "you write", "where it is"],
                 "rows": [
                     ["cuda-oxide", "a thread", "early alpha"],
                     ["cutile-rs", "a tile", "in production"],
                     ["Mojo", "one file, CPU+GPU", "open source, 1.0"],
                 ]},

    # The take, as four lines that unfold with it rather than one card held
    # still for the length of the conclusion.
    "close": {"kind": "points", "tone": "subject", "reserve": 5.5,
              "focus": ["Python", "C++", "Rust", "JS and TS"],
              "head": "what the map is for",
              "items": [
                  "five ladders, not five climbs",
                  "Python is where you work",
                  "one to read the machine in",
                  "start at the stage 3 gate",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    turns = sum(len(t) for t in SCRIPT.values())
    b_turns = sum(1 for t in SCRIPT.values() for who, _ in t if who == B)
    print(f"{len(SCRIPT)} beats, {turns} turns ({b_turns} for B), {words} words")
    # `map` is an inventory and is read about fifty words a minute slower.
    slow = sum(len(line.split()) for _, line in SCRIPT["map"])
    secs = (words - slow) * 0.40 + slow / 100 * 60
    print(f"about {secs / 60:.2f} minutes ({secs:.0f}s)")
    for key, t in SCRIPT.items():
        w = sum(len(line.split()) for _, line in t)
        est = w / 100 * 60 if key == "map" else w * 0.40
        n = len(t)
        print(f"  {key:10s} {w:3d} words  ~{est:4.0f}s  ({n} turns)")
