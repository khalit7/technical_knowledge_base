# Coverage: the child page "Mixture-of-Experts (MoE) models" folded into Topic: llms

Where every section and fact of `mixture_of_experts_moe_models/src/` now lives.
Keys: **DEEP** = `src/parts/35_tab_moe.html` (tab "Deeper: inside an MoE", section id in brackets); **DRAFT** = merged into `src/parts/20_read.html` (s-serve and s-read); **LAND** = merged into the total-against-active scatter (`src/parts/22_js_scatter.js`); **PARENT** = already said in `src/parts/20_read.html` (quoted).

## Header, nav, tab bar (02_header.html, 00_top.html)
- Title, subtitle, reading-time line, tab bar, Reading nav: dropped as instructed; DEEP has its own sub-nav (`#moeNav`) and a `.deepnote` pointing back to Cost to serve.
- "This page owns the generic mechanism; each lab page keeps only what its own variant does differently": DEEP deepnote states the scope instead.

## 03_read_a.html
| Child section / fact | Now |
|---|---|
| s-what: MoE replaces the FFN with N experts plus a router; top-k; weighted sum; attention, norm, residual stay dense | DEEP (moe-layer) lead; PARENT defines MoE: "each layer's feed-forward block is split into many small networks, the experts, and a learned router sends each token to a few" |
| "671B total, 37B active" meaning; memory and quality follow total, latency and price follow active | PARENT: "Total parameters must all sit in memory; active parameters are the ones a token passes through, which sets the compute per token"; quality-per-active in DRAFT "Why the labs went sparse" |
| Layer figure (layerFig) | DEEP (moe-layer), `35_js_moe1_fig.js` |
| Terms: expert (SwiGLU, 3 d d_ff), router, top-k, gate weight | DEEP (moe-layer) dl; router defined by PARENT |
| Terms: total, active, sparsity ratio (Mixtral 3.6x, V3 18x) | PARENT definitions and scatter caption "Mixtral 8x7B at about 3.6x, DeepSeek-V3 at 18x" |
| Terms: shared expert, fine-grained experts | DRAFT "How the labs route" (definitions); DEEP repeats shared expert briefly for the figure |
| Terms: load balance hot/collapsed, capacity factor, EP, dropless | DEEP (moe-layer) dl |
| s-mech four steps; router size 7,168 x 256 = 1.8M, 0.016% of an 11.32B layer | DEEP (moe-mech) |
| Collapse callout (gate weight is the only gradient path) | DEEP (moe-mech) |
| s-gate softmax formulas, Mixtral Softmax(TopK) | DEEP (moe-gate) |
| sigmoid formulas, V3 2.1.2; dilution 1/N; e ratio 2.72; "report states the choice without arguing it" | DEEP (moe-gate) |
| Router card (rc), defaults p = (0.609, 0.224, 0.136, 0.030), gates 0.731/0.269, sigmoid 0.881.../0.546/0.454 | DEEP (moe-gate), `35_js_moe2_rc.js` |
| s-why: Mixtral beat Llama 2 13B, matches 70B and GPT-3.5 (quote) | DRAFT "Why the labs went sparse" |
| s-why: Switch T5-Base quality 7x faster | DRAFT |
| s-why: capacity past one device | DRAFT (one sentence); EP depth in DEEP (moe-ep) |
| s-why: what it costs (memory on total, two all-to-alls, skinny GEMMs, instability) | DEEP (moe-layer), last paragraph, as the tab's roadmap |

