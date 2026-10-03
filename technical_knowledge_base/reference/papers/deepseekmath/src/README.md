# DeepSeekMath (GRPO): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d817f9fc5cb9a9fbcbee5, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `90_js_tabs`, `mk_paper.py`, `mk_coverage.py`, `check_page.mjs`, `build.sh`), via the DPO page's copies; `svgparse.py` is the InstructGPT page's.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; the corpus (mining animation on a synthetic web, with and without domain discovery; Table 1 chart); Base model (data-mix bar, Minerva comparison corrected, code-first lesson, arXiv predict question); SFT; GRPO (Eq. 1 to 4; PPO against GRPO animation on one toy question; GAE reach widget; memory estimate; clip predict question; k3 gradient widget); Results (Table 5 chart); Unified view (Eq. 5, gradient-coefficient widget on eight toy samples, Figures 5 and 6 decoded); Why RL works (Figure 7 decoded, Pass@K predict question); How much to believe; What it takes; Why it matters; Connections. |
| Train all six methods | `t-run` | Live ingredient: SFT, RFT, Online RFT, DPO, PPO, GRPO, GRPO+PS and Dr. GRPO trained in the browser from one base model with one rule reward and one sample budget; exact accuracy, KL, Maj@K and Pass@K; heatmap by question; the three-seed sweep with learning-rate, λ, G and β tables; the PyTorch check; what the toy can and cannot test. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 10 (sort, difference from baseline), Figures 5 to 7 as numbers, 20 claims checked. |
| Then and now | `t-then` | Animation: GRPO's objective term by term through R1, DAPO, Dr. GRPO, Tang and Munos, GSPO, each with what the toy can see; survived/changed table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: the training rules run live on a tiny problem** (the training-recipe row), not a trace replay. GRPO is an update rule, and the paper's own claim is a comparison of update rules (Table 10, Figure 5) that it never runs like for like (no PPO, no DPO, and a learned reward only for GRPO). The toy runs all of them with the same rule reward and sample budget, which is the experiment the paper lacks. Trained live in the browser, deterministic; only the base model's weights are shipped (3,338 float32 weights, 18 KB). JS gradients checked against PyTorch autograd of the paper's objectives as written (Eq. 3 with clip and k3, Eq. 1 with GAE, Eq. 12): worst difference 2.2e-16.
- **The toy disagrees with the paper in places, shown, not tuned away**: Online RFT ends ahead of GRPO and PPO (94.4% against 93.1% and 93.1%, three seeds), DPO collapses at every learning rate, and Pass@64 rises slightly after RL. A held-out split was tried first and abandoned because every method, SFT included, lowered held-out accuracy (`heldout_trial.mjs`, `inputs/heldout_trial.json`); the toy therefore cannot test the paper's out-of-domain gains, and says so.
- **Figures decoded from vector SVGs** (ReAct, InstructGPT and DPO lessons): Figures 5 to 7 print no numbers. Decoding showed GRPO's lead over Online RFT is within one standard error, PS over OS is larger on GSM8K than on MATH (the old summary said the reverse), and Pass@64 falls slightly after RL.
- **The corpus pipeline is an illustrative simulation**, labelled as such: the paper releases no per-round counts, so only its stated mechanism (a classifier that recalls pages like its seed; domains above 10% recalled) is modelled; the paper's own numbers are printed beside it.
- **The GRPO arithmetic for any G is not rebuilt**: the Topic: llms "Deeper: test-time compute" tab already has that calculator; the page links it. The PPO toy and the DPO frontier live on the InstructGPT and DPO pages and are linked.
- **Reading length** about 24 minutes against the old page's 14 (the build's count includes the hidden predict reveals and captions): the page owns the corpus, the base model, GRPO and the evidence judgement.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1, v2, v3 to `inputs/paper_v*.txt`; tables to `inputs/table_*.txt`), `mk_tables.py` (`tables.json`), `decode_figs.py` + `svgparse.py` (`inputs/figs/*.svg` to `inputs/figs.json`).
- `parts/22_js_toy.js`: the toy engine (policy MLP, critic, data, SFT, every method's gradient coefficients, exact evaluation, Maj@K, Pass@K); runs in the browser and in node.
- `toy_sweep.mjs` (node, about 5 minutes; run it in the background): the base model (`parts/_gen_toy.js`) and every toy number the page quotes (`inputs/toy.json`). `mk_toydata.py` slims it into `parts/_gen_toydata.js` with the decoded figures and the check result.
- `check_engine.mjs` then `uv run --with torch python check_engine.py`: `model/check_engine.json` (PASS). The intermediate `model/engine_case.json` (1.5 MB) is regenerated and gitignored.
- `recompute.py`: derived numbers about the paper's evidence (corpus ratios, Table 5 deltas, standard errors, Figure 5 gaps, memory from `inputs/hf_config_rl.json`, GAE weights, zero-signal shares) to `inputs/recompute.json`.
- `heldout_trial.mjs`: the abandoned held-out split, kept as evidence.
- `inputs/`: paper text (three versions), tables, figure SVGs, `repo_README.md` (MIT code), `hf_config_rl.json`, `later_extracts.txt` (quoted lines of every later work cited).
- `check_page.mjs`: every control in both themes and widths, the default training run (must reproduce the sweep), the three animations stepped. `mk_coverage.py`: `coverage.json`.

## Checks (3 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 246 KB. `check_page.mjs`: 414 actions, 0 problems; the default run (all eight methods, 400 steps) takes about 34 s in headless Chrome and reproduces `toy_sweep.mjs` at 168 checkpoints to 5e-5 (the sweep stores 4 decimals). `check_engine.py`: PASS (2.2e-16). `mk_coverage.py`: 63 of 63.
