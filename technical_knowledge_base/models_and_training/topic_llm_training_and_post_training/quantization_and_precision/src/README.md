Source of the interactive HTML on the Notion page "Quantization and Precision" (deep-dive child of Topic: llm-training-and-post-training).

Build: `sh build.sh` writes `../index.html` from `parts/` (same build script as the parent page: 01_head, 10_header, 20_read*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last).

Data pipeline (needs `uv`; downloads Qwen2.5-0.5B, about 1 GB, into the Hugging Face cache):
- `uv run --with torch --with transformers --with numpy python probe_layers.py` (layer survey, used once to choose the layer)
- `uv run --with torch --with transformers --with numpy python quant_lab.py model.layers.8.self_attn.q_proj` (whole-layer results)
- `uv run --with torch --with transformers --with numpy python export_data.py` (writes parts/21_js_qdata.js)
- `uv run --with numpy python check_ref.py && node check_js.mjs` (JS quantisers against qformats.py)
- `python3 recompute.py > recompute.txt` (every derived number)
- `node check_page.mjs` (exercises every control, screenshots into ../.shots/)
- `python3 mk_coverage.py` (coverage.json against live.md; fails loudly on a missing probe)

Shape: a deep dive, built from the brief (no method file covers deep-dive child pages). Reading follows the old page's order but puts Mixed precision right after Formats (it uses them) and adds a short At a glance table first; two tabs hold what spans every format (Bit explorer) or every scheme (One real layer). The memory calculator stays on the parent page and is linked.

`live.md` is the old Notion text, verbatim. No child pages, databases or video on the Notion page.