## 04_read_b.html
| Child section / fact | Now |
|---|---|
| s-route: three jobs of the router | DEEP (moe-route) |
| Noisy top-k (Shazeer 2017), top-2 (GShard, Mixtral), top-1 (Switch), fine-grained plus shared (DeepSeekMoE), C(256,8) = 4.1e14 vs C(8,2) = 28 | DEEP (moe-route) cards; C(256,8) also in DRAFT's definition of fine-grained |
| Sigmoid scores do not compete; replaced softmax as k climbed | DEEP (moe-gate) merged into the sigmoid explanation; lab-level adoption in DRAFT |
| s-bal collapse dynamics, quality and systems problem | DEEP (moe-bal) |
| Five fixes: noisy gating, aux loss (formula, alpha 1e-2, worked example alpha and 2.8 alpha), device-level loss, capacity factor, aux-loss-free (bias rule, gamma 0.001 for 14.3T then 0 for 500B, alpha 0.0001, dropless) | DEEP (moe-bal) |
| z-loss callout (ST-MoE, c_z 0.001, bf16 roundoff, stable runs) | DEEP (moe-bal); the trade-off row's "add a z-loss regardless" folded into the callout |
| s-anim animation (32 tokens, 8 experts, dense / fixed buffers CF 1.0, 1.25, 2.0 / bias) and its caveats | DEEP (moe-anim), `35_js_moe3_rta.js`; seeded defaults (loads 20,7,0,17,3,8,8,1; 17 of 64 dropped; 2 skip; 33 padded; busiest 10; 28 moved) now stated in the caption note |
| s-scope: micro-batch vs global batch, Qwen paper (0.1 perplexity, about 2 points, specialisation), Qwen3 adoption, V3 4.5.3 losses 2.258/2.253/2.253 and 2.085/2.080/2.080 | DEEP (moe-scope) |
| Global-batch toy (2.08 alpha vs 1.00 alpha) | DEEP (moe-scope), `35_js_moe4_gb.js` |
| Price of wider scope; DeepSeek's two risks | DEEP (moe-scope) |
| s-cap: capacity formula, ST-MoE 1.25/2.0, worked example (4,096 tokens, 64 experts: 128, 160, drop 40, pad 100, CF 2.0 256), drops skip the layer, No-Token-Left-Behind, train/inference mismatch, MegaBlocks dropless, grouped GEMM | DEEP (moe-cap) |

## 05_read_c.html
| Child section / fact | Now |
|---|---|
| s-ep: dispatch and combine all-to-all; EP figure | DEEP (moe-ep), `35_js_moe1_fig.js` |
| Tokens per expert B k / N; all-to-all k d | DEEP (moe-ep) |
| Decode arithmetic card (6 presets, K3 latent 3,584 reading is ours) | DEEP (moe-ep), `35_js_moe5_ep.js` |
| Worked example: 8 tokens per expert, 57,344 values, 112 KiB each way | DEEP (moe-ep) |
| Node-limited routing (4 nodes), NVLink 160 vs IB 50 GB/s, k could be 13 | DEEP (moe-ep) |
| DP/ZeRO/FSDP (98% experts), TP, PP and DualPipe | DEEP (moe-ep) |
| All-to-all straggler, latency-bound; DeepEP; prefill/decode disaggregation; 320-way EP, 64 redundant/shared GPUs | DEEP (moe-ep) |
| s-inf memory on total: 1,342 / 671 / 336 GB; quantisation and MoE together | memory formula is PARENT ("M_weights = N_total x b / 8"); the GB figures and the quantisation point in DEEP (moe-inf) and in the V3 worked example (moe-par) |
| s-inf slice of the batch; serving pattern | DEEP (moe-inf) |
| s-inf load imbalance at request time; V3 re-plans every 10 minutes, 32 redundant experts in prefill; EPLB | DEEP (moe-inf) |
| s-inf attention never sparsified; MLA, sparse, linear | DEEP (moe-inf), shortened to a pointer; PARENT's KV-cache table carries which lab ships which attention |
| s-inf input-dependent performance | DEEP (moe-inf); the comparison-level mistake in DRAFT |
| s-spars: ratio history 3.6x, 18x, about 32x; 2026 band 16x (Hy4) to 33x (V4 Pro), 3% to 6.5% active | DRAFT "Why the labs went sparse"; band also PARENT scatter caption "Shaded: 16x to 33x, where the 2026 frontier-size open MoE models sit" |
| K2 sparsity scaling law (1.69x, 1.39x, 1.15x; stopped at 48; quote); Moonshot counts experts | DRAFT |
| Three caps: memory, communication, under-training; K3 Stable LatentMoE (896, 16, 2 shared) and the 2.5x quote | DRAFT |
| "Sparsest" claims: ratio (V4 Pro 33x), active count (Step 5 27B, 22x; Qwen3.8-Flash-Next 6B of 125B, about 21x), phase-dependent (V4.1-Flash 8B / 16B, 69x / 35x) | DRAFT mistake item; PARENT scatter notes V4 Pro "about 33x, the sparsest here" and V4.1-Flash prefill/decode |
| Trend: shared experts a choice (Qwen3 dropped, Qwen3-Next reinstated, 10 routed + 1 shared of 512) | DRAFT "How the labs route" |
| Trend: dense warm-up layers (V3 3 of 61, K2 1, GLM 3) and the explanation | DEEP (moe-par) callout, plus Maverick alternation; first-dense-layer counts also in DRAFT's table |
| Trend: MoE reached small models (Gemma 4 26B-A4B, North Mini Code 30B-A3B, gpt-oss-20b) | DRAFT; points in LAND |
| Trend: low-precision native checkpoints (K2 Thinking INT4, K3 MXFP4/MXFP8 QAT, gpt-oss MXFP4) | DRAFT (memory cap) |
| Trend: sigmoid plus bias lineage, scoring_func and noaux_tc in V3, K2, K3, GLM-5.2, GLM-5.3-Flash configs | DRAFT |
| s-trade rows: dense or MoE (Mistral Medium 3.5 128B, Command A 111B, dense below about 130B), top-k choice, shared expert | DRAFT "When to use which"; the dense models are PARENT scatter points |
| s-trade rows: balancing method, capacity or dropless | DEEP (moe-cap) table |
| s-mist "8x7B is a 56B model" | PARENT: "Mixtral 8x7B is eight 7B models ... about 47B total and 13B active, not 56B and 14B"; exact 46.7/12.9 rebuild in DEEP (moe-par) |
| s-mist "Active parameters set the memory bill" | PARENT: "Reading total parameters as cost or quality: Memory follows total parameters, compute per token follows active ones" |
| s-mist specialise by topic; z-loss; balancing loss moves tokens; sigmoid selects differently; dropped tokens | DEEP (moe-mist) |
| s-mist benchmark speed; "sparsest" without a quantity | DRAFT (two mist items for s-read) |
| Footer pointer to Further reading | DEEP final line points to the parent's Further reading |

