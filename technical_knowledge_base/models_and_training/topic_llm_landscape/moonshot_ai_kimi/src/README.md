# Moonshot AI: Kimi, interactive page (v4, rebuilt 2026-10-24 to the teaching contract; 2026-11-10 split layout and four 3D stages, the section at the end, which supersedes the build notes where they differ)

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

## 2026-11-10: split layout, four 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_css_kimi.css` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `km-tab`). `build.sh` keeps its explicit lists and writes its em-dash test as bytes. Removed: `12_js_qk.js`, `14_js_kx.js` (the 2D KDA/MLA animation and its own controller), `17_js_ar.js`.
- **Data**: `mk_scene_data.py` writes `parts/30_js_km_data.js` (`window.KM`) from `inputs/k3_config.json`, `inputs/k2_config.json` and the K2 report's Table 2 for DeepSeek-V3. Each scene exposes what it computes (`KM_QK`, `KM_KX`, `KM_MOE`, `KM_AR`); `check_stages.mjs` checks the numbers in the step lists against them.
- **`stg-qk`** (6 steps, `41_js_sc_qk.js`): eight heads as columns of their max logit (the earlier widget's illustrative maxima), K2's τ = 100 as a glass plane, each head's content query, content key and rotary query as plates, the shared rotary key behind; growth without a clip, γ per head with the maximum streaming back to the weights, the four MLA parts of h3 close up, the clipped heads on τ, then the naive whole-layer rule. Replaces the τ-slider widget (the slider is gone; τ is K2's).
- **`stg-kx`** (8 steps, `42_js_sc_kx.js`): one KDA head's state as signed bars (the earlier animation's toy values, seed 7), decayed per row, erased along k, written with v, read by q; then the KDA layer's fixed 1,572,864 numbers against an MLA cache at the same scale, appended and read, the context sweeping to 16,384 tokens; then K3's 93 layers from `full_attn_layers`. Its two-mode captions became one step list (`sx-kx`).
- **`stg-moe`** (4 steps, `43_js_sc_moe.js`): one MoE layer of DeepSeek-V3, K2 and K3, each expert's footprint its input by hidden width, one camera for all three so the sizes compare; active experts lit (which ones is illustrative), shared experts in front, heads as plates behind (128, 64, 96), K3's W↓ latent. Replaces the two paragraphs "More experts" and "Half the heads" (their sentences are the step list).
- **`stg-ar`** (5 steps, `44_js_sc_ar.js`): sublayer outputs as plates along depth, read by layer 40's attention sublayer: the plain running sum, Full AttnRes at 1/79 each, Block AttnRes over 5 sources, the widget's illustrative trained weights, then K3's 8 blocks plus the embedding and the EAGLE-3 draft. Replaces the layer-slider widget (fixed at layer 40, where the page's prompt already was).
- **2D kept, each in a split**: hero layer strips, the line (timeline), delta-rule sandbox, ratio chart, cache-against-context chart, parameter card, Quantile Balancing widget, weight-bytes card, the agentic-data pipeline and the K3 distillation diagram. Full width: Muon's update and shape table, the one-screen table, the config table, What K3 changed in the hybrid, K3.1 Pro today (volatile, unchanged), Further reading.
- **Fixed on the way**: the definitions grid made every bold word a block (`.gl b`), breaking the inline maths in the QK-Clip term; now only each box's first bold title is.
- **Checks**: `check_stages.mjs` (new; from the repo root, with a shots directory outside the repo) as on MiniMax; `check_controls.mjs`: 1400 px added, its never-autoplay assertions on the removed animation dropped (inverted in `check_stages.mjs`).
- No real image: still a lab, not a physical object; the papers' figures are CC BY-NC-ND 4.0.

### Length judgement (2026-11-10)
| | Before this pass | After |
|---|---|---|
| Reading, core | 7,465 words, 32.5 min | 8,455 words, 36.8 min |
| Reading, closed details | 2,230 words, 9.7 min | unchanged |
| Further reading | 654 words, 2.8 min | unchanged |
| Visuals inline in Reading (audit count) | 9 | 10, four of them 3D stages |

The added words are the four step lists (23 items). Most replace text the audit could not count (the KDA/MLA animation's 13 script-written captions, the QK-Clip and AttnRes widgets' notes); the rest is the QK-Clip and AttnRes mechanisms now walked step by step with their numbers. Two paragraphs ("More experts", "Half the heads") and the per-head paragraph became step items rather than being kept beside them. Nothing was cut.

### Knowledge ledger (2026-11-10; problems 0)
291 units: core 215, depth 33, volatile 21, owned 5, fat 17 (unchanged counts). Re-keyed to the new wording: 60, 63, 92, 98, 99, 159. No key contains a reading time.
