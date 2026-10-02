# Method: paper pages (rows of the Papers database)

Approved on Attention Is All You Need (2026-10-02); reference folder `technical_knowledge_base/reference/papers/attention_is_all_you_need_transformer/`, whose `src/` holds the reusable pieces. **A suggestion, not a template**: read `README.md` in this folder first. Not every paper has a mechanism to run, a table worth rebuilding or a "then and now"; a paper page takes the shape its paper needs, and the kinds below are starting points, not boxes to fit.

The page replaces the row page's body only; the database properties (Paper, Takeaway, Topics, Year) stay in Notion and are not edited.

## Why papers need their own method

A topic page compares things; a paper page explains one argument and its evidence. The reader's questions are different: what problem, what idea, does the evidence hold, what survived. So the page follows the paper's own structure, points into the paper at section, table and equation level, and, where it can, **runs the paper's mechanism** instead of illustrating it. Three ideas from outside shaped it: a peer's static explainer of the Context Language Models paper (2026-10-02), whose "How much of this to believe" section, verdict up front and "What it takes to use this" were adopted here; Polo Club's [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) (a real model in the browser, every value inspectable); and Distill's [Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/) (ask the reader to predict before showing; details on demand; models and simulations as explanations).

## Structure (tabs)

1. **The paper** (Reading, open by default)
   - A one-screen headline card generated from `paper.json`: title, authors, lab, venue and date, the one-line takeaway, three headline numbers each linked to its table or section, links to the arXiv HTML, PDF and code.
   - Then Problem, Idea, Method, Results, Why it matters, Connections. Every section carries an "in the paper" margin label (`[[S3.SS2|§3.2]]`) and every claim an inline link into the arXiv HTML (`{{§3.2.1|ax:S3.SS2.SSS1}}`). Find the real anchors by listing `id="S..."` in the HTML (sections `S3.SS2.SSS1`, tables `S6.T2`, figures `S3.F1`, equations `S3.E1`, appendix `Sx1.F3` or `A1`).
   - Two or three **predict-then-reveal** questions at the points where intuition usually fails (the widget in `11_js_ui.js`: options, a skip link, the reveal runs a live demo).
   - "Why it matters" is labelled "beyond the paper": each later claim gets its own source.
   - **A verdict up front.** The headline card ends with one or two sentences on how far to trust the paper, for example: "Believe the idea; treat the size of the wins as provisional." It is the short form of the evidence section below and links to it.
   - **How much of this to believe** (near the end of the Reading tab). This judges the paper's own evidence, not just whether our toy reproduces it.
     - Start with what holds up and why: sample size, the gap in standard errors (computed where the paper gives enough to compute it), and baselines run from released code under the same budget.
     - Then name the weaknesses concretely:
       - comparisons that are not like for like (one side got retries, tools, tuning or a bigger budget the other did not);
       - single runs with no seeds or error bars;
       - margins smaller than the noise;
       - benchmarks the authors built themselves;
       - theoretical estimates presented as measurements (FLOPs, cost);
       - an appendix that contradicts the main text;
       - results that change sign across setups.
     - Each point cites its section or table. End with a plain verdict.
     - This matters most for recent agent, harness and benchmark papers, which are often single runs on small suites. For an old classic, later replication can carry it ("held up: every later model uses it"), sourced.
     - Be fair: weaknesses the authors state themselves count in their favour, and say so.
   - **What it takes to use this** (for papers recent enough that someone might still adopt the method):
     - the code and its licence, and what is released or still "coming soon";
     - the hardware and training budget the recipe needs;
     - which model sizes or setups worked and which did not;
     - when it pays off and when it buys little.

     For classics whose method is now standard, "Then and now" covers this; skip it.
2. **The live ingredient**, one tab, named for what the reader does ("Run a Transformer", "Simulate the scheduler", "Refit the curve", "Replay the trace"). See the table below.
3. **The paper's tables (and figures), rebuilt**: every table that carries the argument, transcribed into `tables.json` with the printed precision kept, made interactive (sort, delta from baseline, toggle metric), with every derived number recomputed in `recompute.py` and a "defaults reproduce X, independently or by construction" line, and a plain "does not reproduce" box where it does not (the Transformer's 65M parameters come out 63.1M).
4. **Then and now** (optional): what later work changed and what survived, or what it improved or previous work, or both, as a step-by-step morph with each step's paper and KB link. Worth it for papers whose design became a standard (architectures, training recipes, systems); skip it for a result paper.
5. **Further reading**, generated from `paper.json`: the paper, the code, the page's resources plus the best interactive explainers, each with a time estimate; connected KB paper pages and topics; the parent Papers database.

Tabs may merge when the content is thin (a short paper can put its tables in Reading) or rename to match what the reader does; say why in `src/README.md`.

