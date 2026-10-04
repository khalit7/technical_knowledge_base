# Method: Topic pages (root, then children)

A topic is one root `Topic: *` page and its child pages. The two kinds have different jobs and different rules, so this file keeps them in two separate parts: **Part A is the root page, Part B is a child page.** Read the part for the page you are building; read the other part's "Who owns what" so you know what not to repeat.

Approved shapes:
- **Root, labs as children:** Topic: llms (rebuilt 2026-10-01; `technical_knowledge_base/models_and_training/topic_llms/`).
- **Root, stages or techniques as children:** Topic: llm-training-and-post-training (2026-10-03; `technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/`).
- **Children:** the lab pages under Topic: llms (`deepseek/`, `anthropic_claude_family/`), and the twelve stage pages under Topic: llm-training-and-post-training (`distributed_training/`, `sampling_and_decoding/`, `pretraining/` and the rest).

A suggestion, not a template: read `README.md` in this folder first.

---

## Part A: the root page

### What it is for
A **high-level comparison along a few axes**, plus the definitions needed to follow it. The reader's question is "how do these compare, and on what?" Depth lives on the children.

### Who owns what
- **The root owns:** the comparison; every cross-cutting concept needed to read an axis; data that spans all the children (benchmarks, releases, prices, recipes).
- **A child owns:** one specific thing in depth (a lab, a family, a stage, a technique).
- **A concept that explains an axis is not a child page.** It lives in the root. Khalid folded three child pages into Topic: llms for this reason: Mixture-of-Experts, Reasoning models and test-time compute, and LLM release history. Before a child page is created, ask whether it is a specific thing or a concept the comparison needs. When the children are themselves stages or techniques, keep them (Khalid kept all twelve on the training topic); the root compares them.
- **Folding a page in:**
  - Rewrite it into the root; do not add it as a tab. Khalid: "integrated in even if this means a full re-write of the main page".
  - Repoint every sibling page that linked to it (to the root, naming the tab), remove its folder and manifest entry, and mark its Notion page "TO DELETE: ..." with a line saying where its content went. Khalid deletes it.

### Shape that worked
- **Reading tab, organised by the axes:** the comparison in one screen, then the things compared, then one section per axis, then history ("How we got here"), reading the numbers or common mistakes, and choosing.
  - Labs as children (Topic: llms): axes were where the thinking goes, what it costs to serve, how open it is.
  - Stages as children (training topic): a clickable stage x axis grid on top; axes were what each stage changes, data, cost, what goes wrong; then Machinery.
  - **Each axis section** carries only the comparison-level part of every concept it needs, and ends with a "Go deeper (optional)" note (`.deepnote`) naming the tab or child page that adds depth.
  - Keep the Reading tab as short as possible while self-sufficient; Khalid accepted about 23 minutes on the training topic because its corrections stay visible.
