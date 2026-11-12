# Local and on-device inference: sources, runs and how to rebuild

Child page of Topic: inference-and-serving. Built 2026-10-10; rebuilt 2026-10-23 to the teaching contract, absorbing the sibling Model formats (see the rebuild section below). Tabs: Reading (`t-read`, parts `20_read_a.html` to `20_read_n.html`), File explorer (`t-bytes`), Fit and speed (`t-fit`), Further reading (`t-more`). Ids and classes use the `lo-` prefix; parts absorbed from Model formats keep its `mf-` prefix; since 2026-11-12 also `stg-` stages and `sx-` step lists. Storage key `lo-tab`.

## Machine and versions (every "measured here" number)
Apple M1 Pro laptop (10-core CPU, 16-core GPU, 16 GB unified memory, 200 GB/s by Apple's spec), shared with other agents: every run records the one-minute load average. llama.cpp Homebrew 0.5.0 (build 11146, commit 7fe450e19), MLX 0.32.3 with mlx-lm 0.32.0, Ollama 0.40.1 (the installed app's binary, run as a separate server on a scratch port with a scratch model store). Source read at those versions (Ollama at tag v0.40.1, commit cf2a313a).

Models (downloaded to a scratch folder, never the repo): Qwen/Qwen3-1.7B @ 70d244cc and Qwen/Qwen3-4B @ 1cfa9a72 safetensors (sha256 matched the Hub), converted here to F16 GGUF with llama.cpp b11146's `convert_hf_to_gguf.py`, then quantized with `llama-quantize`; Qwen/Qwen3-4B-GGUF Q4_K_M @ bc640142 (the official file, measured as one more point). MLX variants converted here with `mlx_lm convert`. Perplexity text: WikiText-2 raw test. Importance-matrix calibration: bartowski's calibration_datav3 (gist eb213dcc..., sha256 200e109b...), checked to share no 60-character passage with the test text.

## Scripts (`scripts/`, copies of what ran)
| Script | What it does |
|---|---|
| `qladder.sh` | One model's ladder under the shared bench lock: F16 base logits (`llama-perplexity --kl-divergence-base`, 40 chunks of 512), `llama-imatrix` over the calibration text, then per type: `llama-quantize` (with `--imatrix` for `+i`), `llama-bench -p 512 -n 128 -r 5 -fa 1`, `llama-perplexity --kl-divergence`; deletes each file after measuring. |
| `speedpass.sh` | Speed only, a second pass at another time (re-quantizing), so speed has two passes with their loads. |
| `collect_q.py` | Compacts a ladder run into `results/q17.json`, `results/q4b.json`. |
| `blocks.py` | Reads one real block (blk.14.attn_q row 0) from the F16 and quantized GGUFs with gguf-py: stored scales and codes, dequantized values, tensor-type mix per file. |
| `mlxq.py`, `mlxjob.sh` | MLX conversions of Qwen3-1.7B and their perplexity and KLD against MLX bf16 on the same token ids and windows as llama-perplexity; `mlx_lm benchmark`. |
| `srvlab.py` | llama-server experiments (defaults, slots sweep, split against unified KV, context shift, cache reuse, router mode); each starts its own server on port 8170 and stops it. Load generator: the parent's `src/bench/scripts/loadgen.py`. |
| `ollamalab.py` | Ollama 0.40.1 on port 8172 with a scratch store against llama-server on the same GGUF. |
| `conv.sh` | The conversions. |

## Data and checks
- `gen_data.py`: reads `results/`, imports the parent's `src/plan/plan.py` (model shapes from config.json, unchanged) and writes `parts/20_js_lo_data.js` (`window.LO`) and `out_lo_data.json`. Every number the prose quotes is in `LO.facts`, filled into `<span data-lo="key">`.
- `check_data.py`: the page embeds exactly `out_lo_data.json`; every `data-lo` key exists; facts recomputed from results; bits per weight from block structs.
- `check_ui.mjs <shots dir>`: puppeteer, 390 px dark and 920 px light, every control; since 2026-11-12 it also asserts that the three 2D Reading animations play once in view and the File explorer widget does not.
- `check_stages.mjs [shots dir]`: the 2026-11-06 rollout checks (below).
- `coverage.md`: the old page claim by claim. `viz_ideas.md`: visuals built and rejected.

Rebuild: `python3 -I gen_data.py && (cd formats && python3 -I gen_data.py) && sh build.sh && python3 -I check_data.py && (cd formats && python3 -I check_data.py) && node check_ui.mjs <scratch shots dir>`, then from the repo root `sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving/local_and_on_device_inference` and `node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/local_and_on_device_inference/src/check_stages.mjs <shots dir>` (about five minutes).

