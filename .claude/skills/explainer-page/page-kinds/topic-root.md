# Page kind: a topic root (`Topic: *`)

The root page of a topic: an intuitive overview, the comparisons and the definitions needed to follow them, and the map to its child pages. A suggestion, not a template: take the shape the content needs and say why in `src/README.md`. [../teaching/teaching-contract.md](../teaching/teaching-contract.md) governs; the 2026-10-23 audit found roots twice as long as their children because they re-taught them.

Reference roots:
- `technical_knowledge_base/models_and_training/topic_generative_and_multimodal/`: from zero, five labs, a model map, nine children;
- `.../systems_and_performance/topic_jax_and_tpu/` and `.../topic_ml_infra_and_orchestration/`;
- `.../models_and_training/topic_llm_landscape/`: labs as children;
- `.../topic_llm_training_and_post_training/`: stages as children, with a stage x axis grid.

## What it is for
The reader's question: **"what is this field, how do its parts compare, and on what?"** The root gives intuition and the comparison; depth lives on the children. Khalid (2026-10-04, Topic: rl): "The page shouldn't explain the concepts in depth, this is the children page's responsibility. It should give a quick overview or a quick intuitive explanation."

## Who owns what
- **The root owns**:
  - the comparison;
  - every cross-cutting concept needed to read an axis;
  - data that spans all the children: atlases, model or tool maps, benchmarks, prices, recipes.
- **A child owns** one specific thing in depth ([topic-child.md](topic-child.md)).
- **A concept that explains an axis is not a child page.** Fold it into the root; when the children are stages or techniques, keep them and compare them on the root ([../understand/curriculum.md](../understand/curriculum.md)).
- **Neighbouring topics own their subjects**: link them by Notion id, never repeat them.

## Reading tab
- **Order.** From zero when the topic is new to him (each term before use); by axes when the things compared are already known. The generative root put the axes in section 0's table and then taught in the topic's own order.
- **Sections**:
  - the core idea and the hero figure: the map of the field (what the parts are and how they relate);
  - the comparison in one screen (a table, or a clickable grid such as stage x axis);
  - one short section per axis or part of the spine: the definition, the one distinction that only shows across the children, one visual at most, and a "Go deeper" link (`.deepnote`) to the child that owns it;
  - choosing, when the topic is about choices;
  - the child pages as cards with what each covers and its reading time.
- **A root never re-teaches a child.** If a section explains a mechanism step by step, that explanation belongs on the child; the root keeps one orienting sentence and the link. Move it (checking the child carries every unit, per the ledger) before cutting it here.
- **Length is judged per root** ([../teaching/teaching-contract.md](../teaching/teaching-contract.md)): a root that only maps, compares and defines is usually short. Record the judgement in `src/README.md`.

## Tabs
None of these is mandatory; each earns its place by answering a question the Reading tab cannot. A lab that teaches one child's mechanism belongs on that child.
- **Labs**: a subject that spans the children, on the running example; a before/after where a method replaced another. Measured where measuring teaches ([../evidence/local-runs.md](../evidence/local-runs.md)).
- **A map tab** (Tool map, Model map, Protocol atlas, Chip atlas, Harness atlas):
  - every tool or model with what it is, family, size, licence, release and last-commit dates, and status (alive, maintained, deprecated, archived), all checked live and dated;
  - a one-line verdict each;
  - filters, a timeline or lineage, and a "which one for which job" picker.
- **Data tabs that compare everything**, chosen by what the topic has:
  - **benchmarks**: independent runs first (Artificial Analysis, ARC Prize, Epoch, LMArena); lab figures only where no independent run exists, and flagged; every cell with version, date and who ran it; never splice versions; sortable, with "compare 2 or 3";
  - **capability against price**, **release history**;
  - **open recipes compared**: every cell sourced; "not disclosed" coloured as information;
  - **a price list**: dollars, GPU-hours and FLOPs on separate axes; each figure says what it includes;
  - **a calculator** whose presets show their residual against published figures; never fudge an input to hide a gap.