## The live ingredient, by kind of paper

| Kind of paper | Ingredient | How | Example from the 63 |
|---|---|---|---|
| **Architecture** (a new layer, block or model) | A **live toy model** built exactly as the paper says, trained offline at toy scale on a synthetic task that makes the mechanism visible and every answer checkable; forward pass in plain JS, checked against PyTorch; ablation variants (the component removed) trained the same way, with measured accuracy | `uv run --with torch python train.py` in a throwaway env, fixed seed, the paper's optimiser and schedule; quantise to 6 bits, one base64 character per weight; `check_forward.py` | Transformer (this page), ViT (patch attention on tiny synthetic images), Mamba (selective scan against attention on a copy task), RoFormer (RoPE against sinusoids on a length-extrapolation task), BERT (masked prediction on the toy grammar) |
| **Systems** (kernels, memory, serving, parallelism) | A **simulated before/after** of the same workload, to scale: the old method and the new one as two animations, with counters for bytes moved, memory, utilisation or latency computed from the paper's own cost model | Port the paper's cost formulas or algorithm to JS; take the hardware numbers from the paper's tables; label the workload illustrative | FlashAttention (HBM reads and writes, tiled against naive), PagedAttention (fragmentation, pages against contiguous allocation), ZeRO, pipeline parallelism |
| **Empirical or scaling** (laws, benchmarks, data) | The paper's **figures rebuilt** from its tables or released data, with the fits **recomputed** (refit the power law, show the residuals and the fit's own extrapolation), a slider for the quantity it predicts | `recompute.py` fits; when only a plot exists, transcribe printed labels, never read curves, and say so | Scaling Laws, Chinchilla, GPT-3 (few-shot curves), data-mixture papers |
| **Agent, harness or method-on-top-of-a-model** (prompting, RL recipes, tool use) | A **trace replay**: one real or published episode stepped through turn by turn, with the method on and off, counters for tokens, tool calls, cost, success | Use the paper's released traces or appendix transcripts; if none, a labelled illustrative trace built only from what the paper describes | ReAct, chain-of-thought, RLHF/DPO (a preference pair through the loss), SWE-agent |
| **Training recipe or optimiser** | The **loss or update rule run live** on a tiny problem (a 2-D loss surface, a small regression), the old rule against the new | Plain JS, real arithmetic | Adam, LayerNorm, LoRA (rank against quality on a tiny matrix), quantisation papers |

