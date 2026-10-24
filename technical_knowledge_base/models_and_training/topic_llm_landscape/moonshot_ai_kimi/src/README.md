# Moonshot AI: Kimi, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

Child page of Topic: llm-landscape (storage key `km-tab`). Rebuilt by editing only: no new runs and no new numbers except derived ones shown with their formula (the Muon scale per matrix shape, already in `recompute.py`).

## Build and checks
- `sh build.sh` writes `../index.html`: HTML parts `00_top`, `00_css_base`, `01_css_kimi`, `02_header` (header, tab bar, section nav), `03_read_a` (core idea, hero, you need, new terms, every change in one screen, the line, MuonClip and QK-Clip), `04_read_b` (KDA, the delta-rule sandbox, the KDA/MLA animation, the ratio chart, cache against context), `05_read_c` (experts and heads with the parameter card, Stable LatentMoE and Quantile Balancing, Attention Residuals, low precision with the weight-bytes card, post-training with the K3 expert diagram, K3 today, misreadings), `07_more`; then the error box and one script per JS part: `10_js_common`, `21_js_rd_common` (skill template), `12_js_qk`, `13_js_dr`, `14_js_kx` (never autoplays), `15_js_hr`, `16_js_qb`, `17_js_ar`, `18_js_par` (parameter, weight-bytes and cache cards, now in Reading), `19_js_line` (timeline), `20_js_hero` (hero), `99_js_tabs` (skill template).
- Header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` (230 words a minute) and update it. `build.sh` still prints its own prose-only count, which leaves out script-written text.
- From the repo root: `sh html_utils/checkpage.sh <page>`; `node <page>/src/check_controls.mjs <page>/index.html` (every button, slider, select and timeline dot, every closed block opened, 390 px dark, 920 px light and reduced motion; fails if the KDA/MLA animation moves before play or after a mode switch); `python3 html_utils/ledger.py check <page>`; `python3 recompute.py` (every reproduced default, unchanged).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (start from DeepSeek-V3, replace the layers everyone treats as settled, one ablation at a time); a new static hero, one square per layer for K2 (61 MLA) and K3 (69 KDA, 24 Gated MLA, 8 Attention Residuals blocks), to scale in depth from the configs; "You need" (Attention variants, Beyond attention, Mixture of experts, Optimisers); the definitions became five new terms; the old "where each change sits" table and the Trade-offs table merged into "Every change in one screen" (standard, Kimi's answer, buys, costs).
- **Lineage tab moved into Reading** as "The line": the order explains the design (each change proven on a small model, then shipped big). The per-release cards became a static closed table that a dot click opens and highlights. The config diff merged with the shape section's table into one five-model table.
- **Parameters and memory tab moved into Reading**, each card beside the claim it proves: the cache-against-context chart in the KDA section, the parameter bars in the shape section (formula table and reproduce bullets closed), the weight-bytes card in the precision section.
- **MuonClip**: Muon's mechanism is owned by Optimisers and learning-rate schedulers, which has a Newton-Schulz stepper on a real gradient, so the quintic widget was removed; its worked example, coefficients, cost and distributed version are in a closed block. The shape select became a four-row static table. QK-Clip stays here in full (Normalisation, residuals and stability points here for it), with a prediction prompt.
- **KDA**: the delta rule, linear attention and Gated DeltaNet link Beyond attention (owner). The sandbox now opens on Kimi's own point, per-channel against scalar gates; overwrite is the second preset. Kernel and ablation detail and the bounded-decay maths are closed; one bullet each stays in the core.
- **Post-training**: the K1.5 objective is closed (RL for LLMs owns objectives); new static diagram of K3's nine RL experts distilled into one student; K3's effort, reward-model and rollout details closed.
- **K3 today**: one compact dated volatile table (price, lineup, six rank readings); the ranking discussion, licence exemptions and Cognition SWE-2 closed. Common mistakes closed and cut to the five the core does not already show.
- **No autoplay**: templates `21_js_rd_common.js` and `99_js_tabs.js` replace `90_js_tabs.js`; the KDA/MLA animation already waited for the reader.
- **No real image**: the subject is a lab, not a physical object, and the Kimi papers (2507.20534, 2510.26692, 2603.15031, 2502.16982) are CC BY-NC-ND 4.0 on arXiv, outside the licences allowed for embedding, so no paper figure was used.
- Links: the LLM Architecture Gallery no longer stands in for linear attention (Beyond attention owns it); Positional encodings, Normalisation, Long context and Distillation linked where they own a point. Further-reading times measured on 24 October 2026.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 36.7 min (8,431 words) | 31.3 min (7,206 words) |
| Reading, closed details | 1.1 min | 9.7 min |
| Other tabs | 6.9 min (Parameters and memory 3.1, Lineage 1.5, Further reading 2.2) | 2.6 min (Further reading) |
| Visuals inline in Reading (audit count) | 6 | 9 |

Why about 31 minutes is right: the page owns six of Moonshot's own designs (MuonClip and Per-Head Muon, the KDA hybrid with NoPE and the bounded decay, Stable LatentMoE with Quantile Balancing, Attention Residuals, native 4-bit releases, the agentic data and self-critique recipe), each with its evidence and numbers recomputed from configs, plus the two former tabs now inline. Mechanisms other pages own (Muon's Newton-Schulz, linear attention and the delta rule, MoE, KV sizing, RL objectives) are now a sentence and a link, and detail is closed. About 1,200 words of the core count are script-written widget text (tables, counters, captions).

## Knowledge ledger
283 units: core 214, depth 33, volatile 14, owned 5 (Muon's mechanism and expansion by Optimisers; the fixed-size state and the Gallery card's linear-attention role by Beyond attention), fat 17 (`ledger.py check`: problems 0). 275 drafted by `ledger.py init`; 8 added by hand for script-rendered content (the removed Newton-Schulz and shape widgets, the old lineage cards).

---
Earlier notes (v3): the page replaced all text of the Notion page; `recompute.py` holds every reproduced default; `inputs/` holds the configs, cards, papers and web pages fetched on 1 October 2026 (one paper author's address removed from `ax_2502.16982.txt` on 2026-10-24). The 2026-10-23 pilot (one owner per concept) added the links to Attention variants and Long context and stopped the animation autoplaying.
