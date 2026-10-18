# Config calculator tab (`t-calc`, prefix `cc`)

From any `config.json` to total and active parameters by component, forward FLOPs per token (prefill and decode at a
context), KV cache and recurrent state, weight memory by dtype and a decode arithmetic-intensity hint. No training, no GPU.

## Files
- `calc.py`: the Python reference (standard library only). `parts/33_js_cc_1core.js` is a line-by-line port.
- `validate.py`: reconciles calc.py with the Hugging Face Hub's stored-tensor counts (`inputs/hf_param_counts.json`,
  read 2026-10-18 with `fetch_api.py`). Every residual must be explained (MTP layers, vision towers computed from
  `vision_config`, buffers, FP8 scale tensors, a duplicated tied head); exits 1 otherwise. Result: 44 of 44 exact.
- `dump_results.py` + `check_js_equals_py.mjs`: JS equals Python on all 45 configs at 5 contexts (2,745 numbers).
- `make_page_data.py`: writes `parts/33_js_cc_0data.js` (pruned configs, manifest headline counts, Hub counts,
  validation, which accounting reproduces each published headline: rounded or truncated).
- `make_code_part.py`: writes `parts/33_tab_calc_d.html` (quoted code and recorded outputs; closes the tab div).
- `check_controls.mjs`: puppeteer, every control at 390 dark / 920 light, plus reduced motion.
- `check_page_data.py`: page data equals recorded data; 19 prose numbers checked against calc.py.
- `st_header.py`: reads a remote safetensors header with two range requests (used to confirm Kimi K2's BF16
  `inv_freq` [56] per layer, FP8 scale tensors in DeepSeek-V3.2 and Kimi K2, and gpt-oss MXFP4 shapes).

## Rebuild
```sh
cd src/calc
python3 validate.py > out/validate_stdout.txt
python3 dump_results.py && node check_js_equals_py.mjs > out/js_check_stdout.txt
python3 make_page_data.py && python3 make_code_part.py
sh ../build.sh && python3 check_page_data.py
# from the repo root:
node technical_knowledge_base/models_and_training/topic_llm_architecture/src/calc/check_controls.mjs technical_knowledge_base/models_and_training/topic_llm_architecture/index.html
```

## Conventions and approximations (stated on the page)
- Parameters as transformers builds them; buffers excluded; MTP and vision reported apart.
- Active = routed experts scaled by k/E; three accountings shown (all, without input embedding, without embedding and head).
- FLOPs: 2 x matmul weights touched (LM head in, embedding lookup out) + 2 x n_h x (qk dim + v dim) per cached position.
  MLA decode in the absorbed form (DeepSeek-V3 inference/model.py, commit 9b4e978, line 17, lines 486 to 487); prefill
  in the expanded form. DSA (V3.2) caps main attention at index_topk and adds the indexer term.
- Sliding and chunked layers cap at their window (Llama 4 chunked attention treated as a window of 8192).
- Recurrent mixers (Mamba, Mamba-2, Gated DeltaNet) counted in step form, state in FP32: approximate.
- MoE bytes read at batch B assume uniform routing (illustrative).

## Departures from the brief
None of substance. The "dense vs MoE at equal active parameters" comparison builds a dense twin from the chosen model
(or an 8-expert top-2 MoE from a dense one) rather than pairing two different released models, so only the FFN changes.
