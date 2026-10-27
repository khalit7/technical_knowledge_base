# Page kind: a paper page (a row of the Papers database)

The paper method: the paper's argument in its own order, anchored into the paper, with one live ingredient chosen by the kind of paper, its tables rebuilt and recomputed, and a verdict on how far to trust it.

Approved on Attention Is All You Need (2026-10-02); used for all 63 rows of the Papers database by 2026-10-03.
- **Reference folder**: `technical_knowledge_base/whats_new/papers/attention_is_all_you_need_transformer/`; its `src/` holds the reusable pieces.
- **Recent examples**: `.../ddpm/` (training-recipe ablation run live) and `.../clip/` (training-objective toy plus Then and now).

**A suggestion, not a template.** Not every paper has a mechanism to run, a table worth rebuilding or a "then and now". A paper page takes the shape its paper needs; the kinds below are starting points, not boxes. Departures go in `src/README.md` (ddpm and clip each list theirs).

## Inputs
- **An existing row** (title, Notion id, folder from `technical_knowledge_base/pages.json`, entries with `"parent": "Papers"`):
  - fetch the row page read-only and save it verbatim to `src/live.md` with a script (`save_live.py`), never retyped;
  - the row's body is only the link line to the site page. The database properties (Paper, Takeaway, Topics, Year) stay in Notion and are not edited. Use the Takeaway on the headline card, and flag a wrong Takeaway to Khalid rather than editing it (the `update-kb` pass writes the Takeaway of the rows it creates, scoped as below).
- **A new paper Khalid names** (title, arXiv link or PDF): the row must exist in the Papers database first. Ask him to create it, or whether to create it (its properties are his). The periodic `update-kb` pass creates rows itself for papers central to a topic (its step 6). There is no old body, so coverage runs against the paper's own claims.
- **Either way**: fetch the paper itself (arXiv HTML where it exists, else the PDF text or the publisher page) and read it until you could teach it ([../understand/research.md](../understand/research.md)). Keep small extracts in `src/inputs/`, never PDFs or files over about 1 MB.

## Why papers need their own method
A topic page compares things; a paper page explains one argument and its evidence. The reader's questions differ: what problem, what idea, does the evidence hold, what survived. So the page follows the paper's own structure, points into the paper at section, table and equation level, and, where it can, **runs the paper's mechanism** instead of illustrating it.

Three outside ideas shaped it:
- a peer's static explainer of the Context Language Models paper (2026-10-02): its "How much of this to believe" section, verdict up front and "What it takes to use this" were adopted;
- Polo Club's Transformer Explainer: a real model in the browser, every value inspectable;
- Distill's "Communicating with Interactive Articles": predict before showing; details on demand; models and simulations as explanations.

## Structure (tabs)
1. **The paper** (Reading, open by default)
   - **A one-screen headline card** generated from `paper.json`: title, authors, lab, venue and date, the one-line takeaway, three headline numbers each linked to its table or section, links to the arXiv HTML, PDF and code.
   - **Then Problem, Idea, Method, Results, Why it matters, Connections.**
     - Every section carries an "in the paper" margin label (`[[S3.SS2|§3.2]]`) and every claim an inline link into the arXiv HTML (`{{§3.2.1|ax:S3.SS2.SSS1}}`).
     - Find the real anchors by listing `id="S..."` in the HTML: sections `S3.SS2.SSS1`, tables `S6.T2`, figures `S3.F1`, equations `S3.E1`, appendix `Sx1.F3` or `A1`. Some HTML numbers anchors out of step (in CLIP, `S7.T4` is Table 3): keep an override map.
   - **Two or three predict-then-reveal questions** at the points where intuition usually fails: the widget in `11_js_ui.js` (options, a skip link, the reveal runs a live demo).
   - **"Why it matters" is labelled "beyond the paper"**: each later claim gets its own source.
   - **A verdict up front.** The headline card ends with one or two sentences on how far to trust the paper ("Believe the idea; treat the size of the wins as provisional."), the short form of the evidence section, linked to it.
   - **How much of this to believe** (near the end of the Reading tab). This judges the paper's own evidence, not just whether our toy reproduces it.
     - Start with what holds up and why: sample size, the gap in standard errors (computed where the paper gives enough to compute it), baselines run from released code under the same budget.
     - Then name the weaknesses concretely:
       - comparisons that are not like for like (one side got retries, tools, tuning or a bigger budget the other did not);
       - single runs with no seeds or error bars;
       - margins smaller than the noise;
       - benchmarks the authors built themselves;
       - theoretical estimates presented as measurements (FLOPs, cost);
       - an appendix that contradicts the main text;
       - results that change sign across setups.
     - Each point cites its section or table. End with a plain verdict.
     - It matters most for recent agent, harness and benchmark papers, often single runs on small suites. For an old classic, later replication can carry it ("held up: every later model uses it"), sourced.
     - Be fair: weaknesses the authors state themselves count in their favour; say so.
   - **What it takes to use this** (for papers recent enough that someone might still adopt the method):
     - the code and its licence, and what is released or still "coming soon";
     - the hardware and training budget the recipe needs;
     - which model sizes or setups worked and which did not;
     - when it pays off and when it buys little.

     For classics whose method is now standard, "Then and now" covers this; skip it, unless people still adopt the paper's checkpoints (CLIP has both).
