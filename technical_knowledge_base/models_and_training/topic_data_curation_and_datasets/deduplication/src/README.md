# Source of the deduplication child page (prefix dp)

Build: `sh build.sh` (runs `build_data.py`, which merges `data/out/*.json` and four root Dedup lab outputs into
`data/dp_data.json`, embedded as `window.DP`). Check: from the repo root,
`sh html_utils/checkpage.sh <this page folder>` and `node <this folder>/src/check_page.mjs [shot dir]` (every control at
390 dark and 920 light, embedded data equals the file, JS reproduces datasketch's (b, r) rule and the published
S-curve points, prose numbers equal data).

## Measurements (run order; shared env, CPU only, `nice -n 15`, 4 threads)

```sh
export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4 HF_HUB_OFFLINE=1
PY="nice -n 15 $DC_SCRATCH/venv/bin/python -I -B"
# needs the root lab's dd_pairs.py and dd_semantic.py outputs (pairs.npz, shingles.pkl, emb.npy) in $DC_SCRATCH/dedup/
$PY scripts/dp_mh.py          # 1,024-hash signatures (seed 2), estimator spread, equality masks for the Band designer
$PY scripts/dp_mh_seeds.py    # 24 real pairs x 2,000 hash families: estimate histograms, candidate rate vs S-curve
$PY scripts/dp_mhdemo.py      # the three pairs of the MinHash animation (datatrove's own signer, checked)
$PY scripts/dp_uf.py          # datatrove's bucket + union-find steps replayed; equals run0's remove file
$PY scripts/dp_ufscale.py     # union-find memory per node (dict) and scipy connected components timing (rough)
$PY scripts/dp_simhash.py     # 64-bit SimHash on the same shingles, Hamming for all 3.6M pairs
$PY scripts/dp_sa.py tokens scope corpora   # suffix arrays: tokens vs bytes, scope growth, four corpora (Google tool)
$PY scripts/dp_sem.py         # SemDeDup with three encoders, D4 prototype pruning vs quality scores
$PY scripts/dp_compare.py     # every combination of exact / fuzzy / semantic / suffix array on the 2,692 documents
$PY scripts/snippet_exact.py; $PY scripts/snippet_minhash.py   # the code shown in the Reading tab, with its output
```

GPU run: `scripts/run_pending.sh d4-fwedu50k` (SemDeDup and D4 on 50,000 FineWeb-Edu rows), run 2026-10-15 on MPS in
float32 (2,037 s of embedding); its output `data/out/dp_d4_fw50k.json` is embedded and replaces the pending box.

## Shape (rebuilt 2026-10-24 to the teaching contract; see below)

Child-page method (`.claude/skills/explainer-page/page-kinds/topic-child.md`). The root's Dedup lab already ran every method once
(overlap table, 14-document before/after, S-curve sliders over 112-bit masks, suffix-array toy, Bloom toy, cost
calculator); this page does not rebuild those and goes deeper: variance, the (b, r) rule, union-find replayed,
SimHash, tokens vs bytes, scope growth, encoder sensitivity, D4, combinations in sequence, published evidence and costs.

## Sources

Research notes with table numbers and URLs (read 2026-10-15) were collected in the session scratch; every number on
the page links its paper or names its file and line at a pinned version. Published tables quoted: Lee et al. Tables
2-5, 12, 13; Kandpal et al. Table 1; Pythia Tables 7-8; Muennighoff et al. Table 14; DCLM Tables 4, 17-23; FineWeb
Section 3.4 and Appendix E; Nemotron-CC Table 4; SemDeDup Table A12; D4 Table 1; DeepSeek LLM Table 1; SlimPajama-DC
Table 2.

## Privacy

Only hostnames and the text of three boilerplate pairs (forum software, a shop template, a network banner) reach the
page; text passes through the running example's PII formatter. `dp_common.save` refuses outputs containing local paths.

## The 2026-10-24 rebuild: what changed and why

Rebuilt to `.claude/skills/explainer-page/teaching/teaching-contract.md` (editing only; no new runs). This page owns
deduplication: exact hashing, MinHash and LSH, SimHash, union-find clusters, suffix-array substring dedup, Bloom filters
and BFF, semantic dedup (SemDeDup, D4), what dedup does to quality and memorisation, cross-crawl dedup and FineWeb's
surprise.

| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (core idea, hero, you need, new terms, the six-method table closed) to `20_read_l` (interview, closed); JS `21_js_rd_common.js` (skill template: never autoplays), `24_js_rd.js`, `25_js_rd_sa.js` (new), `31_js_mh.js`, `32_js_band.js`, `33_js_uf.js` | sections 1 to 10 core with closed depth blocks; 11 interview (closed) |
| Method comparer `t-cmp` | `34_tab_cmp.html`, `34_js_cmp.js` | kept as a tab: it combines every method of the page, so it is a tool used across the page |
| Further reading `t-more` | `39_tab_more.html` | unchanged |

- **Top**: the core idea in one sentence, a hero ("four keys, four kinds of copy": each step's key and what it catches, one WARC against web scale, numbers from the comparer and Dolma 3), "You need", new terms. The old "In one screen" table is a closed reference block; its "three things to remember" became the core sentence and section 1's opening.
- **Moved inline** (they each explain one mechanism): the MinHash step-by-step stepper and the Band designer into section 3, the union-find replay into section 4 (the 31-cluster table and the 2,000-family histograms in closed blocks). The MinHash, Band designer and Union-find tabs are gone; their CSS is rescoped to `#rd-mh`, `#rd-band`, `#rd-uf` in `02_style.html`, their render hooks now register on `t-read`, and charts in closed blocks redraw when the block opens.
- **New visuals** for mechanisms that had none: the FineWeb 2013-48 bars to scale (section 1), a word-level suffix-array diagram computed in the page from two illustrative pages (section 6, `25_js_rd_sa.js`), a Bloom-filter bit diagram (section 7, illustrative), DCLM Table 22 as bars (section 7, published).
- **Concrete, then picture, then formula**: section 3 now starts from the forum pair (43 of 73 shingles, J = 0.589), then the stepper, then the min-hash proof, the variance law and the S-curve with the designer.
- **Closed depth**: study-by-study evidence, leftover duplication in finished corpora, the FineWeb shard join, exact-dedup code and line-dedup practice, the band rule's derivation and preset sources, the real-tool code, components at scale, SimHash's index and measured deviations, SA-IS and costs, Bloom memory arithmetic, D4 details and the GPU run, the published costs table, the 17-corpus recipe table, test overlap in standard splits, interview questions.
- **Deleted as fat** (38 ledger units, each with a note): wind-ups, old headings and nav, pointers to removed tabs, tab "Try" lines, the obsolete pending-GPU box, and the Common mistakes section, whose eight items restated core points (the sample-rate point moved to section 1's closed block; the dolma flag stays in section 7's).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `dp-tab`); checked with normal motion that no stepper moves until pressed.
- `check_page.mjs` gained a check of the hero's numbers against the comparer data (exact 50, MinHash 25, semantic 6, suffix array 14.1 kB from 25 documents).

### Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 42.9 min | 32.1 min |
| Reading, closed details | 3.2 min | 22.8 min |
| Other tabs, core (excluding Further reading) | MinHash 2.7 + Band 2.2 + Union-find 3.5 + Comparer 2.1 = 10.4 min | Comparer 2.1 min |
| Core total, excluding Further reading | 53.3 min | 34.2 min |
| Visuals in Reading (svg counted by the audit) | 4 | 8, plus 7 HTML figures and calculators (hero, FineWeb bars, suffix-array list, Bloom bits, Table 22 bars, repeated-span bars, the MinHash signature grid) |

Why 32 minutes is right: the page teaches six methods plus the evidence and the scope question, each with a picture
beside it; about 13 of the 32 minutes are the text inside the visuals (the stepper's two real documents and shingles,
the designer's counters and source note, 25 hostnames of the union-find legend, the suffix-array list, the scale table),
and the prose is about 18 minutes. Everything a first reading does not need (per-study tables, costs, recipes, code,
derivations, interview answers) is closed; the closed time grew because material that sat in the open Reading flow and
in tabs now lives there.

### Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
449 units: core 270, depth 141, fat 38. 433 were drafted by `ledger.py init` from the old page; keys were matched by the
longest word window of each unit found in the new page (core or closed), then checked by hand for short keys; 16 were
added by hand for script-rendered visuals and the new figures. No unit is labelled owned or volatile: contamination
detection belongs to the decontamination page, and this page keeps only what dedup has to do with it.

### Departures from the page-kind shape
- No real image: the page is about algorithms; diagrams carry every mechanism, and no paper figure is the reference people cite here.
- The Method comparer stays a tab because it runs every method of the page together.
