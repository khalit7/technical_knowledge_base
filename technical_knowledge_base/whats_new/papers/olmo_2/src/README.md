# 2 OLMo 2 Furious (OLMo 2): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81fb9857fb956165ae1c, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`), with the Llama 3 page's `build.sh`, `mk_paper.py`, `check_page.mjs` and CSS as the starting copies (themselves from the reference folder).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (generated, verdict and the Takeaway), the core sentence and hero (the 7B's stages to scale with what each bought; the 7B-to-9B models of Table 6 on average against FLOPs), You need and new terms, Problem, The recipe (animation: one model from warmup to RLVR, 7B, 13B, 32B), Architecture (Table 1, block diagram toggle, Table 3 with recount, tokenizer), Deep dive 1 stability (small multiples of every ablation with recounted spike scores, the eight interventions in a details block, predict: norm or QK-norm alone, Figure 5), Deep dive 2 mid-training (predict: peak learning rate after the anneal with Figure 11 rebuilt, data mixes, sources in details, candidate mixes, predict: microanneal at 10%, soups chart, Table 9 per task), Deep dive 3 post-training (stage chart, evaluation details), Deep dive 4 infrastructure, Results (Figure 1 rebuilt, instruct results, 1B in details), Why it matters, Connections, How much of this to believe, What it takes to use this. |
| Replay the stability fixes | `t-run` | The live ingredient: the spike detector sweeping both runs of each ablation figure (animation, threshold slider), the definition-sensitivity table and what reproduces, the z-loss fork, the embedding norm. |
| The paper's tables, rebuilt | `t-tables` | Every number checked (25 checks), Table 6 sortable with flags and recomputed averages, Figure 1 against Table 6, Table 3 recount (parameters, tokens, 6ND), Table 9 with gains, Tables 10 and 11, 12 with standard errors, 5 and 13 recomputed, 14, 7/16/23/24, 19, 17/18/27. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.** The paper is a training recipe and an empirical report, not an architecture, so there is no toy model: its stability claims concern spikes that appear in long runs at scale, which a CPU toy would not reproduce, and the paper itself plots every ablation. The live ingredient is therefore the paper's own figures re-measured: the arXiv source ships them as vector PDFs, so every drawn vertex is read back and the paper's spike score recomputed live. No "Then and now" tab: the OLMo lineage before and after (OLMo 1, OLMo 1.7, Olmo 3) and whole-run log replays live in the Ai2 OLMo section (`#s-olmo`) of Other notable providers (the Ai2 OLMo lab page was merged there; its old id is an alias), which this page links wherever they overlap; "Why it matters" carries the short version. Expandable details hold the per-intervention evidence, the data sources, the instruct evaluation and the 1B, keeping the Reading tab at about 26 minutes plus 6 in details before the 2026-10-25 light pass (see below).

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v3 to `inputs/paper_v3.txt` and `inputs/table_*.txt` (v1 and v2 were also extracted to compare; v1's Table 9 is where the text's 10.6 and 10.3 come from).
- `extract_figs.py` (`uv run --with pymupdf python extract_figs.py [unpacked source]`): downloads the arXiv e-print (not kept) and reads Figures 1 to 5 and 7 to 11 from the vector PDFs in `figures/`, calibrated on each axis's tick marks (residuals recorded). Writes `olmo2_figs_full.json` in the temp folder (about 7 MB, not kept) and `inputs/fig1_points.json`.
- `mk_curves.py` (`uv run --with numpy python mk_curves.py`): the page's curve data `parts/_gen_curves.js` (12-bit envelopes per step bin, rolling mean and 7σ line, every vertex at 4σ or more with its z-score) and `inputs/spike_scores.json` (the spike score under the paper's definition and the variants).
- `mk_tables.py`: tables from the HTML extracts into `tables.json`, strings as printed.
- `recompute.py`: averages, Table 9 gains and v1 comparison, Table 6 against 7 and 9, Table 11 and 12 against the text, GSM* standard errors, Table 13 shares, Table 14 deltas, parameter recount from the configs, tokens from checkpoint branches, 6ND, Figure 1 positions, Qwen 2.5 6ND, data totals, Table 19 arithmetic, Table 27 sums, learning rate at the cut. Writes `inputs/recompute.json`.
- `mk_paper.py`: card, Further reading, `window.PAPER`.
- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/` (each JS part in its own script, tab wiring last, the error box), expands the link macros, fails on an em-dash or an unexpanded macro, fills the reading times. Needs `parts/_gen_curves.js` (run `extract_figs.py` and `mk_curves.py` first if it is missing).
- `check_page.mjs` (from the repo root: `node technical_knowledge_base/whats_new/papers/olmo_2/src/check_page.mjs`): every control in light 920 and dark 390, both animations stepped and played, text at least 11 px, no NaN, no sideways scroll; mid-animation shots to `../.shots/x-*.png`. `shot_parts.mjs` screenshots the predict reveals and charts.
- `mk_coverage.py`: `coverage.json`, every fact of `live.md` with where the page carries it, verified against the built HTML.
- `inputs/`: paper text and table extracts, the four released `config.json` files, `hf_refs_extract.json` (checkpoint branches, pulled when the Ai2 OLMo lab page was built), `qwen25_extract.txt`, `fig1_points.json`, `spike_scores.json`, `recompute.json`.
- `viz_ideas.md`: ideas built and rejected (rows `P-olmo_2.*` for the log).

## What reproduces and what does not

- Reproduces independently: parameters 7.30B, 13.72B, 32.23B from the configs; stage-1 tokens 3.90T, 5.00T, 6.06T from checkpoint names, and totals 4.05T, 5.6T, 6.6T counting every anneal; 6ND FLOPs 1.77, 4.61, 12.87 (Table 6: 1.8, 4.6, 13.0); Tables 4 and 5 totals; FineWeb-Edu ≥ 2 keeping 20.3%; Table 19's carbon and water; the 50B mix of Table 13; Table 27's 13B total; the direction of all three printed spike-score pairs; the learning-rate anneals ending together.
- Does not reproduce: the text's mid-training gains (10.6, 10.3; v3 Table 9 gives 9.9 and 9.4); Appendix B.1's 13B and 32B relative gains; Table 6's Qwen 2.5 32B FLOPs (16.0; 6ND and Table 7 give 35); Figure 1's positions for OLMo 2 32B and OLMo-0424; OLMo 2 32B's MMLU-Pro and average between Tables 6 and 9; Table 13's 100B and 300B maths shares; Table 14's "consistently" (mix E's GSM*); Table 11's "+20" and "−0.4"; experiment 2's "61"; 391 MWh; the 7B DPO prompt count; the spike-score levels; the "well past 200B" crossover (about 180B in the drawn curves); Figure 7's "growth" improvement (the combined run's median still rises).
- Corrections to the old Notion summary: the z-loss fork abandoned was the custom PyTorch one (the fused Flash Attention run was kept); the 13B's cosine was not truncated; mid-training gains are +9.9 (7B) and +9.4 (13B) in the current table; TinyGSM-MIND took GSM* from a 28.5 baseline (25.0 for the code version) to 65.5, and 70.0 with two copies.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a static hero (`parts/14b_js_hero.js`, numbers read from `window.PAPER`): the 7B's three stages drawn to scale in tokens (3.90T, then 3 × 50B souped), with what each bought (init spike score 0.40% to 0.03%; average 53.0 to 62.9 and GSM8K 24.1 to 67.5 from Table 9; instruct suite 51.4 to 56.5 from Table 16), beside the 7B-to-9B base models of Table 6 on average against FLOPs. Then "You need" and the new terms.
- **Owned elsewhere, a sentence kept and linked**: where each norm sits and what QK-norm and z-loss bound, and the decayed-embedding argument (Normalisation, residuals and stability); tokenizers; anneal mixes in general (Data mixing); SFT, DPO and RLVR as stages (Alignment) and GRPO (RL for LLMs). The OLMo lineage and the W&B log replays: links renamed from the Ai2 OLMo lab page to the Ai2 OLMo section (`#s-olmo`) of Other notable providers.
- **Closed**: the two token-count disagreements, the parameter recount and z-loss coefficient, the tokenizer, the pretraining code filters (into the sources block), why the text says +10.6, the post-training hyperparameters, the two clusters, the throughput tricks (one summary sentence stays open), and every table-and-text disagreement (one summary paragraph stays open in How much to believe).
- **Volatile**: Olmo 3 moved to one dated closed block, "Since the paper (dated: checked 25 October 2026)".
- **No autoplay**: `makeAnim` patched (the recipe animation and the spike-detector sweep wait on their first frame until play or a step; a mode toggle pauses); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `olmo2-tab`, plus `data-to` scrolling). `check_page.mjs` fails if either animation draws a frame before a click, and opens every closed block.
- **Takeaway softened** (paper.json, so the card, and `live.md`): "post-norm" is the paper's output (reordered) norm; "Tulu 3 RLVR" is the whole Tülu 3 post-training; "Pareto-frontier" became "on or near the compute frontier of open-weights peers, by estimated (6ND) FLOPs", since the frontier is drawn on 6ND estimates with models of unknown compute left out, and Figure 1 misplaces two points. The Notion property needs the same edit.
- **Kept as tabs**: Replay the stability fixes (a lab used from every ablation pair), the tables, Further reading.
- **No real image**: the paper is CC BY 4.0, but every figure the page relies on (1 to 5, 7 to 11) is already rebuilt from its vector PDF; the subject has no physical object.
- The contact email in `inputs/paper_v3.txt` redacted, and `extract_paper.py` now redacts emails. Header: "Reading: 26 min, plus 10 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 28.3 min (6,513 words) | 26.2 min (6,033) |
| The paper, closed | 5.8 min (1,338) | 10.1 min (2,321) |
| Replay; tables; Further reading | 4.1; 14.5; 2.8 min | unchanged |
| Visuals drawn in Reading (audit) | 13 | 14 |

Why about 26 minutes is right: this is a long report with four deep dives, and the page owns every one of them (stability with re-measured ablations, mid-training with its predict questions and soups, post-training, results) plus the evidence judgement that carries the verdict. The pass added the top (about 1.5 minutes) and paid for it by closing provenance, settings and reproduction details. Shorter would mean closing a deep dive.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
313 units: core 242, depth 65, owned 5, volatile 1, fat 0. 301 drafted by `ledger.py init` from the page before the pass; 12 added (core sentence, hero, new terms, five owner links, four script-drawn table facts with keys in their captions). Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 313 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 466 actions, 0 problems; no frame before a click. `mk_coverage.py`: 83 of 83. `ledger.py check`: problems 0.
