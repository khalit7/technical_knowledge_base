# Memory technology: sources, scripts, outputs

Page parts in `parts/` (assembled by `build.sh` into `../index.html`): `20_read.html` (styles) and `20_read_a.html` to `20_read_i.html` (Reading: top with core sentence, hero, new terms; sections 1 to 7; section 8 all closed depth), `39_tab_more.html` (Further reading); JS: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` (the explainer-page skill templates, unchanged except the storage key `hwmem-tab`; animations and stages play once in view), `40_js_sc_hero.js`, `41_js_sc_hbm.js`, `42_js_sc_kv.js` (the three 3D scenes), `22_js_data.js` (generated, `window.MEMD`), `23_js_rd_charts.js` (chart helpers `MC` and the Reading charts), `24_js_rd_bank.js` (DRAM bank animation, `BANKSIM`), `25_js_rd_meas.js` (the measured charts and tables that were the Memory lab tab). Photos in `../img/` with `../img/CREDITS.md`.

## Reproduce
`MLXPY=<python with mlx> SCRATCH=<dir outside the repo> sh run_all.sh` runs everything below in order.
- `code/mem_gpu.py`: the M1 Pro GPU measurements through MLX custom Metal kernels (working-set read bandwidth, pointer-chase latency, random-block reads, decode attention against MHA/GQA/MQA caches). Every kernel is checked against NumPy first. `out/run_{1,2,3}.json|log`: three runs, 7 trials each, with load averages.
- `code/ssd_read.py`: the internal SSD with the page cache bypassed (`F_NOCACHE` on write and read). `out/ssd.json|log`. `out/ssd_cached_attempt.txt` records the first, cache-served attempt.
- `code/build_data.py` (stdlib only): aggregates the runs (median of run medians, spread across runs), computes the KV cache of 13 models from `inputs/configs/*.json`, the derived numbers, the DRAM bank reference; writes `out/data.json` (embedded verbatim), `out/expected.json` (test vectors) and `parts/22_js_data.js`.
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 39 hand-written numbers in the prose match it.
- `check/check_stages.mjs` (from the repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
- `check/check_ui.mjs` (from the repo root, puppeteer `headless: 'shell'`): the page's JS against `out/expected.json` (9,522 values) and every control at 390 px dark and 920 px light (no errors, NaN, undefined, sideways scroll), with screenshots.

## Inputs
- `inputs/configs/`: Hugging Face `config.json` of the 13 models (gated repos via open mirrors: unsloth for Llama 3.1 and Gemma 3, NousResearch for Llama 2), fetched 2026-10-05. The Llama 3.1 405B config is the unsloth bnb-4bit mirror (architecture fields identical; an AWQ mirror with 16 KV heads was rejected).
- `inputs/safetensors_total_size.json`: `metadata.total_size` from each repo's `model.safetensors.index.json`. DeepSeek-V3's lists 1.369e12, twice its FP8 parameter count; the page uses the parent calculator's parameter count (671.0 GB at 1 byte) for it and for the 405B (811.7 GB at 2 bytes).
- Text extracts kept as evidence: `han2015_energy_extract.txt` (Horowitz table), `oconnor2017_fgdram_extract.txt` (HBM2 3.92 pJ/bit split, GDDR5 14 pJ/bit, 1 KB rows), `gholami2024_memory_wall_extract.txt` (3.0x / 1.6x / 1.4x per two years), `kwon2023_pagedattention_extract.txt` (20.4 to 38.2%, block size 16, 2 to 4x), `vllm_cache_config_extract.txt` (`gpu_memory_utilization` default 0.92 at commit 74c5cbcd). `li2023_pond_cxl_extract.txt` (Pond, ASPLOS 2023: CXL.mem, x8 port against a DDR5-4800 channel, +70 ns, 70 to 90 ns for 8 to 16 sockets, up to 25% stranded, 50% of server cost, 7% saving; fetched 2026-10-23).
- Vendor figures are typed in `code/build_data.py` with URLs; they are the values of the shared facts file used by the parent's Chip atlas (all fetched 2026-10-05).

## Choices and departures
- Child-page method (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the subject's own logic (cell, array, packaging, tiers, contents, offload, supply), then two tabs. Teaches from zero, as the 2026-10-04 lesson asks; the reading is about 30 minutes.
- No NVIDIA GPU: all measurements are on the M1 Pro and say so; the Memory lab says what transfers to NVIDIA and what does not. Independent NVIDIA measurements (Luo et al.) are kept apart from vendor specs.
- The DRAM bank animation uses illustrative timings (labelled); its order of results does not depend on them.
- Qwen3-Next's linear-attention state is counted at 2 bytes per value (an assumption, labelled).
- CXL memory: added 2026-10-23 from the Pond paper (section 5).

## 2026-10-23 pilot: KV-cache sizing has one owner
Whole-model KV-cache sizing now lives only on [Long context](n:3fd5c17b0d0d81059ee1ce20c0326dc5) (KV-cache calculator, tab t-kv, 45 presets); this page keeps a one-line conclusion and a link. Removed the "KV cache across models" tab (t-kv: the growing-conversation animation, KV against context for 13 configs, and the how-many-conversations planner; parts 32_tab_kv.html and 32_js_kv.js) and condensed Reading section 6's formula block, Llama 2 7B example and four-ways list to one paragraph that keeps the Llama 3.1 8B numbers (128 KiB per token, 4.29 GB at 32K) and links Attention variants and the KV-cache calculator. Kept: the measured M1 cache-read timings (Memory lab), allocation (PagedAttention), offload numbers. check/check_ui.mjs no longer tests KVM.kvSeq and KVM.plan; check/check_embed.py drops the two removed prose numbers. MEMD still embeds models and chips (out/data.json is unchanged, so check_embed's equality holds); out/expected.json still carries the kv and plan cases, now unused. Core reading 26 to 25 min, other tabs 11 to 6 min. Removed units and where the owner carries them: `src/ledger.json` (`python3 html_utils/ledger.py check`). Also: animations no longer autoplay (they wait on step 0), a tab named in the URL hash opens, and the header reading time uses the "Reading: N min, plus M in closed details." format.

## 2026-10-23 rebuild to the teaching contract
Brief: `.claude/skills/explainer-page/teaching/teaching-contract.md`. No new runs; editing, two new photos, one new source.
- **Top**: the core idea in one sentence; a static hero (one H100 server's rungs from on-die SRAM to SSD, log bandwidth bars, and the batch-1 decode ceiling for Llama 3.1 8B on each rung: bandwidth / 16.06 GB, derived); "You need" with the owners of the programming view (GPU memory hierarchy) and of KV sizing (Long context); six new terms. The old "In one screen" table is a closed reference block; the "Three rules" box became the core sentence.
- **Memory lab tab removed; its charts moved inline** beside the claims they prove: random blocks into section 2, the working-set table as a third mode of the section 3 ladder chart, decode attention against cache bytes into section 6 (with a prediction prompt), the SSD table into a closed block in section 7, run method, metadata and "what transfers" into a closed block in section 3. Tabs are now Reading and Further reading.
- **Real images** (`img/CREDITS.md`): an HBM2 stack seen edge-on on a Tesla P100 (CC0) in section 4; AMD Fiji's and TPU v4's packages side by side in section 5 (CC BY-SA 4.0; CC BY 4.0, reused from the TPU programming page) for "only so many stacks fit along the die edge". No licensed photo of a polished HBM cross-section (SEM) was found on Commons; the edge-on P100 photo with the photographer's thickness labels is the closest.
- **Ownership**: coalescing now links to GPU memory hierarchy (section 1) instead of "coalesced access on the CUDA root's GPU simulator"; the Little's-law cross-check keeps the CUDA root's measured 138 to 151 GB/s and drops the "inferred about 370 ns" that the CUDA root no longer states. KV sizing stays on Long context; section 6 is now "Decode is bound by the bytes it reads", with the bound as a formula.
- **Added**: CXL as a tier (section 5, Pond).
- **Closed depth (section 8)**: HBM supply (dated, volatile), four common mistakes (two that restated the core removed), the six interview questions, the symptoms table; the HBM generations table and the spec-sheet arithmetic are closed in section 4.
- `check/check_ui.mjs` exercises the Reading controls including the new `rd-kv-mode` and opens every closed block; `check/check_embed.py` swaps the two prose checks of the removed rules box for three new ones (1,239 GB/s card, the hero's SSD ceiling, the 4.8 ms decode bound).

### Length judgement
| | Before | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 25.2 min | 23.2 min |
| Reading, closed details | 2.5 min | 8.2 min |
| Memory lab tab | 3.5 min | (folded into Reading) |
| Further reading | 2.7 min | 2.8 min |
| Visuals in Reading (audit count) | 4 | 9 (plus 3 photos) |

Why about 23 minutes is right: the page teaches seven things a reader cannot get elsewhere in the knowledge base (the DRAM array and its access-order cost, energy per bit, SRAM and the measured ladder with Little's law, packaging and the bandwidth equation, the capacity-bandwidth trade with CXL, why decode is bound by bytes, offload arithmetic), each with its own visual; the core shrank by two minutes while absorbing the lab's 3.5 minutes and adding CXL, because restatements, wind-ups and per-item tables moved out or into closed blocks.

### Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
312 units: core 246, depth 28, fat 24, owned 14 (all `owned:models_and_training/topic_llm_architecture/long_context`, from the KV pilot). 284 drafted by `ledger.py init` from the page before this rebuild; 17 carried over from the KV pilot ledger (section "pilot: ..."); 11 added by hand for script-rendered text (generations note, ladder table, SSD table, decode and random-block notes, bank captions) and for what was added (hero, CXL, photos, the decode bound). Fat units carry a `note`.

2026-10-26 (final follow-up sweep): the tiers table's host DRAM capacity ("terabytes per server") now cites NVIDIA's DGX B200 page (2 TB, configurable to 4 TB).

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `hwmem-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. No new runs: every scene draws from `window.MEMD` (`out/data.json`, unchanged).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): one H100 server from the die outward | yes, 7 |
| Reading | You need, new terms, reference table | full width | table (closed) | no |
| Reading | 1 Why memory | split | 2D generations chart | no |
| Reading | 2 DRAM cell, array | split | 2D bank animation, three orders | yes, 5 + 5 + 5 |
| Reading | 2 Measured random blocks | split | 2D log-log chart | no |
| Reading | 2 Why bandwidth costs power | split | 2D energy bars | no |
| Reading | 3 SRAM and the cache ladder | split | 2D measured ladder (three modes) | no |
| Reading | 3 NVIDIA's ladder, SRAM-only machines, method | full width | none; details closed | no |
| Reading | 4 Packaging | split | **3D** `stg-hbm` (Fig. 2): HBM against GDDR7 | yes, 5 |
| Reading | 4 HBM, GDDR7, LPDDR cards | split | photo (P100 HBM2 stack edge-on) | no |
| Reading | 4 Per-stack growth, spec sheet, the trade | full width | table (closed) | no |
| Reading | 5 Stacks along the die edge | split | two photos (Fiji, TPU v4) | no |
| Reading | 5 Further from the die, unified memory | split | 2D tiers bars | no |
| Reading | 5 CXL | full width | none | no |
| Reading | 6 Decode bound | split | **3D** `stg-kv` (Fig. 3): what one decode step reads | yes, 5 |
| Reading | 6 Measured decode attention | split | 2D log-log chart | no |
| Reading | 6 Allocation, when it matters; 7 Offload; 8 Depth | full width | tables; details closed | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1: `nums.h100_onchip_mb` (119.2 MB), `chips` h100 (80 GB, 3.35 TB/s), the ladder's PCIe Gen5 x16 (128 GB/s both directions, 64 each way) and 400 Gb/s NIC (50 GB/s), CXL as one DDR5-4800 channel (38.4 GB/s, derived), `meas.ssd.seq_GBs`; ceilings are bandwidth / `models` l8 `wbytes`; dot counts 4 x log10 of the bandwidth in GB/s; positions and the DIMM count illustrative. Fig. 2: `chips` h100 and rtx5090, `nums.h100_pin_gbps`, `nums.rtx5090_gbs` (28 Gb/s = 1,792 x 8 / 512), `nums.hbm2_pj`, `nums.gddr5_pj`; one lane per 64 wires; dot speed proportional to the pin rate; the 8 DRAM dies per stack and 8 GDDR7 packages illustrative. Fig. 3: `models` l8 (`wbytes`, 32 layers, `kv_tok_bf16`, `kv` at 32,768 and 131,072 tokens), `chips` h100, vLLM's `gpu_memory_utilization` 0.92; step time = (weights + cache) / 3.35 TB/s, activations ignored; the scene exports `window.MT_KV` and the check recomputes every number in the list.

**Removed**: the 2D hero rows (numbers now in Fig. 1's step list), the 2D width-by-rate rectangles (Fig. 2), the bank animation's per-read caption (the step lists). The bank animation went from 17 frames to 5 explained stretches (the long-replay rule), each stretch playing its reads one by one when entered going forward. Kept 2D and why: `viz_ideas.md`.

**Length judgement.** Reading core 23.3 min before (5,359 words), 27.8 min after (6,386 words, `audit_pages.mjs`); closed details 8.8 min both times; Further reading 2.9 min unchanged. Visuals in Reading 9 before, 11 after by the audit's count (three 3D stages; two 2D drawings retired). The four and a half minutes are the step lists that now explain each stage and the bank animation on the left, as the rollout requires, including new derived results in Fig. 3 (a batch of four at 32K reads the same cache bytes as one 128K conversation; 13 conversations fill vLLM's 92%). Prose the stages carry was condensed (the KV paragraph of section 6, the width-by-rate note). Nothing the ledger holds was cut.

**Ledger**: 320 units (core 252, depth 28, fat 24, owned 14, volatile 2): two keys re-pointed (23: the generations chart sentence; 104: width by rate, now Fig. 2's lanes), five units added for the new step-list results; `ledger.py check` problems 0 here and on the root.

**Checks** (2026-11-12): `check/check_stages.mjs` (problems 0), `check/check_ui.mjs` (PASS), `check/check_embed.py` (38 prose checks, 0 problems; two prose anchors moved to the new wording), `html_utils/checkpage.sh` (fail=0, emdash 0, errbox 1, clipped 0).
