# Re-grading six physics benchmarks: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d8165b0c8d15600421259, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. The paper is arXiv 2609.13009 v1, "How Good Are Frontier Models at Physics? Expert Re-Grading Reveals Broken Evaluations and Near-Saturation of Leading Benchmarks". Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Phi-Bench page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence, hero figure (`15_js_hero.js`), You need and New terms; the question; six benchmarks in two groups; the audit (three labels, two protocols); case gallery (the paper's 11 worked cases); Results (Figure 1 rebuilt; predict: which benchmarks were grader-driven, revealing Figure 2 rebuilt; predict: PHYBench 140's score, revealing two graders run on the paper's cases; CritPt 44 repair; the Anthropic audit); the defect floor (interactive, presets from Table 2); Not only physics; How much to believe (predict: what a rejections-only audit cannot see); What it takes to use this; Why it matters; Connections. |
| Follow the audit | `t-run` | The live ingredient: every benchmark's questions as squares through the paper's pipeline (select, grade, audit run, labels, exclude or repair, re-grade), with the paper's counts; then a simulator of the protocol against the truth, with the three rates the paper never measured. |
| The paper's tables, rebuilt | `t-tables` | Table 1 (printed, change, counts; Wilson intervals), the by-construction check for GPT-5.6-Sol, removal against re-grading, Table 2 with the audit funnel and defect rates, Tables 3 and 4 with bounded Scott's pi, 27 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the audit itself, not a toy model or a trace replay.** The paper is an evaluation audit with no released code, data or labels; what it does release is counts at every stage. The pipeline animation replays those counts exactly, and the simulator runs the paper's protocol on a benchmark built from its own rates, which is the only way to show the protocol's one-sided biases (unaudited acceptances, exclusions chosen by one model's failures) that drive the verdict.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Outside data used:** Artificial Analysis's CritPt leaderboard (read 3 October 2026, `inputs/aa_critpt_20261003.json`) to confirm the pre-audit 32.29% = 113 of 350 and to show the top-ten cluster; the Anthropic system card's section 8.9 text (`inputs/anthropic_syscard_critpt.txt`; the 88.4% itself sits in an image); FutureHouse's HLE audit, labelled beyond the paper.
- **Reading tab is long (about 22 minutes against the old 3).** The old page was written from the abstract; this page owns the paper's details and an evidence section that changes how its headline numbers read.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`.
- `mk_tables.py`: `tables.json` (Tables 1 to 4 and the audit funnel from Appendix B's text).
- `recompute.py`: 27 checks and every derived number (integer counts behind Table 1, implied scores, removal-only bound, Wilson intervals, Scott's pi bounds by enumeration, Bowman and Dahl's power ratio, Artificial Analysis cross-check), to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (26 items, this paper's own, verified against the built page).
- `label_ledger.py`: labels `ledger.json` (rerun after a rebuild). `reading.json`: the measured core and closed-details minutes for the header.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the pipeline animation stepped for every benchmark. `shot_parts.mjs`: screenshots of each visual for review.
- `viz_ideas.md`: ranked ideas, rows `P-re_grading_six_physics_benchmarks.<k>`.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence; a static hero figure (`parts/15_js_hero.js`): the 250 answers GPT-5.6-Sol had been marked wrong on, one square each, coloured by label (Table 2 pooled: 143 benchmark, 95 grader, 12 model errors), captioned with the one-sidedness of the audit; You need (LLM-as-judge, Eval statistics); New terms (the three labels, pre-audit and corrected, audit run, mean@4 and pass@4, EED, defect floor). The first predict question (how many of 250 were model errors) is answered by the hero, so it now asks which benchmarks were grader-driven; it reveals the same Figure 2.
- **Owned elsewhere, now linked** (what this paper did kept here): LLM-judge biases (LLM-as-judge), the FutureHouse and other HLE audits (Knowledge and reasoning benchmarks), Scott's pi (Human evaluation and annotation).
- **Moved into closed blocks**: provenance and corrections to the first summary; the CritPt 44 repair in full (the same case is in the gallery); Bowman and Dahl's precision arithmetic. Volatile items (the Artificial Analysis CritPt reading of 3 October 2026, the other stories of the 2026-09-21 issue) went to one dated closed block, "Dated readings, September and October 2026".
- **Never autoplays**: `makeAnim` (copied from the Phi-Bench page) waits on step 1 until the reader presses play or steps, also after a benchmark switch; the pipeline caption says so. `check_page.mjs` scrolls the animation into view and fails on any frame drawn before a click, clicks tabs through the DOM and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `rg6-tab`; `90_js_tabs.js` removed). Header: "Reading: 24 min, plus 2 in closed details." from `reading.json`.
- **Takeaway softened** (`paper.json`, so the card, `live.md` and `mk_coverage.py`): "most reported model failures" was most of the audited rejections of one model on four benchmarks (238 of 250); "frontier models look near-saturated" is now GPT-5.6-Sol's corrected 78.7% to 94.6% mean@4 on filtered or repaired sets, upper estimates since nothing marked right was checked; "harder human-written exams rather than another leaderboard on a broken quiz" is now the paper's own call for new, hard, verified physics tasks. The Notion property itself is Khalid's to change.
- **Length judgement**: Reading core 24 min before (5,419 words, 23.6 min) and 24 after (5,405, 23.5), plus 0 then 2 (415 words) in closed details (`audit_pages.mjs`, 230 words a minute). The top added about 1.5 minutes and the moves took out as much. The rest is core: the page's value is the error attribution with its per-benchmark counts and the evidence audit (one-sided review, exclusions chosen by one model, denominator effects), which change how every headline number reads. Other tabs unchanged (Follow the audit 2.6, Tables 6.6, Further reading 3.0). The Follow the audit tab stays a tab: it holds two tools (the pipeline replay and the protocol simulator) that the Reading tab links from three places.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 259 units; core 240, depth 9, owned 4, volatile 2, fat 4 (old header line, the old predict question, the old autoplay note); `ledger.py check` problems 0.
- **Not kept here, should live elsewhere**: the SWE-bench Verified audit (problems in 59.4% of 138 tasks; about 30% of SWE-bench Pro broken) is not on the Coding benchmarks page, and Bowman and Dahl's 98% to 98.1% power arithmetic is not on Eval statistics; both stay on this page until those owners carry them.
- **No real image**: the page is about benchmark items and grading, not a physical object; the paper's own figures are redrawn (Figures 1 and 2) or quoted (Figure 4), so no photo was added.
- Source extracts: one author email in `inputs/paper.txt` replaced with "[email removed]"; no em-dashes were present; `extract_paper.py` now does both on extraction.

## Checks (25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (304 actions); `recompute.py` 27 of 27; `mk_coverage.py` 26 of 26; `ledger.py check` problems 0.

## Checks at first build (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 27 of 27; `mk_coverage.py` 26 of 26.

2026-10-26 (final follow-up sweep): the ceiling-precision block's sample sizes corrected: 38,200 against 3,100 omitted the power factor; at 80% power and alpha 0.05 it is about 300,000 against 24,600 (ratio 12.2 unchanged). Eval statistics section 7 now carries the example.
