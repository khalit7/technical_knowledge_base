Source of the interactive HTML on the Notion page "Topic: llm-training-and-post-training".

Build: `sh build.sh` writes `../index.html` from `parts/` (slot order in the comment at the top of build.sh).

Shape (agreed with Khalid 2026-10-03): stages compared on shared axes in the Reading tab; three data tabs (Open recipes compared, Price list of disclosed runs, Scaling calculator); Further reading. All 12 child pages kept; nothing folded in.

Part ownership (parallel build): `20_read*` and `39_tab_more*` the Reading tab and Further reading; `32_*` recipes; `33_*` price list; `34_*` scaling calculator. Each tab's CSS is scoped under its tab id and its element ids are prefixed (`rc-`, `pl-`, `sc-`). Data and scripts for each tab live in `data/` and in a subfolder named after the tab (`recipes/`, `price/`, `scale/`).
