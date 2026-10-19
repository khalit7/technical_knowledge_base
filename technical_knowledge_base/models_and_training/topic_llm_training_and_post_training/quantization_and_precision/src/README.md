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

Overlap fix (19 October 2026): GGUF types are owned by "Local and on-device inference" (3c65c17b0d0d81f7a144fe25d799e811, sections 3 and 4, Quant ladder tab) and the container by "Model formats" (section 4); float formats and mixed-precision mechanics by "Numerical computing for ML" (3f05c17b0d0d81d6af0be4a9a2edba8d, sections 4 and 11). This page cut its GGUF grammar, block-layout widget, perplexity knee chart, GGUF table and imatrix subsection to one summary paragraph (`parts/26_js_rd_names.js` removed), its float rows to the scaled formats (FP8, E2M1, int8, int4, NF4, MX, NVFP4), and its mixed-precision list to a summary plus the bytes and FP8 training. Facts the owners lacked were moved there first: the Q4_K_S recipe and `_L` correction, the Hugging Face IQ4_NL error, the 2023 against current help-string perplexities and Kurt 2026, the imatrix calibration caveat (local page); the 80% accuracy loss without master weights, the SSD factor 8 and the 8 to 32K range (numerical page). `mk_coverage.py` probes moved facts in the owner's built page.
