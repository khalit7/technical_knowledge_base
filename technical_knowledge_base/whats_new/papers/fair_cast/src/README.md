# Fair Cast: page source

`sh build.sh` writes `../index.html`. The paper is arXiv 2610.41073v1 (29 October 2026, Andrew Gao and William Gao, Stanford), the only version on 2 November 2026; code at github.com/andrewgcodes/faircast (MIT, read at commit 7c213b2 of 29 October 2026). The Papers row is new (created by the lead), so there is no `live.md` and coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, with the shared pieces copied from the GRAFT page (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `99_js_tabs` with storage key `fc-tab`, `mk_paper.py`, `build.sh`, `label_ledger.py`); everything else written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with takeaway and verdict; the idea in one sentence beside the hero, Fig. 1 (Figure 2's loop as a 3D stage, two modes with their step lists); You need; new terms; Problem (dead zone, predict 1 run by the engine, Figure 4 as an image); the hidden lag; Method (with the one-weight slider; guarantees closed); Stale, not noisy (Fig. 2, a 3D stage driven by the rounding engine); Setup (Table A1 closed); Result 1 both halves (predict 2, Table 1); Result 2 long rollouts (Figure 5 image); Result 3 the 25 pairs (dot plot); Result 4 checkpoint (Table 3); Result 5 lag as regularizer (predict 3, Figure 9 image); transfer, ablations, cost; How much to believe; What it takes (details closed); Since the paper (closed, checked 2026-11-02); Why it matters; Connections. |
| Round a weight | `t-sim` | Live ingredient: one fp32 master and its bf16 copy under round-to-nearest, stochastic rounding and error feedback on real float32 bits; weight, learning rate, update, noise, seed; Play after a click (a widget: no autoplay, no step list); counters (first change, changes, same-sign stretch, 256-run average); what reproduces and what cannot. |
| The paper's numbers, rebuilt | `t-tables` | Table 2 (sortable, with the standard error of each difference), the 25 pairs, Table 3, all 38 recompute checks and the three that do not reproduce as printed. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **The live ingredient is the export rule itself, not a toy RL run.** This is a training-recipe paper ("run the update rule live"), and the claim is arithmetic: what each rounding rule does to a small update. That runs exactly in the browser; an RL toy at CPU scale would not have the paper's weight sizes, learning rates or Adam statistics, so it could only be tuned to agree. The engine is checked bit for bit against ml_dtypes' bfloat16 (torch's rounding) and its stochastic rounding is checked exactly by enumerating all 65,536 noise patterns.
- **Its quantitative agreement is by construction**, said on the page: the update size (0.5η) and noise are illustrative because the paper publishes neither the distribution of Adam's normalized update nor of weight sizes. A population view was rejected for the same reason (`viz_ideas.md` P-fair_cast.6).
- **Three of the paper's figures are embedded as images** (CC BY 4.0, `../img/CREDITS.md`) instead of rebuilt: the per-step logs the figure scripts read are not in the repository, and curves are never read by eye. All quoted numbers come from the text and tables.
- **No "Then and now"**: the paper is four days old.
- **Topics**: `paper.json` keeps the two requested topic chips (RL for LLMs, Quantization and Precision); Numerical computing, which owns bf16 and stochastic rounding per OWNERS.md, is in `topics_extra` (listed in Further reading; `mk_paper.py` renders both).

## Corrections and findings

- Every Table 2 mean and standard deviation recomputes from the released 25-pair table (`inputs/table2_pairs.md`), and the 8 MBPP+ endpoints match the released held-out curves exactly. The tally 18 / 6 / 1 and mean +6.1 reproduce; the median is +3.1.
- The mean is carried by the three zebra pairs (96.9 of 152.5 summed points); without them +2.5. The zebra seed-0 pair uses the first Fair Cast run (0.623); the repeat that fell to 0.34 is in Table 2's four-run mean but not in the pairs (with it, mean +5.0).
- 14 of 25 differences are smaller than one standard error of a difference (sqrt(2 x 0.25 / n) on the problems actually scored); MBPP+ is scored on 224 (or 121) problems though the pair table's n_eval says 512.
- Does not reproduce as printed: "30 to 40 points worse" (Table 3 gives 42.0 and 30.4 on HumanEval+, 11.7 on Countdown); "below 0.1%" cost (error feedback is 0.12% at a 31 s step); the conclusion's "two configurations" where removing the lag hurts (section 7.5 reports one). Also: the abstract's "tied on 6" means within one point (three are slightly negative); Figure 4a's bf16 bar after step 1 is visibly below the text's 0.19; "u ≈ |w|/128" is the upper end of a range whose log-average is about |w|/177.
- Checked and fine: the harness multiplies Muon's learning rate by 20 by default, but every Muon config sets `muon_lr_mult` to 1.0, matching the text.
- In the simulator, round-to-nearest's error under a steady drift is a sawtooth that leads the master after each jump, so its average lag is small; what persists is the sign of the error over about a hundred steps, which is what the paper's "sign-coherent across steps" means. The page says this and counts the longest same-sign stretch.

## Files

- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`.
- `inputs/code_readme.md`, `inputs/table2_pairs.md`, `inputs/faircast_cast.py.txt`, `inputs/mbppplus_heldout_curves.json`: small files from the code repository (MIT), fetched 2 November 2026.
- `mk_tables.py` (tables.json), `recompute.py` (`inputs/recompute.json`: 38 checks, 35 agree), `mk_paper.py`, `parts/20_js_sim.js` (the rounding engine, shared by the page and the checks), `check_sim.mjs` (writes `inputs/sim.json`, exact SR check) and `check_sim.py` (`uv run --no-project --with ml_dtypes --with numpy python check_sim.py`: 1,993 of 1,993 casts identical).
- `check_page.mjs` (from the repo root with CHROME_PATH set): every control at 920 light and 390 dark, no frames before a click, every closed block opened, prose and summary numbers against the data. `mk_coverage.py` (after a build): `coverage.json`, 41 of 41 claims in the paper extract and on the page.
- `reading.json`: the header's minutes, measured with `html_utils/audit_pages.mjs` and `audit_pages.py` at 230 words a minute.
- `label_ledger.py`: labels `ledger.json` after `html_utils/ledger.py init`.

## Teaching contract and length

Core sentence, hero, You need and new terms at the top; general mechanisms linked to their owners (GRPO and mismatch corrections to RL for LLMs, bf16 and stochastic rounding to Numerical computing, the straight-through estimator to Quantization and Precision); derivations, settings, release details and the volatile "Since the paper (checked 2026-11-02)" in closed blocks; nothing moves before a click. Reading 20 minutes plus 4 in closed details (measured). A paper page owns every detail of its paper; the five result sections make different claims (both halves needed, long-rollout gains, breadth, checkpoint drift, lag as regularizer) and the verdict depends on all of them. Ledger: 244 units (core 200, depth 36, owned 3, volatile 5), `ledger.py check` problems 0.

## Checks (2 November 2026)

See the report; rerun `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/fair_cast`, `node src/check_page.mjs`, `python3 src/mk_coverage.py`, `python3 html_utils/ledger.py check technical_knowledge_base/whats_new/papers/fair_cast`. Measured on a Linux cloud container (no GPU); everything is deterministic CPU work.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper tab: the top (core sentence, the stage's mode toggle and step list, You need, New terms) beside the hero stage; Problem and The hidden lag share one split beside the paper's Figure 4 (panel (a) is the problem, (b) the changed fraction, (c) the hidden ratio); Method beside the one-weight slider; the new section "Stale, not noisy" beside Fig. 2; Result 2 beside Figure 5; Result 3 beside the 25-pair dot plot; Result 5 beside Figure 9. Full width (no visual, or a table): Setup, Result 1 (Table 1), Result 4 (Table 3), Transfer and cost, How much to believe, What it takes, Why it matters, Connections. Round a weight: notes, What to try, the reproduction box and the engine check on the left, the simulator card on the right. The tables tab stays full width (tables only).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_loop.js`, Fig. 1 (replaces the 2D hero SVG and its toggle): the RL loop of Figure 2 with the fp32 master and the served copy as glass plates, the export and trainer boxes, a group of 8 rollouts, flows on every path (the export stream thin under round-to-nearest, dense under Fair Cast), and the two ratios as bars on white plinths. Two modes, each with its own five-step list; the camera moves in close on the master (step 1) and the export path (step 2). Values are the paper's measurements as the page already quotes them (0.4 to 0.5% and 2 to 15% of weights changed per step; mean |log ratio| 0.01 visible, 0.10 to 0.16 MATH and about 0.45 knights-and-knaves hidden, about 0.01 under Fair Cast); stream densities are schematic, said under the list.
  - `32_js_sc_dz.js`, Fig. 2 (new): one weight of 0.02 under round-to-nearest, stochastic rounding and error feedback, three rails in depth with the bf16 grid, round-to-nearest's dead-zone gates as glass, the master as a ball, each copy as a block, the export as a flow from master to copy, and master minus copy as a signed bar on a plinth. Every position is `FCSIM.run` at the simulator's defaults (illustrative update size and noise, as the tab says); the 300 steps play in 5 explained stretches (long-replay rule), and the camera moves in close on the round-to-nearest rail at the jump. Every number in its step list is checked against the engine by `check_stages.mjs`.
- **Kept 2D**: the one-weight slider (a number line with a probability bar; one parameter, reads best flat); the 25-pair dot plot (a sorted scatter with error bands); the simulator chart (a time series, and the tab's tool); Tables 1 to 3 and the tables tab; the paper's Figures 4, 5 and 9 stay real images (curves, CC BY 4.0).
- **Motion**: the stages play once half in view and stop for good on a reader control (template). The simulator stays a widget that waits for Play (it is the outcome of a run the reader drives). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `fc-tab`; the template keeps `data-to`). `check_page.mjs` now asserts that both stages play when scrolled into view instead of forbidding any frame before a click, and drives the new mode toggle `fcLoopM`.
- `check_stages.mjs` (after DSec's): both stages at 1400 light, 920 light and 390 dark, autoplay, one list item per step in each mode, flows stopping off screen, splits two columns at 1400, reduced motion, the simulator drawing nothing before Play, and 21 numbers (Fig. 2's step list against the engine, Round a weight's reproduction box, Fig. 1's quoted values against the prose).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 20.4 min (4,685 words) | 23.7 min (5,458) |
| The paper, closed | 4.2 min (957) | unchanged |
| Round a weight; tables; Further reading | 2.8 + 0.6; 8.1; 2.3 min | unchanged |
| Visuals in Reading (audit) | 6 | 7 (Fig. 2 added; the hero is now a stage) |

The growth is the step lists: Fig. 1's two lists (the Fair Cast one is hidden until chosen, about 0.7 minutes of the count) and Fig. 2's list with its introduction (about 1.8 minutes). The old hero caption was drawn by script and invisible to the audit. Nothing was cut. A reader following one mode reads about 23 minutes. Header: "Reading: 24 min, plus 4 in closed details."

Ledger: 252 units (core 207, depth 37, owned 3, volatile 5); 8 added for the two step lists; keys re-pointed on units 11 and 12 (the hero caption, reworded under Fig. 1's list). `ledger.py check`: problems 0.
