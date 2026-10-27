# src: Trained Persistent Memory for Frozen Encoder-Decoder LLMs (arXiv 2603.16413)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 check_sim.py`: runs `parts/20_js_sim.js` through node against an independent NumPy implementation of Eqs. 7, 16 and 24 to 28 (15 cases, worst relative difference about 1e-13); writes `inputs/check_sim.json`.
- `python3 locomo_stats.py <locomo10.json>`: lag buckets, sizes and the answer-word overlap counted from LoCoMo's released data (download command in the script's docstring; the file is not kept); writes `inputs/locomo_stats.json`.
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py`) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 2 to 5 transcribed at printed precision (`mk_tables.py` from `inputs/table_*.txt`) |
| `recompute.py` | every derived number: means, question-weighted means, standard-error bounds, F1 levels, parameter counts, decay figures, the 19 claim checks; writes `inputs/recompute.json` |
| `parts/20_js_sim.js` | the three write rules, shared by the page and `check_sim.py` |
| `inputs/paper_v1.txt` | the arXiv HTML as text (`extract_paper.py`), the only arXiv version |

## Shape, and departures from .claude/skills/explainer-page/page-kinds/paper.md

- **Live ingredient: a simulation of the write rules, not a trained toy.** The paper is a method-on-top-of-a-model pilot with no code, weights or traces, so there is no trace to replay and a toy read adapter would test a toy. Its write side, though, is never trained (Sec. 5: random fixed projections), so it can be run exactly as the paper runs it. That simulation carries the page's main findings (decay far faster than LoCoMo's lags; attention-coupled rows collapse to one vector; slot ties waste 10x capacity).
- **No "Then and now"**: a 2026 result paper with no later lineage yet.
- **The Reading tab is long (about 18 minutes against the old page's 4)**, because the old summary missed most of what the tables show (three methods harm answers at 1x, eight text-table contradictions, the metric's clipping). Every predict widget's detail sits inside its reveal, so a reader who skips them reads less.
- The input sizes in the simulation (d = 32, 8 tokens per turn, random latents) are illustrative and labelled as such.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero figure redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html`): the frozen encoder and decoder, the trained read adapter in blue, the untrained write in orange with its 0.95 decay, and a 20-turn decay strip with 0.95^256. The paper is under arXiv's non-exclusive licence, so none of its own figures is embedded. Then "You need" (Families and objectives, PEFT) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: cross-attention in an encoder-decoder (Families and objectives), prefix tuning and LoRA (PEFT), text-level agent memory (Context engineering), standard errors and seed variance (Eval statistics).
- **Closed**: the write rules in full (Eqs. 7, 16, 24 to 28, initialisations; one sentence on the shared decay stays open), the training setup table and the LoCoMo split inference, Table 4 against the text, the OpenClaw and Hermes specifics, and the bullets of What it takes to use this (one summary sentence stays open).
- **Volatile**: none found; the page has no dated follow-up news.
- **No autoplay**: `makeAnim` patched as on the EnvHarness page (both step animations wait on step 1; a mode change resets paused); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `tpm-tab`). `check_page.mjs` now fails if an animation draws a frame before a click, opens every closed block, and runs Chrome as `headless: 'shell'`.
- **Takeaway softened** (paper.json, so the card, `live.md` and `mk_coverage.py`'s item): "so writes and reads are differentiable" and "all six adapters positive at 10x" became: only the read adapters are trained, the write projections stay random; all six above zero at 10x, but the rate is clipped at zero and the baseline is zero by construction; at 1x three of six make answers worse than no adapter; net +1.8 to +6.3 F1 over 6.44 at 10x. The Notion property needs the same edit.
- The author's email in `inputs/paper_v1.txt` is redacted and em-dashes in the extracts are `--`; `extract_paper.py` now does both. Header: "Reading: 18 min, plus 3 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 18.5 min (4,252 words) | 17.7 min (4,075) |
| The paper, closed | 0 | 3.0 min (694) |
| Simulate; tables; Further reading | 3.1; 5.6; 2.6 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 (the hero added) |

Why about 18 minutes is right: the core gained the sentence, hero and terms (about 330 words) and lost the derivations, setup and adoption detail to closed blocks. What stays open is the argument: six methods and how they actually enter the decoder, what is and is not trained, the metric and why it cannot fail, the results with their numbers, and the evidence section whose findings (decay against lag, identical rows, slot ties, eight text-table contradictions) carry the verdict.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
234 units: core 202, depth 23, owned 4, volatile 0, fat 5. 220 drafted by `ledger.py init` from the page before the pass; 14 added (top, the four owner links, script-drawn charts keyed to their static captions). Fat: one wind-up and four citation fragments. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 155 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 214 actions, 0 problems (no frame before a click). `check_sim.py`: worst relative difference 9.5e-14. `mk_coverage.py`: 27 of 27.