## 06_tabs.html
| Child tab | Now |
|---|---|
| t-par "Total and active, rebuilt from configuration files": formula, 8 presets, granularity slider, precision, embedding toggle, table, reproduction line, V3 worked example (7 steps, 685B with MTP, 98% vs 61%), Mixtral worked example | DEEP (moe-par), `35_js_moe6_par.js` |
| t-land "The MoE landscape" scatter, ranking bars, table, 4-bit memory rule (total / 2 GB) | not duplicated: PARENT scatter (`22_js_scatter.js`) already plots total against active with constant-ratio lines and computes memory at any bit width; missing points and better sources in LAND |

## 07_more.html (Further reading)
Dropped from the page as instructed; every link with its time estimate is in the agent report for the parent's Further reading tab.

## JS parts not ported
- `10_js_common.js`: rewritten as `35_js_moe0_common.js` (namespaced under `window.MOE`, marker ids prefixed).
- `17_js_land.js`: not ported (see t-land above); its data is in LAND.
- `90_js_tabs.js`: not ported (the parent's tab script is used).

## src/inputs, recompute.py, viz_ideas.md
- `inputs/` (configs of V3, GLM-5.2, GLM-5.3-Flash, gpt-oss 120b and 20b, Maverick, Mixtral, Qwen3-235B, Qwen3-Next, Qwen3.8, Qwen3.8-Flash-Next, K2, K3; text extracts of the V3 report, Mixtral paper, global-batch paper) and `recompute.py`: copied to `src/moe/`; `cd src/moe && python3 recompute.py` reproduces every default of the deep tab.
- viz_ideas.md ranked ideas: 1 routing animation, DEEP (moe-anim); 2 total and active from config, DEEP (moe-par); 3 landscape scatter, PARENT plus LAND; 4 router card, DEEP (moe-gate); 5 decode card, DEEP (moe-ep); 6 global-batch toy, DEEP (moe-scope); 7 static figures, DEEP (moe-layer, moe-ep). New: a compact dense-versus-MoE before/after animation for the Reading tab, DRAFT plus `35_js_moe_read.js`. Rejected ideas and the methodology gap (embedding convention for "active") stay recorded in the child's viz_ideas.md; the embedding toggle is kept in DEEP.

## Known inconsistency carried over
- Kimi K2 ratio: the child's text and table use 1.04T / 32B = 32.5x; `recompute.py`'s landscape block uses 1.00T and prints 31.2x. Left as copied; noted in LAND.
