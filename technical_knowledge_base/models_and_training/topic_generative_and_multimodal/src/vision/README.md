# Vision lab (tab `t-vision`, prefix `vs`)

Parts: `src/parts/34_tab_vision_a.html` to `_c.html` (prose, CSS scoped under `#t-vision`), `34_js_vs_0data.js` (generated), `34_js_vs_1core.js` (helpers, animation controller), `34_js_vs_2patch.js` (patch animation), `34_js_vs_3sim.js` (similarity explorer, loss calculator, sigmoid scaling), `34_js_vs_4zs.js` (zero-shot, probes, typographic animation).

Everything was run on the CPU of an Apple M1 Pro (float32, 4 threads, `nice -n 15`), so the shared GPU bench lock was never taken. Run from this folder with the shared venv (see `../data/README.md`):

```sh
export GM_SCRATCH=<shared setup folder>
PY="nice -n 15 $GM_SCRATCH/venv/bin/python -I"
$PY make_probes.py                 # probe images: GM_SCRATCH/vision/probes/*.png, thumbnails in img/, probes.json
$PY embed_fmnist.py clip; $PY embed_fmnist.py siglip     # 15,000 Fashion-MNIST embeddings each (GM_SCRATCH/vision/)
$PY analyse.py clip; $PY analyse.py siglip               # out/analyse_*.json and text embeddings of the prompt sets
$PY zeroshot.py                    # out/zeroshot.json (accuracies, confusion, linear probes, query cosines)
$PY make_data.py                   # ../parts/34_js_vs_0data.js
python3 check_data.py              # the page embeds exactly out/*.json, and the prose numbers match
node check_vs.mjs <shots dir>      # every control at 390 dark and 920 light
```

`time_cpu.py` measured CPU speed before choosing CPU over MPS. Recorded outputs in `out/` are small and committed; the embedding arrays stay in `GM_SCRATCH/vision/`. Verified facts are in `facts.md`; visual ideas in `viz_ideas.md`.
