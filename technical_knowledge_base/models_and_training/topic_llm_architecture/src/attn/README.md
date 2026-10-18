# Attention lab (tab `t-attn`, prefix `at`)

The root's Attention lab: what each token must store and why that is the whole story of attention variants. Built 2026-10-18 by the attention-lab agent.

## Parts
| Part | What |
|---|---|
| `parts/32_tab_attn_a.html` | opens the tab, scoped CSS, lead, section 1 (why a cache) |
| `parts/32_tab_attn_b.html` | section 2: the before/after cache animation |
| `parts/32_tab_attn_c.html` | sections 3 to 5: trained variants, published ablations, decode speed |
| `parts/32_tab_attn_d.html` | sections 6 and 7: windows and sinks, sparse attention |
| `parts/32_tab_attn_e.html` | section 8: KV-cache sizing calculator and every model's attention |
| `parts/32_tab_attn_f.html` | sections 9 and 10: drills, mistakes, interview questions, code; closes the tab |
| `parts/32_js_at_0data.js` | `window.ATD`, written by `make_page_data.py` (never by hand) |
| `parts/32_js_at_1core.js` | `window.AT` helpers and a copy of the step controller registered on `t-attn` |
| `parts/32_js_at_2anim.js` | section 2 animation |
| `parts/32_js_at_3runs.js` | sections 3 to 6 charts and tables |
| `parts/32_js_at_4text.js` | prose that quotes recorded numbers, drills, mistakes, interview answers |
| `parts/32_js_at_5kv.js` | section 8; starts on DOMContentLoaded because it uses `window.CC` and `window.CCD` from the Config calculator's parts, which load after it |
| `parts/32_js_at_6code.js` | section 10 code quotes |

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
