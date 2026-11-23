# Budget Internalization: page source

`bash build.sh` writes `../index.html`. The paper is arXiv 2611.26172v1 (19 November 2026, Ilia Zavidnyi, Alexander Kovrigin, Arina Puchkova, Kirill Gelvan, Sergey Titov, JetBrains Research; CC BY 4.0), the only version on 23 November 2026. All trained checkpoints are public in the JetBrains-Research Hugging Face collection; no training or evaluation code and no per-problem scores are released. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces copied from the Dense Rewards page (`01_css`, `02_split`, `05z_errbox`, `10_js_common`, `21_js_rd_common` (RD.anim), `99_js_tabs` (storage key `bi-tab`), `mk_paper.py` (card's code line made configurable), `build.sh`, `label_ledger.py`, `extract_paper.py`); everything else written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (takeaway, three headline numbers, verdict); the idea in one sentence beside Fig. 1 (the crossover, model and training-data buttons, seed bands), You need, new terms; problem and setup (recipe closed); the crossover and lengths beside Fig. 2 (Table 1); other training data and tasks beside Fig. 3 (differences per task); stop early or lost? beside Fig. 4 (RD.anim, 4 steps); where the budget enters training beside Fig. 5 (Eq. 1 and the ablations, RD.anim, 6 steps); the fine-tuning control beside Fig. 6; How much to believe (with a "does not reproduce" box); What it takes (details closed); Since the paper (closed, checked 23 November 2026); Why it matters and connections. |
| The paper's numbers, rebuilt | `t-tables` | Tables 1, 3, 6, 7 to 16 with a "difference from the base model" view, and every recompute check. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **The live ingredient is the paper's tables, rebuilt and recomputed, not a trained toy.** The claims are measurements of 2B to 4B reasoning models at budgets up to 64k tokens; a toy RL run with a length cap would only show that zero reward for long rollouts shortens rollouts, which is true by construction, and could not test the crossover's size, the transfer or which fixes fail (`viz_ideas.md` P-budget_internalization.9). Instead Fig. 1 replays Tables 8, 9 and 15 per model and training set, Fig. 5 places every ablation of Table 3 on the trade-off, and the tables tab recomputes every quoted number (77 checks).
- **No predict-then-reveal questions.** Fig. 4's step order plays that role (the reader meets the "stopped early" reading before the forcing-up result rejects it), and Fig. 5 shows each ablation one at a time against the empty target corner.
- **No 3D, no embedded figures.** Nothing is spatial; the paper's figures are redrawn from its exact tables (CC BY 4.0 would have allowed embedding).
- **No "Then and now"**: the paper is four days old.
- **Topics**: `paper.json` chips are RL for LLMs and Topic: llm-training-and-post-training (as briefed); Test-time compute and reasoning (owns test-time scaling, budget forcing and overthinking), Alignment and Eval statistics are in `topics_extra`.

## Corrections and findings

- **Takeaway changed.** The provisional takeaway quoted the introduction's ranges (+11.7 to +46.7 at the cap, −17.2 to −35.0 at the largest budget). The paper's own Table 8 seed means, which section 2.1 quotes checkpoint by checkpoint, give +10.9 to +42.4 and −13.1 to −30.2; no per-seed or final checkpoint gives the introduction's ranges (all 36 seed evaluations: +8.3 to +47.8 and −10.6 to −32.2). `paper.json` uses Table 8 and a `takeaway_note`.
- Appendix B calls 64.4% the "headline" Qwen base accuracy at 32k; Table 8 prints 65.56% (Table 3, avg@16: 65.4%).
- Section 3's deltas are 0.1 off Table 3's rounded entries in nine places (the paper subtracts unrounded values); recompute allows that.
- Table 12's printed budget headers for Gemma and Nemotron (1k to 64k) do not match the budgets those models are evaluated at elsewhere (512 to 16k); transcribed as printed and flagged in the tables tab.
- By a non-overlap screen of Table 3's 95% intervals, only forced-answer training and short-trace fine-tuning differ from the standard run at 64k; the standard recipe's own seed spread at 64k is 5.0 points (Qwen 8k, Table 15). Both are derived here and drive the trust section.
- The released Qwen 8k model card describes GRPO with a "leave-one-out baseline"; the paper standardises within the group. Unverifiable without code.
- Not sourced: the forcing-up results (−36.1, −51.0, −5.1 at 4k; 0.0, +2.7, +5.0 at 64k) and the budget-cue numbers exist only in the text (and figures), so Fig. 4 enters them by hand with a comment; Table 7 supplies the base answer-forcing bars.

## Files

- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt`, `inputs/anchors.txt` (`curl -sL https://arxiv.org/html/2611.26172v1 -o <scratch>/bi_v1.html`, then `python3 extract_paper.py <scratch>/bi_v1.html v1`). `inputs/hf_card_qwen8k_franktiger.md`: one released model card, fetched 23 November 2026.
- `mk_tables.py` (tables.json from the extracts), `recompute.py` (`inputs/recompute.json`: 77 checks, 72 agree, 5 documented disagreements, 6 derived; exits 1 on any unexpected result, so the build stops), `mk_paper.py` (card, Further reading, `window.PAPER`).
- `parts/30_js_figs.js`: Figs. 1 to 6 from `PAPER.tables` and `PAPER.rc`; `parts/24_js_tables.js`: the tables tab.
- `check_page.mjs <shots dir>`: every control at 1400 light, 920 light, 390 dark and 1400 reduced motion; splits; text at least 11 px, overlaps, NaN; autoplay once half in view, pause off screen, stop on a reader control, none under reduced motion; list items per step; prose, step-list and figure numbers against recompute.json.
- `reading.json`: the header's minutes, measured with `html_utils/audit_pages.mjs` and `audit_pages.py` (230 words a minute).
- `label_ledger.py`: labels `ledger.json` after `html_utils/ledger.py init`.

## Teaching contract and length

Core sentence, hero, You need and new terms at the top; GRPO's terms, Dr. GRPO and DAPO linked to RL for LLMs, budget forcing and overthinking to Test-time compute, intervals and paired tests to Eval statistics. Recipe details, the adoption bullets and the volatile "Since the paper" are closed. Reading: 18 minutes plus 2 in closed details (measured; the build's own count agrees). The length comes from the paper's three distinct arguments (the crossover with its transfer, the stop-or-lose controls, the one-term ablations plus the supervised control) and a trust section with a reproduction failure; each paragraph carries numbers the reader needs. Ledger: 211 units (core 184, depth 17, owned 3, volatile 5, fat 2: a link-label fragment and a step heading), `ledger.py check` problems 0.
