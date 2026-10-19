Source of the interactive HTML on the Notion page "Sampling and Decoding" (child of Topic: inference-and-serving; it was a child of Topic: llm-training-and-post-training until it moved on 2026-10-19).

Build: `sh build.sh` writes `../index.html` from `parts/` (slot order in the comment at the top of build.sh).

Data, in order:
1. `make_data.py [lab|degen|beam|json|all]` runs Qwen2.5-0.5B-Instruct and GPT-2 small offline (`OMP_NUM_THREADS=2 uv run --with torch --with transformers --with regex python make_data.py all`, about 25 minutes on CPU) and writes `inputs/*.json`.
2. `make_page_data.py` compacts them into `parts/22_js_data.js` (top 60 tokens exact, the rest binned; samples filtered for display).
3. `recompute.py` checks every number the page states; `--exact` re-runs the model for full-vocabulary counts. Output saved in `recompute_output.txt`.

Other inputs: text excerpts of the sources whose exact wording or defaults the page relies on (llama.cpp, vLLM, transformers, SGLang code; Anthropic and Azure docs; Holtzman Table 1; Codex temperatures; OpenAI's Structured Outputs post from the Wayback Machine) and the four public-domain passages.

Shape: a deep-dive child page built from the brief (no method file covers this kind of page): Reading with three before/after animations (greedy against beam, top-p against min-p, unconstrained against constrained), two data tabs (Sampler lab; Twelve decoders, real text), Further reading. Speculative decoding and best-of-n are linked rather than re-built because other pages own them. `live.md` is the old Notion text; `coverage.json` maps every fact in it to where the HTML carries it. Visualisation choices: `viz_ideas.md`.

Moved 2026-10-19 from Topic: llm-training-and-post-training to Topic: inference-and-serving (same Notion id; folder now `systems_and_performance/topic_inference_and_serving/sampling_and_decoding`). Only the wording that says where the page lives changed: the header's "Part of", the Reading's "Where this sits" note, the speculative-decoding bullet (now links the Speculative decoding sibling), two sibling links in the Reading (Batching, KV cache and scheduling; vLLM) and Further reading (parent card, three sibling cards, the training root kept as where sampling feeds training, the source path). The teaching content and data are unchanged.
