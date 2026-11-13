# DeepSeekMath (GRPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d817f9fc5cb9a9fbcbee5, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `mk_paper.py`, `mk_coverage.py`, `check_page.mjs`, `build.sh`), via the DPO page's copies (`90_js_tabs` replaced by the skill template `99_js_tabs` on 2026-10-25); `svgparse.py` is the InstructGPT page's.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence and hero (MATH at each stage; PPO's four models against GRPO's three); You need and new terms; Problem; the corpus (mining animation on a synthetic web, with and without domain discovery; Table 1 chart); Base model (data-mix bar, Minerva comparison corrected, code-first lesson, arXiv predict question then the Tables 8 and 9 chart); SFT; GRPO (Eq. 1 to 4; PPO against GRPO animation on one toy question; GAE reach widget, closed; memory estimate; clip predict question; k3 gradient widget, closed); Results (Table 5 chart); Unified view (Eq. 5, gradient-coefficient widget on eight toy samples, Figures 5 and 6 decoded); Why RL works (Pass@K predict question then Figure 7 decoded); How much to believe; What it takes; Why it matters; Connections. |
| Train all six methods | `t-run` | Live ingredient: SFT, RFT, Online RFT, DPO, PPO, GRPO, GRPO+PS and Dr. GRPO trained in the browser from one base model with one rule reward and one sample budget; exact accuracy, KL, Maj@K and Pass@K; heatmap by question; the three-seed sweep with learning-rate, λ, G and β tables; the PyTorch check; what the toy can and cannot test. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 10 (sort, difference from baseline), Figures 5 to 7 as numbers, 20 claims checked. |
| Then and now | `t-then` | Animation: GRPO's objective term by term through R1, DAPO, Dr. GRPO, Tang and Munos, GSPO, each with what the toy can see; survived/changed table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the training rules run live on a tiny problem** (the training-recipe row), not a trace replay. GRPO is an update rule, and the paper's own claim is a comparison of update rules (Table 10, Figure 5) that it never runs like for like (no PPO, no DPO, and a learned reward only for GRPO). The toy runs all of them with the same rule reward and sample budget, which is the experiment the paper lacks. Trained live in the browser, deterministic; only the base model's weights are shipped (3,338 float32 weights, 18 KB). JS gradients checked against PyTorch autograd of the paper's objectives as written (Eq. 3 with clip and k3, Eq. 1 with GAE, Eq. 12): worst difference 2.2e-16.
- **The toy disagrees with the paper in places, shown, not tuned away**: Online RFT ends ahead of GRPO and PPO (94.4% against 93.1% and 93.1%, three seeds), DPO collapses at every learning rate, and Pass@64 rises slightly after RL. A held-out split was tried first and abandoned because every method, SFT included, lowered held-out accuracy (`heldout_trial.mjs`, `inputs/heldout_trial.json`); the toy therefore cannot test the paper's out-of-domain gains, and says so.
- **Figures decoded from vector SVGs** (ReAct, InstructGPT and DPO lessons): Figures 5 to 7 print no numbers. Decoding showed GRPO's lead over Online RFT is within one standard error, PS over OS is larger on GSM8K than on MATH (the old summary said the reverse), and Pass@64 falls slightly after RL.
- **The corpus pipeline is an illustrative simulation**, labelled as such: the paper releases no per-round counts, so only its stated mechanism (a classifier that recalls pages like its seed; domains above 10% recalled) is modelled; the paper's own numbers are printed beside it.
- **The GRPO arithmetic for any G is not rebuilt**: the Topic: llm-landscape "Deeper: test-time compute" tab already has that calculator; the page links it. The PPO toy and the DPO frontier live on the InstructGPT and DPO pages and are linked.
- **Reading length**: see the length judgement below.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1, v2, v3 to `inputs/paper_v*.txt`; tables to `inputs/table_*.txt`), `mk_tables.py` (`tables.json`), `decode_figs.py` + `svgparse.py` (`inputs/figs/*.svg` to `inputs/figs.json`).
- `parts/22_js_toy.js`: the toy engine (policy MLP, critic, data, SFT, every method's gradient coefficients, exact evaluation, Maj@K, Pass@K); runs in the browser and in node.
- `toy_sweep.mjs` (node, about 5 minutes; run it in the background): the base model (`parts/_gen_toy.js`) and every toy number the page quotes (`inputs/toy.json`). `mk_toydata.py` slims it into `parts/_gen_toydata.js` with the decoded figures and the check result.
- `check_engine.mjs` then `uv run --with torch python check_engine.py`: `model/check_engine.json` (PASS). The intermediate `model/engine_case.json` (1.5 MB) is regenerated and gitignored.
- `recompute.py`: derived numbers about the paper's evidence (corpus ratios, Table 5 deltas, standard errors, Figure 5 gaps, memory from `inputs/hf_config_rl.json`, GAE weights, zero-signal shares) to `inputs/recompute.json`.
- `heldout_trial.mjs`: the abandoned held-out split, kept as evidence.
- `inputs/`: paper text (three versions), tables, figure SVGs, `repo_README.md` (MIT code), `hf_config_rl.json`, `later_extracts.txt` (quoted lines of every later work cited).
- `check_page.mjs`: every control in both themes and widths, the default training run (must reproduce the sweep), the three animations stepped, no frame before a click, every closed block opened. `mk_coverage.py`: `coverage.json`.
- `ledger.json` (knowledge ledger) and `label_ledger.py` (labels it against the built page); `reading.json` holds the header's minutes, measured with `html_utils/audit_pages.mjs`. `parts/14b_js_hero.js`: the hero, static.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 246 KB. `check_page.mjs`: 414 actions, 0 problems; the default run (all eight methods, 400 steps) takes about 34 s in headless Chrome and reproduces `toy_sweep.mjs` at 168 checkpoints to 5e-5 (the sweep stores 4 decimals). `check_engine.py`: PASS (2.2e-16). `mk_coverage.py`: 63 of 63.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero (`14b_js_hero.js`, static): MATH without tools at each stage (Base 36.2% few-shot, Table 2; Instruct 46.8% and RL 51.7%, Table 5) against GPT-4's 52.9% and the best earlier open model's 37.7%, beside the models PPO and GRPO keep (policy and value trained, reward and reference frozen, against policy only) with a group's rewards normalised. The paper is under arXiv's non-exclusive licence, so its Figure 4 is not embedded. Then "You need" (Policy gradients and actor-critic for the clip and GAE; RL for LLMs for GRPO today) and the new terms.
- **Visuals inline**: the arXiv ablation chart (Tables 8 and 9) and Figure 7 (Pass@K and Maj@K) left the predict reveals; each sits in a card right after its question.
- **No autoplay**: `makeAnim` patched as on FlashAttention and DeepSeek-V3 (the corpus, PPO-against-GRPO and Then and now animations wait on their first frame); `90_js_tabs.js` replaced by the template (storage key `dsm-tab`). `check_page.mjs` fails if any animation draws a frame before a click and opens every closed block. Training in Train all six methods already waited for its button.
- **Owned elsewhere, a sentence kept and linked**: PPO's clip and GAE in general (Policy gradients and actor-critic); the Pass@K debate since 2025 and GRPO's later fixes, Dr. GRPO, DAPO and GSPO (RL for LLMs); R1's GRPO settings (the DeepSeek-R1 paper page).
- **Closed**: the classifier's settings and decontamination, the 1.3B training settings, tool use, formal proofs and general ability (Tables 3 and 4), what the 776K SFT examples are, the GAE reach widget, the k3 gradient subtlety and its widget, the paper's directions and limits.
- **Volatile**: R1's settings and the open ecosystem, the fixes in detail, and "GRPO today" (TRL, verl, OpenRLHF defaults) moved to one dated closed block, "Where GRPO went next, and where to run it (dated: checked 3 October 2026)".
- **Kept as tabs**: Train all six methods (a lab with several sections and controls, compared across every method, linked from five places in Reading), the tables and figures, and Then and now.
- **No real image**: the paper is about an algorithm and a corpus; there is no physical object to show.
- Header: "Reading: 23 min, plus 4 in closed details." from `reading.json`. The contact email in `inputs/repo_README.md` redacted.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 24.5 min (5,646 words) | 22.9 min (5,273) |
| The paper, closed | 0 | 3.6 min (833) |
| Train all six methods; tables; Then and now; Further reading | 4.9; 4.3; 1.9; 2.5 min | unchanged |
| Visuals drawn in Reading (audit) | 10 | 14 |

Why about 23 minutes is right: the page owns four things a reader needs (the corpus recipe, the base model's data lessons, GRPO as the paper states it, and the evidence judgement), each already with its visual; the pass added the top (about 2 minutes) and paid for it by closing settings, side results and two beyond-the-paper widgets. Shorter would mean closing the unified view or the evidence section, which carry the verdict.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
255 units: core 227, depth 18, owned 6, volatile 4, fat 0. 248 drafted by `ledger.py init` from the page as committed before the pass; 7 added (core sentence, hero, new terms, three owner links, the biases sentence). Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, 255 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 414 actions, 0 problems; the default run reproduces `toy_sweep.mjs` at 168 checkpoints to 5e-5; no frame before a click. `mk_coverage.py`: 63 of 63. The toy engine is unchanged, so `check_engine.py` was not rerun.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged). The paper tab: the top (core sentence, You need, New terms) beside the hero; the corpus loop beside the 3D corpus stage (Fig. 1) with its two step lists and counters; the 1.3B test beside the Table 1 chart; the base model beside the data mix; the lessons and the arXiv prediction beside the arXiv chart; "PPO against GRPO on one question" (new `h3`, section `s-grpo1`) beside the 3D stage (Fig. 2), with "why the critic is the hard part" and the closed GAE widget; what dropping the critic saves beside the memory chart; Results beside Table 5; the unified view beside the gradient-coefficient widget; the knob experiments beside Figures 5 and 6 (stacked); Why RL works beside Figure 7. Full width (no visual, or equations too wide for a column): Problem, SFT, the GRPO equations (`s-grpo`), iterative RL, the recipe, the clip prediction and the k3 block (`s-grpo3`), How much to believe, What it takes, Why it matters, Connections. New section ids: `s-data2`, `s-base2`, `s-grpo1`, `s-grpo2`, `s-grpo3`, `s-uni2`; the nav still points at the first of each. Train all six methods: intro, toy box and "Try" beside the run card; the heatmap and Maj@K/Pass@K each beside their note (the notes moved out of the cards into the left column); the sweep tables, checks and limits full width. Then and now: the step list beside the objective animation; the survived/changed table full width. Tables and Further reading: tools and lists, full width.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_mine.js`, the corpus pipeline (replaces the 2D `#mine` animation): the page's illustrative synthetic web (`MINE` in `13_js_read.js`): 48 domain tiles, each with its math pages as a column by writing style (solid once found, glass while missed), stray finds in red, flagged domains outlined; the classifier as a glass plate; the seed as one bar per style on a plinth, with the 12-positive line, counts from `MINE.dd/self[*].pos`; flows for training, recall (dot count by pages newly found) and annotation (flagged domains to the seed). Two modes with two lists (`sx-mine-dd`, `sx-mine-self`).
  - `32_js_sc_ppo.js`, PPO against GRPO (replaces the 2D `#ppo` animation): the four models as glass plates (policy blue, value model teal, reference purple, reward model gold; in GRPO mode the value model is a dashed empty frame); PPO: the toy PPO policy's wrong output 6 1 6 with its token probabilities, then r_t, V_t and A_t as three signed bars per token on one plinth, flows from the plates and back for the update; GRPO: eight base-model outputs (2 right), rewards, the group mean as a sinking glass plane, advantages +1.62 and -0.54, every token tinted by its advantage, the KL term zero at the start, the update flowing into the policy only. Data: `READTOY()` (computed in the browser from the toy engine, 100 PPO steps). Two lists (`sx-ppo`, `sx-grpo`). R1's GRPO group stage is not repeated: this one adds PPO's critic against GRPO's group baseline on the same input.
- **Kept 2D**: the hero (scores on an axis plus the model boxes), Table 1, the data mix, the arXiv chart, Table 5, the memory bars, the GAE and k3 widgets (closed), the gradient-coefficient widget, Figures 5 to 7 (curves), the run tab's charts, heatmap and tables, and Then and now (a formula changing term by term).
- **Motion**: `11_js_ui.js` is DeepSeek-R1's (its `makeAnim` follows the 2026-11-06 rules: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, an `ol.sx` per mode). The Then and now animation's caption carousel became its step list (`sx-obj`); the toy line and the source stay in its counters. `05z_errbox.js.html` and `99_js_tabs.js` are the templates (storage key `dsm-tab`; a `data-to` link opens the closed block holding its target). `check_page.mjs` now asserts that both stages and the Then and now animation play when scrolled into view, and steps both stages in both modes; `check_stages.mjs` (after DeepSeek-R1's) checks the layout and motion rules at 1400 light, 920 light and 390 dark, both modes of each stage, flows stopping off screen, reduced motion, and that the step lists' numbers match `MINE` and `READTOY`.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 22.9 min (5,275 words) | 27.0 min (6,215) |
| The paper, closed | 3.6 min (833) | 3.6 min (833) |
| Train all six methods; tables | 4.9; 4.3 min | unchanged |
| Then and now | 1.9 min (431) | 3.1 min (718) |
| Further reading | 2.5 min | unchanged |

The growth is the step lists: the old animations' captions, which a reader saw one at a time and the audit did not count (they were drawn by script), are now written out, plus the second mode's list for each stage (the audit counts hidden lists). Nothing was cut; the ledger is still mostly core. Header: "Reading: 27 min, plus 4 in closed details." Pages that quote 23 minutes need `check_times.py --fix` by the lead.

Ledger: 287 units (core 258, depth 18, owned 6, volatile 4, fat 1); 32 added for the step lists (five lists); keys re-pointed on units 28 ("runs the same loop on a synthetic web"), 75 ("runs one question of this page's toy") and 122 ("applies each method's coefficient to the same eight outputs"); unit 77 ("Stops off screen; starts paused under reduced motion") relabelled fat, since autoplay replaced it. `ledger.py check`: problems 0.
