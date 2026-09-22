"""
Topic overview: ML infra and orchestration, as of 22 September 2026.

The load-bearing idea, and why this page earns a video: this topic looks like a
tool catalogue and is not one. It is four questions you answer whether you meant
to or not (who gets which GPU, what runs when and why, how the machines exist at
all, how you know it worked), and every one of those four rows has the same fork
inside it: the cluster world or the Kubernetes world. The page says outright who
it is written for, a SLURM native learning the cloud side, so that fork is the
axis and the products are what hangs off it. Getting that right was most of the
work: fifteen product names read aloud would have been a catalogue, not an
episode.

The outline that survived the revision step:

    ident       what this is, in the page's own "training script to 256 GPUs
                with a bill I can explain" words, and who it is written for
    map         the four questions, built and parked as the home frame
    question    the same fork runs through all four rows: which world?
    schedulers  row one, the two worlds side by side: SLURM against Kubernetes
    ray         the third scheduler, the one no deep dive owns
    pipelines   row two, and the difference is what each engine thinks a
                pipeline is made of
    data        what actually moves the bytes, chosen by scale
    machines    row three, as a question about whether the cluster outlives
                the job
    watch       row four, the one people skip
    close       the take, and the one live market fact: Prefect and Dagster
                are now one company

What the step-4 critique changed:

  - Draft one opened on the four layers as nouns (schedulers, orchestrators,
    IaC, observability). Nouns are a contents page. The page itself glosses
    each layer as a question, so the map now carries the questions and the
    nouns arrive as answers.
  - Draft one had Ray inside the scheduler beat, which made that beat a
    three-way comparison and flattened the SLURM/Kubernetes fork the whole
    episode rests on. Ray is now its own beat, placed after the fork so it
    reads as the thing that does not fit it.
  - Kueue, Volcano and the training operators were a list in draft one. They
    are one point (raw Kubernetes lacks gang admission, and these are what put
    it back), so B now asks that question and the list becomes an answer.
  - The consolidation fact was in the ident in draft one, where it was just
    trivia. Moved to the close, where it is the thing that dates the map.
  - A draft-one closing line predicted which of Prefect and Dagster survives
    the merge. The page makes no such prediction and neither may the video, so
    it became an observation about the roadmaps instead.
  - B was agreeing in draft one. B now interrupts three times: to ask where
    anyone starts, to ask what raw Kubernetes actually lacks, and to name what
    the last row is worth.

Everything traces to the canonical page "Topic: ml-infra-and-orchestration",
including the pragmatic 2026 scheduler read, the Ray positioning, and Prefect's
2026 acquisition of Dagster Labs.

Numbers and names are spelled the way they are said, because text to speech
reads "256", "K8s" and "W&B" badly.
"""

A = "A"
B = "B"

FORMAT = "overview"
TITLE = "Topic: ml-infra-and-orchestration"
SUBTITLE = "four questions you answer whether you meant to or not"
UPDATED = "22 September 2026"

