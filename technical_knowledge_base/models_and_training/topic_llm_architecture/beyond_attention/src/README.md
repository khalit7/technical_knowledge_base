# Beyond attention: page source

`sh build.sh` writes `../index.html` (Notion page 3fd5c17b0d0d8142bc9ecac1fc366966, a child of Topic: llm-architecture).
The build is the attention_variants child's: it includes the root's `src/parts/33_js_cc_1core.js` (window.CC, the
Config calculator core) unchanged before this page's scripts.

## Tabs
| Tab | id | Parts | What |
|---|---|---|---|
| Reading | t-read | 20_read_a..j, 22_js_rd_0data (generated), 22_js_rd_1fill, 23_js_rd_write | 14 sections from recurrence vs attention to interview questions; the write-rule animation; prose numbers filled from data (`data-v`) |
| State vs KV cache | t-mem | 31_* | race animation, calculator, all-model chart, tiny GPT table (window.MM over window.CC) |
| Recall probes | t-recall | 32_* | running-sequence token strip, Pythia vs Mamba, tiny GPT name recall, MQAR |
| Inside the trained SSM | t-inside | 33_* | half-lives, hidden attention maps vs attention maps, decay per token |
| Further reading | t-more | 39_tab_more.html | |
Shared lab helpers: `30_js_ba_core.js` (window.BA). Storage key `ba-tab`.

## Data and scripts (outputs in each folder's `out/`, all small)
- `runs/collect.py`: copies the training runs (ba_ssm, ba_ssm_s1, ba_hybrid, ba_hybrid2 trained here with the root's train.py; at_mha, at_mha_s1 from the Attention lab; pe_nope from the Positional child) into `runs/out/runs.json`.
- `state/state_rules.py`: the write-rule toy (Python reference of 23_js_rd_write.js).
- `mem/statecalc.py`: KV vs state for 15 configs (root calc.py + KDA and Qwen3.5 additions).
- `recall/mqar.py`, `recall/tiny_recall.py`, `recall/pretrained_copy.py`: the three recall probes.
- `inside/ssm_inside.py`: half-lives, hidden attention maps, dual-vs-recurrent check on ba_ssm.
- `code/quotes.py` (source lines located by pattern), `code/demos.py` (linear attention two ways; decay-mask precision), `code/make_code_part.py` (writes 20_read_i.html).
- `make_page_data.py` writes `parts/22_js_rd_0data.js`. `scripts/run_pending.sh` reruns everything.
- `inputs/research_quotes.md`: verbatim quotes and table rows of every published source used, with URLs, read 2026-10-19.

## Checks
From the repo root: `sh html_utils/checkpage.sh <this folder>`; `node <src>/check_controls.mjs`; `node <src>/check_data.mjs`
(BAD equals recorded outputs; MM.cache equals statecalc.py at 6 contexts for 15 models; BA_WR equals state_rules.py; prose numbers);
`node <src>/reading_time.mjs`.

## Departures from the topic-child shape
None of substance. The page has three labs because the subject has three questions (memory, recall, what the layer
does inside); the Mamba-1 material lives on the Mamba paper page and is linked, not repeated.