2. **The live ingredient**: one tab, named for what the reader does ("Run a Transformer", "Simulate the scheduler", "Refit the curve", "Replay the trace", "Run a tiny CLIP"). See the table below.
3. **The paper's tables (and figures), rebuilt**:
   - every table that carries the argument, transcribed into `tables.json` with the printed precision kept;
   - made interactive (sort, delta from baseline, toggle metric);
   - every derived number recomputed in `recompute.py`;
   - a "defaults reproduce X, independently or by construction" line;
   - a plain "does not reproduce" box where it does not (the Transformer's 65M parameters come out 63.1M).
4. **Then and now** (optional): what later work changed and what survived, what it improved on in earlier work, or both. Built as a step-by-step morph or a recipe card that changes line by line, each step with its paper and knowledge base link. Worth it for papers whose design became a standard (architectures, training recipes, systems); skip it for a result paper.
5. **Further reading**, generated from `paper.json`:
   - the paper, the code, and the best interactive explainers, each with a time estimate;
   - connected knowledge base paper pages and topic pages (`https://app.notion.com/p/<id>` in `paper.json`; the site build rewrites them to site pages, [../../sync-kb-github/site.md](../../sync-kb-github/site.md));
   - the parent Papers database (`3c65c17b0d0d81549dbedb27e8f2a26f`).

Tabs may merge when the content is thin (a short paper can put its tables in Reading) or be renamed to match what the reader does; say why in `src/README.md`.

## Teaching contract on a paper page (the 2026-10-26 light pass)
Every paper was brought to the [teaching contract](../teaching/teaching-contract.md) on 2026-10-25 and 26; a new paper starts there. Each folder's `src/README.md` has a "light pass" section (`whats_new/papers/sharpening_tax` and `.../agora` are good examples).
- **Top, after the card**: "The idea in one sentence"; one hero (the paper's own figure when its licence allows, embedded as WebP and credited under it and in `img/CREDITS.md`, otherwise redrawn as SVG, with a title saying what to notice); "You need" (links to the owners of what the paper assumes); new terms. In that order, at body size.
- **Owned elsewhere**: a general mechanism the paper uses (UCB, bootstrap, temperature) gets a sentence and a link to its owner ([OWNERS.md](../../../../technical_knowledge_base/OWNERS.md)); the page owns only the paper's method, numbers and evidence.
- **Closed `<details>`**: proofs and derivations, provenance and "how the replay was checked" boxes, per-item and per-figure lists, hyperparameters, bookkeeping slips, version-to-version changes, related work, the bullets of What it takes (one open summary paragraph stays). The argument in the paper's order, the verdict and How much to believe stay open. A page with no closed block is a defect.
- **Volatile**: release status, code availability, later versions sit in one dated closed block, "Since the paper (checked <date>)", never in open prose.
- **Tabs**: a tab stays only when it is a tool used across the page (a replay, a toy, the tables); a tab explaining one mechanism moves into the Reading flow.
- **Nothing moves before a click**: `makeAnim` waits on step 1 and a mode switch pauses on step 1; `check_page.mjs` fails if an animation draws a frame before a click and opens every closed block. Tabs use the template `99_js_tabs.js` from [../build/templates/](../build/templates/) (storage key `<prefix>-tab`, keeping the page's `data-to` scroll), never the old `90_js_tabs.js`.
- **Header**: "Reading: N min, plus M in closed details.", both numbers measured (`html_utils/audit_pages.mjs`, 230 words a minute; several pages write them to `src/reading.json` and `build.sh` fills the header from it).
- **The site's What's new block and Papers page read `paper.json`** (`html_utils/whats_new.py`): `arxiv` (orders papers newest first), `lab`, `takeaway`, `topics` (chips in their section colour). Keep them filled on a new paper.
- **Takeaway scoped to the paper's own evidence**: the model and size it was shown on, single runs or seeds, the metric, matched comparisons rather than each side's best point (a headline that compares different settings is the flaw the trust section names, so it cannot lead), a theorem's conditions, no "first", "proves", "beats" or "consistently" without support. One text in `paper.json` (plus `takeaway_note` when it needs a qualifier), the card, `live.md` where the page has one, `mk_coverage.py` and the row's Takeaway property.
- **Ledger**: once the page is final, `python3 html_utils/ledger.py init <folder>`, label every unit (paper text `core`, provenance `depth`, mechanisms taught elsewhere `owned:<path>`, the release block `volatile`), keys on the built page; `ledger.py check` problems 0. `src/README.md` records the length judgement and ledger counts.
- **Privacy in extracts**: `extract_paper.py` replaces author emails with "[email removed]" and long dashes with `--`.

## The live ingredient, by kind of paper
Choose it by what the paper is, and only if it teaches more than reading.

| Kind of paper | Ingredient | How | Examples |
|---|---|---|---|
| **Architecture** (a new layer, block or model) | A **live toy model** built exactly as the paper says, trained offline at toy scale on a synthetic task that makes the mechanism visible and every answer checkable; forward pass in plain JS, checked against PyTorch; ablation variants (the component removed) trained the same way, with measured accuracy | `uv run --with torch python train.py` in a throwaway env (never add torch to `pyproject.toml`), fixed seed, the paper's optimiser and schedule; quantise to 6 or 8 bits, one base64 character per weight at 6 bits; `check_forward.py` | Transformer, ViT (patch attention on tiny synthetic images), Mamba (selective scan against attention on a copy task), RoFormer (RoPE against sinusoids on length extrapolation), BERT (masked prediction on the toy grammar) |
| **Systems** (kernels, memory, serving, parallelism) | A **simulated before/after** of the same workload, to scale: old method and new as two animations, with counters for bytes moved, memory, utilisation or latency from the paper's own cost model | Port the paper's cost formulas or algorithm to JS; hardware numbers from the paper's tables; label the workload illustrative | FlashAttention (HBM reads and writes, tiled against naive), PagedAttention (fragmentation, pages against contiguous), ZeRO, pipeline parallelism |
| **Empirical or scaling** (laws, benchmarks, data) | The paper's **figures rebuilt** from its tables or released data, with the fits **recomputed** (refit the power law, show residuals and the fit's own extrapolation), and a slider for the quantity it predicts | `recompute.py` fits; when only a plot exists, transcribe printed labels or decode vector paths, never read curves by eye, and say so | Scaling Laws, Chinchilla, GPT-3 (few-shot curves), data-mixture papers |
| **Agent, harness or method on top of a model** (prompting, RL recipes, tool use) | A **trace replay**: one real or published episode stepped turn by turn, method on and off, with counters for tokens, tool calls, cost, success | The paper's released traces or appendix transcripts; if none, a labelled illustrative trace built only from what the paper describes | ReAct, chain-of-thought, RLHF/DPO (a preference pair through the loss), SWE-agent |
| **Training recipe or optimiser** | The **loss or update rule run live** on a tiny problem (a 2-D loss surface, a small regression), old rule against new | Plain JS, real arithmetic | Adam, LayerNorm, LoRA (rank against quality on a tiny matrix), quantisation papers, DDPM (four parameterisations sampled live) |

- **No code or data released**: build the mechanism from the paper's equations alone (usually enough for a toy), use only published numbers for anything quantitative, label every input illustrative, and never invent a curve.
- **The paper's numbers disagree with each other** (the Transformer's 41.0 against 41.8): show both, with where each appears.
- **Nothing can be made live** (a survey, a position paper): the page is The paper plus Tables and Further reading, and that is fine.

## Shared pieces (copy, do not rewrite)
From the reference folder's `src/` (ddpm and clip have later versions of some):
- `build.sh`: macros `ax:`, `tab:`, `n:`, margin labels, `@@CARD@@`; clip's version counts closed `<details>` apart and checks every `ax:` link against `inputs/anchors.txt`;
- `mk_paper.py`: card, Further reading, data;
- `11_js_ui.js`: `fit` for width-measured charts, `makeAnim` for step animations, the predict widget, `placeLabels`, `legend`;
- `check_page.mjs`: every control, both themes and widths, text at least 11 px, animations stepped;
- `mk_coverage.py`, `save_live.py`, `extract_paper.py`, and the CSS.

Charts are drawn at the container's measured width in CSS pixels, so a font size in the code is the size on screen; the check script enforces 11 px. Never edit the reference folder.

When you copy `mk_coverage.py` from another paper, **replace its item list entirely** with this paper's facts from `src/live.md` (a copied list once checked the wrong paper's facts and still reported all found).

