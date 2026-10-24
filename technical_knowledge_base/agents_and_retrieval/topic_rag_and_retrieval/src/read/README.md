# Reading and Further reading tabs (`t-read`, `t-more`) of Topic: rag-and-retrieval

Rebuilt on 2026-10-24 as a map (see `../README.md` for the method and the length judgement).

Parts: `../parts/20_read.html` (opens the tab, scoped CSS, section nav), `20_read_a.html` (the idea in one screen: core sentence, hero, you need, new terms, the running example), `20_read_b.html` (1 why retrieve, 2 four ways to score a passage), `20_read_c.html` (3 the stages, 4 where an answer gets lost and the two recalls), `20_read_d.html` (5 who decides what to read, 6 after launch, 7 tools), `20_read_e.html` (8 child cards with each child's header time), `20_read_z.html` (closes the tab); JS `21_js_rd_common.js` (the explainer-page skill template: nothing moves on its own) and `22_js_rd_hero.js` (the hero, a static SVG drawn at the measured width, each stage a link to its owner); `39_tab_more.html` (Further reading). Every number on the tab is static HTML, so `html_utils/ledger.py check` sees it.

Every measured number comes from the topic's shared runs (`../pipe/out`, `../vec/out`, `../agent/out`) or a child page, and was already on the page before the rebuild (the ledger, `../ledger.json`, records where each now lives).

## Check
```sh
node <page>/src/read/check_tab.mjs <page>/index.html <screenshot folder>   # from the repository root
sh html_utils/checkpage.sh <page>
python3 html_utils/ledger.py check <page>
```

## Notes
- `old/`: the old root and its four old children, saved verbatim from read-only Notion fetches on 2026-10-14. `coverage.md`: the claims of the old root with a verdict (written for the 2026-10-14 page).
- The 2026-10-14 Reading tab (taught from zero, about 46 minutes), its data script `make_data.py` and its checks are in `../retired/`.
- `viz_ideas.md`: visuals built and rejected for the old tab.