## Speed measurements on a shared laptop
Other agents used the same GPU, and the load average does not see GPU use. Speed was therefore measured in up to three passes at different times (the ladder itself, `speedpass.sh` pass 2, pass 3); the page uses the fastest pass per file (another job can only slow a run) and shows every pass in the Quant ladder tab. Qwen3-4B's ladder pass and pass 2 overlapped another agent's job after the shared lock went stale during a long item (the lock was taken over after 45 minutes without a touch; later runs kept a background toucher), so Qwen3-4B speeds come only from pass 3; its quality numbers do not depend on timing. The reduced Qwen3-4B ladder (no IQ1/IQ2/IQ3_XXS files) is why: those quantizations took 30 to 50 minutes each under contention, and Qwen3-1.7B covers them.


## Build additions (2026-10-23)
- `bake_facts.py` (run by `build.sh`): writes every `<span data-lo>` and `<span data-mf>` number into the static HTML, so the prose numbers show without script and `html_utils/ledger.py` can find them. The script still fills them at load (same values).
- `formats/`: everything Model formats measured on 2026-10-11 (its `results/`, `scripts/`, `inputs/research_2026-10-11.md`, `coverage.md`, `viz_ideas.md`), with its `gen_data.py` (writes `parts/20_js_mf_data.js`, `window.MF`) and `check_data.py` (embedded MF equals a fresh build; prose numbers typed into the parts match `results/`). Its scripts, versions and models are as recorded in that page's README: PyTorch 2.14.1, transformers 5.19.0, safetensors 0.8.0, onnx 1.23.2, ONNX Runtime 1.31.0, gguf-py 0.19.0, llama.cpp b11146, mlx 0.32.3; Qwen3-0.6B @ c1899de2, the Unsloth Qwen3-0.6B BF16 GGUF @ 50968a44.
- JS parts from Model formats: `22_js_mf_read.js`, `23_js_mf_pickle.js`, `24_js_mf_charts.js`, `25_js_mf_conv.js` (was its Conversion map tab), `31_js_bytes.js` + `31_tab_bytes.html` (File explorer). `25_js_lo_ladder.js` is the old Quant ladder tab's code, now drawing inline. `26_js_lo_hero.js` was the hero (removed 2026-11-12; Fig. 1 is `40_js_sc_hero.js`). `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (recopied 2026-11-12: animations now play once in view).
- `check_ui.mjs`: every control in every tab at 390 dark and 920 light, plus a motion check (inverted 2026-11-12: the Reading animations play once in view; the File explorer widget never moves by itself).

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core sentence (speed = bandwidth / bytes per token; fit = weights + KV inside the GPU's share of memory; so choose a file and an engine), a new static hero (one 2.49 GB file in the M1 Pro's memory to scale, and the bytes each token reads with its 80 and 23 tok/s ceilings against the measured 43.2), "You need" (the parent; Quantization and Precision owns the methods; Distillation and small language models owns model choice), new terms, the stack diagram. The local-against-datacenter table and versions are a closed reference block.
- **Model formats folded in** as section 3, "The file": three layers, what a file holds, pickle, safetensors, GGUF, MLX layout, ONNX, the repo and compressed-tensors, conversions, loading, choosing; compiled artifacts closed; on-device formats merged into section 11's runtime table; ternary packing merged into section 10; the Q4_K_M recipe and super-block layout merged into section 4 (one explanation, not two); the tied-embedding duplicate told once (section 3) and used in section 4. Its mistakes and interview questions merged with this page's (closed).
- **Lab tabs moved into Reading** beside the claims they prove: speed against size (section 1), quality against size (section 5), every-file table and every llama-server/Ollama/CPU run (closed blocks), the conversion map (section 3). Remaining tabs are tools used across the page: Fit and speed, File explorer.
- **Depth closed**: CPU against GPU, transfer notes, pickle security history, safetensors limits and shards, GGUF splitting, history and parser CVEs, ONNX operator detail, repo files, published loading numbers, TensorRT, _S/_L recipes, the hand-decoded blocks, newer-model and benchmark evidence, server options and metrics, MLX modes and multi-Mac, LM Studio versions, published two-card numbers, the dual RTX 5090 setup, the very-low-bit products table, the per-runtime table, mistakes, interview.
- **Section numbers** now: 1 speed, 2 fit, 3 the file, 4 quantisation, 5 types measured, 6 llama-server, 7 MLX, 8 Ollama and LM Studio, 9 NVIDIA, 10 very low bits, 11 phones. References in `gen_data.py` and the JS were updated.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 49.0 min (this page) + 34.4 (Model formats) | 52.2 min (first pass), 39.6 min (second pass) |
| Reading, closed details | 3.5 + 1.5 min | 35.5, then 53.2 min |
| Other tabs, core | Quant ladder 3.2, Fit 3.0, server lab 4.5 (+ Model formats: explorer 3.6, conversion map 2.6) | File explorer 3.6, Fit 3.0 |
| Visuals drawn inline in Reading (SVG, audit count) | 3 (+ 0 on Model formats) | 6, plus 10 HTML charts and steppers absorbed from Model formats |

