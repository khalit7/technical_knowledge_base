# VLM lab (tab `t-vlm`, prefix `vl`)

Parts: `src/parts/35_tab_vlm_a.html` to `_d.html` (prose, CSS scoped under `#t-vlm`), `35_js_vl_0data.js` (generated), `35_js_vl_1core.js` (helpers, step-animation controller, SmolVLM's token arithmetic), `35_js_vl_2pipe.js` (one image through the model, SmolVLM against LLaVA-1.5), `35_js_vl_3budget.js` (token-budget calculator, measured table), `35_js_vl_4eval.js` (prompt, question set, hallucination probe, descriptions, timing, parameters).

Model: `HuggingFaceTB/SmolVLM-500M-Instruct` at revision a7da5b986cb5, bfloat16, on MPS (Apple M1 Pro), greedy decoding, loaded through the root's `src/data/pretrained.py`. Token counting runs on the CPU with the processor only. Run from this folder with the shared venv (see `../data/README.md`):

```sh
export GM_SCRATCH=<shared setup folder>
PY="nice -n 15 $GM_SCRATCH/venv/bin/python -I"
$PY tokens.py                        # CPU: out/tokens.json (prompt string, 36 token counts)
# GPU, only under the shared bench lock (one process, about 10 minutes):
sh <lock.sh> acquire bench vl 3600 && { GM_LOCK=<lock.sh> $PY run_vlm.py; sh <lock.sh> release bench vl; }
                                     # out/trace.json, timing.json, qa_raw.json, pope_raw.json, captions_raw.json
python3 score.py                     # out/scores.json (pattern scoring of qa_set.json; yes/no parsing)
$PY make_data.py                     # ../parts/35_js_vl_0data.js
node check_calc.mjs                  # the page's token calculator against all 36 measured counts
python3 check_data.py                # the page embeds exactly out/*.json, and the prose numbers match
node check_vl.mjs <shots dir>        # every control at 390 dark and 920 light
```

`qa_set.json` holds the 30 questions (with accept and reject patterns) and the 72 yes/no object questions; `captions_marks.json` holds this page's by-eye judgement of wrong claims in the long descriptions. `VL_DEV=cpu` runs `run_vlm.py` as a dry run of the code path (writes `out/dry_*.json`, not used). Verified facts: `facts.md`; visual ideas: `viz_ideas.md`.
