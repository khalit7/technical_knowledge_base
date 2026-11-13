# GRAFT: page source

`sh build.sh` writes `../index.html`. The paper is arXiv 2610.17062v1 (12 October 2026; its arXiv title is "Gradient Routing Localizes and Removes Unintended Behaviors in RL", the code README and the knowledge base add the "GRAFT:" prefix). The Papers row is new (created by the lead at publish), so there is no `live.md` and coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces copied from the Sharpening Tax page (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `mk_paper.py`, `build.sh`); `check_page.mjs`, `mk_coverage.py`, `recompute.py` and the rest written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the idea in one sentence beside Fig. 1 (one RL step under GRAFT, a 3D stage, five steps), new terms; Problem (Table 1, predict 1 on the released object_qa logs); Method (Algorithm 1 beside Fig. 2, the routed baseline on one toy group as a 3D stage, the x2, split-moment Adam, anchors, MLP against LoRA, cost; SFT variant closed); Result 1 Countdown-Code (Figure 2 replayed per seed with truth and developer views, predict 2 on D.8's selection, Figure 2 right decoded, transfer and anchoring); Result 2 six toy environments (Figure 3 replayed); Result 3 32B SFT (Figure 4 decoded); Why it works (three mechanisms, failure modes, predict 3 on the toy); Inside the toy (Fig. 3, the toy's two adapters over the default run, a 3D stage); How much to believe; What it takes; Why it matters; Connections. |
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

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper tab: the top (core sentence, Fig. 1's step list, legend, You need, New terms) beside Fig. 1; Method beside Fig. 2; Result 1 beside Figure 2 (left) replayed; a new sub-section "Result 1, inside the run" beside Figure 2 (right); Result 2 beside Figure 3 replayed; Result 3 beside Figure 4; the new section "Inside the toy" beside Fig. 3. Full width (no visual, or a table): Problem (Table 1 and predict 1), Why it works (the failure-modes paragraph moved up, before the toy paragraph and predict 3), How much to believe, What it takes, Why it matters, Connections. Train the toy: two splits (intro and the toy's exact definition beside the method comparison; "One run, step by step" plus the reproduction and Checked boxes beside the step-through widget). The tables tab stays full width (tables only).
- **Three 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_hero.js`, Fig. 1 (replaces the 2D hero stepper and its caption carousel; the captions became the step list): the frozen MLP and the two adapters as glass plates, the sample in front, the summed output and the loss behind; grey flows for the forward pass, coloured gradient flows into the adapters (twice the dots for ×2, a red bar for the mask), the forget plate switched off for the anchor and deleted at deploy, where two bars on plinths show the hack rate. Schematic except those two numbers, read at run time from the page's data: the pre-ablation peak of Figure 2 (right, 38.5% at step 192) and deployed GRAFT's mean over its eight released seeds (1.6%). The camera moves in close on the adapters for the flagged sample.
  - `32_js_sc_base.js`, Fig. 2 (new): one group of 16 sampled by the toy engine from the default GRAFT run's π_R+F at step 15, seed 1: rewards as bars, the monitor's flags, the baseline as a glass plane (all 16 against the unflagged 7), the engine's advantages as signed bars on plinths with the sum over the unflagged (−2.25 against 0), then flows into the two adapter plates. The group is labelled illustrative; its selection rule (the first sampler seed whose group shows every answer type and 6 to 10 flags) is in `toy_sweep.mjs`.
  - `33_js_sc_toy.js`, Fig. 3 (new): the toy's two adapters (five logit shifts each, signed bars on plinths in front of a glass plate) and the two policies' answer mixes, over the default GRAFT run, seed 1; the 300 steps (61 snapshots) play in four explained stretches (long-replay rule), then θF is deleted. Shows routing keeping θR's hack-1 logit at exactly 0 while unflagged hack 2 leaks into θR.
- **Data for the stages**: `22_js_toy.js` now keeps each snapshot's adapters (`uR`, `uF`; no change to any result); `toy_sweep.mjs` writes them and the sampled group into `TOYREF.stage` (`parts/_gen_toydata.js`, `inputs/toy.json`).
- **Kept 2D**: Figure 2 (left) and Figure 4 (scatters with error bars and a truth/developer toggle), Figure 2 (right) (curves over training), Figure 3 (30 labelled stacked bars read value by value; a 3D bar field would hide the numbers), Table 1 and the tables tab, the toy tab's charts (a scatter and a reader-driven step-through widget with a slider: the outcome of a run the reader drives, so no autoplay and no step list).
- **Motion**: the three stages play once half in view and stop for good on a reader control (template). `99_js_tabs.js` (storage key `gr-tab`) and `05z_errbox.js.html` recopied from the templates. `check_page.mjs` no longer clicks the old hero buttons and now asserts that no stage moves under reduced motion.
- `check_stages.mjs` (after Fair Cast's): the three stages at 1400 light, 920 light and 390 dark, autoplay, one list item per step, flows stopping off screen, splits two columns at 1400, reduced motion, the step-through widget not moving by itself, and 44 numbers of the three step lists against the data the stages draw (plus the live engine against `TOYREF.stage`).

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 18.7 min (4,294 words) | 22.6 min (5,206) |
| The paper, closed | 2.2 min | unchanged |
| Train the toy | 1.8 + 1.4 closed | 2.1 + 1.4 closed |
| Tables; Further reading | 9.0; 2.0 min | unchanged |
| Visuals in Reading (audit) | 5 | 7 (Fig. 2 and Fig. 3 added; the hero is now a stage) |

The growth is the three step lists (Fig. 2 and Fig. 3 are new explanations: the routed baseline worked on real numbers, and where each hack is stored in the toy) and a short intro to "Inside the toy". The old hero captions were drawn by script and invisible to the audit. Nothing was cut. Header: "Reading: 23 min, plus 2 in closed details."

Ledger: 233 units (core 199, depth 32, owned 2); 6 added for the new step lists; keys re-pointed on units 10, 11 and 13 (the old hero card title, button and legend, reworded under Fig. 1's list). `ledger.py check`: problems 0.
