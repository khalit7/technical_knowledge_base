# Direct Preference Optimization (DPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d818bb1d8cafd30e20f9e, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `mk_paper.py` as in LoRA, `mk_coverage.py`, `check_page.mjs`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence and the hero (the paper's Figure 1 with the bridge equation), You need and new terms; Problem (Eqs. 1 to 3); Idea (Eqs. 4 to 7, RLHF against DPO as a 3D stage on the toy, Fig. 1); The loss (gradient, four real training pairs through DPO and Unlikelihood as a 3D stage, Fig. 2, likelihood-displacement predict question); Theory (Section 5 lemmas and theorem, measured on the toy; implicit reward against true reward); Experiments; Results (Figure 2 left rebuilt, toy-against-paper predict question, standard-error predict question); How much to believe; What it takes; Why it matters; Connections. |
| Train DPO and RLHF | `t-run` | Live ingredient: a 4-word toy language (20,736 sequences, 444-logit autoregressive policy) preference-tuned in the browser with DPO, IPO, cDPO, Unlikelihood, Preferred-FT, PPO on a learned reward and PPO-GT, against the exact Eq. 4 frontier; Figure 2 at toy scale (19 runs, rerunnable, reproduces `toy_sweep.mjs` exactly); 4,000-step runs; Theorem 1 measured. |
| The paper's figures, rebuilt | `t-tables` | Figures 2, 3, 4 from their SVG vector data; Tables 1 and 2 with standard errors; checks on the paper's text. |
| Then and now | `t-then` | Animation: the push on a pair against its margin for Unlikelihood, DPO, SLiC hinge, IPO, cDPO, SimPO, each with its 4,000-step toy result; dated timeline of what followed; survived/changed table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the loss run live on a tiny problem with a known answer** (the training-recipe row), not a trace replay. DPO is a training objective, and its claim ("optimises the RLHF objective exactly, better than PPO") can only be tested where the RLHF optimum is computable. The toy enumerates all 20,736 sequences, so reward, KL and the Eq. 4 optimum are exact. Trained live in the browser (as Switch Transformers): no shipped weights; JS losses and gradients checked against PyTorch autograd.
- **The toy disagrees with the paper's Figure 2**, and the page says so beside the paper's figure: in the toy PPO-GT sits on the exact frontier, DPO at β = 1 and 5 is about as close, and DPO at the paper's β = 0.05 and 0.1 falls well short. The task was not retuned (ViT lesson); the "can and cannot test" box says what the toy cannot reproduce (PPO's difficulty at scale).
- **Figures rebuilt from vector paths** (ReAct lesson): DPO prints almost no numbers. Decoding showed the TL;DR points are counts out of 256 and the bars are ±1 binomial SE, which drives "How much to believe".
- **Tables tab renamed "figures"**: the evidence is in figures; Tables 1 and 2 sit in the same tab.
- **Reading length** 19 min against the old page's 9: the page owns the derivation, the theory and the evidence judgement; trimmed twice.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1, v2, v3 to `inputs/paper_v*.txt`, tables to `inputs/table_*.txt`), `decode_figs.py` (`inputs/figs/*.svg` to `inputs/figs.json`: ticks matched to labels, markers, polylines, error bars; legend bars dropped).
- `parts/22_js_dpo.js`: the toy engine (policy, reference, reward, data, every loss, reward model, PPO, exact evaluation, `makeRunner`); runs in the browser and node.
- `toy_sweep.mjs` (node, about 16 s): every toy number the page quotes, to `inputs/toy.json`. `check_engine.mjs` then `uv run --with torch python check_engine.py`: PyTorch check, `model/check_engine.json` (PASS, worst 1.9e-13).
- `recompute.py`: derived numbers about the paper's evidence (n = 256 grid, bar/SE ratio, z-scores, frontier dominance, Table 1 and 2 SEs) to `inputs/recompute.json`. `mk_toydata.py`: `parts/_gen_toy.js`. `mk_paper.py`: card, Further reading, data.
- `inputs/`: paper text, figure SVGs, `repo_README.md`, `repo_preference_loss.txt` (Apache 2.0 code), `later_extracts.txt` (abstracts and quoted lines of every later work cited), `toy.json`, `figs.json`, `recompute.json`.
- `check_page.mjs`: every control in both themes and widths, each trainer method to 150 steps, the sweep rerun (exact match), the three animations stepped; since 2026-10-25 it also fails if an animation moves before a click and opens every closed block. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 237 KB. `check_page.mjs`: about 400 actions, 0 problems; sweep rerun in the browser in 3.5 s, largest difference 5e-5 (rounding of stored values). `check_engine.py`: PASS. `mk_coverage.py`: 51 of 51.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence (the change of variables and what it deletes); the hero is the paper's own Figure 1 (CC BY 4.0, `img/`, `img/CREDITS.md`), split into its two panels so the labels stay legible at 390 px, with the bridge equation under it (Eq. 5 put into Bradley-Terry, the Z terms cancel). Then "You need" (the RLHF pipeline on the alignment page, cross-entropy on Loss functions) and the new terms (π_ref, β, implicit reward, frontier, Preferred-FT, Unlikelihood, PPO-GT).
- **Visuals inline**: the likelihood-displacement chart and the toy-sweep chart left their predict reveals; each sits in its own titled card right after its question, and the reveal keeps the short answer.
- **No autoplay**: `makeAnim` in `11_js_ui.js` replaced by the patched copy (as on ReAct, CLIP and Constitutional AI), so the pipeline, pair and Then-and-now animations wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `dpo-tab`). The page has no `21_js_rd_common.js`; its own controller is `makeAnim`.
- **Owned elsewhere, linked with this paper's sentence kept**: the RLHF pipeline in general, the DPO-against-PPO evidence (Xu, Tang, Tajwar), the successor losses compared on one pair, and why likelihood displacement happens (all Alignment: SFT, RLHF, DPO family, RLVR); standard errors in general (Eval statistics); judge biases (LLM-as-judge).
- **Closed**: Plackett-Luce rankings (A.3); Definition 1, Lemmas 1 and 2 and Theorem 1 in full (the core keeps the theorem in one sentence); the three tasks' models and labellers; every baseline; hardware and the settings that worked.
- **Volatile**: the adoption list (Zephyr, Mixtral, Llama 3, Qwen2, Tülu 3, OLMo 2) and the "rough consensus as of 2026" moved into one dated closed block ("sources read 3 October 2026"); Why it matters keeps the durable claims in a paragraph each.
- Header: "Reading: 20 min, plus 3 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 20.0 min (4,609 words) | 20.2 min (4,644) |
| The paper, closed | 0 | 3.3 min (767) |
| Train DPO and RLHF | 4.2 min core + 2.1 closed | unchanged |
| The paper's figures, rebuilt | 5.5 min | unchanged |
| Then and now | 3.4 min | unchanged |

