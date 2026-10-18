# Reading tab: lab numbers still to fill (numbered as on the page)

Each TODO is a `<span data-rd="KEY" class="rd-todo">` on the page. Fill it by adding `"KEY": "<html>"` to `lab_values.json`, then `python3 make_read_data.py`, `sh ../build.sh`, and add a check of the value against the lab's recorded file to `check_data.py`.

1. `example` (setup, src/data/README.md): the tiny GPT: corpus and licence, tokenizer, d_model, layers, heads, context, parameters; the 256-token running sequence.
2. `example_open` (setup): SmolLM2-135M licence and revision.
3. `tiny_shapes` (setup or Block lab): the tiny GPT's column of the section 2 table (d_model, heads, FFN width, parameters per block).
4. `attn_variants` (Attention lab): held-out loss and KV bytes per token for mha, gqa2, mqa, mla, sliding window; decode-step time against context on MPS (what transfers: the ratio, not the times).
5. `sink` (Inside lab): attention mass on the first token by layer in SmolLM2-135M, and the effect of removing it.
6. `moe_rec` (whoever trains moe8top2, if anyone): recorded router probabilities on 8 tokens of the running sequence. If recorded, also set `moe_route` to `{"tokens":[...8], "probs":[[8 floats] x 8]}` and the animation uses them; then remove the "illustrative" label in 20_read_e.html.
7. `prepost` (Block lab): residual norm by layer, pre- against post-norm; the learning rate at which post-norm diverges, loss and gradient-norm numbers.
8. `massive` (Inside lab): largest residual dimension against the median, by layer.
9. `cfg_check` (setup configs): recheck every config value quoted on the page against src/data/configs/ (derive.py CFG; check_configs() lists the files). Llama 3.1 8B, Gemma 3 27B, Qwen3-0.6B and Qwen3-Next fields were read live on 2026-10-18; Llama 3.1 70B/405B, DeepSeek-V3, gpt-oss-120b, SmolLM2-135M values are from the moved Gallery page and memory, unchecked here.
10. `calc_resid` (Config calculator): parameter-count residuals against published sizes, largest explained.
11. `mis_rope` (any lab): a real bad output past the trained length, if recorded.
12. `mis_lab` (all labs): real error messages and bad outputs, verbatim and scrubbed.
13. `kid_times`, `kid_times_more` (lead): child reading times. Also `t_block`, `t_attn`, `t_calc`, `t_inside`, `t_map` in Further reading: each tab's reading time.

After filling: rerun `node check_read.mjs <shots dir>` (reading time; update `#rd-time`, `#rd-time-qa`, `#rd-more-time`), `python3 check_data.py`, and the checkpage.
