# src/read: the Reading and Further reading tabs

Parts: `parts/20_read.html` (tab opener, CSS, section nav), `20_read_a.html` to `20_read_i.html` (sections 0 to 13, mistakes, interview questions, child pages), `20_read_z.html` (closes the tab), `22_js_rd_data.js` (generated), `23_js_rd_drills.js` (predict-then-reveal, table cards, lab values), `24_js_rd_moe.js` (section 6 animation), `25_js_rd_ssm.js` (section 10 animation and chart), `39_tab_more.html` (Further reading). `21_js_rd_common.js` is the lead's shared helper.

Files here:
- `derive.py`: every derived number quoted in prose (KV bytes, parameters, FLOPs, the design answer), from config values with sources; writes `derived.json`.
- `lab_values.json` and `make_read_data.py`: lab numbers as HTML per `data-rd` key, written into `parts/22_js_rd_data.js`.
- `check_data.py`: the built page embeds exactly `lab_values.json`, and every derived number in prose matches `derived.json` (36 derived checks on 2026-10-18; 128 with the lab and child numbers on 2026-10-19).
- `check_read.mjs`: clicks every control at 390 px dark and 920 px light, steps both animations through every step in both modes, checks errors, NaN, sideways scroll, reduced motion, and measures the reading time. `node check_read.mjs <shots dir>`.
- `todo.md`: lab numbers still to fill. `facts.md`: facts verified. `viz_ideas.md`: visuals built and rejected.

Shape: `page-kinds/topic-root.md`, organised as the brief's spine (one token through one block, then each component's alternatives and costs) rather than by an axis grid; section 0's table gives the axes up front. Old pages (Positional Encodings, Tokenizers, the Architecture Gallery, the llms root's MoE tab) were read only to align: the Gallery's attention ladder animation and KV calculator are not rebuilt here (the Attention lab and the gallery child own them). 2026 models are quoted only where the root's own configs back them (src/map/inputs/configs, read 2026-10-18): Gemma 4 31B, GLM-5, DeepSeek-V3.2's indexer cache, DeepSeek-V4-Pro (design only; its compressed caches are not computed), Kimi K3, Nemotron 3 Super and Qwen3.5 (sections 4, 7 and 10), with sizes from their cards labelled vendor. Models the Gallery lists without a config here are not quoted.

Reading time on 2026-10-19 (check_read.mjs, words outside widgets at 200 a minute), after the root fix pass filled every lab number and added the measured paragraphs from the children: 38.5 min main (7,700 words), 7.2 min folded (1,434 words); the page says about 39 plus 7.
