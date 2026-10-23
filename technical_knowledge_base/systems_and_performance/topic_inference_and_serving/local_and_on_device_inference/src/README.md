# Local and on-device inference: sources, runs and how to rebuild

Child page of Topic: inference-and-serving. Built 2026-10-10; rebuilt 2026-10-23 to the teaching contract, absorbing the sibling Model formats (see the rebuild section below). Tabs: Reading (`t-read`, parts `20_read_a.html` to `20_read_n.html`), File explorer (`t-bytes`), Fit and speed (`t-fit`), Further reading (`t-more`). Ids and classes use the `lo-` prefix; parts absorbed from Model formats keep its `mf-` prefix. Storage key `lo-tab`.

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
- `check_ui.mjs <shots dir>`: puppeteer, 390 px dark and 920 px light, every control.
- `coverage.md`: the old page claim by claim. `viz_ideas.md`: visuals built and rejected.

Rebuild: `python3 -I gen_data.py && (cd formats && python3 -I gen_data.py) && sh build.sh && python3 -I check_data.py && (cd formats && python3 -I check_data.py) && node check_ui.mjs <scratch shots dir>`, then from the repo root `sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving/local_and_on_device_inference`.

## Speed measurements on a shared laptop
Other agents used the same GPU, and the load average does not see GPU use. Speed was therefore measured in up to three passes at different times (the ladder itself, `speedpass.sh` pass 2, pass 3); the page uses the fastest pass per file (another job can only slow a run) and shows every pass in the Quant ladder tab. Qwen3-4B's ladder pass and pass 2 overlapped another agent's job after the shared lock went stale during a long item (the lock was taken over after 45 minutes without a touch; later runs kept a background toucher), so Qwen3-4B speeds come only from pass 3; its quality numbers do not depend on timing. The reduced Qwen3-4B ladder (no IQ1/IQ2/IQ3_XXS files) is why: those quantizations took 30 to 50 minutes each under contention, and Qwen3-1.7B covers them.


## Build additions (2026-10-23)
- `bake_facts.py` (run by `build.sh`): writes every `<span data-lo>` and `<span data-mf>` number into the static HTML, so the prose numbers show without script and `html_utils/ledger.py` can find them. The script still fills them at load (same values).
- `formats/`: everything Model formats measured on 2026-10-11 (its `results/`, `scripts/`, `inputs/research_2026-10-11.md`, `coverage.md`, `viz_ideas.md`), with its `gen_data.py` (writes `parts/20_js_mf_data.js`, `window.MF`) and `check_data.py` (embedded MF equals a fresh build; prose numbers typed into the parts match `results/`). Its scripts, versions and models are as recorded in that page's README: PyTorch 2.14.1, transformers 5.19.0, safetensors 0.8.0, onnx 1.23.2, ONNX Runtime 1.31.0, gguf-py 0.19.0, llama.cpp b11146, mlx 0.32.3; Qwen3-0.6B @ c1899de2, the Unsloth Qwen3-0.6B BF16 GGUF @ 50968a44.
- JS parts from Model formats: `22_js_mf_read.js`, `23_js_mf_pickle.js`, `24_js_mf_charts.js`, `25_js_mf_conv.js` (was its Conversion map tab), `31_js_bytes.js` + `31_tab_bytes.html` (File explorer). `25_js_lo_ladder.js` is the old Quant ladder tab's code, now drawing inline. `26_js_lo_hero.js` is the hero. `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (no autoplay; mode switches no longer start an animation).
- `check_ui.mjs`: every control in every tab at 390 dark and 920 light, plus a no-autoplay check (every scrubber still at step 0 after each animation has been on screen).

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
