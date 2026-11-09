# Topic: data-curation-and-datasets, root page source

Root of the topic (storage key `dc-tab`). Built 2026-10-14 to 16 by tab agents (`read/`, `pipe/`, `dedup/`, `qual/`, `mix/`, `post/`, `map/`, each with its own README; the shared running example is `data/`). Rebuilt on 2026-10-24 at the topic close, after its nine children were rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), with the method of `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md`. Editing only, no new runs. Examples followed: the ML infra, ML fundamentals and RL roots.

## 2026-11-09: split layout, one 3D stage (renderer v2), explained and autoplaying animations (layout rollout)

Method: `.claude/skills/explainer-page/orchestration/briefs/rebuild-page.md` with `layout-rollout.md`, after all nine children were rebuilt in the same rollout (none edited here). Copied unchanged from the templates: `parts/02_split.html` (in `build.sh` after `01_head.html`), `parts/25_js_s3.js` (renderer v2), `parts/21_js_rd_common.js`, `parts/05z_errbox.js.html`, `parts/99_js_tabs.js` (key `dc-tab`). `build.sh` writes the em-dash test as bytes. Replaced parts are kept in `read/retired/parts_2026-11-09/`.

**Reading tab** (anchors `rd-s0` to `rd-s12`, `rd-hero`, `rd-worth`, `rd-lin-card`, `rd-page-card`, `rd-smol-card`, `rd-calc-card`, `rd-mis`, `rd-iq` unchanged; `rd-hero` is now the split that holds Fig. 1):
| Section | Layout | Visual | Step list |
|---|---|---|---|
| The idea (`rd-s0`) | split | **3D stage Fig. 1 `stg-pipe`** (`parts/38_js_sc_pipe.js`), replacing the static twelve-row hero | yes, 10 items (`sx-pipe`), the hero rows' words |
| You need, terms, running example | full width | none | no |
| 1. Why the data decides | full width | table (`rd-worth`) | no |
| 2. Where the tokens come from | split | 2D Fig. 2, corpus sizes (log scale); labels now placed without overlap, 12 px | no (click widget) |
| 3. The pipeline | split | 2D stepper Fig. 3 (`rd-page-card`) | yes, 9 items (`sx-page`); its caption carousel is gone |
| 4. Deduplication | full width | none; links Deduplication Figs. 1 to 4 | no |
| 5. Quality models | split | 2D Fig. 4, FineWeb-Edu against DCLM bars | no (static) |
| 6. Decontamination | full width | none; links Decontamination Figs. 1 to 3 | no |
| 7. Mixing and staging | full width | none; links Data mixing Figs. 1, 2, 3, 4, 6 | no |
| 8. Synthetic data | full width | none: the one-dimensional collapse simulation is retired (`27_js_rd_s789.js`); one sentence links Synthetic data Fig. 4, which draws collapse; links Figs. 1 and 2 | no |
| 9. Post-training data | full width | table; links Post-training data Figs. 1 to 3 | no |
| 10. Storage and tools | full width | table; links Storage and loading Figs. 1, 3, 6, 7, 8 | no |
| 11. Choosing | split | calculator Fig. 5 (its predict prompt moved to the left) | no (widget) |
| 12. Child pages | full width | cards; times as each child's header states on 2026-11-09 | no |

