# Local and on-device inference: sources, runs and how to rebuild

Child page of Topic: inference-and-serving. Built 2026-10-10. Tabs: Reading (`t-read`, parts `20_read_a.html` to `20_read_m.html`), Quant ladder (`t-quant`), Fit and speed (`t-fit`), llama-server lab (`t-srv`), Further reading (`t-more`). Ids and classes use the `lo-` prefix.

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

Rebuild: `python3 -I gen_data.py && sh build.sh && python3 -I check_data.py && node check_ui.mjs /tmp/shots`, then from the repo root `sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_inference_and_serving/local_and_on_device_inference`.

## Speed measurements on a shared laptop
Other agents used the same GPU, and the load average does not see GPU use. Speed was therefore measured in up to three passes at different times (the ladder itself, `speedpass.sh` pass 2, pass 3); the page uses the fastest pass per file (another job can only slow a run) and shows every pass in the Quant ladder tab. Qwen3-4B's ladder pass and pass 2 overlapped another agent's job after the shared lock went stale during a long item (the lock was taken over after 45 minutes without a touch; later runs kept a background toucher), so Qwen3-4B speeds come only from pass 3; its quality numbers do not depend on timing. The reduced Qwen3-4B ladder (no IQ1/IQ2/IQ3_XXS files) is why: those quantizations took 30 to 50 minutes each under contention, and Qwen3-1.7B covers them.

## Departures from the method
Reading is long (about 45 minutes) because the reader asked to be taught from zero and the page owns three measured subjects (quantization, llama-server, the wrappers). The dual RTX 5090 recommendation is reasoned from sources, not run.
