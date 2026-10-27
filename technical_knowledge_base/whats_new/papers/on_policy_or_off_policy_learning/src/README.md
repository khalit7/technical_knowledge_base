# On-Policy or Off-Policy Learning? A Systematic Study of Distillation Dynamics: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3fe5c17b0d0d8136888ff145ba3a7bbb, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the SA-MRPO page's copies of the reference pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `mk_paper.py`, `build.sh`).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the idea in one sentence, the hero 2 × 2 (`parts/15_js_hero.js`), You need, New terms; Problem; Two knobs (Eq. 1 to 3, the 2 x 2 grid, predict question); Setup; Result (Figure 1 rebuilt, Appendix E, predict question); Why: gradients (Eq. 4 and 5, the one-prefix gradient card, Theorems C.1 and C.2, Corollary C.3); The spectrum (pi_lambda and its safeguards, Figure 3 rebuilt, predict question, A.10 in details); Beyond pass@1 (Figure 5 rebuilt, RLVR table from Figures 6 and 26, style transfer); Robustness (A.1, A.2, A.3, A.7, A.12); How much to believe; What it takes; Why it matters; Connections. |
| Move the rollout policy | `t-run` | Live ingredient: a two-token distillation toy with the paper's exact loss, pi_lambda and optimiser; the lambda slider with exact expected-update changes and the paper's bounds; the recorded lambda sweep (and an in-browser rerun that must match it); one prompt before and after, four ways; the PyTorch check and the design log. |
| The paper's figures, rebuilt | `t-tables` | 24 claims checked against the paper's own figures; Figures 1, 3, 5 as tables; Tables 2 and 6; Appendix A.12. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **The live ingredient is the gradient analysis plus a training toy** (training-recipe row of the table). The owning page, Distillation and Small Language Models, already animates mass-covering against mode-seeking and already trains forward and reverse KL on teacher and student text, so both are linked, not rebuilt. What only this paper has is the rollout-policy spectrum and the gradient-sensitivity argument (Section 5.1, Appendix C), so the page runs those exactly.
- **The toy does not reproduce reverse KL's sensitivity, and says so.** The design was fixed before running (`inputs/toy_design_log.txt`): a first direct-logit version showed nothing (Adam moves every visited logit at the learning rate; every setting reached the teacher), and was replaced once, before its results were seen, by a 184-parameter shared network. Forward KL's insensitivity and its coverage advantage reproduce; reverse KL's sensitivity and the clipping effect do not (5 tokens give log-ratios of at most about 8 nats, and the batch gradient norm never reaches 1.0). Not retuned.
- **"Tables" tab renamed "The paper's figures, rebuilt".** The paper's results are all figures; the numbers come from the vector SVGs (decoded, not read by eye) and only Tables 2 and 6 are printed tables.
- **No Then and now tab**: the paper is three weeks old. Concurrent work (Semi-OPD, OPD collapse, RIDE) is in Why it matters and Further reading, each with its arXiv link.
- **No code card**: nothing is released; Further reading points to the Thinking Machines recipe the study tests.
- **Coverage runs against the paper's claims**: the row's old body was a one-line placeholder.

## Corrections and findings beyond the paper's text

- "On-policy rollouts consistently yield 10 to 15% higher pass@k" on Countdown-4E holds for pass@10 (mean gains 11.6 and 13.3 points) but not pass@1 (3.4 and 3.8 points).
- Figure 6: on-policy forward-KL checkpoints at 1e-5, the best Countdown-4E generalisers, never learn in the RLVR stage (peak reward at most 0.08); the text does not mention this.
- Figure 3: forward KL at 5e-5 is the most accurate setting on Countdown-3 (86.5 to 94.5%), not stated in the text.
- Appendix A.11's last paragraph names "OnPD with forward KL" where the result is about reverse KL.
- §4.2's 11.2 to 14.0 OOD drop decodes as 11.23 to 14.13 against one shared baseline (a 0.1-point gap, plausibly per-dataset averaging).

## Files

