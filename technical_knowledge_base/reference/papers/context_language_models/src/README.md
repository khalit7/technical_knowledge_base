# src: Context Language Models (arXiv 2609.37725)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py` and `mk_paper.py` first, and refuses to build if an `ax:` link or margin label names an anchor that is not in `inputs/anchors.txt`). Then, from the repo root:
- `python3 technical_knowledge_base/reference/papers/context_language_models/src/mk_coverage.py`: `coverage.json`, every item checked against the built page.
- `node technical_knowledge_base/reference/papers/context_language_models/src/check_page.mjs [shots dir]`: the JS replay and turn calculator against `recompute.py`, reduced motion, then every control and the animation in both themes and widths (set `CHROME_PATH` if puppeteer's own browser is missing).
- `sh html_utils/checkpage.sh technical_knowledge_base/reference/papers/context_language_models`.

Rebuilding the inputs (not needed to build the page):
- `python3 extract_paper.py <arXiv HTML>`: `inputs/paper_v1.txt`, `inputs/tables_v1.txt` (v1 is the only version as of 19 October 2026); `inputs/anchors.txt` as in its docstring.
- `uv run --no-project --with pymupdf python decode_figs.py <e-print>/figures`: `inputs/figs.json`, Figures 2, 5 and 19 read from the vector PDFs of the arXiv e-print (commands in the docstring). The label-only figures (8, 9, 11, 14, 15, 16, 27, 28) were transcribed from their printed labels into `mk_tables.py` and `recompute.py`.
- `save_live.py <transcript>`: `live.md`, the Notion row as fetched on 19 October 2026 (properties plus a one-line placeholder body).

| File | What |
|---|---|
| `live.md` | the Notion row as fetched (the body was a placeholder, so coverage runs against the paper's claims) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 1 and 2, Figures 2, 5, 19 (decoded), 8, 9, 11, 14, 27, 28 (printed labels) (`mk_tables.py`) |
| `recompute.py` | Appendix C's cost model (Eq. 7 to 9) and Figure 16, every abstract percentage, Figure 19 against Figure 5, standard errors the paper omits, and the illustrative replay (the same algorithm as `parts/23_js_run.js`); 64 checks, written to `inputs/recompute.json` |
| `reading.json` | the header's reading minutes, measured with `html_utils/audit_pages.mjs` after a build |
| `ledger.json`, `label_ledger.py` | the knowledge ledger and its labeller (2026-10-26) |
| `coverage.json` | 32 items (the row's Takeaway, current and as fetched, and the paper's own claims), all found; the placeholder body dropped with its reason |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **Kind**: an agent/harness method with a systems half (the FLOPs accounting and Suffix Cache Reuse). The live ingredient is a **trace replay** with the paper's cost model, not a toy model: there is nothing to train on a CPU that would test a claim about frontier models editing their own context. No traces were released, so the trajectory is a labelled illustrative one built from what the paper describes (BrowseComp-Plus result sizes, the Codex-style summary at 75% of the budget, Figure 3's note-folding edits, the released harness's nudge at 75% and its 28,672-token budget). What is real in it is the pricing: Eq. 9 with Qwen3.6-27B's constants, message-level prefix matching (Appendix C) and SCR's K = 6 relocation, checked against `recompute.py` call by call. It says plainly that it does not reproduce the paper's 21.5% (it gives 7.9% at its defaults).
- **A calculator with residuals** ("One turn's bill") sits on the same tab because Figure 16 is the one place where the paper's cost model can be reproduced exactly from public inputs (the model shape); it lands on 1.41, 5.74 and 10.81 × 10¹⁴ independently.
- **The RL objective runs live in Reading** (Eq. 6 on a group of eight illustrative rollouts), the training-recipe ingredient of the method, small enough to sit in the text.
- **Figures decoded, not transcribed**: most results exist only as vector figures. Figure 5's label-to-circle assignment is checked against the numbers the text prints; where two labels sit over two nearby circles (runner-up assignment within 10 pt), the table marks the pair as swappable. Decoding Figure 19 found what the text does not say (Self-Compact beats CLM on BrowseComp-Plus with Qwen3.5-9B).
- **Code read against the text**: the released BrowseComp-Plus configuration and prompt give CLM more harness support than Appendix E describes (nudges at 25/50/75%, an urgent nudge past 90%, a cost-model lesson in the system prompt, a 28,672-token budget); the FLOPs metric uses the paper's constants. Read at commit 4831982.
- **No "Then and now"**: a September 2026 paper with no later lineage yet.
- **Reading time**: see the light pass below (the header now shows the measured minutes from `reading.json`).
- `build.sh` counts the reading time without details blocks and predict reveals; the Further reading total is summed from the resources.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then the paper's own Figure 1 as the hero (arXiv lists the paper under CC BY 4.0; `img/clm_fig1_overview.webp`, credited under the figure and in `img/CREDITS.md`), then "You need" (prefix caching, GRPO, production compaction) and the new terms. The "Not the same paper" callout moved below the top.
- **Figure 4 inline** beside Suffix Cache Reuse: the paper's before/after of standard serving against SCR (`img/clm_fig4_suffix_cache_reuse.webp`, CC BY 4.0).
- **One turn's bill moved into Reading** (from the Replay tab) beside Eq. 9, with a prediction prompt: it explains one mechanism, the cost of an edit. The Replay tab stays: a trajectory simulator with several controls used by the trust and tables sections.
- **Owned elsewhere, a sentence kept and linked**: why a prefix-cache hit stops at the first miss (Batching, KV cache and scheduling); GRPO in general (RL for LLMs, beside DeepSeekMath); production compaction triggers (Context engineering).
- **Closed**: the prior-work families system by system, the four ContextBench tasks, the released harness's file layout, the released FLOPs metric against the paper's, the evolution loop's budget and splits, the RL run's hyperparameters and hardware, SCR on the linear-attention layers, Table 1 problem by problem, and the settings that disagree (an open pointer stays).
- **Volatile**: one dated closed block in Why it matters, "Since the paper (checked 26 October 2026)": arXiv still v1 (checked that day) and the README's harness ports (read 19 October).
- **No autoplay**: `makeAnim` patched as on DSec (the replay waits for a click; a mode switch pauses on step 1); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `clm-tab`, keeping `data-to`). `check_page.mjs` now fails if an animation draws a frame before a click and audits every closed block opened.
- **Takeaway scoped** (`paper.json` takeaway and new `takeaway_note`, the card, the Takeaway in `live.md`, `mk_coverage.py`): the earlier wording said CLMs beat harness-side context management at lower cost zero-shot without limits. The new one says the zero-shot gain holds with a strong model on BrowseComp-Plus (a tie on TerminalBench 2.1, single runs, calculated FLOPs) and not with the 9B model, and that after RL the clear gain is cost. The Notion property needs the same edit.
- `inputs/paper_v1.txt`: its one redacted author email now reads "[email removed]" (and `extract_paper.py` writes that); it had no em-dashes.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 20.8 min (4,794 words) | 21.7 min (4,984) |
| The paper, closed | 0 | 2.5 min (580) |
| Replay; Tables; Further reading | 2.9; 5.1 + 3.4 closed; 3.3 min | 2.5 (calculator moved to Reading); unchanged; unchanged |
| Visuals in Reading (audit) | 2 | 4 (Figure 1 hero, Figure 4, the calculator) |

Why about 22 minutes is right: the top added about 400 words (core sentence, hero caption, terms, the takeaway note) and the calculator about 100; about 580 words of systems lists, harness layout, metric code, hyperparameters and provenance closed. What stays open is the paper's argument with its numbers: the problem and ContextBench, the file mechanism and what models did with it, the cost model with its predict question and calculator, the three ways to learn it, SCR, every result (including the 9B reversal and the RL comparison) and the evidence section. The page owns this paper, so shorter would mean closing results the takeaway rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
266 units: core 239, depth 18, owned 4, volatile 3, fat 2 (the old reading-time header and the tab-bar labels). 250 drafted by `ledger.py init` from the page before the pass; 16 added. `ledger.py check`: problems 0.
