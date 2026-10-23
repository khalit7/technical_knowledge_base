# Source of "Topic: llm-architecture"

Root of the topic (storage key `la-tab`). Built 2026-10-18 to 2026-10-19 by a team of tab agents; rebuilt on 2026-10-23 as the pilot root of the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and check
- `sh build.sh` writes `../index.html` from `parts/` (unchanged script). `parts/33_js_cc_1core.js` is also read by the Attention variants, Beyond attention and Mixture of experts children's builds: keep its path and API.
- `sh html_utils/checkpage.sh <this page>`: tabs 6, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-23).
- `node <this page>/src/check_controls.mjs <this page>/index.html` (from the repository root): every tab at 390 px dark and 920 px light, scrolled through (nothing may start playing), every button, range and select moved; clean on 2026-10-23.
- `python3 html_utils/ledger.py check <this page>`: problems 0.

## Tabs and parts
| Tab | Parts | Decision on 2026-10-23, and why |
|---|---|---|
| Reading `t-read` | `20_read.html` (opener, CSS, nav), `20_read_a` (core idea, hero, you need, new terms, section 1) to `20_read_h` (child cards), `20_read_z`; JS `21_js_rd_common.js` (the skill template: never autoplays), `22_js_rd_hero.js` (hero), `23_js_rd_wt.js` (section 3 figure), `24_js_rd_ui.js` (predict reveal, tables as cards on phones) | Rewritten as a map (below). |
| Block lab `t-block` | `31_*` | **Kept.** It is the one lab that spans several children: one real token through a whole block (norms, attention, position, FFN) with recorded vectors for six real models, and FLOPs per operation against context. Its pre- against post-norm section (`31_js_bl_4norm.js`, the old `31_tab_block_c.html`, now in `retired/parts/`) and its interview answer were retired on 2026-10-23 at the topic close: Normalisation, residuals and stability carries every unit in its section 2 (ledger keys 5.1e-7, 2.138, 65.8, "a 24-layer version"); section 5 is now one paragraph and a link. The runs and traces stay in `src/block/out`, which that child's checks read. |
| Attention lab `t-attn` | moved to `retired/parts/32_*` | **Removed.** Every unit is now carried by Attention variants (mechanisms, four caches, trained variants, ablations, decode timing, windows and sinks, sparse attention, mistakes, interview) or Long context (the KV calculator); keys checked by the ledger. Links now point to `{{Attention variants|n:3fd5c17b0d0d8120859ecc2d0236e846}}` and the `#t-kv` tab of Long context. Scripts and outputs stay in `src/attn/`. |
| Config calculator `t-calc` | `33_*` (the dense-vs-MoE stepper `33_js_cc_3moe.js` retired to `retired/parts/` on 2026-10-23: Mixture of experts section 1 carries it) | **Kept, without its KV parts.** Parameters, active parameters, weight memory, decode and prefill FLOPs and decode intensity for any config, checked against stored tensor counts, are whole-model arithmetic that spans every child, and no child does them. Removed: the two KV tiles, the KV formula block and the context sweep of cache against weights (owned by Long context's calculator, which runs the same `calc.py`); a short section links there. **Since 2026-10-23** the core models Nemotron 3's MoE layers (two-matrix squared-ReLU experts, a non-gated shared expert, the latent projections of Super and Ultra; MTP layers not counted) instead of refusing them: `calc/check_nemotron3.py` shows Nano 30B-A3B equal to the Hub's stored-tensor count (31,577,937,344) and Super 120B-A12B equal to it once its one MTP layer is added (123,611,012,096); JS equals Python on all five Nemotron 3 configs; the gallery child's `cc_agree.mjs` now agrees on 46 of 46. |
| Inside a real model `t-inside` | `34_*` | **Kept.** It spans attention (maps, induction heads, sinks), norms (massive activations) and the output (logit lens) on one real model; no child owns interpretability of a whole model. Its sink before/after is Attention variants' mechanism and is listed for that page. |
| Architecture map `t-map` | `35_*` | **Kept.** A root-owned model map: every model from GPT-2 to 2026 on the axes of the Reading tab, with a timeline and a picker. |
| Further reading `t-more` | `39_tab_more.html` | Kept; tab list and child times updated (measured). |

All three kept step controllers that used to play on first view (`33_js_cc_2ui.js`, `34_js_in_1core.js`, `35_js_am_1core.js`) now wait for play or a step; the Block lab uses the template `RD.anim`.

## What changed in the Reading tab
- **Top**: the core idea in one sentence, then a hero figure: the decoder block as a static annotated SVG, each part a link to the child page that owns it (tokenizer, norms, the sequence mixer with position, KV cache and the fixed-state alternative as separate chips, FFN or MoE, the output and objective), drawn at the measured width; "You need"; six new terms.
- **One screen**: the comparison table with an Owner column instead of section numbers; the mixer now has two rows (attention variant; attention or a fixed state) and a row for context and its cache.
- **One short section per part**, each with the distinction that only shows across children: vocabulary size (tokens against cache), the FFN holding four fifths of the weights (new static figure: why MoE targets the FFN and attention design targets the cache), the **four levers on the cache** (smaller entry, sparse reads, fewer tokens, fewer layers with a cache) as one table with storage against reads and the owning page, total against active parameters, the three logs for a loss spike, the four long-context walls with owner and check, families, reading a config, choosing.
- **Re-derivations removed**: the per-variant cache table at one shape, the MoE dense-vs-MoE animation and the attention-vs-recurrent animation (owned and drawn by Mixture of experts and Beyond attention), the attention-variant mechanism prose (Attention variants), the 70B cache predict (Long context sizes it), the interview block (answers restated sections; the two that added something, tensor parallelism of MQA and GQA and the 128K design, are kept in closed blocks).
- **Measured and per-model evidence** that is not needed on first read sits in closed blocks per section (2026 configs on the levers, published and measured costs, MoE and norm runs, effective context runs, MTP, width and depth, checkpoint checks, lab failures, the running example and the labels).
- **No script-filled prose.** The old `data-rd` fills (`22_js_rd_data.js`, written by `src/read/make_read_data.py`) are now static HTML, so the ledger can see them; `src/read/` keeps the scripts and `derive.py` for provenance, and `retired/parts/` the old parts.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 37.5 min | 22.1 min |
| Reading, closed details | 5.1 min | 14.0 min |
| Block lab | 18.5 + 4.2 | 18.5 + 4.2 |
| Attention lab | 29.7 + 9.3 | removed |
| Config calculator | 15.4 + 10.6 | 14.1 + 10.6 |
| Inside a real model | 23.7 + 2.3 | 23.7 + 2.3 |
| Architecture map | 14.3 + 1.3 | 14.3 + 1.3 |
| Further reading | 4.6 | 4.6 |
| Visuals drawn in Reading | 3 (two animations owned by children, one chart) | 2 (hero map, weights split) |

Why about 22 minutes is right: the core is now only what a map needs, the definitions used to read the comparisons (attention, the KV cache formula, prefill and decode, SwiGLU, total and active, pre-norm, RoPE) and seven cross-child tables or distinctions (one screen, four levers, four walls, families, config fields, choosing, plus the weights split); every mechanism is one orienting sentence and a link. It is longer than a pure index because it defines the terms each comparison needs, which no single child does. Shorter would mean dropping a definition the comparisons rely on; the remaining depth is closed.

## Knowledge ledger (`ledger.json`)
984 units: core 591, depth 190, owned 120 (Attention variants 84, Long context 17, Mixture of experts 7, LLM architecture gallery 5, Normalisation 2, Tokenizers 2, Positional Encodings 2, Beyond attention 1), fat 83, volatile 0; problems 0. 958 were drafted by `ledger.py init` from the page as built before the rebuild; 26 were added by hand for script-rendered text (the old `data-rd` fills, the Attention lab's and the calculator's script-written tables), with the owners' key strings. Units of the unchanged tabs keep their own text as key. Fat units carry a `note` (headings, wind-ups, stale child times, TODO placeholders whose content was added as hand units, navigation of the retired lab, run provenance of the retired lab whose scripts stay in `src/attn/`). Keys were found by script (numbers first, then a phrase of at least four words) and the residue labelled by hand; some owned keys are deliberately the owner's own headline string for the section that absorbed the unit, so they prove the section exists rather than every sentence.

## The topic close (2026-10-23)
After the ten children were rebuilt: the Block lab's pre/post-norm section, the calculator's dense twin and the Reading tab's closed MoE, norm and fixed-state measurements were replaced by one sentence and a link to Normalisation (section 2), Mixture of experts (sections 1 to 6) and Beyond attention (sections 8 and 9); their ledger units are `owned:` with keys checked on those pages. Child cards and Further reading carry each child's current title and the reading time its header states. Root times measured with `html_utils/audit_pages.mjs`: Reading 23 + 13 (was 22 + 14; the cards grew, the closed blocks shrank), Block lab 15 + 4 (was 19 + 4), Config calculator 13 + 11 (was 14 + 11). Ledger after the close: 984 units, core 555, depth 175, owned 168, fat 86, problems 0. `src/read/check_data.py` still asserts the retired `window.RDL` fills and fails since the pilot; the Reading tab's numbers are static HTML checked by the ledger.

## For the children's rebuilds
- Attention variants: Inside a real model's sink before/after on long stories (3.36 against 1.62, 1.81 with the first token kept) is also on that page; the Inside tab keeps the maps.