- `save_live.py` (the Notion fetch, copied verbatim from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_*.txt`; em-dashes and emails scrubbed), `inputs/anchors.txt` (every section, figure, table and equation anchor; `build.sh` refuses unknown `ax:` links).
- `decode_figs.py` with `svgparse.py` (copied from the InstructGPT page): Figures 1, 3, 5, 6 and 26 from the vector SVGs into `inputs/figs.json` (the SVGs are fetched to scratch; the command is in the docstring). `mk_tables.py`: `tables.json` (Tables 2 and 6 and Appendix A.12 transcribed and checked in reading order against the extracted text, plus the decoded figures). `recompute.py`: `inputs/recompute.json`, 24 claims checked against the figures, Table 6 means and medians, Theorem C.2's formula, the D.5 amplification cap, counts.
- `parts/22_js_toy.js`: the toy engine (world, both students, exact KL gradients, pi_lambda with the D.5 safeguards, batch and exact expected semi-gradients, total-variation distance, Adam with clipping, exact evaluation); runs in the browser and in node.
- `toy_sweep.mjs` (node, seconds): every toy number (`inputs/toy.json`, `parts/_gen_toydata.js`); `build.sh` runs it.
- `check_engine.mjs` then `uv run --no-project --with torch --with numpy python check_engine.py`: `model/check_engine.json` (PASS, max difference 2.2e-16 against torch 2.14.1). `model/engine_case.json` is regenerated and gitignored.
- `check_page.mjs` (from the repo root with node): every control in both themes and widths, the four before/after modes stepped to the end, the in-browser sweep against the record, reduced motion. `mk_coverage.py`: `coverage.json`.

## Checks (19 October 2026)

See the agent report; rerun `sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/on_policy_or_off_policy_learning`, `node .../src/check_page.mjs` and `python3 mk_coverage.py` after any change.

## Light pass to the teaching contract (2026-10-26)

- **Top**: the idea in one sentence (change only who writes the rollouts and the on-policy advantage mostly disappears; for 1B students on short answers the KL direction and the learning rate decide); a static hero (`parts/15_js_hero.js`), the paper's 2 × 2 of rollout policy against KL direction, each cell with Figure 1's accuracy and out-of-distribution change at both learning rates (from `PAPER.rc.f1`); it replaces the old best-of-two-rates 2 × 2 card in "Two knobs" (a one-line pointer stays there); You need (Distillation and Small Language Models, RL for LLMs); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): distillation and on-policy distillation in general, and the forward/reverse KL shapes (Distillation and Small Language Models; the Problem's first paragraph shortened to one sentence plus the link); pass@1 against pass@*k* (RL for LLMs); the gradient on the logits (Loss functions).
- **Moved into closed blocks**: Theorems C.1, C.2 and Corollary C.3 with their constants (a one-sentence summary stays in the Reading flow); what this page's toy adds (in the evidence section); the concurrent work of the same weeks (Semi-OPD, OPD collapse, RIDE) into one dated block, "Same weeks, beyond the paper (read 19 October 2026)".
- **Never autoplays**: `makeAnim` in `11_js_ui.js` (the fixed version shared with the other paper pages) waits on its first frame until the reader presses play or steps, also after a mode switch; tabs from the skill template (`99_js_tabs.js`, key `opd-tab`). `check_page.mjs` fails on any frame of the before/after animation drawn before a click in both themes (it already checked reduced motion), checks the hero is drawn, and opens every closed block.
- **No real image**: nothing physical to show, and the hero redraws the paper's grid from its decoded figure.
- **Takeaway softened** (card, `paper.json`, `live.md`): scoped to 1B students on about 100-token answers with three seeds; reverse KL favours student rollouts only at the lower learning rate (at the higher one off-policy reverse KL scored 49% against on-policy's 35%); forgetting and sparsity follow the learning rate; the RLVR result rests on one RL seed; long traces untested. The Notion property, saved in `live.md` before this pass, read: "In controlled strong-to-weak distillation, the token-level KL direction, not who wrote the rollouts, shapes performance and coverage: forward KL is robust to rollout policy, reverse KL favours student rollouts, and the on-policy generalisation edge does not reliably survive later RLVR." It credits the KL direction alone where the learning rate matters as much, and states reverse KL's preference without its sign flip; Notion still carries it.
- **Source extracts**: `extract_paper.py` already wrote em-dashes as `--` and redacted emails (six in `inputs/paper_v1.txt`); a scan of the folder found no em-dash or email left.
- **Length judgement**: Reading core 23 min before (5,325 words) and 23 after (5,332), plus 2 in closed details (513 words, from 154; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 2 minutes; folding the derivation, the toy note and the dated news took out as much. What stays is core: the two knobs, the grid and its result, the gradient argument in one paragraph plus its live card, the spectrum, coverage and RLVR, the robustness checks and an evidence section that narrows the claim. Other tabs unchanged (Move the rollout policy 5, Figures 7, Further reading 2). Visuals inline: 4 before, 5 after (the hero; the old 2 × 2 table, which the audit did not count as a visual, was folded into it).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 290 units; core 268, depth 13, volatile 5, owned 4; `ledger.py check` problems 0.
- **Checks (26 October 2026)**: `checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (273 actions; in-browser sweep within 5.0e-5 of the record); `mk_coverage.py` 42 of 42. `check_engine.py` not rerun: the toy engine (`22_js_toy.js`) is unchanged.
