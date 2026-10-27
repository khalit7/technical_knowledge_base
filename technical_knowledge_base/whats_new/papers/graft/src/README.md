# GRAFT: page source

`sh build.sh` writes `../index.html`. The paper is arXiv 2610.17062v1 (12 October 2026; its arXiv title is "Gradient Routing Localizes and Removes Unintended Behaviors in RL", the code README and the knowledge base add the "GRAFT:" prefix). The Papers row is new (created by the lead at publish), so there is no `live.md` and coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces copied from the Sharpening Tax page (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `mk_paper.py`, `build.sh`); `check_page.mjs`, `mk_coverage.py`, `recompute.py` and the rest written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the idea in one sentence with the hero stepper (one RL step under GRAFT, four steps), new terms; Problem (Table 1, predict 1 on the released object_qa logs); Method (Algorithm 1, the routed baseline, the x2, split-moment Adam, anchors, MLP against LoRA, cost; SFT variant closed); Result 1 Countdown-Code (Figure 2 replayed per seed with truth and developer views, predict 2 on D.8's selection, Figure 2 right decoded, transfer and anchoring); Result 2 six toy environments (Figure 3 replayed); Result 3 32B SFT (Figure 4 decoded); Why it works (three mechanisms, predict 3 on the toy); How much to believe; What it takes; Why it matters; Connections. |
| Train the toy | `t-toy` | Live ingredient: Algorithm 1 run literally on a tabular policy, six methods side by side, monitor choice, recall, penalty, seed, truth and developer views; one run stepped with its answer mix and curves; what reproduces and what cannot. |
| The paper's numbers, rebuilt | `t-tables` | Every check (26), the per-seed Countdown data, the per-environment toy data, Tables 2, 3, 4. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **The tables tab holds replayed data more than printed tables.** The paper's evidence is in figures (2, 3, 4); its four tables are appendix detail. The authors released the figure inputs, so the figures are replayed from data (Figure 2 left, Figure 3) or decoded from the vector SVGs (Figure 2 right, Figure 4), and the printed tables are shown as printed.
- **Two kinds of live ingredient.** The paper is a training method on top of RL (the "training recipe" row: run the update rule live). The page does that with a toy, and also replays the released per-seed evaluations in the Reading tab, because the real numbers carry the argument better than any toy.
- **The toy is not tuned to agree.** Its environment was set so that no intervention learns hack 1 and the penalty learns hack 2 (the paper built its environments to the same conditions, Appendix F.1); GRAFT's outcome was not tuned, and it does not reproduce the clean deployed model (about 42% hacking, a third of answers using undetected hacks). The page shows this beside the paper's 1.6% and says why: tabular adapters share nothing, so only preemption can act. An earlier expected-gradient version was dropped because with nearly all rewards equal the group standard deviation vanishes and advantages blow up, unlike finite GRPO groups (`viz_ideas.md` P-graft.9).
- **No "Then and now"**: the paper is two weeks old. The problem it answers is owned by the Reward Hacking page, linked rather than retold.
- **Three Figure 3 arms are not replayed** (Filtering, without routing, without anchoring): their runs are not in the released bundle (only their configs are).

## Corrections and findings

- Figure 2 (left) replays exactly: all eight means within 0.01 points of the figure's geometry; GRAFT reproduces Table 4 (79.2 ± 1.0, 1.6 ± 0.4) and the base model 60.2 / 4.7, independently.
- Two metrics: Figure 2's clean solve rate (+16.2 over base, the paper's "roughly 16") and Table 4's scaffolded task score (+19.0, the blog's "nearly 20pp").
- The penalty's undetected hacking is 25.9% (paper "about 26%", D.8 "28%" for the developer-picked seed, 27.7%; blog "about 30%"). Pre-ablation peak 38.5% (paper "up to 38%", blog "up to 35%").
- The penalty solves more of the clean task than GRAFT on Countdown (77.2 against 74.8), and deployed GRAFT is below the better baseline in all six toy environments (2 to 14 points) and below oracle filtering in the SFT run without elicitation (39.5 against 49.7).
- A comment in `rl/figures/countdown_figure1.py` says a penalty configuration chosen by ground truth (penalty 5) hacked 7.7% at task score 81.3; those runs are not in the bundle (stated as from the script, not verified).
- Table 2 prints standard deviations and Table 3 standard errors of the same numbers; they agree after dividing by the square root of 8.

## Files

- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt` and `inputs/anchors.txt`. `inputs/blog.txt`: the Alignment Science Blog post as text (fetched 26 October 2026).
- `mk_countdown.py <paper_fig_inputs.tar.gz>` and `mk_toyenvs.py <same>`: read the authors' figure bundle (github.com/jnward/GRAFT at b0767d1c40e5a03d78fc5ff4b6abc92829168386, `rl/paper_data/paper_fig_inputs.tar.gz`, 7.6 MB, sha256 3bd3911c...7797, MIT; not kept here) and write `inputs/countdown_points.json` and `inputs/toyenv_points.json` with the selection rules of the authors' figure scripts. Stdlib only.
- `decode_figs.py <dir of SVGs>` (with `svgparse.py`, copied from the InstructGPT page): the arXiv figure SVGs (`countdown_figure1`, `routing_scatter_main`) to `inputs/figs.json`.
- `mk_tables.py` (Tables 2 to 4 parsed from the extracts into `tables.json`), `recompute.py` (`inputs/recompute.json`: 26 checks, all agree), `mk_paper.py`, `toy_sweep.mjs` (node, about 5 s: `inputs/toy.json` and `parts/_gen_toydata.js`, five seeds, four variants), `parts/22_js_toy.js` (the toy engine, the same file in the page and the sweep).
- `check_page.mjs` (from the repo root after `. html_utils/cloud_setup.sh`): every control in both themes and widths, label overlap, 11 px text, prose numbers against the data, the live toy against the sweep, element screenshots. `mk_coverage.py`: `coverage.json`, 41 of 41 of the paper's claims found in the source and on the page.

## Length

Reading 19 minutes (4,389 words at 230 a minute) plus 2 in closed details (contract pass, 26 October 2026: the replay check of Figure 2 and the Table 2 transfer and Appendix D.3 paragraph moved into closed blocks, as provenance and per-item detail). A paper page owns every detail of its paper; the Reading carries three result sections because the paper's three experiments make different claims (preemption on Countdown, removal of learned undetected hacks in the toys, propensity under elicitation in SFT), and the verdict depends on all three.

## Contract pass (26 October 2026, after the routine audit)

- The tab script is the skill template `99_js_tabs.js` (storage key `gr-tab`) in place of the old `90_js_tabs.js`, so links like `#t-toy` open their tab; `check_page.mjs` loads the page at `#t-read` so a remembered tab never changes where a pass starts.
- `src/ledger.json` drafted with `ledger.py init` and labelled by `label_ledger.py` (227 units: core 193, depth 32, owned 2: GRPO on RL for LLMs, monitor obfuscation on Reward Hacking); `ledger.py check` problems 0.

## Checks (26 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs, about 169 KB. `check_page.mjs`: 78 actions, 0 problems. `recompute.py`: 26 of 26 agree. `mk_coverage.py`: 41 of 41. Measured on a Linux cloud container (4 CPUs, shared, no GPU); everything here is deterministic CPU work.