**Second pass (2026-10-23, at the lead's request: core towards 35 to 40 min, no unit lost).** Section 3 now keeps one short paragraph per format beside its visual (layers, what a file holds, pickle stepper, safetensors hex, GGUF map, MLX groups, ONNX, repo, conversion rules and map, loading bars, choosing table); the byte layouts, measured tables, edge cases and provenance are closed blocks. The same treatment in the other sections: the KV-read and prefill numbers, the Mac working set, the calibration caveat and how-to-check boxes, how quality was measured, three of the seven ladder lessons, slot choice, context shift mechanics, MLX background and server limits, Ollama's runner paths and adds, the Ollama method, LM Studio, the layer-against-tensor-split detail and the ternary measurements each became a two-line core summary plus a closed block holding the original text. Restatements the merge created were reduced to cross-references (the tied-embedding duplicate is told in section 3 and referenced in section 4; mmap is explained once, in section 3). Every visual stays inline (audit: 6 SVG visuals plus the HTML charts). Header: "Reading: 40 min, plus 53 in closed details."

Why about 40 minutes is right (the first pass argued for 52): the page now owns two subjects that used to take 83 minutes of core reading plus 17 of lab tabs across two pages, and it carries every non-fat unit of both (ledger below). The core is what is needed to choose and run a model locally: the two rules (bandwidth, fit), what is in the file and what loading it costs, how the quantised types work and what each costs measured, and the four engines' real defaults and traps. About a fifth of the core words are captions, script-rendered results and the opcode listing of the pickle stepper. Everything that is evidence, provenance, history or a per-item list is closed (35 minutes, optional).

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
785 units: core 354, depth 395, fat 36 (after the second pass; 523 / 226 / 36 after the first). Labels were recomputed from where each key now sits: core when outside a closed block. 449 were drafted from this page's old build and 308 from Model formats' (ids `mf*`, section prefixed "absorbed from model_formats", `where` empty: they live here), both with the prose numbers filled in; 28 were added by hand for script-rendered charts, tables and steppers (ids `hand*`), keyed to their static titles. Keys were chosen per unit as the most distinctive phrase (a number where possible) of the unit found on the new page, labelled core or depth by whether it sits outside or inside a closed block, and checked: every number of every non-fat unit is on the page or in its embedded data (section 10 now gives log2 3 as 1.585, as Model formats did). Fat units carry a `note` (wind-ups, headings, tab pointers, interview answers that restated a section). `../../model_formats/src/ledger.json` lists Model formats' 320 units labelled `owned:` this page (19 fat), and checks with problems 0.

## Departures
- The page is long because it absorbed a sibling; it is still one owner per concept (formats and local engines both live here).
- The dual RTX 5090 setup is reasoned from sources, not run (closed block).
- The conversion map's default node changed to GGUF BF16 so its first view shows one lossless and one lossy route instead of nine.


## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `lo-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`; `build.sh` writes the em-dash detector's character as bytes. The static SVG hero `26_js_lo_hero.js` is gone (Fig. 1 replaces it); the never-autoplay check in `check_ui.mjs` is inverted.

**No new runs.** The four scenes read the page's own data at load: `LO.q` (llama-bench speeds and file bytes measured on this laptop), `LO.hw` (makers' memory sizes and bandwidths), `LO.models` (KV bytes per token from the configs), `LO.facts.wsGB` (measured working set). Derived numbers in the step lists (ceilings 93, 157, 163, 64, 719; the 11 GB spill) are checked against that data by `check_stages.mjs`, as are the cache-reuse and safetensors step lists (`LO.reuse`, `MF.tinySt`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | Top: core idea | split | **3D** `stg-hero` (Fig. 1): the M1 Pro's 16 GB pool to scale, Qwen3-4B Q4_K_M+i weights and full-context KV, bytes per token, ceilings 80 and 23 against the measured 43.2 | yes, 5 |
| Reading | You need, new terms | full width | none | no |
| Reading | The stack | split | **3D** `stg-stack` (Fig. 2): llama.cpp and MLX stacks, file to apps, one Ollama request down | yes, 6 |
| Reading | Running examples, reference block | full width | none | no |
| Reading | 1 Bandwidth | split | **3D** `stg-bw` (Fig. 3): four Qwen3-1.7B files, GB per token against ceiling and measured speed, then the 16K KV cache | yes, 6 |
| Reading | 1 The ceiling | split | 2D scatter, every file (two modes) | no |
| Reading | 1 Prefill, CPU against GPU | full width | none (closed blocks) | no |
| Reading | 2 Will it fit | split | **3D** `stg-mem` (Fig. 4): a Mac's pool against system RAM, PCIe and a 32 GB card | yes, 6 |
| Reading | 2 Why a Mac has one pool | split | **real image**: an M1 package on a Mac mini board (CC BY-SA 4.0) | no |
| Reading | 2 When it does not fit | full width | none | no |
| Reading | 3 Intro, every format | full width | layer cards | no |
| Reading | 3 What a file holds; dtypes | split x2 | 2D repo bar; 2D bit strips with a value box | no |
| Reading | 3 Pickle | split | 2D stepper, three modes | yes, 8 + 5 + 7 |
| Reading | 3 safetensors; GGUF; MLX | split x3 | hex dump; 2D byte map; 2D group layout | no |
| Reading | 3 ONNX; the repo | full width | none | no |
| Reading | 3 Conversions; loading | split x2 | 2D conversion map; 2D load bars | no |
| Reading | 3 Choosing a format | full width | table | no |
| Reading | 4 The idea: a scale per block | split | 2D stepper, five formats | yes, 5 |
| Reading | 4 Three generations | full width | table | no |
| Reading | 4 Recipes | split | 2D type-mix bars | no |
| Reading | 4 Importance matrices | full width | predict | no |
| Reading | 5 Types measured | split | 2D quality scatter (log, four views) | no |
| Reading | 5 What the ladder teaches | full width | none | no |
| Reading | 6 Slots | split | 2D bars and line | no |
| Reading | 6 Cache reuse | split | 2D stepper, two modes | yes, 5 + 5 |
| Reading | 6 Context shift, router, options | full width | none | no |
| Reading | 7 to 11, depth | full width | tables | no |
| File explorer | Field walk | split | 2D widget (long-replay rule b: reader-driven, never autoplays, no step list) | no |
| File explorer | Tensor and file tables | full width | tables | no |
| Fit and speed | Calculator | split | 2D lab (controls, memory bar, numbers) | no |
| Fit and speed | Check against measured | full width | table | no |
| Further reading | | unchanged | | |

Kept 2D and why: the speed and quality scatters (many files, a log axis, a ceiling curve), the slots bars and line, the dtype bit strips, the byte maps, the type-mix bars, the load bars and the calculator all read best flat; the three 2D steppers draw a 32-weight plot, an opcode listing and token bars, which depth would not clarify. The 3D figures carry the spatial ideas: where the bytes sit (one pool against two memories), the stack as layers, and bytes against speed side by side. The pickle stepper's 13 key opcodes were grouped into 8 explained stretches (long-replay rule a). The File explorer's field walk is a widget (rule b).

Real image: one, the M1 package photo (memory beside the processor in one package), credited in `img/CREDITS.md`; the caption's claim is sourced to Apple's M1 announcement. No RTX 5090 board photo was added (the PC side's point is the separate memory and the link, which Fig. 4 draws).

### Length judgement
| | Before (2026-11-12, `audit_pages.mjs`) | After |
|---|---|---|
| Reading, core | 9,340 words, 40.6 min | 10,971 words, 47.7 min |
| Reading, closed details | 12,247 words, 53.2 min | 12,247 words, 53.2 min |
| File explorer, core | 3.6 min | 3.9 min |
| Fit and speed, core | 3.0 min | 3.0 min |
| Visuals in Reading (audit count) | 6 | 10 (4 of them 3D stages), plus the HTML charts and steppers, plus one photo |

Why about 48 minutes is right: the extra 7 minutes are the step lists of the four new figures (about 1,000 words) and the captions of the three 2D steppers, which were drawn by script before (not counted by the audit) and are now the static step lists on the left; the removed predict box in section 1 and the old stack table were folded into the lists. Nothing was added to the closed blocks. Each step list replaces a paragraph a reader would otherwise need beside the figure; the prose around them was not lengthened.

### Ledger
796 units: core 362, depth 395, fat 39 (problems 0). Eight units were added by hand for the new figures (`hand29` to `hand36`); five keys were updated where the rewording moved them (lo30, lo31, lo32, lo34 in section 1; mf271 in the File explorer). The root's ledger check stays at problems 0.