- **Optional deeper dives**, only when a page was folded in: one tab per folded mechanism, under an "Optional deeper dives" label, each opening by naming the Reading section it extends.
- **Further reading**, last: children in reading order with times, the data tabs, neighbouring topics, papers and the best outside resources, timed and dated.

## Size
Root pages run to about **1.5 MB** (the old 300 KB limit is gone). Budget each lab's embedded data from the start; on the generative root, labs were asked to keep data near 120 KB once the page reached 1.42 MB. If the root still runs over, move bulky data (trajectory frames, full matrices) to the child that owns the subject. Never cut knowledge to meet a size. Images are small WebP or PNG data URIs.

## How a root is built
A team of agents, one per tab ([../orchestration/topic-pipeline.md](../orchestration/topic-pipeline.md)):
1. **Setup** builds the shared environment and the running example and writes `src/data/README.md`, ending READY. Light agents (map, Reading drafts) can run alongside.
2. **Labs** run after READY, at most about three heavy at once and one GPU job at a time.
3. **The Reading agent** writes early with marked TODOs (`src/read/todo.md`), then fills every number from the labs' recorded outputs. A script checks prose numbers against the data files.
4. **Assembly**: reconcile shared facts (two tabs citing one fact must agree), rerun checks, look at screenshots.
5. **The root fix list**: children report corrections and links for the root while they are built. Collect them in one list and apply them in one fix pass after the children, then a link-wiring pass, then republish.

Each tab agent owns only its own part files: CSS scoped under its tab id, ids prefixed, renders registered in `window.TAB_RENDER` ([../build/scaffold.md](../build/scaffold.md)).

## Publishing a root
Commit and push like any page (`sync-kb-github`). Its Notion page has child pages, so its link line is written with `update_content`, never `replace_content`, keeping every `<page>` tag and any video. An old narrated video describes the old page: leave it, and tell Khalid it is his to delete.

## Lessons (dated)
- **2026-10-01**: build folded-in tabs in parallel and write the Reading tab last, by one hand, from their drafts; give the build script per-tab slots.
- **2026-10-02**: SVG labels drawn at a fixed width clip at phone width. Lay charts out by the measured container width and put long captions in HTML (`clipcheck.mjs` catches it).
- **2026-10-03** (training topic): when the children are stages or techniques, compare them on shared axes with a stage x axis grid. The "compare everything" tabs became recipes, a price list and a calculator. Reconcile shared facts at assembly (the Reading tab and the Price list disagreed on what Thomson Reuters' $40M covered; the sourced reading won).
- **2026-10-04** (rl): a root gives intuition, one or two visuals per idea and a Go deeper link per section. Hands-on depth (a tabular-RL lab) belongs to children; cut material is kept in `src/for_children/`.
- **2026-10-04** (swe): on a topic he is new to, decide the spine, tabs and children yourself and present them as a teaching plan with reasons; teach from zero; treat the old page as unverified notes ([../understand/reader.md](../understand/reader.md)).
- **2026-10-04** (evaluation and benchmarks): two neighbouring topics stay separate when they answer different questions; write down which page owns which subject and link both ways.
- **2026-10-05** (programming-languages): a root about skills can be a philosophy-first design space. Python is the reference column; each axis gives the choice, the value it comes from, its cost and the false friends for a Python programmer.
- **2026-10-05**: when copying a scaffold's `01_head.html`, change its `<title>` (four pages shipped with the root's title).
- **2026-10-06** (agents): two roots on adjacent subjects take a sharp split. Harnesses: how a complete agent works, plus products. Frameworks: the building blocks. Link, do not repeat.
- **2026-10-14** (rag): never `git add -A` over the topic while agents work (a commit swept in a map agent's unfinished files). Stage explicit paths.
- **2026-10-15** (jax): `page_finalize.py` on a root folder commits everything under it, including children's in-progress `src/`. Publish the root before children start, or check what it swept.
- **2026-10-15** (data curation): the GPU queue was cut to cheap runs that teach. Dropped runs cite the published result with "not run here".
- **2026-10-17** (generative): set lab data budgets early (page 1.42 MB after five labs). A Reading tab written before the labs needs a final pass that fills every TODO from recorded outputs and applies the corrections the children found (guidance interval, autoguidance, model names).

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)