Why about 20 minutes is right: the added top (core sentence, hero caption, terms and owner links, about 2 minutes) was paid for by closing the lemma statements, task and baseline detail, hardware and settings, and the dated adoption list. What stays open is the paper's argument in order: the RLHF objective, the three-line change of variables, the loss and its weighted gradient with the pair animation, Theorem 1 measured on the toy, every result with its number, and the evidence section this page owns. Cutting further would drop results, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
255 units: core 209, depth 34, owned 6, volatile 5, fat 1. 244 drafted by `ledger.py init` from the page before the pass; 11 added (core sentence, hero, terms, the two moved charts, six owner links). Fat: the old animation-manners line. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 410 actions, 0 problems (including no movement before a click and every closed block opened); sweep rerun matches to 5e-5. `mk_coverage.py`: 51 of 51 (the reading-time item's keys and one quoted key updated). `check_engine.py` not rerun: the engine (`22_js_dpo.js`) is unchanged.

## 2026-10-26: the loss-family push animation moved to Alignment
Khalid's decision: the DPO-family animation (the push on a pair against its margin for unlikelihood, DPO, the SLiC hinge, IPO, cDPO and SimPO, with each loss's outcome on this page's toy) moved to Alignment, section 5, beside the claim it proves. `parts/25_js_then.js` was removed (ported there as `27_js_lfx.js`; its toy outcomes are copied from `_gen_toy.js` by that page's `mk_lfx_data.py`, so rerun it there if this toy is regenerated). The Then and now tab keeps the timeline and the what-survived table and links to the animation; this page keeps its derivation, its toy and its long runs. Ledger units 204 to 206 relabelled `owned:` Alignment.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). The paper tab: the top (core sentence, You need, New terms) beside the hero (the paper's Figure 1); "Both pipelines on the same pairs" (new `h3`, section `s-idea2`) beside the stage Fig. 1; "The weight, on four real pairs" (`s-method2`) beside the stage Fig. 2; the displacement prediction (`s-method3`) beside its chart; Theory beside the implicit-reward scatter; Results' first paragraph beside Figure 2 left (now in a titled card, `f2Card`); the toy prediction (`s-res2`) beside the toy sweep chart. Full width (equations too wide for a column, or no visual): Problem, the derivation of Eqs. 4 to 7, the gradient, the recipe (`s-method4`), Experiments, the rest of Results (`s-res3`), How much to believe, What it takes, Why it matters, Connections. Train DPO and RLHF: the intro, the toy and "Try" (moved out of the card) beside the trainer; the sweep paragraph beside its chart; the long-run paragraph beside its chart; both tables now full width under their splits, as is Theorem 1. The figures tab and Then and now: tools, tables and a timeline, full width (`verify_layout.mjs` lists the figures tab's charts as outside a split; deliberate).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged), replacing the two 2D `makeAnim` animations:
  - `31_js_sc_pipe.js`, Fig. 1, RLHF against DPO on the toy's 5,229 pairs: the models as glass plates at the back (policy green, value net a dashed frame, reference purple, reward model gold; in DPO mode the reward model is an empty frame), the pairs as a stack, the 64 samples per PPO step as blocks, flows for labelling, reward-model fitting, copying, sampling, scoring, the loss and the updates; a plinth with pair 3's two rewards as signed bars: the RLHF reward model's centred scores (+2.48, +0.27) and, in DPO mode, the policy's implicit reward β log π/π<sub>ref</sub> rising through the 600-step run to +0.58 and −1.87. Data: `RMFIT`/`RMC` (the toy's reward model, 3 epochs), `ckRun('dpo', 1)`, the sweep runs "PPO target KL 1" and "DPO β = 1" in `TOYRES`. Two lists (`sx-rlhf`, `sx-dpo`). The Alignment page's general stages (one RL step model by model; one illustrative pair through eight losses) are linked, not repeated.
  - `32_js_sc_pair.js`, Fig. 2, four training pairs through DPO and Unlikelihood: one plinth per pair, side by side, each answer's log π<sub>θ</sub>/π<sub>ref</sub> as a signed bar, the pair's weight σ(r̂(y<sub>l</sub>) − r̂(y<sub>w</sub>)) as a glass trough in front, dots flowing from the trough to both answers in proportion to the weight. Data: `ckRun` (600 steps in the browser; checkpoints 0, 5, 10, 25, 50, 100, 200, 400, 600), grouped into five explained stretches (the long-replay rule); the camera moves in close on pair 4 (DPO) or pair 1 (Unlikelihood) for the last stretch. β selector kept (the counters follow it; the steps quote β = 1 and say so). Two lists (`sx-pair-dpo`, `sx-pair-ul`).
- **Considered and not built**: a value surface over the policy's parameters with the DPO and PPO paths: the toy's policy has 444 logits, not two parameters, so there is no honest 2D surface to draw.
- **Kept 2D**: the hero (the paper's own figure, a real image), the displacement curves, the implicit-reward scatter, Figure 2 left and the toy sweep (reward against KL), the trainer, sweep and long-run charts, the figures tab's charts and tables, Then and now (a timeline and a table): each is a number on an axis or a table.
- **Motion**: `makeAnim` removed from `11_js_ui.js` (no 2D step animation remains). `05z_errbox.js.html` and `99_js_tabs.js` are the templates (storage key `dpo-tab`; a `data-to` link opens the closed block that holds its target, or the one just after it, as before). `check_page.mjs` now asserts that both stages play when scrolled into view and steps each through both modes; `check_stages.mjs` (after DeepSeekMath's) checks the split at 1400 px, both stages in both modes at 1400 light, 920 light and 390 dark, flows stopping off screen, reduced motion, and 25 numbers the static step lists state against the data the stages draw.
- `mk_coverage.py`: the Takeaway item's check updated to the scoped wording now in `paper.json` (it had gone stale with that change; 51 of 51 again).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 20.3 min (4,669 words) | 25.6 min (5,895) |
| The paper, closed | 3.3 min (767) | 3.3 min (767) |
| Train DPO and RLHF | 4.2 core + 2.1 closed | unchanged |
| The paper's figures, rebuilt | 5.5 min | unchanged |
| Then and now | 2.6 min | unchanged |

The growth is the four step lists (23 items): the old animations' captions, which a reader saw one at a time and the audit did not count (drawn by script), are now written out, including the second mode's list of each stage, which the audit counts while hidden. A reader following one mode per stage reads about 3 minutes less. Nothing was cut. Header: "Reading: 26 min, plus 3 in closed details." Pages that quote 20 minutes need `check_times.py --fix` by the lead.

Ledger: 279 units (core 230, depth 34, owned 9, volatile 5, fat 1); 24 added (the 23 step-list items and the plinth sentence); keys re-pointed on units 47 ("the same four training pairs of the toy go through both"), 48 ("grey trough: the pair's weight"), 91 ("rebuilt from the paper's vector data (177 points)") and 205 (owned by Alignment; its key had gone stale with that page's rewording: now "the figure draws the push −∂ℒ/∂ h on one pair"). `ledger.py check`: problems 0.
