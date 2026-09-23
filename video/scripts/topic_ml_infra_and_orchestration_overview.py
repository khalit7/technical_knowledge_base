"""
Topic overview: ML infra and orchestration, as of 22 September 2026.

Source: the canonical Notion page "Topic: ml-infra-and-orchestration", read
from Notion directly on 22 September 2026 rather than from the repo mirror.
Every name, figure and status claim below is on that page. Nothing is imported
from the five deep dives underneath it, and nothing is invented for shape.

Which kind of overview this is. A comparison, and an unusually honest one,
because the page does not present a field of rivals: it presents four layers
and glosses each of them as a question. "Four layers: compute schedulers (who
gets which GPU), workflow orchestrators (what runs when and why), infra as code
+ cloud (how the machines exist at all), and observability + tracking (how you
know it worked)." So the map is those four questions, the products are what
hangs off each one, and the tour is one row at a time.

The organising question, and why it is the page's rather than the video's. The
page carries one sentence that cuts across the whole board: "Kubernetes is the
industry platform everything else is converging on; raw K8s is bad at batch ML,
so Kueue (quota + gang admission), Volcano, and training operators ... fill the
gap." That is a genuine spine, it is the page's own, and it makes every row's
tour mean something: the schedulers row is where the convergence is happening,
KubeRay and Flyte are on the far side of it, HyperPod has an EKS flavour, and
the observability row is untouched by it. So the question beat states the
convergence and then asks the only question that follows from it: if that is
true, why is the rest of the board still there?

The cut cleared in 74326b3 found the four-question axis independently, and that
axis is kept, because it is the page's own framing. Four things from that cut
are deliberately not kept:

  - Its organising question was "the same fork runs through all four rows: the
    cluster world or the Kubernetes world". That is not on the page and it is
    not true of all four rows: the orchestrators do not fork that way, and the
    observability row does not fork at all. A video may add explanation and may
    not add a thesis, so the fork is stated where the page states it, on the
    scheduler row, and the cross-cutting claim is the page's own convergence
    sentence instead.
  - It claimed the page "says outright who it is written for, a SLURM native
    learning the cloud side". The topic page says no such thing; one of its
    five deep dives is subtitled "a learning track for a SLURM native". That is
    a figure imported from a child page, which is the specific defect the
    method warns about.
  - Not one of its beats carried a `reserve`, so every panel finished drawing
    at the very end of its budget.
  - It used `compare` on `schedulers` and on `machines`, two of its longest
    beats. A `compare` has exactly two reveals, so a fifty second beat on one
    is a twenty second motionless frame. Both are `points` here, with five and
    six reveals.
  - Its close was a `claim`: two reveals over a forty five second take, which
    is the motionless closing card every early overview in this series shipped.
    Six reveals here, and a small reserve.

The outline that survived the revision step:

    ident       what this is, in the page's own "training script to 256 GPUs
                with a bill I can explain" words, and how current
    map         the four questions, built whole and parked as the home frame
    question    the convergence, flat, and the question it leaves behind
    schedulers  row one, where the convergence is actually happening, and the
                gap that Kueue, Volcano and the training operators fill
    ray         the third answer on that row, and the one no deep dive owns
    pipelines   row two: five orchestrators that disagree about what a pipeline
                is made of
    machines    row three, as one question: does the cluster outlive the job?
    watch       row four, the one the page puts last and people skip
    close       the take, and the one live fact that dates the second row

What the step-5 critique changed:

  - Draft one opened the map on the four layers as nouns (schedulers,
    orchestrators, infra as code, observability). Nouns are a contents page.
    The page itself glosses every layer as a question, so the map carries the
    questions and the nouns arrive as answers to them.
  - Draft one had Ray inside the scheduler beat, which turned that beat into a
    three-way comparison and flattened the convergence the episode rests on.
    Ray is its own beat, placed after the convergence so that it reads as the
    thing that sits across it rather than inside it.
  - Draft one ran ten beats and 1,111 words, which is about seven and a half
    minutes: one rung below where the encode ladder gives up 1080p, and past
    the wall this method sets. The data engines beat went, for the reasons in
    "what was cut" below.
  - Kueue, Volcano and the training operators were a list in draft one. They
    are one point (raw Kubernetes has no gang admission, and these are what put
    it back), so the beat states the gap first and the list becomes its answer.
  - The consolidation fact sat in the ident in draft one, where it was trivia.
    It is in the close, where it dates the second row.
  - A draft-one closing line predicted which of Prefect and Dagster survives
    the merge. The page makes no such prediction and neither may the video, so
    it is an observation about one roadmap instead.
  - B was agreeing in draft one. B has one turn now, and it is the question the
    whole episode answers: is there one of these I can learn and skip the rest?

What was cut, so the next person can see the second episode sitting there
rather than rediscover it:

  - The data engines branch in full: Polars as the single-node speed king that
    often replaces a whole Spark cluster, Dask for distributed pandas and
    arrays, Spark as the JVM heavyweight proven at petabytes, Ray Data
    streaming into GPU training, and datatrove for FineWeb-style trillion-token
    text curation. It is the one branch of the page's diagram that its own
    four-layer framing does not name, it lives on the same deep dive as the
    orchestrators, and a beat on it costs forty five seconds this episode does
    not have. Ray Data survives as one clause in `ray`, because it is part of
    what makes Ray one runtime. That branch plus the FineWeb pipeline is the
    obvious second episode from this page.
  - Apptainer is named in `machines` and is not on the map, because a fifth
    pill in the third column pushes the map beat's arithmetic past what a
    parked beat's reserve can hold. Volcano, Kubeflow Trainer v2 and KubeRay
    are named in narration and are not on the map for the same reason.
  - The five deep dives by name, and the Best starting resources block. A
    resources card is a deep dive's obligation; this close points at the page,
    and the page carries all of it.

Nothing here needed back-porting to the page. Two things were checked for it
and did not qualify: "gang scheduling" and "ephemeral" are both glossed in the
narration, and both are already glossed in context on the page itself. Every
page mention was checked through the API rather than through `notion-fetch`,
which renders them as bare `<mention-page url=.../>`; all nine carry their
titles.

Speakers:
  A  narrator, owns the spine and the map
  B  the listener, one turn, which is the question the episode answers

Numbers and names are spelled the way they should be said, because text to
speech reads "256", "K8s", "W&B", "MLflow" and "SageMaker" badly. Five shapes
were rewritten before the first render on rules this method already carries:
"SLURM" is said "Slurm", because an all-caps name that is also a sayable word
is the shape that turned "HELM" into "LM"; "SageMaker HyperPod" is said "Sage
Maker Hyper Pod" and "KubeRay" is said "Kube Ray", because a welded compound is
the shape that produced "postgres cool"; "MLflow" is said "M L flow", because a
word welded to an acronym is the same shape again; "EventBridge" is said "Event
Bridge"; and no segment opens or closes on "Kueue", "Pyxis" or "Flyte", because
a fragile name at either end of a segment has nothing to recover from.

Reveal arithmetic, which set the length. `spread` puts reveal k of n at
`(k-1)/(n-1) x (beat_length - reserve)`, so a panel with n reveals wants n
narration segments, the first n-1 naming one reveal each and the last short
enough to sit inside the reserve. On the parked map that is the binding
constraint rather than a preference: the reserve is capped near 8.3 there
(`still` is about `reserve - 2.4` and the cap on `still` is six), so everything
said after the fourth column is named has to fit inside about eighteen words.
The map's four segments are therefore 32, 33, 23 and 24 words rather than four
equal ones, and the last column is named six words into the last segment.

Lit state of the map, decided for every beat rather than left to inherit,
because `focus` is a state and persists until something changes it:

    map         builds with all four columns lit
    question    inherits all four, which is right: the claim is about the board
    schedulers  lights "who gets the GPUs"
    ray         no focus at all. The previous beat already left column one lit
                and lighting it again buys nothing and costs about a second of
                panel delay at the head of the beat. This is a decision, not an
                omission.
    pipelines   lights "what runs when"
    machines    lights "how it all exists"
    watch       lights "how you know"
    close       lights all four, which is how this vocabulary says no emphasis

No column is toned `context`, because a focus on a context-toned column is
invisible: that tone is already the de-emphasis colour. That forces four
distinct tones, and `number` on the third column is the weakest fit of the
four. It is chosen over `cost`, which would say on screen that infrastructure
as code is a mistake, a verdict the page does not take.

No contract beat, deliberately: an overview's contract is the map itself, built
whole before anything is explained, and `check_structure.py` exempts the format
for exactly that reason. No resources card either, which is a deep dive's
obligation.

Pace, which was the expensive part of this episode. Five beats came back above
the 158 the renderer should be held to, and none of them was fixed by a seed.
What fixed every one of them was splitting the beat's turns: `render.py` emits
one conversation item per turn, so more turns means more prosodic boundaries
and a slower read of the identical words. `ident` went from two turns at 162 to
four at 123. `schedulers` went from five turns at 161 to nine at 149. `close`
was the stubborn one: at eight turns it came back at 159, 164, 165, 170 and 190
across five seeds, and at thirteen turns, every one of them a complete
sentence, it read 156 first time. No words cut and no seconds of narration
added.

Six defects got through the character gate and were caught by reading the
transcripts as text. Every one of them scored under 0.03:

  - "Kueue" is the name this page cannot say. It came back as "QP", "Kua",
    "Q", "Koei" and "QU" across five seeds in two beats. It is pronounced
    "queue", so the sound is not really wrong and the transcriber has nothing
    to write it as. Respelling it "Kew" made it worse, because that read as a
    bare letter Q and then as "Kube", which is a different product on the same
    row. The fix that worked is the one this method already carries for
    "lighteval": give the name a category word right behind it, so it is
    recoverable however the middle lands. The narration now says "the Kueue
    add on" and "Kueue, a batch queue that only admits a job when its whole
    gang can run", and the panel carries the spelling.
  - A fragile name opening a turn was eaten outright. "Slurm is the high
    performance computing incumbent" came back as "Is the high performance
    computing incumbent?", with "Slurm" absorbed into the previous sentence as
    "Who gets which GPU floor?". The subject of the sentence was simply gone
    and the character error was 0.015. "The incumbent there is Slurm, out of
    high performance computing" reads correctly.
  - A possessive on a fragile name. "Prefect's twenty twenty six acquisition
    of Dagster Labs" came back as "prefix 2026 acquisition". Written as
    "Dagster Labs was acquired by Prefect in twenty twenty six" the name is
    mid-sentence and not possessive, and it is right.
  - A single real word swapped. "you look at them in Grafana" came back as
    "you look at him in Grafana", at a character error of 0.009. Rewritten as
    "you read the result in Grafana".
  - "Enroot" came back as "enroute" in `machines` while reading correctly in
    `map`, which is the rule about a name failing in one beat and not another,
    seen again. Respelled "En root" in that beat only. The transcriber still
    writes "enroute", which is a homophone of the correct pronunciation, so
    this one is left as a transcriber convention rather than chased further.
  - "G P Us" came back as "GP WUS" in `ident` once and as "GPS" everywhere
    else. The plural spelled acronym is a transcriber convention this method
    already records; the one-off was re-rendered with the pace fix anyway.

Length, and the thirteen seconds that bought 1080p back. The first complete
cut ran 7 minutes 00 and the ladder delivered it at 720p. Encoding the master
by hand at 1080p and rate factor 34 showed why: 4.73 MiB against a 4.70 cap, a
miss of six tenths of one percent. That is worth knowing as a procedure rather
than as a number, because it turns "trim and hope" into arithmetic: render the
master, encode it at the last 1080p rung yourself, and the overshoot tells you
how many seconds to cut. Sixteen words out of `ray` and five out of `watch`
took the episode to 6 minutes 47 and the same rung to 4.64 MiB. This page has
a parked map and a dense table on screen for most of its length, which are the
two things closest to the legibility floor at 720p, so the trim was worth more
here than the material it cost.

What the trim cost, recorded so it is a decision rather than a loss: "including
D D P and F S D P" went out of the `ray` beat, so Ray Train is named without
the two parallelism schemes the page lists for it; and "That part is ordinary
monitoring" went out of `watch`, which was filler.

Reserve arithmetic, fitted from the rendered durations rather than guessed. On
an ordinary beat `still` came out at about `reserve + 0.37`, so 5.5 is the real
ceiling and 6.0 is not; on the parked map `still` was `reserve - 2.35`. Two
panels grew a row rather than take a bigger reserve, which is the cheaper fix
and the one the arithmetic actually asks for: `schedulers` went from four items
to five because Volcano and the training operators had no reveal of their own,
and `ray` went from four to five because everything said after KubeRay was
named had to fit inside the reserve, which was twelve seconds of narration
against a ceiling of five.

Delivered: 6 minutes 47, 1080p, 4.64 MiB, on the third and last 1080p rung.
143 words a minute overall, no beat above 155 by `check_timing`, every still
under 5.7, no lead anywhere, layout audit clean.

Re-cut 23 September 2026, for timing only. "No lead anywhere" above was true of
the check as it then stood; once `check_leads` modelled the focus delay (five
seconds at the head of every beat carrying `focus` against this twenty handle
map) it found 11 reveals named before they were drawn, worst 8.2 seconds
(Kueue), and 5 reveals it could not time at all. Every spoken word and every
wav is unchanged; only `VISUALS` moved. The heads of `schedulers` and `close`
went, because behind the focus delay each cost every row a place. `schedulers`
split Volcano from the training operators, and its closing SLURM then
Kubernetes sentence, into two rows each; `machines` split the glue from the
S3 layout, and `watch` split its two trackers, so each beat's last reveal lands on its last sentence. Three heads
and two `ray` items were reworded to words the line actually says, so every
reveal is now timed. Reserves were swept to what `check_leads --reserves`
suggests, except `schedulers` (5.0) and `pipelines` (4.5), which sit above it
because `--words`, timing from the voice's own word timestamps, put their last
reveals at 3.3 and 3.1 seconds on the suggested values. Worst lead after, by
word timestamps: 2.7 seconds.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: ml-infra-and-orchestration"
SUBTITLE = "four questions you answer whether you meant to or not"
UPDATED = "22 September 2026"

SCRIPT: dict[str, list[tuple[str, str]]] = {}

# --- what this is, and how current ----------------------------------------
SCRIPT["ident"] = [
    (A, "This is the map of M L infrastructure and orchestration."),
    (A, "It covers everything between, I have a training script, and, it runs "
        "reliably on two hundred and fifty six G P Us, with metrics, "
        "checkpoints, and a bill I can explain."),
    (A, "That gap is four layers and about fifteen tools, and from outside "
        "they all look interchangeable. They are not."),
    (A, "Current as of the twenty second of September, twenty twenty six."),
]

# --- the inventory, named before anything is explained --------------------
# Four columns, four reveals, four segments. Sized by the reserve cap rather
# than by taste: reveal four lands at `beat_length - reserve`, the reserve
# cannot go past about 8.3 on a parked beat, so the fourth column is named six
# words into the last segment and only eighteen words follow it. The last line
# is the one that has to survive the collapse into headings, so the beat hands
# over on the board rather than on a name.
SCRIPT["map"] = [
    (A, "Whole board first, grouped the way the page groups it. Nothing "
        "explained yet. Who gets which G P U. Three answers to that one: "
        "Slurm, Kubernetes with the Kueue add on, and Ray."),
    (A, "What runs when, and why. That is the orchestrators, and there are "
        "five of them: Dagster, Airflow three, Prefect, Flyte, and Metaflow. "
        "They do not agree about what a pipeline is made of."),
    (A, "How the machines exist at all. That is Terraform, Sage Maker Hyper "
        "Pod, S three and Lambda, and Enroot with Pyxis for containers."),
    (A, "And how you know it worked. D C G M into Prometheus, Grafana, "
        "Weights and Biases, M L flow. That is the whole board."),
]

# --- the organising question ----------------------------------------------
# A `claim` has two reveals, so twenty five seconds is its honest budget. The
# note lands at `beat_length - reserve`, so the sentence it paraphrases is the
# last thing said rather than the middle of the beat.
SCRIPT["question"] = [
    (B, "Fifteen tools. Four layers. Is there one of these I can learn, and "
        "skip the rest?"),
    (A, "The page gives a straight answer to that. And it is Kubernetes."),
    (A, "It is the industry platform that everything else is converging on."),
    (A, "Which leaves the obvious question. If that is true, why is the rest "
        "of the board still there?"),
]

# --- row one: where the convergence is actually happening ------------------
# Five reveals, five segments. `points` rather than `compare`, because the
# material is a gap and the three things that fill it, not two positions.
SCRIPT["schedulers"] = [
    (A, "Start at the top row, because that is where the convergence is "
        "actually happening. Who gets which G P U."),
    (A, "The incumbent there is Slurm, out of high performance computing."),
    (A, "Gang scheduling is native, so a job gets all of its nodes at once or "
        "it waits. Jobs are batch scripts."),
    (A, "Kubernetes is where the industry is heading."),
    (A, "But raw Kubernetes is bad at batch machine learning, and gang "
        "admission is the piece it does not have."),
    (A, "The gap is filled by Kueue, a batch queue that only admits a job "
        "when its whole gang can run, and it brings quota with it. Volcano "
        "does the same job a different way."),
    (A, "And the training operators, Kubeflow Trainer version two and Kube "
        "Ray, shape the jobs."),
    (A, "So the pragmatic twenty twenty six read is this."),
    (A, "Slurm still wins for pure large scale pretraining. Kubernetes wins "
        "the moment you also serve models, or run many teams."),
]

# --- the third answer on that row -----------------------------------------
# No `focus`: the previous beat left column one lit, which is the state this
# beat wants, and a redundant focus costs about a second of panel delay.
SCRIPT["ray"] = [
    (A, "There is a third answer on that row, and no deep dive owns it. Ray "
        "writes distributed work as an ordinary Python program."),
    (A, "Decorate a function and you get a stateless task. Ray schedules it "
        "on the cluster, and a shared object store carries data between the "
        "pieces."),
    (A, "Decorate a class instead and you get a stateful actor, which holds "
        "state between calls. Those two decorators are the programming "
        "model."),
    (A, "One runtime then spans stages that usually take three systems. Ray "
        "Data keeps the G P Us fed. Ray Train wraps distributed training. "
        "And Ray Serve hosts inference."),
    (A, "Kube Ray runs it as a Kubernetes custom resource. Reach for Ray when "
        "preprocessing, training and serving belong in one program. Not for "
        "a fixed size pretraining run."),
]

# --- row two ---------------------------------------------------------------
# A `table` with a head row is six reveals, not five: the head is a reveal of
# its own. The corner cell is filled rather than blank, because a blank corner
# in a header row slides the whole header one column left.
SCRIPT["pipelines"] = [
    (A, "Second row lighting up. What runs when, and why. And the difference "
        "between these five is in the right hand column. What each one "
        "thinks a pipeline is made of."),
    (A, "Dagster says assets. The nodes of the graph are the datasets and the "
        "models themselves, not the jobs that produce them."),
    (A, "Airflow three says tasks. A directed graph of them, and an enormous "
        "ecosystem of integrations around it."),
    (A, "Prefect says dynamic Python flows, where the shape of the run is "
        "decided while the run is happening."),
    (A, "Flyte says typed steps, with the types checked between them, and the "
        "whole thing is Kubernetes native."),
    (A, "And Metaflow optimises for something else entirely. Data scientist "
        "ergonomics. It came out of Netflix."),
]

# --- row three -------------------------------------------------------------
SCRIPT["machines"] = [
    (A, "Third row. How the machines exist at all. The question that separates "
        "the managed platforms is whether the cluster outlives the job."),
    (A, "Sage Maker Hyper Pod says yes. A persistent cluster, in a Slurm or "
        "an E K S flavour, with health monitored nodes that get replaced, "
        "and jobs that resume themselves."),
    (A, "Plain Sage Maker training jobs say no. Ephemeral capacity, handed to "
        "you per job. Vertex A I is Google Cloud's equivalent."),
    (A, "Underneath either of them is Terraform, with its state, its modules "
        "and its workspaces."),
    (A, "Containers come from En root with Pyxis on a Slurm cluster, or from "
        "Apptainer, which used to be called Singularity."),
    (A, "And the glue is what decides your bill. An S three layout for "
        "datasets and checkpoints, with Lambda and Event Bridge between "
        "them."),
]

# --- row four --------------------------------------------------------------
SCRIPT["watch"] = [
    (A, "Last row, and the page puts it last as well. How you know it "
        "worked."),
    (A, "G P U metrics come out of the D C G M exporter. That feeds "
        "Prometheus, and you read the result in Grafana."),
    (A, "What to alert on is the line worth memorising, and there are three. "
        "Throughput drops. N C C L stalls. Node health."),
    (A, "Experiment tracking is Weights and Biases if you want it hosted."),
    (A, "Or M L flow, if you want open source with a model registry."),
    (A, "And then checkpoint hygiene, which is the difference between a run "
        "you can resume and a run you have to repeat."),
]

# --- the take --------------------------------------------------------------
# Six reveals and a small reserve, because a closing `claim` is the motionless
# card every early overview in this series shipped.
SCRIPT["close"] = [
    # Thirteen turns for 118 words, which looks like over-punctuation and is
    # not: `render.py` emits one conversation item per turn, so more turns
    # means more prosodic boundaries and a slower read of the identical words.
    # This beat came back at 159, 164, 165, 170 and 190 words a minute across
    # five seeds at eight turns. Every turn below is a complete sentence,
    # because a verbless fragment is what the model pours an invention into.
    (A, "So what is the map for?"),
    (A, "Not for picking products off it."),
    (A, "It is for noticing something."),
    (A, "You answer all four of these questions whether you meant to or not."),
    (A, "The expensive one is the question you answered by accident."),
    (A, "Nobody ever wrote it down."),
    (A, "What to watch is the floor moving."),
    (A, "Kubernetes is the platform everything else is converging on."),
    (A, "The gap fillers exist because it did not arrive ready for batch "
        "work."),
    (A, "And one live fact that dates the second row."),
    (A, "Dagster Labs was acquired by Prefect in twenty twenty six."),
    (A, "So two of those five answer to one company."),
    (A, "Which is a better reason to read that row properly than any feature "
        "table would be."),
]


VISUALS = {
    "ident": {"kind": "title"},

    # The home frame, and the axis: the page's own four layers, each glossed
    # as the question the page glosses it with. The headings are compressed
    # forms of the questions the narration asks in full, because the parked
    # map is four headings in 4.2 units and a 23 character heading scales the
    # strip down to where it stops being readable at the delivery encode.
    #
    # Tones. Subject for the scheduler row, which the episode keeps coming
    # back to. Machinery for the orchestrators, which are literally apparatus
    # bolted around a training script. Verified for observability, which is
    # the row whose whole job is knowing something is true. Number for the
    # cloud row, the weakest of the four and chosen over `cost`, which would
    # deliver a verdict the page does not take. None is `context`, so every
    # column has somewhere to brighten from when a later beat lights it.
    "map": {"kind": "columns", "park": True, "reserve": 7.7, "columns": [
        {"head": "who gets the GPUs", "tone": "subject", "items": [
            "SLURM",
            "Kubernetes + Kueue",
            "Ray"]},
        {"head": "what runs when", "tone": "machinery", "items": [
            "Dagster",
            "Airflow 3",
            "Prefect",
            "Flyte",
            "Metaflow"]},
        {"head": "how it all exists", "tone": "number", "items": [
            "Terraform",
            "SageMaker HyperPod",
            "S3 and Lambda",
            "Enroot + Pyxis"]},
        {"head": "how you know", "tone": "verified", "items": [
            "DCGM + Prometheus",
            "Grafana",
            "Weights and Biases",
            "MLflow"]},
    ]},

    # The card carries the convergence sentence's spine; the narration says
    # the full sentence, so they share their key words without either reading
    # the other out. No focus: the map was built one beat ago with all four
    # columns lit, which is the state a claim about the whole board wants.
    "question": {"kind": "claim", "reserve": 2.8,
                 "text": "Kubernetes is the platform\n"
                         "everything else is converging on.",
                 "note": "so why is the rest of this board still there?"},

    # Seven rows and no head. Re-cut 23 September 2026 for timing only: once
    # check_leads modelled the five second focus delay, the head was pushing
    # every row one place late and Kueue was named 8.2 seconds before it was
    # drawn. Dropping the head and splitting Volcano from the training
    # operators (a row after Kueue pulls Kueue earlier) closed all four leads
    # on this beat with the audio untouched. The closing sentence is two rows,
    # SLURM and then Kubernetes, because word timestamps put "Slurm still
    # wins" 3.3 seconds ahead of a single row carrying both halves.
    "schedulers": {"kind": "points", "tone": "subject", "reserve": 5.0,
                   "focus": "who gets the GPUs",
                   "items": [
                       "SLURM: gang scheduling is native",
                       "raw Kubernetes is bad at batch ML",
                       "Kueue adds quota and gang admission",
                       "Volcano does the same job",
                       "Kubeflow Trainer and KubeRay",
                       "SLURM still wins pretraining",
                       "Kubernetes wins once you serve",
                   ]},

    # A fifth row so that the last thing said has a reveal of its own to land
    # on: with four, everything after KubeRay was named had to fit inside the
    # reserve, which is twelve seconds of narration against a ceiling of five.
    "ray": {"kind": "points", "tone": "subject", "reserve": 2.8,
            "head": "Ray: the third answer",
            "items": [
                "function: a stateless task",
                "class: a stateful actor",
                "Ray Data, Ray Train, Ray Serve",
                "KubeRay runs it on Kubernetes",
                "not for fixed-size pretraining",
            ]},

    "pipelines": {"kind": "table", "tone": "machinery", "reserve": 4.5,
                  "focus": "what runs when",
                  # A filled corner cell, deliberately: a blank one in a header
                  # row slides the whole header a column to the left and the
                  # layout audit passes it, because nothing overlaps.
                  "head": ["orchestrator", "thinks a pipeline is made of"],
                  "rows": [
                      ["Dagster", "assets: datasets and models"],
                      ["Airflow 3", "tasks in a graph, huge ecosystem"],
                      ["Prefect", "dynamic Python flows"],
                      ["Flyte", "typed steps, Kubernetes-native"],
                      ["Metaflow", "data scientist ergonomics"],
                  ]},

    # Re-cut 23 September 2026: the head is now the words the line says, so
    # it is timed, and "the glue" and the S3 layout are two rows, so the last
    # reveal lands on the beat's last sentence rather than 3.6 seconds late.
    "machines": {"kind": "points", "tone": "number", "reserve": 3.7,
                 "focus": "how it all exists",
                 "head": "the cluster outlives the job?",
                 "items": [
                     "HyperPod: persistent, nodes replaced",
                     "training jobs: ephemeral, per job",
                     "Terraform: state, modules, workspaces",
                     "Enroot and Pyxis, or Apptainer",
                     "the glue decides your bill",
                     "S3 layout, Lambda, EventBridge",
                 ]},

    # Re-cut 23 September 2026: head spoken verbatim so it is timed, and the
    # two trackers split into two rows so MLflow has its own landing.
    "watch": {"kind": "points", "tone": "verified", "reserve": 2.9,
              "focus": "how you know",
              "head": "how you know it worked",
              "items": [
                  "DCGM, Prometheus, Grafana",
                  "throughput drops, NCCL stalls, node health",
                  "Weights and Biases, hosted",
                  "MLflow: open source, a registry",
                  "resume the run, or repeat it",
              ]},

    # Lighting every column is how this vocabulary says no emphasis, and it is
    # also true: the close is about the whole board.
    "close": {"kind": "points", "tone": "subject", "reserve": 4.4,
              "focus": ["who gets the GPUs", "what runs when",
                        "how it all exists", "how you know"],
              # No head since the 23 September re-cut: behind the five second
              # focus delay it cost every row a place, five leads of 3.4 to 5.2
              # seconds. Six rows and a small reserve. A closing `claim` draws one card
              # and then holds it for the length of the take, which is the
              # motionless frame every early overview in this series shipped.
              "items": [
                  "four questions, answered either way",
                  "the expensive one you answered by accident",
                  "Kubernetes: the floor is moving",
                  "the gap fillers put batch back",
                  "Prefect now owns Dagster Labs",
                  "read the row, not the feature table",
              ]},
}


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words * 0.40:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:12s} {len(turns)} turns  {w:3d} words  ~{w * 0.40:4.0f}s")
