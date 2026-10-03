Source of the interactive HTML on the Notion page "Sampling and Decoding" (child of Topic: llm-training-and-post-training).

Build: `sh build.sh` writes `../index.html` from `parts/` (slot order in the comment at the top of build.sh).

Data, in order:
1. `make_data.py [lab|degen|beam|json|all]` runs Qwen2.5-0.5B-Instruct and GPT-2 small offline (`OMP_NUM_THREADS=2 uv run --with torch --with transformers --with regex python make_data.py all`, about 25 minutes on CPU) and writes `inputs/*.json`.
2. `make_page_data.py` compacts them into `parts/22_js_data.js` (top 60 tokens exact, the rest binned; samples filtered for display).
3. `recompute.py` checks every number the page states; `--exact` re-runs the model for full-vocabulary counts. Output saved in `recompute_output.txt`.

Other inputs: text excerpts of the sources whose exact wording or defaults the page relies on (llama.cpp, vLLM, transformers, SGLang code; Anthropic and Azure docs; Holtzman Table 1; Codex temperatures; OpenAI's Structured Outputs post from the Wayback Machine) and the four public-domain passages.

Shape: a deep-dive child page built from the brief (no method file covers this kind of page): Reading with three before/after animations (greedy against beam, top-p against min-p, unconstrained against constrained), two data tabs (Sampler lab; Twelve decoders, real text), Further reading. Speculative decoding and best-of-n are linked rather than re-built because other pages own them. `live.md` is the old Notion text; `coverage.json` maps every fact in it to where the HTML carries it. Visualisation choices: `viz_ideas.md`.
