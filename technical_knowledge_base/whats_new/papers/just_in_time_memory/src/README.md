# src: Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents (arXiv 2609.27334)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py`, `stream_sim.py` if `inputs/stream.json` is missing, and `mk_paper.py` first; `%%S:...%%` and `%%R:...%%` in the parts are filled from `inputs/stream.json` and `inputs/recompute.json`). Then:
- `python3 check_sim.py` (needs node): runs `parts/20_js_stream.js` against `stream_sim.py` on 5 seeds and success rates; orderings, retrievals and every statistic identical; writes `inputs/check_sim.json`.
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page (25 of 25).
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths (Chrome launched with `headless: 'shell'`).
- `sh fetch_inputs.sh` regenerates `inputs/` from public sources (arXiv HTML and e-print, SkillOS's arXiv HTML, the ALFWorld release zip); `decode_figs.py` needs `uv run --with pymupdf`.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched on 2026-10-03 (Notion's own timestamp 2026-09-28); written from the fetch result, see the note below |
| `paper.json` | headline card, verdict, resources, KB links |
| `mk_tables.py` | Tables 1, 2 and 9 parsed from the LaTeX in the e-print (`inputs/tex/`), Tables 3 to 8 typed and checked against `inputs/tables_v1.txt`; marks every baseline cell that matches SkillOS's published tables (`inputs/skillos_tables.txt`) |
| `recompute.py` | the 63 derived numbers printed in the paper (62 reproduce), standard errors of the gaps, the gain decomposition, the 17 untrained comparisons, validation-set sizes from the decoded curves, training budget |
| `stream_sim.py`, `parts/20_js_stream.js` | the paper's test-time memory protocol (empty bank, batches of 10, BM25 top 3 over task descriptions) on the 140 real ALFWorld valid_seen goals (`inputs/alfworld_valid_seen.json`) |
| `decode_figs.py` | the validation curves of Figures 5 and 6 from the vector PDFs (`inputs/fig_curves.json`) |
| `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt` | the arXiv HTML as text (`extract_paper.py`, which writes `--` for em-dashes and redacts emails), v1 is the only version |
| `mk_hero.py` | the hero figure (`parts/03a_hero.svg.html`), run by `build.sh` |
| `reading.json` | the header's reading minutes, measured with `html_utils/audit_pages.mjs` after a build |
| `ledger.json`, `label_ledger.py` | the knowledge ledger and its labeller |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **Live ingredient: a replay of the paper's memory traffic, not a trace replay.** papers.md suggests a trace replay for agent papers, but no traces, code or curator are released. The part of JitMem that has no LLM in it, which trajectory each task retrieves and when, is exactly what the paper's credit-assignment argument is about, and it can be run on the real ALFWorld test goals with the paper's own protocol. Only task success is a coin (labelled). The replay measures what the paper only asserts: a stored trajectory is first used about 20 tasks later, a quarter are never used, a used one feeds about 5 tasks of about 2 types.
- **The Idea animation is the paper's own example (Figure 3)** run through both designs; its trajectory steps and the write-time artifact are illustrative and labelled.
- **No "Then and now"**: a 2026 result paper.
- **The Reading tab is long (about 17 minutes against the old page's 6)**, because the old summary's central claim ("an untrained curator already wins, so the gain is the timing") does not hold for the headline cells, and showing why takes the decomposition, the 17-cell comparison and the provenance of the baselines.
- **`live.md` was written with the Write tool from the fetch result in context**, not with `save_live.py`: the permission system blocked reading the session transcript. The content is the fetch result's text field, verbatim.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py`): write time against read time on one trajectory, with this page's replay delays (a stored trajectory first used 19.5 tasks later on average, 24% never) and, below, the Qwen3-8B gain split into what the untrained curator adds and what RL training adds (ALFWorld 57%, WebShop SR 92% from training) against RL SkillOS. The paper is under arXiv's non-exclusive licence and no code repository exists, so no paper figure is embedded; nothing physical to photograph. Then "You need" (RL for LLMs for GRPO, Context engineering for agent memory) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: GRPO and Dr. GRPO in general (RL for LLMs); agent memory designs in general (Context engineering). The paper's own loss stays, closed.
- **Closed**: the loss, the training recipe and the fixed training bank (Method); small ablation effects and the two worked examples (Ablations); three smaller evidence points (validation split, a printing slip, nothing released); the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: one dated closed block, "Since the paper (dated: checked 26 October 2026)": still v1 only, no code or weights.
- **No autoplay**: `makeAnim` patched as on Dream-RSI (both animations, Idea and the replay tab, wait for a click); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `jitm-tab`), keeping the `data-to` scroll target. `check_page.mjs` now fails if either animation draws a frame before a click, and audits every closed block opened.
- **Lab tab kept**: the replay tab is a lab with several controls (success rate, ordering, task inspector, 50-ordering statistics) used from Method, Ablations and the hero; its result already sits inline in Method's predict reveal and now in the hero.
- **Takeaway scoped** (`paper.json` with a new `takeaway_note`, the card, `live.md` and `mk_coverage.py`): the database Takeaway said an untrained curator already wins "so the gain is the timing rather than the model". The new one keeps 15 of 17 like for like, gives the headline with its executor, the RL share of the gain, the copied Qwen3-8B baselines and the tau2-bench +3.9 under two standard errors. The Notion property needs the same edit.
- `inputs/paper_v1.txt` and `tables_v1.txt`: 20 em-dashes written as `--`; no author emails were present.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 16.6 min (3,822 words) | 16.4 min (3,774) |
| The paper, closed | 0 | 2.9 min (677) |
| Replay tab; Tables; Further reading | 3.0; 9.6; 3.7 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 (the hero added) |

Why about 16 minutes is right: the top added about 330 words (core sentence, hero caption, terms) and about 680 words of recipe, small effects, examples and adoption detail closed, so the core is flat. What stays open is the method in the paper's order, the results with both predict questions (the 17-cell comparison and the gain decomposition that change how the headline reads) and the four evidence points the verdict rests on. Shorter would mean closing the evidence that corrects the abstract's attribution.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
221 units: core 193, depth 25, owned 1, volatile 1, fat 1 (the old reading-time header). 208 drafted by `ledger.py init` from the page before the pass; 13 added. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 180 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 288 actions, 0 problems (no frame before a click). `mk_coverage.py`: 25 of 25. `check_sim.py`: identical on 5 runs.
