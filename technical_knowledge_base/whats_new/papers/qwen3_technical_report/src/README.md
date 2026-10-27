# Qwen3 Technical Report: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81a19006e6b096a6e14b, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`) with the shared pieces copied from `llama_3_herd/src/` (themselves the reference folder's).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (generated, with the verdict); the core sentence, the hero (Figure 1 and §4.3 redrawn as an HTML diagram), You need and New terms; a box saying what the Alibaba Qwen lab page already has; Problem; Family and architecture (recounted from config.json); Pre-training; Base results (tier-shift chart); Post-training (route animation: four stages against strong-to-weak distillation); Stage 3, mode fusion (animation: two models against one checkpoint); Thinking budget (predict: what a fused toy answers when cut off; Figure 2 rebuilt from its SVG; predict: 1K to 2K); Stage 4; Distillation (predict: pass@64 in questions; toy Table 21); Stage effects (Table 22 on one axis); Results (predict: Qwen3-4B against Qwen2.5-72B-Instruct); How much of this to believe; What it takes to use this; Why it matters; Connections. |
| Run a toy Qwen3 | `t-run` | The live ingredient: a 28,496-parameter Qwen3 decoder trained three ways, run in the page (playground with flag and budget, attention of the answer position), the toy's Figure 2 decomposed, a live check on fresh problems, what the toy shows and cannot, the toy Table 21, training curves. |
| The paper's tables, rebuilt | `t-tables` | Comparison explorer for Tables 3 to 8 and 11 to 20; every count in the text checked (34 rows); Tables 21, 22, 23; language averages (24 to 35) and Belebele (37); Tables 1 and 2 with the recount. |
| Further reading | `t-more` | Generated from `paper.json`. |