- **Data tabs that compare everything** (choose the ones the topic has):
  - **Benchmarks**, the one Khalid stressed for model topics: a dense grid on independent runs first (Artificial Analysis, ARC Prize, Epoch, LMArena), lab figures only where no independent run exists and visibly flagged; every cell with version, date and who ran it; never splice versions; sortable, filterable, "compare 2 or 3 side by side".
  - **Capability against price**, **Release history** (Topic: llms).
  - **Open recipes compared** (training topic): disclosed recipes stage by stage, every cell sourced and dated, "not disclosed" coloured as information.
  - **Price list:** every run with a published cost; dollars, GPU-hours and FLOPs on separate axes, never converted without a stated rate; each figure says what it includes and excludes.
  - **A calculator whose presets show their residual** against published figures (the training topic's Scaling calculator), never fudging an input to hide a gap.
- **Optional deeper dives** (only when a page was folded in): a tab per folded-in mechanism, set apart under an "Optional deeper dives" label, opening with a note saying which Reading section it extends.
- **Further reading** last: data and deeper tabs, every child page with what it covers and its reading time, neighbouring topics, papers, best resources, each timed.

### Things to keep
- **Animations:** at least one before/after per axis where a mechanism replaced another (dense against MoE at equal compute; one batch through PPO, GRPO and DPO).
- **Each fact said once,** in the place that owns it; link to it from elsewhere (`data-tab` links between tabs).
- **Size:** going over 300 KB is accepted when the comparison needs it (Topic: llms about 544 KB, training topic 414 KB). Say so; never cut knowledge to meet it.
- **The narrated video** may describe the old page: leave it and ask Khalid (he deleted the training topic's).

### How it is built
- **In parallel, one subagent per tab,** each owning only its own part files (CSS scoped under its tab id, element ids prefixed), with the build script giving each tab its own slot. The Reading tab is one agent's; it links the data tabs by id and does not repeat them.
- **Reconcile at assembly:** when two tab agents cite the same fact, check that they agree before review (the Reading tab and Price list disagreed on what Thomson Reuters' $40M covered; the Price list's sourced reading won).
- **Publishing a root with child pages:** never `replace_content`. Insert the embed and source line with `update_content`, then remove the old text (headings, paragraphs, lists, tables, each matched exactly; a run of consecutive blocks can be matched as one span, which saves many calls on a long page), and fetch afterwards to confirm only the embed, source line, video and `<page>` tags remain.

### Lessons (root)
- 2026-10-01: build folded-in tabs in parallel, the Reading tab written last by one hand from their drafts; give the build script per-tab slots.
- 2026-10-02: SVG labels drawn at a fixed width clip at phone width; lay charts out by the measured container width and put long captions in HTML (`clipcheck.mjs` catches it).
- 2026-10-03 (training topic): when the children are stages or techniques, compare the stages on shared axes with a stage x axis grid; the "compare everything" tabs became recipes, a price list and a calculator. Reconcile shared facts at assembly.
- 2026-10-04 (Topic: rl): Khalid first asked for a comprehensive root (about 60 minutes), then corrected it: "The page shouldn't explain the concepts in depth, this is the children page's responsibility. It should give a quick overview or a quick intuitive explanation." A root gives intuition in about 15 to 20 minutes, one or two visuals per idea at most, and a "Go deeper" link per section; hands-on depth such as a tabular-RL lab belongs on the child pages. Keep cut material in the repo (`src/for_children/`) as input for the children.
- 2026-10-04 (Topic: swe-and-system-design): Khalid: "you should be teaching me, I don't know what I don't know, so I can't make decisions about what to include." On a topic he is new to, decide the spine, tabs and child structure yourself from research and present them as a teaching plan with reasons; ask only about his goal, his starting point and deletions. Teach from zero: no term before it is explained, one running example over lists, and for each building block the problem it solves and what it costs. Treat the old page as unverified notes.

---

## Part B: a child page

### What it is for
**The depth on one specific thing:** one lab or model family, or one stage or technique. The reader's question is "how does this work, exactly, and what is the evidence?" A child owns its details: nothing is cut, only said once and clearly.

### Who owns what
- **The child owns** every detail of its subject: mechanisms, formulas, configs, numbers, history, common mistakes.
- **It does not repeat the root.** Read the parent root page first (its `index.html` and `src/`) and link its grid, axis sections and data tabs by name (Notion URL of the root, naming the tab) instead of rebuilding them.
- **It does not repeat its siblings or paper pages.** Before choosing a visual, check the sibling child pages and the paper pages in `technical_knowledge_base/reference/papers/` for the same mechanism; where a live toy or animation already exists (the DPO, GRPO, LoRA, NF4, ZeRO, pipeline, RoPE visuals), link it and build what is missing instead.
- **Use the paper pages' verified facts,** not the old page's: they carry corrections.

### Shape that worked
- **Reading tab** organised by the subject's own logic: an "in one screen" summary or comparison table first, then the mechanisms in order, then what is in production now (real configs and recipes), then common mistakes.
- **One tab per standalone visual** that deserves room: a calculator (Layout calculator, Trainable parameters), a lab (Sampler lab), a dataset view (Twelve decoders, One real layer, Case gallery), a tree (Method family tree), a toy run (Anneal a toy).
- **Further reading** last: the parent root and its tabs, siblings, paper pages, best resources, each timed.

### What makes a child page good (the twelve training pages)
- **Research beyond the old page.** The old page is the floor (every fact carried, in `src/coverage.json`); each claim is checked against primary sources (papers, model cards, config.json files, library code, vendor docs), corrections go in visible boxes, and what cannot be sourced is marked unconfirmed.
- **Real data over illustrative data:** real logits from a small open model, a real layer's weights, a real chat template on real conversations, released position biases read by byte range from a safetensors file, real configs from many families. Compute it offline with `uv run --with torch --with transformers` (threads capped at 2, in the background) and store small extracts in `src/inputs/` (under 1 MB; large downloads stay in scratch or a gitignored folder).
- **A toy only when it completes something published:** a toy run that fills the missing cell of a published ablation (Pretraining's anneal toy), with several seeds and the departures said plainly.
- **Reproduce published numbers** from the page's formulas and say independently or by construction; say plainly where they do not reproduce (Llama 3.1's rope scaling, Gao et al.'s RL fit). The page's JavaScript is checked against `src/recompute.py`.
- **Animations** of the mechanism on one input, before/after: one training step under nine parallelism schemes; one block of real weights through five quantisation scopes; one preference pair through eight losses; top-p against min-p on a real distribution; what breaks past the trained length on six real configs.

### Lessons (child)
- 2026-10-03: judge periodic angles modulo a turn (RoPE "unseen pairs" were overcounted without it).
- 2026-10-03: when a figure gives fitted coefficients only as plotted dots, reading the dots with a stated precision is acceptable if labelled "read from figure"; curves are still never read.
- 2026-10-03: with generated model text (GPT-2 at high temperature), filter what is displayed, keep it in the measures, and say so on the page.