**Fig. 1, `stg-pipe`.** One Common Crawl WARC file through nine glass gates, cheapest first: URL filter, extract, language ID, heuristic rules, dedup, quality model, decontamination and PII, mix, store. Documents flow as dots (dot size and count follow the share still alive), removed ones arc into a tray in front of the gate (count by share removed), and the white column after each gate is the share of the 20,463 HTML pages still alive, to scale, shrinking from the input share to the output share during the step. The quality step adds two thin columns (FineWeb-Edu keeps 159, DCLM 573) while the stream stays at 2,617 (the later stages were measured on all 2,617); decontamination removes nothing (no 13-gram overlap, the Decontamination child's finding) and PII edits 101; the mix step brings four other domains in from behind and morphs the mixture column from the running example's natural shares to the DoReMi proxy's weights; the store step turns the stream into four token shards (illustrative) with bytes per token derived from the Tool map's storage measurement; the last step pulls back to the whole line with synthetic data joining the mix. The camera moves in close on each gate, older gates fade out, and labels appear only once the camera has arrived. Data: `window.RDP.funnel`, `window.DCPD.run0` and `.pii`, `window.QD.S`, `window.MXD.proxy.doremi`, `window.TM_DATA.storage`, read when the scene first draws (the script loads after the lab data parts). `read/check_read.mjs` checks every number in `sx-pipe` against those globals.

**Lab tabs** stay full width (reader-driven tools and data views). Every lab animation now uses the template `RD.anim` through each lab's own `anim` (the six `3x_js_*_1core.js`): it plays once at least half in view, pauses off screen, stops for good on any control or at its last step, never moves under reduced motion, at least 3.8 s per step (the rephrasing progress animation keeps 1.3 s, `fast:true`), redrawn when its tab opens. The Tool map's corpus lineage by year opens on 2026 and is a widget (`auto:false`). The lab animations keep their in-card captions and have no step list on the left (the lead's scope for this root: lab internals unchanged).

**Kept 2D, and why**: the corpus size chart (a log axis over time), the SmolLM2 bars (scores on one axis), the page stepper (real text, line by line), the tables and the calculator. The one 3D stage is the orienting map, where the gates in a row and the shrinking columns are the structure.

**Retired**: the static hero rows (now the step list of Fig. 1), the page stepper's caption, the collapse simulation (ledger units 297 owned by Synthetic data, 298 and 299 fat with notes). Ledger re-keys: 15 (the hero's URL row), 1182 to 1196 (outside-resource times: keys no longer contain minutes).

**Length** (230 words a minute, `html_utils/audit_pages.mjs`): Reading 31.0 core + 6.7 closed before, 35.1 + 6.0 after (header 35 + 6). The rise is the two step lists: Fig. 1's list carries the hero rows' words plus the stage's added numbers (the DoReMi weights, bytes per token, quality keeps, decontamination and PII), and Fig. 3's list puts on the page the nine captions the stepper showed one at a time (script text the audit did not count); the collapse simulation, in a closed block, was retired (closed time down). Still a map: every mechanism is a line and a link, and each section now names the child figure that draws it. Lab tabs and Further reading unchanged in length.

**Ledger**: 1,197 units, core 901, depth 203, owned 63, fat 30, volatile 0; problems 0.

**Checks (2026-11-09)**: `sh html_utils/checkpage.sh`: tabs 8, emdash 0, errbox 1, clipped 0, fail=0; `node src/check_stages.mjs` (new; the stage and the page stepper play once in view, have 10 and 9 list items, reach their last step, a list click holds; the stage's flows stop off screen; every lab animation plays in view and stops on a control; the lineage widget never moves by itself; nothing moves under reduced motion; five Reading splits are two columns at 1400; no errors, NaN, undefined or sideways scroll in any tab at 1400 light, 920 light and 390 dark; the Quality lab's quoted "Encountered NaN" is whitelisted); `node src/read/check_read.mjs` (stepper checks now read the view, counts and `sx-page`; new checks of every number in `sx-pipe`); the lab checks listed above, all clean.

## Build and check
- `sh build.sh` writes `../index.html`. Children read `data/`, `dedup/` (outputs and `dd_common.py`), `qual/` (`q_common.py`, `out/q_summary.json`), `post/` (`pt_common.py`, `pt_checkers.py`) and `pipe/`: keep those paths, even for retired cards.
- `sh html_utils/checkpage.sh <this page>`: tabs 8, emdash 0, errbox 1, clipped 0, fail=0 (2026-10-24). `python3 html_utils/ledger.py check <this page>`: problems 0.
- Page checks, all clean on 2026-10-24 (from the repo root, `<page>` = this folder's `index.html`): `node src/read/check_read.mjs <page>` (rewritten for the rebuilt tab: hero counts against the funnel data, prose numbers, the page stepper, the calculator), `node src/pipe/check_tab.mjs <page> <shots>`, `python3 src/pipe/check_numbers.py`, `node src/dedup/check_tab.mjs <page> <shots>`, `python3 src/dedup/check_numbers.py`, `node src/qual/check_q.mjs <page>`, `node src/mix/check_mix.mjs <page>`, `node src/post/check_pt.mjs <page>`, `node src/map/check_tab.mjs <page> <shots>`, `python3 src/map/validate.py`.
- Nothing moves before the reader acts: `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the six lab controllers (`31_js_pip_1core`, `32_js_dd_1core`, `33_js_q_1core`, `34_js_mx_1core`, `35_js_pt_1core`, `36_js_tm_1core`) no longer start playing when scrolled into view.

## Tabs
| Tab | Decision on 2026-10-24, and why |
|---|---|
| Reading `t-read` | Rewritten as a map (below). Section numbers 1 to 11 kept for the same subjects, because children cite them (synthetic data cites section 8, data mixing section 7, storage section 10); section 12 is the child cards. |
| Pipeline lab `t-pipe` | Kept: the running example through every stage with three extractors, which the children reuse and cite. Section 1 now opens with a pointer to Extraction and filtering's hero (the same funnel, trafilatura path, to scale) and its sections 6 to 9; the lab keeps the three-extractor and character views the child does not draw. The railway page's caption "resiliparse drops the data" was wrong (Extraction and filtering, section 4): now "a preformatted data list both extractors keep" (`pipe/pip_data.py`, `pipe/out/page_data.json`, `31_js_pip_0data.js`). |
| Dedup lab `t-dedup` | Kept (Deduplication's build merges its outputs). The "Bands and rows over the measured pairs" slider card **retired** to a paragraph: Deduplication section 3's Band designer draws the same curve over the same pairs (JS kept behind a guard in `32_js_dd_3mh.js`). Pointers to the Reading tab's old section 4 MinHash walk-through now name Deduplication sections 1 and 3. |
| Quality lab `t-qual` | Kept unchanged apart from the controller (Quality classifiers cites its prompt, CCNet run and 50,000-row run). |
| Mixing lab `t-mix` | Kept; the CMR bar chart **retired** to a paragraph: Data mixing section 6 owns continued pretraining and its CMR calculator. The link to the deleted Continued Pretraining page now names Data mixing; the Token-budget planner link opens its tab. |
| Post-training data lab `t-post` | Kept; pointers to the child's former Checker lab and Rephrasing lab tabs now name Post-training data section 6 and Synthetic data section 3. |
| Tool map `t-map` | Kept: the dated atlas a root owns. The packing stepper **retired** to a paragraph (Storage and loading section 6 owns packing on the same 2,000 documents); the loader note adds that nanoGPT draws random offsets with replacement (`map/storage/finalize.py`, `map/out/storage.json`, `36_js_tm_0data.js`). The Parquet-against-JSONL sentence already gave the zstd-level cause Storage and loading section 3 found. |
| Further reading `t-more` | Tab and child times set to the headers, child cards in pipeline order, the Continued Pretraining card removed (Data mixing holds it). |

Retired parts are in `retired/parts/`: the old Reading (`20_read*.html`, eleven sections plus mistakes, interview and child cards), `25_js_rd_dedup.js` (S-curve with published settings and the global-dedup bars: Deduplication sections 1 and 3), the n-gram decontamination demo (formerly in `26_js_rd_s56.js`: Decontamination section 2's stepper), the OLMo 2 mid-training bars (formerly in `27_js_rd_s789.js`: Data mixing section 5), the DCLM Table 4 bars (Quality classifiers section 2 draws every row; the data stays in `22_js_rd_data.js`), the funnel bars (now the hero's counts; Extraction and filtering's hero draws them), and the old versions of the lab parts edited here.

## What changed in the Reading tab
- **Top**: the core idea in one sentence (a dataset is what survives a chain of cheap-to-expensive filters, and every stage trades per-token quality against unique tokens left); a static hero, the pipeline as twelve rows (stage, what it does, the running example's measured count at that stage, the owning child and section), with synthetic and post-training data as side lanes; "You need" (Tokenizers); 19 new terms and the running example in closed blocks.
- **Kept as the root's own**: section 1 now holds a new cross-stage comparison, "what each stage is worth as published" (extraction, rules, dedup, quality model, decontamination, final stage, rephrasing, each with effect, cost and owner); the corpus size chart (section 2); the page-through-every-stage stepper (section 3, spans five children); the scope point of dedup (section 4); the three quality recipes as a table, the FineWeb-Edu against DCLM bars and the one-in-seven predict (section 5); the web-against-post-training contamination finding (section 6); repetition, staging, the measured DoReMi weights and CPT in a paragraph (section 7); synthetic lineages and the collapse premise, the one-dimensional simulation now in a closed block (section 8, Synthetic data links it); the four shapes of post-training row (section 9); storage in a paragraph and the tool table (section 10); choosing, the pipeline-sizing calculator (spans extraction, quality, mixing and corpora) and nine cross-stage mistakes in a closed block (section 11); child cards with header times and one closed design question (section 12).
- **Moved to the owners, one sentence and a link left**: MinHash and LSH step by step, suffix arrays, Bloom filters, the S-curve, the 2013-48 arithmetic (Deduplication sections 1 to 7); fastText scoring, DCLM's Table 4 (Quality classifiers sections 1 and 2); the n-gram rule demo and the 1.45 million-document reading (Decontamination sections 2 and 3); RegMix and DoReMi detail, mid-training bars, the long-context stage (Data mixing sections 3 and 5); WRAP's four styles on the running example (Synthetic data section 3); the small-judge run (Post-training data section 5); approximate shuffling (Storage and loading section 8); per-stage interview questions (each child).

## Length judgement
| Tab | Before (230 words a minute, `html_utils/audit_pages.mjs`) | After |
|---|---|---|
| Reading | 48.0 + 6.1 | 31.0 + 6.7 |
| Pipeline lab | 25.1 + 2.4 | 25.4 + 2.4 |
| Dedup lab | 32.0 + 4.0 | 31.5 + 4.0 |
| Quality lab | 23.2 + 3.0 | 23.2 + 3.0 |
| Mixing lab | 15.1 + 2.0 | 15.0 + 2.0 |
| Post-training data lab | 20.1 + 1.6 | 20.1 + 1.6 |
| Tool map | 13.8 + 6.6 | 13.6 + 6.6 |
| Further reading | 4.9 | 4.9 |

Why about 31 minutes: the topic is taught from zero, so the root carries the vocabulary of every stage and the comparisons only a root can make: the hero (one file's count at every stage with its owner), what each stage is worth as published, the quality-against-unique-tokens trade-off that links sections 2, 5, 7, 8 and 11, and the two cross-child findings (dedup scope, where contamination hides). About 1,700 of the core words are the hero, the two comparison tables and the page stepper's captions. Every mechanism is now a line and a link; shorter would drop a definition the children assume or a comparison no child carries. The labs stay as they are: they are the running example's measurements that six children build on and cite.

## Knowledge ledger (`ledger.json`)
1,197 units drafted by `ledger.py init` from the page before the rebuild (all tabs): core 901, depth 206, owned 62 (Deduplication 26, Data mixing 10, Decontamination 7, Quality classifiers 5, Synthetic data 5, Post-training data 5, Storage and loading 3, Extraction and filtering 1), fat 28 (each with a `note`: old intro, reading time and roadmap, run-in headings, the old child-card labels and time rule, pointers to retired cards), volatile 0. Keys found by script (the longest phrase of six or more words, or four with a number, on the rebuilt root, then on a child), the residue labelled by hand (`"manual": true`, 140 units).

## The topic close (2026-10-24): other pages of the topic
Every child's Further reading quotes the root as "31 min, plus 7" and siblings as their headers (child ledgers re-keyed where a key quoted an old time). Also fixed: Quality classifiers' Continued pretraining card (now Data mixing, merged with its existing card); Pretraining corpora's Deduplication card points at section 1 (the 171B bars); Deduplication's cards (inline times); the root's Post-training data lab time on Post-training data; Extraction and filtering's and Storage and loading's corrections to the root now say the root was fixed. Each child's `src/README.md` has a dated line.