## Honesty rules for a live ingredient
- **Held-out accuracy**: report it, with how the test set was drawn, and measure the overlap with the training stream. In the Transformer page, 49% of sentences from the training distribution occurred in training, so the in-browser test samples uniformly instead, with 0.2% overlap.
- **Quantisation and agreement**: report what quantisation cost, and the JS-against-PyTorch agreement (identical outputs; maximum logit and attention differences).
- **Toy-scale misses**: when an ablation does not reproduce the paper's effect at toy scale (one head is as good as four), say so beside the paper's figure. Do not tune the task until it does.
- **Training curves** come from the log, not a cleaned plot.
- **Final checkpoint only**: export shipped weights from the final checkpoint, and rerun the forward check after any re-export.

## What to keep in the repo
- **Keep** every file the page's own scripts need to rebuild and check it, including the exported weights `check_forward.py` loads.
- **Leave out** large intermediate checkpoints (`model/ck/` and similar) unless a script needs them, and training data (regenerate it with a script).
- **Keep** each paper's `src/model/` under about 1 MB.
- **Weights count toward the page**: budget size early (the Transformer's three models took 117 KB at 6 bits, 35,184 parameters each; the rest of the page 168 KB). A paper page stays under about 1 MB; say why if it needs more.

## Running it (work rules for a paper agent)
- **Pre-check the machine**: run the guard before training ([../evidence/resource-safety.md](../evidence/resource-safety.md)).
- **Threads and priority**: train on CPU at `nice -n 15` with at most 4 threads (`torch.set_num_threads(4)`), variants one after another, not all at once.
- **Background long jobs**: anything over about 4 minutes (training, long screenshot loops, big fetch batches) runs with `run_in_background`, writes progress to a log, and is checked with short commands every few minutes. A run whose `checkpage.sh` is slow because the machine is busy goes in the background too.
- **Reuse interrupted work**: before training, look in `src/model/` for checkpoints an interrupted builder left, and reuse them if the config matches.
- **Small writes**: write big files (`paper.json`, long HTML parts) in several smaller pieces; an agent with no progress for 600 s is killed.
- **Stay in your folder**: never write to Notion, commit, edit `pages.json` or other papers' folders. Temporary scripts go in scratch or `src/`; this paper's visual ideas go in `src/viz_ideas.md` with ids `P-<folder>.<k>`.

## Checks
- `sh html_utils/checkpage.sh <folder>` ends `fail=0`, `emdash 0`, `errbox 1`, `clipped 0`.
- `node src/check_page.mjs` passes, with no animation frame before a click.
- `python3 html_utils/ledger.py check <folder>` prints problems 0; the header matches the measured minutes.
- `check_forward.py` passes, and `mk_coverage.py` accounts for every item.
- Look at screenshots of every tab (cropped) and mid-animation frames.
- Exercise every control by DOM clicks (a sticky nav swallows coordinate clicks) at 390 dark and 920 light: no errors, NaN, undefined, sideways scroll, text under 11 px or overlap.
- Rebuild the page as the very last step ([../build/checks.md](../build/checks.md)).

## Report back
- Child pages, databases or video found, and the tabs and Reading outline.
- The verdict and its main reasons.
- The live ingredient chosen and why (or why none): what reproduces and what does not.
- Corrections to the old summary (and any wrong Takeaway property).
- Departures from this method and why.
- Coverage counts, reading time, size, check results, and the new `viz_ideas.md` rows.

## Time budget per paper
| Step | Architecture paper | Systems / empirical / agent paper |
|---|---|---|
| Fetch the row, save `live.md`, fetch the arXiv HTML, extract text and tables, list anchors | 15 min | 15 min |
| `paper.json`, `tables.json`, `recompute.py` | 30 min | 30 to 45 min |
| Reading tab prose with anchors and two or three predict questions | 60 min | 60 min |
| Live ingredient: toy task, training (10 to 40 min CPU, in the background), export, forward check; or simulation, refits, trace | 90 to 120 min | 60 to 90 min |
| Tables tab, Then and now if any | 45 to 60 min | 30 to 60 min |
| Checks: checkpage, check_page.mjs, screenshots of every tab and mid-animation, coverage | 30 to 45 min | 30 to 45 min |
| **Total** | **about 4.5 to 6 hours** | **about 3.5 to 5 hours** |

Short papers with nothing to run take about 2 hours.

## Many papers at once
1. **Assign**: give each paper to one subagent with the paper brief ([../orchestration/briefs/paper-agent.md](../orchestration/briefs/paper-agent.md)): title, Notion id and folder; about four at a time.
2. **Check each finished page**: rerun `checkpage.sh` and look at the screenshots.
3. **Publish it** with the `sync-kb-github` steps: `python3 html_utils/paper_finalize.py <slug>` commits, then push; the row page's body is the link line (no children, so `replace_content` is right).

Progress is in `pages.json`. A paper with status `not_migrated` whose folder already has an `index.html` was built and not yet published; one with only a README has not started.

## Lessons from the first page (2026-10-02)
1. **Write the coverage list first.** Listing every fact of `live.md` before writing prose sets the Reading outline directly.
2. **Measure before claiming.** "About 0.1%" train/test overlap and "1.1 billion sentences" were first guesses; measuring gave 49% and 540.8 million. Every number about the toy model comes from a script, from the start.
3. **Design the toy task for the ablations you want to show.** Positional encoding failed spectacularly (3.6%) but one head did not fail at all; a task with two simultaneous dependencies per word (agreement plus reordering) would probably make the head count matter. Decide which variants should differ before training, then check that they do.
4. **Start from the reference folder.** Copy its `src/` pieces rather than adapting another page's CSS and helpers by hand.
5. **Judge the Reading tab's length by its ledger, not by the old page.** It came out at 14 minutes against the old page's 9, because the paper page owns every detail of the paper; long lists, provenance and proofs go into closed details blocks (the 2026-10-26 light pass left most papers at 16 to 28 minutes of core plus closed details, each with its length judgement in src/README.md).
6. **Test with DOM clicks.** A sticky nav silently swallowed puppeteer's coordinate clicks; `check_page.mjs` clicks through the DOM.
7. **Pick what you draw by measurement, not by eye.** The page draws the attention head whose weights best match the rule alignment and says which and how well (over 90% on the default sentence), so the choice is reproducible.

## Lessons from the other 62 (dated)
- **2026-10-02 (BERT)**: fine-tuning seeds all share one pretrained model, so they hide pretraining-seed noise; repeat pretraining with a second seed before reporting a toy ablation gap. A toy result can come from the toy's own data (true sentence pairs always shared a name); say so.
- **2026-10-02 (ViT)**: when a toy contradicts the paper's headline (the ResNet never fell behind the toy ViT), show the toy's result beside the paper's and say what the toy cannot test (data scale); do not retune. Check machine load before sizing a sweep.
- **2026-10-02 (LoRA)**: for a training-recipe paper, build a toy with a known answer (a teacher edit of known rank), so the learned update is compared against the truth. If a first toy fails for a reason unrelated to the claim (an optimisation barrier, not a rank limit), replace it before using any result and keep its log.
- **2026-10-02 (Switch Transformers)**: when the mechanism is one layer that trains in seconds, train it live in the page, deterministically, and check the JS gradients against PyTorch. Recount every model size from the released configurations, not only the paper's table.
- **2026-10-02 (RoFormer, Chinchilla)**: check every arXiv version's experiment section (results and "comparable" wording changed), and which split each copied comparison row comes from (test server against validation). With no released data, points a published replication parsed from the figure's vector graphics may be used, source and precision stated; that is not reading curves.
- **2026-10-03 (Constitutional AI, Stable Diffusion)**: when nobody outside the lab can run the model but samples or traces were released, replay and measure those (4,488 released answers) instead of building a toy. For image-generation toys, grade samples with a fixed checker that reads content from the pixels, since FID cannot be measured at toy scale. Export shipped weights only from the final checkpoint, and rerun the forward check after any re-export.
- **2026-10-03 (ReAct)**: when the arXiv HTML ships a figure as SVG, read values from the vector paths, calibrated on the gridlines (about 0.01 point). A best-of-N prompt picked on the test set is a selection effect: report the average prompt beside it.
- **2026-10-03 (InstructGPT)**: arXiv SVG figures often carry their text as glyphs; decode them first (`decode_figs.py` in that folder). When a paper never measures a comparison directly ("1.3B beats 175B"), derive it with a stated model (Bradley-Terry) and label it derived.
- **2026-10-03 (DPO)**: for a training-objective paper, a toy whose whole output space can be enumerated gives the exact optimum, so every method is measured against the true frontier, not against each other.
- **2026-10-03 (Mamba)**: rebuild the page as the very last step (one shipped first-pass numbers until an audit rebuilt it). When a paper makes two different synthetic claims, test both; one reproduced and one did not.
- **2026-10-03 (DeepSeek-V3)**: a paper can be several kinds at once. When its mechanisms are animated elsewhere in the knowledge base, link them and build around what only this paper claims (FP8 numerics, the training bill against an outside yardstick).
- **2026-10-03 (Llama 3, Mixtral)**: the e-print often ships figures as vector PDFs as well as SVGs; read exact points from either. Check comparison numbers for provenance: Mixtral's GPT-3.5 column was copied from the GPT-4 report; Llama 3's own human evaluation contradicts "competitive with GPT-4o".
- **2026-10-03 (DeepSeekMath)**: when a comparison is confounded (GRPO with a learned reward against RFT with the rule), design the toy to remove the confound and say so; the toy then runs the like-for-like experiment the paper never did.
- **2026-10-03 (Qwen3, DeepSeek-R1, Bitune)**: when a capability "emerges" from a stage, train the toy with and without that stage plus one trained explicitly for the capability; a smooth aggregate curve can hide that. Say plainly when usefulness is built in by construction. With no figure images in the HTML, decode figures from the PDF's vector paths with PyMuPDF (`decode_figs.py` in the R1 folder).
- **2026-10-03 (Demystifying Agent Skills)**: read a study's sampling design out of its printed numbers (528 "triples" were six reuses of 88 single-trial tasks, so the bootstrap's independence fails); fetch the public task behind a printed example to replay it with real numbers.
- **2026-10-03 (WSM)**: compare methods at matched tokens or steps; picking each method's best point at different token counts can reverse a ranking. Check what each abstract percentage is computed from.
- **2026-10-03 (RocketEval)**: for judge and benchmark papers that release per-item grades, resample them (bootstrap over items, per-response noise, per-model bias) for the error bars the paper omits; Spearman 0.965 against 0.979 can be one discordant pair out of 66.
- **2026-10-03 (OLMo 2)**: when the effect only appears at scale (loss spikes), re-measure the paper's metric from its vector figures instead of training a toy; the direction is the test, the level indicative. Checkpoint branch names give exact token counts. Fit gridlines on several scales before reading points (an axis was square-root, not log).
- **2026-10-03 (Encoder-Decoder Gemma)**: two papers on one page are fine when they form one line of work (a second link macro and margin label). Check a toy for flaws the real models lack (learned positions restarting at 0 in the decoder); log and keep the rerun.
- **2026-10-03 (LLM Modules)**: when code is released, list where code and text disagree and test the one that most affects the evidence (no causal mask: the loss showed a leak, not learning); compare released against fixed.
- **2026-10-03 (Trained Persistent Memory)**: when part of a method is untrained by design, simulate that half exactly as written; it can show the mechanism cannot work as claimed. Check the metric's floor: a score clipped at zero makes "all methods positive" nearly automatic.
- **2026-10-03 (HarnessDev, Terminal-Universe, Repo-To-Skill)**: check which artefact each result used (four benchmark gains used none of the released library) and count construction budgets the matched comparison leaves out. Replay a released session, or re-implement a cheap deterministic stage of an unreleased pipeline on its public inputs. Sample a data paper's source corpus to see who produced it (96% one dataset of one model's runs). Decoded per-version scores should land on whole numbers of tasks.
- **2026-10-03 (Ettin, Seq vs Seq)**: cross-check tables that share rows (one carried decoder rows under another table's column order). Decode a figure even when an appendix table holds its data (it showed a result reversing at the two largest sizes). For "x times the budget" claims, read the cited paper's own config.
- **2026-10-03 (Phi-Bench)**: for a benchmark with a released grader, translate a figure's raw metric into the benchmark's own reward (a curve that looks like progress can sit at zero reward), and compare stated scoring rules with the package's code and leaderboard config.
- **2026-10-03 (NeoHorse-1)**: when a paper never ablates its components and releases nothing, show what the method does and state that this cannot test whether it helps. Recover benchmark sizes from score granularity for per-benchmark error bars; split a "gain over public data" into its parts against the untrained base.
- **2026-10-03 (MOLE)**: when a benchmark releases its corpora, run its simple baselines in the browser on the real data, and read the raw traces: "fixed" prompts can change what a headline rate means; a renderer's input limits can explain a "blind spot". Check the main text against its appendix tables.
- **2026-10-03 (StateM)**: for a leaderboard result, read the submission's public review thread and per-trial artefacts (a raw, unreviewed score set against a reviewed baseline; the PR closed unmerged). Count rules that fire on exactly one task to show benchmark tuning.
- **2026-10-03 (SA-MRPO, Dream-RSI)**: when a paper omits the obvious simpler alternative, run it in the toy at a matched point on the trade-off. For "x times fewer/better", show matched-performance and matched-budget versions beside it.
- **2026-10-03 (JIT-Agent, Just-in-Time Memory)**: check whether training data was built on the test cases' own environments even when queries differ, and per cell whether baseline rows were copied from the cited paper (36 of 60 matched to the decimal).
- **2026-10-03 (EnvHarness, Schrodinger's Code Repository, SoL-Pi)**: when the contribution is released code, port it and check it against the original seed for seed; reading the code against the text produced most corrections.
- **2026-10-03 (Emergence World, RRSI, Prime Agent, Agora)**: when raw logs, run records or scorecards are released, replay the decision rule against them and put the record beside each printed number; deduplicate and state the counting rule. Diff the blog against the paper and arXiv versions against each other.
- **2026-10-03 (Re-grading physics, DSec, MoE memory bottlenecks, Latent Context LMs)**: for audit and systems papers with counts or vector figures only, replay the pipeline from the counts and simulate what the protocol cannot observe; check which baseline a speed-up divides by. Pilot the plain decoder on the raw task before building a retrieval toy, and drop the toy if even that does not learn.
- **(DDPM, CLIP, from their src/README.md)**: when 6-bit weights break a model (DDPM's mu-predicting variants), ship 8-bit and report what it costs. When the argument is about the objective, the toy trains several objectives on one encoder; results that do not reproduce (CLIP's 4x, prompt engineering's gains) are shown as such, not retuned.

---
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

Sources distilled: html_utils/methods/papers.md (whole method, time budget, all lessons); html_utils/BRIEF_paper_agent.md (step 0, connections, live ingredient limits, coverage list, what to keep, long-running commands, checks, reply); html_utils/methods/README.md; memory papers-migration-in-progress, methods-are-suggestions; whats_new/papers/ddpm and clip src/README.md (departures). Superseded and changed here: the 300 KB limit (now about 1 MB per paper page), 2 threads (now 4 at nice 15), merging viz rows into the deleted ideas log (they stay in src/viz_ideas.md).