**Departures from papers.md, and why.**
- *Live ingredient.* This is a model report, part architecture, part recipe, part empirical. The architecture is Qwen2.5's with QK-Norm and is already explained on the lab page; the claims specific to this report are about post-training. So the toy is a recipe toy, not an architecture ablation: the same tiny Qwen3 trained fused, thinking-only, and with explicit cut-off training, to test the report's untested claim that answering from partial thinking "emerges naturally" from fusion. It does not, in the toy (cut-off answers copy the last thought), and explicit training only partly fixes it; the page says what the toy cannot test (language, stage 4, scale).
- *Second toy experiment*, on the Run tab and in Reading: Table 21 at toy scale with three seeds (RL against on-policy distillation from one off-policy checkpoint), because the report's evidence for its distillation claim is one run.
- *No Then and now tab.* The lineage (2507 split, Coder, Next, 3.5 to 3.8) is on the Alibaba Qwen lab page; Why it matters carries the split with Qwen's own announcement.
- *Linked rather than rebuilt*, as briefed: global-batch balancing, the budget strip and the Table 21 bars (lab page); GRPO (RL for LLMs and the DeepSeekMath page); test-time compute (Test-time compute and reasoning, since 2026-10-25; it replaced the landscape root's old Deeper tab).
- *Reading length* about 23 minutes against the old page's 12: the page owns the report's details (filters, reward types, stage evidence) and its evidence judgement. Stage 1's filter list and stage 4's capability list could fold into details blocks if Khalid prefers.
- *Size.* 282 KB: two of the three toy variants are shipped (fused and budget-trained, 60 KB of 6-bit weights); the thinking-only variant behaves like the fused one when cut off and is measured offline only.

## What reproduces and what does not

- Reproduces independently: every win count stated in the text except one; Table 22's printed changes (within 0.1, rounding) and its stage 4 equals the released Qwen3-32B of Table 13; all eight parameter counts from config.json (within rounding of the model cards); 1,800 ÷ 17,920 = 10.0%; 60% and 35% of R1's parameters.
- Figure 2 read from the arXiv HTML's vector SVG (`extract_fig2.py`), calibrated on its gridlines (residual 0.0): its four non-thinking lines equal Table 12's scores within 0.05, which checks the reading.
- Does not reproduce: Qwen3-32B-Base "on all 15" against Llama-4-Scout (Scout wins INCLUDE); Figure 2's 32K points against Table 11 (LiveCodeBench 67.8 against 70.7); Maverick "about twice" (1.7 times); "consistently superior" small models (Qwen3-0.6B and 1.7B lose math and code rows to R1 distills); the 1/10 "compared to the four-stage training method" (only RL is measured).
- Provenance: the DeepSeek-R1 and DeepSeek-V3 columns of Tables 11 and 12 equal DeepSeek's own published numbers on 8 of 9 shared benchmarks.
- Toy: JS forward identical to PyTorch on 2,880 decoded responses (logits within 8.7e-5).

## Corrections to the old summary

- "beats Llama-4-Maverick at half its size": 235B against 402B is 0.58 of its size (the paper says "about twice").
- "Qwen3-4B roughly matches Qwen2.5-72B-Instruct-era quality": a release-blog claim; on the report's tables true only with thinking on (16 of 23), not in non-thinking mode (7 of 23).
- "Qwen3-1.7B beats R1-Distill-Llama-8B": 18 of 22, losing AIME'24, GPQA and LiveCodeBench.
- "the team concluded fusion taxed peak quality": the announcement says "so we can get the best quality possible", with no numbers; Table 22 is the report's own measure of the tax.
- "a 10x cheaper, strictly better substitute for per-model RL": one 8B comparison against the RL stage alone, one run, a pass@64 gain of one question.

## Files

- `save_live.py` (Notion fetch from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt`, `inputs/anchors_v1.txt`), `extract_fig2.py` (`thinking_budget.svg` to `inputs/fig2.json`), `mk_tables.py` (`tables.json`).
- `recompute.py`: every derived number about the report's evidence to `inputs/recompute.json` (checks, tier shift, Figure 2 against Tables 11 and 12, Table 21 and 22 arithmetic, parameter recount from `inputs/cfg_*.json`, RULER, baseline provenance against the R1 paper).
- `train.py` (`uv run --with torch --with numpy python train.py`; about 8 minutes per variant on 2 threads): the toy, three variants to `model/<v>.pt` with logs; `train.py eval` (`evaluate.py`) to `model/results.json` on the 6-bit weights; `train.py export` to `parts/20_model_data.js` and `model/<v>_q.pt`. `check_forward.py`: JS against PyTorch, `model/check_forward.json` (PASS).
- `distill.py` (about 6 minutes per method per seed; run in the background): the toy Table 21, `model/distill_<seed>.json`, then `distill.py summary` to `model/distill.json`.
- `mk_toydata.py`: slims the toy results into `parts/_gen_toydata.js`. `mk_paper.py`: card, Further reading, `window.PAPER`.
- `check_page.mjs` (node, from the repo root): every control in light 920 and dark 390, both animations stepped, text at least 11 px, no NaN, no sideways scroll. `mk_coverage.py`: `coverage.json`, every fact of `live.md` verified against the built page.
- `inputs/`: paper text and tables, figure points, the eight config.json files, model-card parameter lines, `external_extracts.txt` (release blog, Qwen's 21 July 2025 post, 2507 cards, Qwen3-235B-A22B card lines, R1 paper Table 4).

## Parts

HTML: `00_top`, `01_css` (reference copy), `02_header`, `03_paper`, `03b_post`, `03c_end`, `04_run`, `05_tables`, generated `_gen_card`, `_gen_more`. JS: `10_js_common`, `_gen_data`, `_gen_toydata`, `20_model_data`, `11_js_ui` (reference copies), `22_js_model` (the toy in JS, also loaded by node), `13_js_read`, `14_js_anim`, `23_js_run`, `24_js_tables`, `99_js_tabs` (the explainer-page template since 2026-10-25).

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence; the hero, a redrawn diagram of the report's Figure 1 and §4.3 (flagships' four stages, the small models' off- then on-policy distillation, the two modes and the budget) built in HTML so it reflows at phone width; the report is under arXiv's non-exclusive licence, so its own figure is not reproduced and no image is used; You need (RL for LLMs, Distillation and small language models, Test-time compute and reasoning) and New terms.
- **Owned elsewhere** (OWNERS.md): GRPO links RL for LLMs (plus DeepSeekMath); on-policy distillation and the KL direction link Distillation and small language models (which already carries Table 21); budget forcing and other labs' dials link Test-time compute and reasoning (id 4035c17b0d0d813f9fb2d62cff1f09ef), which replaced the landscape root's "Deeper: test-time compute" tab in the budget section, Connections and Further reading. The landscape root stays linked for the cross-lab comparison.
- **Moved into closed `<details>`** (nothing deleted but fat): the three pre-training data pipelines and the per-instance mixture (one open sentence), tokenizer and context-length sources, stage 1's two filters, stage 4's five capabilities, the four in-house benchmarks, Table 10's benchmark settings, and a dated block "Later, as of 25 October 2026" (the family after the report; the 2507 split stays open as what later work showed). In the Tables tab, the comparison explorer, Tables 21 and 22 stay open; the 34 checked counts, Table 23, the language tables and Tables 1 and 2 are closed blocks (a `data-to` link opens the block holding its target). The Problem's three gaps became one sentence.
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1, also after a mode switch; `check_page.mjs` fails if `pp` or `fz` draws a frame before play or on a mode switch, and opens every closed block before auditing a tab. Tabs use the template (`99_js_tabs.js`, storage key `q3-tab`). Header: "Reading: 25 min, plus 2 in closed details." (`reading.json`, from audit_pages.mjs).
- **Takeaway softened** (paper.json, live.md, so the card): "on-policy distillation beating RL for small models at 1/10 the GPU hours" rests on one Qwen3-8B comparison, math and code only, one run each, against the RL stage alone (Table 21); four-stage post-training is for the two flagships only. The Notion property itself still has the old wording.
- **Length**: Reading core 5,709 words (25 min) plus 0 closed before; 5,734 (25 min, including about 450 words of new top) plus 541 closed (2) after. Tables tab 2,603 open before, 786 open plus 1,821 closed after. Toy tab unchanged (5 plus 1). The core stays at its length because the ledger is mostly core: the page's weight is the mode-fusion and budget evidence, the toy test of "emerges naturally", the distillation comparison and the evidence judgement.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 287 units, core 232, depth 48, owned 5, volatile 1, fat 1 (old reading-time line); `ledger.py check` problems 0. `mk_coverage.py`: three items updated; 83 of 83.
- Privacy: no author emails in the saved text; `extract_paper.py` now redacts any it meets.

Rechecked 2026-10-25: `checkpage.sh` 4 tabs, 300 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 248 actions, 0 problems.
