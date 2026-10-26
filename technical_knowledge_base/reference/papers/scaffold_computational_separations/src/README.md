# Understanding the Benefits of Scaffolds through Computational Separations: page source

`sh build.sh` writes `../index.html`. The paper (arXiv 2610.27157v1, 19 October 2026, Gai, Block and Risteski) was added by the 2026-10-26 update-kb run; its Papers row did not exist yet, so there is no `live.md` and coverage runs against the paper's own claims (`inputs/paper_v1.txt`, the saved arXiv HTML text). Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `mk_paper.py`, `build.sh`, `extract_paper.py`) copied via the Sharpening Tax page; `mk_coverage.py` and `check_page.mjs` rewritten for this paper. `11_js_ui.js`'s step animation no longer starts by itself, and a mode switch stops on step 1 (never autoplay, 2026-10-23). The tab script is the skill template `99_js_tabs.js` (storage key `sc-tab`), so links like `#t-run` open their tab.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the idea in one screen (core sentence, hero graph from the lab's engine, new terms); Problem; Same-size students (setup, Figure 1 rebuilt, ablations, what the teacher brings); Closing the gap (Figure 2b, simple BT, chain-of-thought length with a predict question and Figure 3b); The theorem (STCON, AC0 lookup, complexity ladder, Lemma 1 on numbers, Theorem 1 and BFS, why depth, what it does not say); Branching on math (predict question and Figure 5a, noise, recipes, capacity, QED-Nano with Figure 13c intervals); How much to believe; What it takes; Why it matters; Connections. |
| Run the harness | `t-run` | Live ingredient: the BFS harness of Theorem 1 (i) stepped round by round on a graph you choose, against a reader that squares the Boolean adjacency matrix once per layer (2^k hops for k layers); then reader accuracy over 200 graphs per size, N = 8 to 256, two families, plus the harness's rounds and lookups. |
| The paper's figures, rebuilt | `t-tables` | Every decoded chart and Tables 1 to 3 (select), and every check of `recompute.py` as cards. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **The live ingredient is a simulation of the theorem's mechanism, not a trained model.** The paper is theory plus distillation experiments that need its traces and models (none released). The theorem is the part that can be run exactly: its harness is plain breadth-first search over an edge-lookup oracle. The fixed-depth "reader" is one standard constant-depth strategy (repeated Boolean squaring), labelled as such; it illustrates why depth matters and cannot show that every constant-depth circuit fails (that is the open NL vs TC0 question). A tiny transformer student trained on BFS traces was considered and rejected (`viz_ideas.md` row 11).
- **Figures decoded, not tables transcribed.** The paper prints nearly every result as a chart. `decode_figs.py` reads the e-print's vector PDFs (bars, tick marks, error bars, dashed reference lines) with PyMuPDF; the 91 bars that carry a printed label agree with it to the label's precision. Values without labels (Figures 2b and 9, Figure 13c intervals, the teacher lines) are marked decoded. Figures 6 to 8 and 10 (line and scatter panels of ablations, no printed values) are summarised in words only.
- **No "Then and now"**: the paper is a week old.
- **Reading time** 20 minutes plus 1 in closed details (counted by the build, predict reveals included). The page owns every detail of the paper; the knowledge the topic pages own (chain of thought as computation on Test-time compute and reasoning, distillation recipes, scaffold sensitivity) is linked, not retaught.

## Corrections and findings (against the paper's text and the brief's summary)

- "The harness reaches 43.6% with 85 model calls, while a single-pass student saturates near 36%" compares different trees: the (4,3) tree (85 calls) has no student ("n/a" in Figure 5a); the best student of any shape is 35.8% at (2,2), 7 calls. The (3,3) student, 26.8%, is below the untouched base model (28.0%).
- "Increasing the LoRA rank improves the student by only 2.2 percentage points": rank 16 to 64 gives +1.8 (31.8 to 33.6); +2.2 is full fine-tuning (34.0), Figure 13b.
- "A 4B backbone closes the gap and surpasses the teacher": 41.6% against 40.0%, +1.6 points, half a standard error at 500 problems; the 4B model's own score without distillation is not reported.
- "A longer chain of thought matches and eventually exceeds verifier-guided search" (introduction): greedy decoding matches (97 and 98 against 99 at L = 19 and 20; 100 against 100 at n_ops = 10) but never exceeds the scaffold in Figures 3 or 11; that experiment trains on the true chain, not on traces, and the scaffold's verifier holds the answer key.
- Theorem 1 covers students with a chain of thought of O(log n) tokens; every distilled student in the experiments writes a long trace, which is outside that class (polynomial chains reach P; Merrill and Sabharwal 2024). The theorem motivates the experiments rather than explaining them.
- The size sweep's 0.68M point on VGB/Dyck is 0.984 ID / 0.770 OOD (best over runs on the evaluation split) against 0.90 / 0.70 for Figure 1's fine-tuned student at the same size.
- Authors: Adam Block is at Columbia, not CMU (the brief said all CMU).
- Bookkeeping: Section 3.1 says 12 scales up to 11.5M, Appendix C.1 up to 5.65M, Table 1's caption says VGB ran "tiny to m_plus" (11 rows) as 8 scales; figures plot 8 VGB and 5 A* sizes. The (3,2) teacher is 40.4 in Figure 5a and 40.0 in Figure 13a; the (3,1)-tree teacher line in Figure 12 is 36.0 against 36.4 in Figure 5a. Figure 5b shows a (1,3) QED-Nano shape that is in neither Table 3 nor Figure 13c; Figure 13c marks (2,2) as exceeding the window though Table 3 gives no length. The base bar in Figure 5a (28.0) is 3 points under the stated evaluation pass@1 (about 0.31).
- Reproduced: calls per tree (sum of d^i) equal Figure 12d; Figure 1's teacher lines equal Figure 8's caption (0.765/0.605, 0.99/0.98); Figure 2c equals Table 2's BT rows; A* gap 0.65 to 0.13 and VGB students passing the teacher (Appendix C.1).
- Derived: Table 1's parameter counts fit 12 L d^2 + 2,289 d within 3.2% (configs not released); binomial standard errors for every Qwen3 gap; Lemma 1 on 100 vertices (14 tokens, 16,384 transcripts).

## Contract pass (26 October 2026, after the routine audit)

- **Closed depth**: Lemma 1 on numbers with the Part (ii) reduction, the size sweep's teacher-size point, and the paper's bookkeeping slips (with the Figure 5b shape) are closed `<details>`; the theorem statement, the BFS box, why depth is the limit, what the lab does and does not show, and what the theorem does not say stay in core. "You need" moved above New terms. The BFS formula is two lines (it overflowed at 920 px). Trust: small-tree gaps are 1 to 4 points.
- **Takeaway scoped to matched trees** (`paper.json`, card): the old one led with 43.6% (85 calls, no student) against 35.8% (the best student, 7 calls), the comparison the trust section calls the flaw. Matched trees from Figure 5a: 13 calls 40.4 against 35.2, 15 calls 38.0 against 30.0, 21 calls 41.4 against 31.8, 40 calls 42.8 against 26.8; trees of up to 7 calls differ by 1.0 to 4.0. The first headline stat is now the 40-call tree, 42.8 against 26.8. The Notion Takeaway property needs the same text.
- **Ledger**: `src/ledger.json` drafted with `ledger.py init` and labelled by `label_ledger.py` (224 units: core 215, depth 7, owned 2); `ledger.py check` problems 0.

## Files

- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_*.txt`; anchors in `inputs/anchors.txt`.
- `decode_figs.py` (needs PyMuPDF: `uv run --no-project --with pymupdf python decode_figs.py <e-print>/fig`): `inputs/figs.json`. The e-print is not kept (PDFs); its URL is in the script.
- `mk_tables.py`: `tables.json` from the decoded figures and the transcribed tables. `recompute.py`: `inputs/recompute.json`, every check on the tables tab. `mk_paper.py`: card, Further reading, `window.PAPER`.
- `parts/22_js_graph.js`: the lab's engine (graph families, BFS harness, squaring reader, sweep), used by the page and by `sweep.cjs` (node, about 2 s), which writes `inputs/sweep.json` and checks that the squaring reader equals the distance rule (3,000 of 3,000) and that BFS stays under N^2 lookups.
- `check_page.mjs` (from the repo root): every control at 390 dark, 920 light and reduced motion; the live sweep equals `inputs/sweep.json`; hero numbers; prose numbers against the data. `mk_coverage.py`: `coverage.json`, 49 of 49 of the paper's claims found on the page.

## Checks (26 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 4 tabs (rerun after the contract pass). `check_page.mjs`: 0 problems. `mk_coverage.py`: 49 of 49. Everything here is deterministic CPU work on a Linux cloud container; nothing was trained.
