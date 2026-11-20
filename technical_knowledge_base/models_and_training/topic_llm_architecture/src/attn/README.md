# Attention lab (tab `t-attn`, prefix `at`)

The root's Attention lab: what each token must store and why that is the whole story of attention variants. Built 2026-10-18 by the attention-lab agent.

**Removed from the page on 2026-10-23** (see `../README.md`): Attention variants and Long context carry every unit. Its parts (`parts/32_tab_attn_*.html`, `parts/32_js_at_*.js`) were deleted the same day (commit bc10a299b; in git history); the scripts and `out/` stay here for provenance (Attention variants' `make_stage_data.py` reads `out/`). `make_page_data.py` would still write `parts/32_js_at_0data.js`, which no build reads.

## Scripts and recorded outputs
| Script | Runs on | Writes |
|---|---|---|
| `run_train.sh` | MPS, under the bench lock, one run per hold (set `KB_SCRATCH`) | `$LA_SCRATCH/runs/at_*` (checkpoints stay in scratch) |
| `make_page_data.py` | CPU | `out/runs_summary.json` (from the runs, when `LA_SCRATCH` is set) and `parts/32_js_at_0data.js` |
| `decode_bench.py` | MPS, about 2 minutes | `out/decode_bench.json` |
| `cpu_evals.py` | CPU, a few minutes | `out/cpu_evals.json` (sliding-cache serving, first-token mass, the repeat bug) |
| `sdpa_errors.py` | CPU, a second | `out/sdpa_errors.json` |
| `extract_code.py` | CPU | `inputs/code_snippets.json` (quotes located by pattern; transformers v5.20.1 clone in scratch) |
| `real_numbers.mjs` | node | `out/real_numbers.json` (real-model KV numbers with the calculator's own code) |
| `check_data.py` | CPU | checks the built page against `out/` and the prose numbers |
| `check_controls.mjs` | puppeteer | clicks every control at 390 px dark and 920 px light |

`inputs/published.json` holds every published table the tab shows, with URL and read date. Everything the page needs to rebuild is in this folder; only checkpoints and the transformers clone live in scratch.

## Departures from the brief, and why
- **All trained variants use RoPE.** The setup's baseline uses learned positions and its MLA preset uses RoPE, so comparing them would mix two changes. The MHA run here is the `rope` preset.
- **Decode timing at a real layer shape, not the tiny GPT.** At 6M parameters the decode step is dominated by kernel launches and Python, so the cache size barely shows (kept as a small table to make that point). The memory-bandwidth argument is tested on one attention layer at Llama 3.1 8B's shape.
- **Sparse attention is described, not run**: NSA and DSA need CUDA kernels and long contexts.
- **Sinks**: measured only as far as the cache needs them (serving with a sliding cache); the Inside tab owns sinks in a real model.
