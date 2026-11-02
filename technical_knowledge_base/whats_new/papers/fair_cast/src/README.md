# Fair Cast: page source

`sh build.sh` writes `../index.html`. The paper is arXiv 2610.41073v1 (29 October 2026, Andrew Gao and William Gao, Stanford), the only version on 2 November 2026; code at github.com/andrewgcodes/faircast (MIT, read at commit 7c213b2 of 29 October 2026). The Papers row is new (created by the lead), so there is no `live.md` and coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, with the shared pieces copied from the GRAFT page (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `99_js_tabs` with storage key `fc-tab`, `mk_paper.py`, `build.sh`, `label_ledger.py`); everything else written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with takeaway and verdict; the idea in one sentence; hero (Figure 2's loop redrawn, toggle between the two export rules); You need; new terms; Problem (dead zone, predict 1 run by the engine, Figure 4 as an image); the hidden lag; Method (with the one-weight slider; guarantees closed); Setup (Table A1 closed); Result 1 both halves (predict 2, Table 1); Result 2 long rollouts (Figure 5 image); Result 3 the 25 pairs (dot plot); Result 4 checkpoint (Table 3); Result 5 lag as regularizer (predict 3, Figure 9 image); transfer, ablations, cost; How much to believe; What it takes (details closed); Since the paper (closed, checked 2026-11-02); Why it matters; Connections. |
| Round a weight | `t-sim` | Live ingredient: one fp32 master and its bf16 copy under round-to-nearest, stochastic rounding and error feedback on real float32 bits; weight, learning rate, update, noise, seed; Play after a click; counters (first change, changes, same-sign stretch, 256-run average); what reproduces and what cannot. |
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
