# Beyond attention: page source

`sh build.sh` writes `../index.html` (Notion page 3fd5c17b0d0d8142bc9ecac1fc366966, a child of Topic: llm-architecture).
The build is the attention_variants child's: it includes the root's `src/parts/33_js_cc_1core.js` (window.CC, the
Config calculator core) unchanged before this page's scripts.

## Tabs (since the 2026-10-23 rebuild)
| Tab | id | Parts | What |
|---|---|---|---|
| Reading | t-read | 20_read_a..j, 20_read_z; JS 21_js_rd_common (skill template), 22_js_rd_0data (generated), 22_js_rd_1fill, 23_js_rd_write, 24_js_rd_ssm, 25_js_rd_figs, plus the moved lab scripts 31_js_mm_2ui (race), 32_js_rc_1ui, 33_js_si_1ui | sections 0 to 10 core, section 11 and per-section closed blocks depth |
| State vs KV cache | t-mem | 31_tab_mem_a.html, 31_js_mm_* | calculator, all-model chart, tiny GPT presets (a tool used across the page) |
| Further reading | t-more | 39_tab_more.html | |
Shared helpers: `30_js_ba_core.js` (window.BA; its controller never autoplays). Storage key `ba-tab`. The old parts are kept in `retired/parts/` for provenance.

## Data and scripts (outputs in each folder's `out/`, all small)
- `runs/collect.py`: copies the training runs (ba_ssm, ba_ssm_s1, ba_hybrid, ba_hybrid2 trained here with the root's train.py; at_mha, at_mha_s1 from the Attention lab; pe_nope from the Positional child) into `runs/out/runs.json`.
- `state/state_rules.py`: the write-rule toy (Python reference of 23_js_rd_write.js).
- `mem/statecalc.py`: KV vs state for 15 configs (root calc.py + KDA and Qwen3.5 additions).
- `recall/mqar.py`, `recall/tiny_recall.py`, `recall/pretrained_copy.py`: the three recall probes.
- `inside/ssm_inside.py`: half-lives, hidden attention maps, dual-vs-recurrent check on ba_ssm.
- `code/quotes.py` (source lines located by pattern), `code/demos.py` (linear attention two ways; decay-mask precision), `code/make_code_part.py` (writes 20_read_j.html, the closed code block).
- `make_page_data.py` writes `parts/22_js_rd_0data.js`. `scripts/run_pending.sh` reruns everything.
- `inputs/research_quotes.md`: verbatim quotes and table rows of every published source used, with URLs, read 2026-10-19.

## Checks
From the repo root: `sh html_utils/checkpage.sh <this folder>`; `node <src>/check_controls.mjs`; `node <src>/check_data.mjs`
(BAD equals recorded outputs; MM.cache equals statecalc.py at 6 contexts for 15 models; BA_WR equals state_rules.py; every static
prose number, table cell and summary against the recorded outputs: 428 checks); `python3 html_utils/ledger.py check <this folder>`;
reading time with `node html_utils/audit_pages.mjs` (230 words a minute; `src/reading_time.mjs` is the older 200-a-minute script).
`check_controls.mjs` also scrolls every animation into view at normal motion and fails if one starts by itself.

## The 2026-10-23 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing only, no new runs.
- **Top**: the core idea in one sentence, a hero grid (every design as one cell of "how the state forgets" by "how it writes", with the layers that ship in 2026 outlined), "You need" (Attention variants for the attention layers, Long context for whole-model cache sizing), new terms. The old comparison table is a closed reference block; the "what this page measured" box and the one-sentence answer were restatements (their numbers live in sections 7 to 10).
- **Every core mechanism has its visual inline**: section 1 the attention-against-recurrent stepper (moved here from the root, which retired it on 2026-10-23 and names this page as its owner); section 2 a new static figure of linear attention's two forms; section 3 the five write rules (unchanged); section 4 the trained SSM's per-token decay (selection) and its hidden attention maps beside real ones (moved from the retired Inside tab), half-lives in a closed block; section 6 a new static figure, one forget rate per head against one per key channel; section 7 the attention-against-hybrid race (moved from the State vs KV cache tab); section 8 the Pythia-160M against Mamba-130M curves (moved from the retired Recall probes tab), with name recall and MQAR in a closed block; section 9 the running-sequence token strip (moved); section 10 a new static rollback figure (KV cache against state snapshots).
- **Tabs**: Recall probes and Inside the trained SSM each explained one mechanism, so their visuals moved into Reading; State vs KV cache stays as a tool used across the page.
- **No script-written knowledge**: the hybrid table, runs table, copy and phone-book numbers, name recall, MQAR, half-lives and the tiny presets table are static HTML (the root links here for the SSM and hybrid losses and the Mamba-130M copy numbers). `data-v` spans keep their key; `22_js_rd_1fill.js` now only marks a static number that disagrees with the data, and `check_data.mjs` fails on it.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; `BA.anim` lost its play-on-scroll line.
- **Depth closed**: S4 discretisation and the Path-X correction, Mamba kernel detail, SSD against FlashAttention-2, Mamba-3, RWKV scale, Gated DeltaNet's tables, Kimi's claims, NVIDIA/IBM/TII ratios and the unused RoPE, the full ratio quotes, MQAR/BASED quotes, vendor speedups, SSM costs and curves, four mistakes, five design questions, the code.
- **Deleted as fat**: headings, the old intro, pointers to retired tabs, three mistakes and four interview answers that restated sections.
- **Fixed a break caused upstream**: the root's Config calculator began refusing Nemotron 3 configs on 2026-10-19 (it cannot count latent-MoE parameters), which made this page's all-model chart throw. `MM.ext` and `statecalc.py`'s `cache_ext` now size Nemotron 3 Super's cache and state from its layer pattern; they equal the recorded `statecalc.json` at every context.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 34.7 min | 29.5 min |
| Reading, closed details | 4.6 min | 17.1 min |
| Other tabs, core | State vs KV 2.3 + Recall 4.2 + Inside 2.3 = 8.8 min | State vs KV 1.7 min |
| Core total, excluding Further reading | 43.5 min | 31.2 min |
| Visuals drawn in Reading | 3 | 16 |

Why about 30 minutes is right: the page teaches seven mechanisms (recurrence against attention, linear attention, decay and the delta rule, S4 to Mamba-2 with its duality, RWKV, Gated DeltaNet and KDA, hybrids) plus the recall limit and serving, each with its picture and numbers, and now carries the two lab tabs' evidence in the flow. About 1,100 of the counted core words are not prose: the 256-token running-sequence strip, SVG labels, animation counters and select options. What made the old page long beyond that (provenance, per-model detail, code, mistakes, interview answers) is closed and optional.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
363 units: core 242, depth 96, fat 25, owned 0, volatile 0. 337 drafted by `ledger.py init` from the page before the rebuild (keys found by script, numbers and quotes first, then a phrase of four or more words, and the residue by hand); 26 added by hand for formerly script-rendered tables and summaries and for the stepper moved from the root (including the root's owned unit "and each new token reads all of it"). Fat units carry a `note`.

## Departures from the topic-child shape
The hero is an HTML grid rather than an SVG, so its cells wrap at phone width. The Mamba-1 material lives on the Mamba paper page and is linked, not repeated.