When a paper has **no code or data**: build the mechanism from the paper's equations alone (they are usually enough for a toy), use only published numbers for anything quantitative, label every input illustrative, and never invent a curve. When the paper's numbers disagree with each other (the Transformer's 41.0 against 41.8), show both with where each appears. When it cannot be made live at all (a survey, a position paper), the page is The paper plus Tables and Further reading, and that is fine.

## Shared pieces (copy, do not rewrite)

From the reference folder's `src/`: `build.sh` (macros `ax:`, `tab:`, `n:`, margin labels, `@@CARD@@`), `mk_paper.py` (card, Further reading, data), `11_js_ui.js` (`fit` for width-measured charts, `makeAnim` for step animations, the predict widget, `placeLabels`, `legend`), `check_page.mjs` (every control, both themes and widths, text at least 11 px, animations stepped), `mk_coverage.py`, `save_live.py`, `extract_paper.py`, the CSS. Charts are drawn at the container's measured width in CSS pixels, so a font size in the code is the size on screen; the check script enforces 11 px.

## Honesty rules for a live ingredient

- Report held-out accuracy and how the test set was drawn; measure the overlap with the training stream (here 49% of sentences from the training distribution occurred in training, so the in-browser test samples uniformly instead, with 0.2% overlap).
- Report what quantisation cost, and the JS-against-PyTorch agreement (identical outputs, maximum logit and attention differences).
- When an ablation does not reproduce the paper's effect at toy scale (one head is as good as four here), say so beside the paper's figure; do not tune the task until it does.
- Show training curves from the log, not a cleaned plot.

## Time budget per paper

| Step | Architecture paper | Systems / empirical / agent paper |
|---|---|---|
| Fetch the Notion page, save `live.md`, fetch the arXiv HTML, extract text and tables, list anchors | 15 min | 15 min |
| `paper.json`, `tables.json`, `recompute.py` | 30 min | 30 to 45 min |
| Reading tab prose with anchors and two or three predict questions | 60 min | 60 min |
| Live ingredient: toy task, training (10 to 40 min CPU, run in the background), export, forward check; or simulation, refits, trace | 90 to 120 min | 60 to 90 min |
| Tables tab, Then and now if any | 45 to 60 min | 30 to 60 min |
| Checks: checkpage, check_page.mjs, screenshots of every tab and mid-animation, coverage | 30 to 45 min | 30 to 45 min |
| **Total** | **about 4.5 to 6 hours** | **about 3.5 to 5 hours** |

Short papers with nothing to run take about 2 hours. Budget the 300 KB limit early: here the three models' weights took 117 KB (6-bit, one character per weight, 35,184 parameters each), the rest of the page 168 KB.

## Lessons (from building the first one, 2026-10-02)

1. **Write the coverage list first.** Listing every fact of `live.md` before writing prose would have set the Reading outline directly; here it was written after and passed, but it should drive the work.
2. **Measure before claiming.** I first wrote "about 0.1%" for train/test overlap and "1.1 billion sentences"; measuring gave 49% and 540.8 million. Every number about the toy model now comes from a script; do that from the start.
3. **Design the toy task for the ablations you want to show.** Positional encoding fails spectacularly here (3.6%) but one head does not fail at all; a task with two simultaneous dependencies per word (agreement plus reordering) would probably make the head count matter. Decide which variants should differ before training, then check they do.
4. **Start from the reference folder.** Copy its `src/` pieces (listed under Shared pieces) rather than adapting another page's CSS and helpers by hand.
5. **Keep the Reading tab nearer the old length.** It came out at 14 minutes against the old page's 9, because the paper page owns every detail of the paper; the training bullet list could fold into a details block if Khalid prefers shorter.
6. **Test with DOM clicks.** A sticky nav silently swallowed puppeteer's coordinate clicks; `check_page.mjs` now clicks through the DOM.
7. **Pick the attention head by measurement, not by eye.** The averaged cross-attention looked messy; the page now draws the head whose weights best match the rule alignment and says which and how well (on the default sentence, over 90%), so the choice is reproducible.

## Running it for many papers

Give each paper to one subagent with `html_utils/BRIEF_paper_agent.md` (title, Notion id, folder), about four at a time. Then, for each finished page:
1. Re-run `checkpage.sh` and look at the screenshots.
2. Publish it with the `sync-KB-github` steps (the row page has no children: `replace_content` with the embed and the source line).
3. Set its `pages.json` status to `html_only`, then `sync_status.py --record` it.
4. Merge its `src/viz_ideas.md` rows into the ideas log, then commit.

Progress is in `pages.json`. A paper whose status is `not_migrated` but whose folder already has an `index.html` was built and not yet published. One with only a README has not started.
- 2026-10-02 (BERT): fine-tuning seeds all share one pretrained model, so they hide pretraining-seed noise. Before reporting a toy ablation gap, repeat the pretraining with a second seed. A toy result can also be caused by the toy's own data (BERT's toy made next sentence prediction look useful because true pairs always shared a name); say so when it happens.
- 2026-10-02 (ViT): when a toy result contradicts the paper's headline (the ResNet never fell behind the toy ViT), show the toy's result beside the paper's and say what the toy cannot test (data scale); do not retune the task until it agrees. Check machine load before sizing a training sweep: parallel builders share the CPU.
- 2026-10-02 (LoRA): for a training-recipe paper, build a toy with a known answer (a teacher edit of known rank), so the learned update can be compared against the truth, which the paper itself never had. If a first toy design fails for a reason unrelated to the paper's claim (an optimisation barrier rather than a rank limit), replace it before using any result and keep its log.
- 2026-10-02 (Switch Transformers): when the mechanism is one layer that trains in seconds, train it live in the page, deterministically, and check the JS gradients against PyTorch; no shipped weights are needed. Recount every model size from the released configurations, not only the paper's table (Switch-XXL's experts and T5-Large's feed-forward width differ).
- 2026-10-02 (RoFormer, Chinchilla): check every arXiv version's experiment section (RoFormer's English results and its "comparable" wording changed between versions), and check which split any copied comparison row comes from (its BERT row was test-server, its own row validation). When a paper released no data, points a published replication parsed from the figure's vector graphics may be used, with the source and precision stated; that is not reading curves off a plot.
- 2026-10-03 (Constitutional AI, Stable Diffusion): when nobody outside the lab can run the model but the authors released samples or traces, replay and measure those (Constitutional AI's 4,488 released answers) instead of building a toy. For image-generation toys, grade samples with a fixed checker that reads the content from the pixels, since FID cannot be measured at toy scale. Export shipped weights only from the final checkpoint, and re-run the forward check after any re-export (Stable Diffusion's page first shipped a mid-training checkpoint).
- 2026-10-03 (ReAct): when the arXiv HTML ships a figure as SVG, read its values from the vector paths, calibrated on the figure's own gridlines (about 0.01 point), rather than from labels or by eye. A best-of-N prompt picked on the test set is a selection effect: report the average prompt beside it.
