Source of the interactive HTML on the Notion page "Value-based deep RL: from DQN to Rainbow" (child of Topic: rl).

Build: `sh build.sh` writes `../index.html` (part order in the comment at the top of build.sh; the reading time replaces RT_MIN).
Checks (from `src/`): `python3 checks/recompute.py && node checks/check_engine.mjs` (independent Python reference against the page's engine `parts/21_js_vb_engine.js`: 11,338 values, 0 mismatches; `recompute.py` rewrites `expected.json`, whose last digits can move with the numpy version); from the page folder `node src/checks/check_page.mjs [light|dark] [width]` drives every control in headless Chrome, screenshots each visual into `../.shots/`, and fails on sideways scroll or any animation that moves before the reader acts; `sh html_utils/checkpage.sh <page folder>`; `python3 html_utils/ledger.py check <page>`.

## The 2026-10-24 rebuild (teaching contract)
Parts now: `01_head`, `02_css` (adds `.core`, `.terms`, `details.dp`), `10_header`, `20_read_a` (top, §1, §2), `20_read_b` (§3 DQN, §4 Double DQN), `20_read_c` (§5 to §9), `20_read_d` (§10 to §13 and the closed misconceptions), `39_tab_more`; JS `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `rlvbdeep-tab`; nothing moves before the reader acts; mode toggles no longer start playback), `22_js_rd_helpers.js` (this page's number helpers and the spine-table jump), `23b_js_bars.js`, `24_js_sd.js`, `25_js_tn.js`, `26_js_ov.js`, `26b_js_du.js`, `27_js_pr.js`, `27b_js_ns.js`, `28_js_c5.js`, `28b_js_nz.js`, `29_js_hero.js`, `30_js_f4data.js`, `31_js_ev.js`, `32_js_abl.js`. Removed: `32_tab_abl.html` (the ablation tab), `23_js_chart.js` (unused), `24_js_tr.js` (the triad widget), the old `22_js_rd_common.js`.

What changed and why:
- **Top**: the core idea in one sentence; a hero (DQN's loop as a static annotated diagram with a blue tag where each fix acts); "You need"; six new terms; the method table kept as the one-screen comparison.
- **Ownership**: the deadly triad mechanism (the w, 2w pair and Baird's counterexample, with their widget) moved to Model-free prediction and control, Reading section 7, at the lead's request; §2 keeps one paragraph and a link, plus DQN's side (soft divergence on Atari, gradient-TD in a closed block). Its maximisation-bias link now points to that page's Reading section 5.
- **Visuals inline**: the Rainbow ablation tab moved into §10 (summary, table, one game, the predict; every game per component closed). New: hero, dueling toggle (§5), n-step corridor slider (§7), NoisyNet factorised against independent noise (§9). Every core mechanism now has a picture beside it.
- **Concrete first**: DQN's section opens with the 4.465 worked update, Double DQN continues it (3.97), dueling uses V = 5, A = (1, −1, 3) in the figure.
- **Depth closed**: approximator kinds, Baird's construction, FQI step by step and the Tsitsiklis and Van Roy counterexample, DQN 2013 against 2015, input processing and the hyperparameter table, Theorem 1 and per-game effects, score tables, IQN's embedding, NoisyNet initialisation and resampling, Rainbow's adaptations and hyperparameters, Ape-X/R2D2/Agent57 detail, the full protocol table and the Nature evaluation, CleanRL defaults, misconceptions (only those that add something).
- **Deleted as fat**: wind-ups, old headings, widget instructions the captions now carry, the old nav and tab bar, the "On this page" card, the mistakes that restated sections (2013 vs 2015, off-policy vs offline and replay are now said in §3 and §13).
- **Images**: none; see `viz_ideas.md`.

Length judgement (`html_utils/audit_pages.mjs`, rendered DOM, 230 words a minute):
| | Before (2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading core | 10,179 words, 44 min | 6,662 words, 29 min |
| Reading closed details | 372 words, 2 min | 3,625 words, 16 min |
| Other tabs | ablation 704 (3 min), Further reading 781 (3 min) | Further reading 778 (3 min) |
| Visuals drawn inline (svg at least 120 × 80) | 7 | 12 (plus 5 bar charts drawn as HTML) |

Why 29 minutes is right: the page teaches ten methods (DQN's two stabilisers, six Rainbow components, the distributed agents) and the evaluation protocols, each with its picture, formula and headline evidence; about a seventh of the core words are captions of the visuals. Everything that is provenance, per-game or per-table detail is closed. Going shorter would drop the evidence lines (the median each fix bought), which are what distinguish the methods.

Knowledge ledger (`ledger.json`, `ledger.py check`: problems 0): 351 units, core 225, depth 102, owned 10 (Model-free prediction and control: the w, 2w narration and Baird's construction), fat 14. 347 drafted by `ledger.py init` from the old page; 4 added by hand for script-rendered data (Extended Data Table 3, the nine medians, the ablation summary, the 330 decoded bars). Keys were chosen as the longest word window shared with the new page and checked by hand where short.

Old text: this Notion page was new (a placeholder). Its content comes from the old page "Deep RL: from DQN to PPO to MuZero" (Notion 3c65c17b0d0d8180b808c8c0cf8ddbe6), split three ways with Policy gradients and actor-critic and Model-based RL and planning. `live_deep_rl.md` is that page fetched verbatim on 2026-10-04; `inputs/old_embed_deep_rl.html` is its old embed. `coverage_deep_rl.json` (by `checks/mk_coverage.py`, 2026-10-04) lists every fact with its owner; it describes the pre-rebuild structure (section numbers changed on 2026-10-24).

Data: `inputs/rainbow_fig4_decoded.json` (330 bar heights decoded from the vector rectangles of Rainbow's Figure 4 by `checks/decode_rainbow_fig4.py`, PDF in scratch only; the highlighted bar equals the decoded maximum in all 55 games); Nature DQN Extended Data Tables 1, 3, 4 transcribed from the PDF's images (labelled on the page). R2D2's paper was read from a Wayback Machine capture of the OpenReview PDF.

Findings worth knowing: van Hasselt et al. 2015 Figure 2's printed average errors reproduce independently (+0.612/−0.021, +0.473/+0.016, +3.349/−0.016); C51's Algorithm 1 as printed drops the mass of atoms landing exactly on the grid; Rainbow's "53 of 57" against Figure 4's 46 of 55; NoisyNet's "48 and 18 percentage points" are relative gains; Rainbow's restatement of DQN's schedule is consistent with the Nature table counting agent steps as frames (unconfirmed); CleanRL's DQN uses Adam 1e-4, MSE loss and a 1,000-step target refresh.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; ledger keys that quoted old times re-keyed.