VISUALS = {
    "ident": {"kind": "title"},

    "map": {"kind": "columns", "park": True, "columns": [
        {"head": "who gets which GPU", "tone": "subject",
         "items": ["SLURM", "Kubernetes + Kueue", "Ray", "SageMaker HyperPod"]},
        {"head": "what runs when, and why", "tone": "machinery",
         "items": ["Dagster", "Airflow 3", "Prefect", "Flyte", "Metaflow"]},
        {"head": "how the machines exist", "tone": "number",
         "items": ["Terraform", "S3, Lambda, EventBridge", "Enroot + Pyxis"]},
        {"head": "how you know it worked", "tone": "verified",
         "items": ["DCGM + Prometheus", "Grafana", "W&B", "MLflow"]},
    ]},

    "question": {"kind": "claim",
                 "text": "Not which tool.\nWhich world: the cluster, or Kubernetes?",
                 "note": "the same fork runs through all four rows"},

    "schedulers": {"kind": "compare", "focus": "who gets which GPU", "sides": [
        {"head": "SLURM", "tone": "subject", "items": [
            "gang scheduling is native",
            "jobs are batch scripts",
            "still wins on pretraining ergonomics"]},
        {"head": "Kubernetes", "tone": "machinery", "items": [
            "Kueue: quota and gang admission",
            "Kubeflow Trainer v2, KubeRay, Volcano",
            "wins the moment you also serve models"]},
    ]},

    "ray": {"kind": "points", "head": "Ray: the third scheduler", "items": [
        "a function becomes a task, a class becomes an actor",
        "Ray Data, Ray Train, Ray Serve: one runtime, three stages",
        "KubeRay runs it as a Kubernetes custom resource",
        "for elastic, heterogeneous work, not fixed-size pretraining",
    ]},

    "pipelines": {"kind": "table", "focus": "what runs when, and why",
                  "head": ["", "thinks a pipeline is made of"],
                  "rows": [
                      ["Dagster", "assets: the datasets and models themselves"],
                      ["Airflow 3", "a DAG of tasks, and a huge ecosystem"],
                      ["Prefect", "dynamic Python flows, shaped at runtime"],
                      ["Flyte", "typed steps, Kubernetes-native"],
                      ["Metaflow", "data-scientist ergonomics"],
                  ]},

    "data": {"kind": "columns", "columns": [
        {"head": "single node", "tone": "subject", "items": ["Polars"]},
        {"head": "distributed frames", "tone": "machinery", "items": ["Dask", "Spark"]},
        {"head": "into the GPU", "tone": "number", "items": ["Ray Data"]},
        {"head": "text curation", "tone": "verified", "items": ["datatrove"]},
    ]},

    "machines": {"kind": "compare", "focus": "how the machines exist", "sides": [
        {"head": "the cluster outlives the job", "tone": "verified", "items": [
            "SageMaker HyperPod",
            "a SLURM or an EKS flavour",
            "nodes replaced, jobs auto-resumed"]},
        {"head": "the job brings the cluster", "tone": "machinery", "items": [
            "SageMaker training jobs",
            "ephemeral, per-job capacity",
            "Vertex AI is the GCP equivalent"]},
    ]},

    "watch": {"kind": "points", "focus": "how you know it worked",
              "head": "how you know it worked", "items": [
        "DCGM exporter, Prometheus, Grafana",
        "alert on: throughput drops, NCCL stalls, node health",
        "W&B hosted, or MLflow open source with a registry",
        "checkpoint hygiene: resume the run, or repeat it",
    ]},

    "close": {"kind": "claim",
              "text": "Four questions you answer whether you meant to or not.\n"
                      "The pain is always the one you answered by accident.",
              "note": "and since Prefect's 2026 acquisition of Dagster Labs, "
                      "two of those five orchestrators are one company"},
}

SCRIPT: dict[str, list[tuple[str, str]]] = {}

SCRIPT["ident"] = [
    (A, "This is the map of M L infrastructure and orchestration. It covers "
        "everything between, I have a training script, and, it runs reliably "
        "on two hundred and fifty six G P Us, with metrics, checkpoints, and a "
        "bill I can explain."),
    (A, "And it is written for a particular person. Somebody who already knows "
        "a cluster and is learning the cloud side. So that contrast runs "
        "through all of it. Current as of the twenty second of September, "
        "twenty twenty six."),
]

# --- the inventory, before any explanation --------------------------------
SCRIPT["map"] = [
    (A, "Here is the whole board, grouped the way the page groups it. Four "
        "questions. Nothing explained yet."),
    (A, "Who gets which G P U. That is the schedulers. SLURM, Kubernetes with "
        "Kueue on top of it, Ray, and SageMaker HyperPod. What runs when, and "
        "why. That is the orchestrators. Dagster, Airflow three, Prefect, "
        "Flyte, Metaflow."),
    (A, "How the machines exist at all. Terraform, S three, Lambda and "
        "EventBridge, and the container runtimes. And how you know it worked. "
        "The D C G M exporter into Prometheus, Grafana, Weights and Biases, "
        "M L flow."),
]

# --- the organising question ----------------------------------------------
SCRIPT["question"] = [
    (B, "That is four layers and about fifteen products. Where is anyone "
        "supposed to start?"),
    (A, "By noticing that the same fork runs through every one of those rows. "
        "Each layer asks you the same thing underneath. Are you in the cluster "
        "world, or the Kubernetes world?"),
    (A, "So the question this map answers is the one on the screen. Not which "
        "tool. Which world, and what the other one is costing you."),
]

# --- row one: the fork itself ---------------------------------------------
SCRIPT["schedulers"] = [
    (A, "Start at the top row, who gets which G P U, and put the two worlds "
        "side by side."),
    (A, "SLURM is the high performance computing incumbent. Gang scheduling is "
        "native, so a job either gets all of its nodes at once or it waits. "
        "Jobs are batch scripts. It is what most academic clusters run."),
    (B, "And plain Kubernetes cannot do that?"),
    (A, "Not on its own. Raw Kubernetes is bad at batch M L, and gang admission "
        "is exactly the piece it is missing. So Kueue puts it back, with quota "
        "alongside it, Volcano does the same job differently, and the training "
        "operators, Kubeflow Trainer version two and KubeRay, handle the job "
        "shapes."),
    (A, "The pragmatic twenty twenty six read is the last line on each side. "
        "SLURM still wins for pure large scale pretraining ergonomics. "
        "Kubernetes wins the moment you also serve models, run many teams, or "
        "want one platform for everything."),
]

