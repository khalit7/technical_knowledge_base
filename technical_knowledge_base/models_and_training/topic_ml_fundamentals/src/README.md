Source of the interactive HTML on the Notion page "Topic: ml-fundamentals".

Build: `sh build.sh` writes `../index.html` from `parts/`.

Shape (agreed with Khalid 2026-10-03): the Reading tab follows one training step (data and init, forward, loss, backward, update, regularise, measure), each component at the moment it acts, then the four threads that cut across the bands. Tabs: Training lab (component swap, trained live), Defaults across models (what landmark models used), When training goes wrong (symptom to cause to fix; the child page "Debugging training" is folded in here and in the Reading tab), Further reading. Nine child pages stay.

Part ownership (parallel build): `20_read*` and `39_tab_more*` Reading and Further reading; `32_*` lab (ids `lb-`); `33_*` defaults (ids `df-`); `34_*` debugger (ids `dg-`). CSS scoped under each tab id. Data and scripts per tab in `data/` and a subfolder named after the tab.