SCRIPT["ray"] = [
    (A, "There is a third scheduler on that row, and no deep dive owns it. Ray."),
    (A, "Decorate a function and you get a stateless task. Decorate a class and "
        "you get a stateful actor. Ray schedules them across a cluster with a "
        "shared object store, so distributed code reads as ordinary Python "
        "rather than as a job script."),
    (A, "And one runtime spans stages that usually take three systems. Ray Data "
        "keeps the G P Us fed, Ray Train wraps distributed training loops "
        "including D D P and F S D P, Ray Serve hosts inference."),
    (A, "So reach for Ray when preprocessing, training and serving belong in "
        "one program, or when the work is elastic. Reinforcement learning "
        "rollouts. Batch inference. Not for a fixed size synchronous "
        "pretraining run, where its flexibility buys nothing and adds a "
        "layer."),
]

# --- row two ---------------------------------------------------------------
SCRIPT["pipelines"] = [
    (A, "Second row lighting up now. What runs when, and why. And the real "
        "difference between these five is in the right hand column. What each "
        "one thinks a pipeline is made of."),
    (A, "Dagster says assets. The nodes of the graph are the datasets and the "
        "models themselves, not the jobs that produce them. Airflow says tasks, "
        "a directed graph of them, and it carries an enormous ecosystem with it."),
    (A, "Prefect says dynamic Python flows, where the shape of the run is "
        "decided while it runs. Flyte says typed steps, Kubernetes native. And "
        "Metaflow optimises for data scientist ergonomics."),
]

SCRIPT["data"] = [
    (A, "Underneath the orchestrator is the thing that actually moves the "
        "bytes, and the page keeps these on the same deep dive for a reason. "
        "The choice is almost entirely about scale."),
    (A, "Polars is the single node speed king, and it often replaces a whole "
        "Spark cluster outright. Dask gives you distributed pandas and arrays. "
        "Spark is the Java heavyweight, proven at petabytes."),
    (A, "Ray Data is the one here that exists to stream into G P U training. "
        "And datatrove is for FineWeb style trillion token text curation."),
]

# --- row three -------------------------------------------------------------
SCRIPT["machines"] = [
    (A, "Third row. How the machines exist at all. And the fork shows up here "
        "as one question. Does the cluster outlive the job?"),
    (A, "SageMaker HyperPod says yes. A persistent cluster, in a SLURM or an "
        "E K S flavour, with health monitored nodes that get replaced "
        "automatically and jobs that auto resume when one dies."),
    (A, "Plain SageMaker training jobs say no. Ephemeral capacity, per job. "
        "Vertex A I is Google Cloud's equivalent. Under both of them sits "
        "Terraform, with its state, modules and workspaces, the S three layout "
        "for datasets and checkpoints, and the EventBridge glue."),
]

# --- row four --------------------------------------------------------------
SCRIPT["watch"] = [
    (A, "Last row, and the one people skip. How you know it worked."),
    (A, "G P U metrics come from the D C G M exporter into Prometheus, and you "
        "look at them in Grafana. What to alert on is the line worth "
        "memorising. Throughput drops. N C C L stalls. Node health."),
    (A, "Experiment tracking is Weights and Biases if you want it hosted, or "
        "M L flow if you want it open source with a model registry attached. "
        "And then checkpoint hygiene, which is the difference between a run you "
        "can resume and a run you have to repeat."),
    (B, "That last line is the one that pays for itself at three in the "
        "morning."),
]

# --- the take --------------------------------------------------------------
SCRIPT["close"] = [
    (A, "So what is the map for? Not for picking products. It is for noticing "
        "that you answer all four of these questions whether you meant to or "
        "not, and that the pain is always the one you answered by accident."),
    (A, "And one live fact, because it dates the second row. Since Prefect's "
        "twenty twenty six acquisition of Dagster Labs, Prefect and Dagster are "
        "one company shipping two products."),
    (A, "Two of the five names on that row now answer to the same roadmap. "
        "Which is a better reason to go and read them than any feature table "
        "would be."),
]


def word_count() -> int:
    return sum(len(line.split()) for turns in SCRIPT.values() for _, line in turns)


if __name__ == "__main__":
    words = word_count()
    print(f"{len(SCRIPT)} beats, {words} words, about {words / 148 * 60:.0f} seconds")
    for key, turns in SCRIPT.items():
        w = sum(len(line.split()) for _, line in turns)
        print(f"  {key:18s} {len(turns)} turns  {w:3d} words  ~{w / 148 * 60:4.0f}s")
