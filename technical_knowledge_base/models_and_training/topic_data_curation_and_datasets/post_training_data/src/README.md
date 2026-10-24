# Post-training data (source; prefix pd)

Child 7 of Topic: data-curation-and-datasets. Built 2026-10-15. `sh build.sh` writes `../index.html` from `parts/`,
`data/pd_data.json` (embedded as `window.PD`) and `data/facts.json` (prose numbers, written `@@key@@`).
`build_data.py` makes both from the recorded runs in `data/out/` and `inputs/hf_statistics/`.

## Layout
- `parts/`: `01_head.html`, `05z_errbox.js.html`; `21_js_rd_common.js` and `99_js_tabs.js` from the explainer-page skill templates
  (storage key `pd-tab`; nothing moves before the reader acts); `10_header.html`; Reading `20_read_0css` (styles, including the
  folded labs' CSS), `20_read_a` (core idea, hero, terms) to `20_read_i` (closed depth), `20_read_z` (closes the tab);
  `22_pd_rd1.js`, `23_pd_rd2.js`, `24_pd_rd3.js` (Self-Instruct filter animation, mixtures, lineage metrics, generators, traces,
  raw-row before/after and mask shares, binarization animation, length bias, extractor animation, pass rates, mutation testing,
  environments, trajectory stepper, overlap and contamination, the judge run); `25_pd_new.js` (hero, SFT lineage dot plot,
  prompt-reuse diagram); `32_pd_pair.js` (Pair inspector, now a closed block in section 5) and `33_pd_chk.js` (Checker lab, now a
  closed block in section 6); `31_*` Dataset atlas tab; `39_tab_more.html`.
- `scripts/`: every measurement (below). `notes/`: `sources.md` (verified published facts with quotes and table
  checks), `judge_labels.md`, `code_survivors.md`, `contam_read.md` and `contam_labels.json` (hand labels).
- `inputs/`: `pd_manifest.jsonl` (every sample: repo, commit, files or row groups, sha256), `hf_statistics/` (full-set
  compositions), `seed_tasks.jsonl` (Self-Instruct's 175 seeds; three fictional example e-mail addresses rewritten to example.com).
- `check_page.mjs`: data and prose checks plus every control at 390 dark and 920 light.
- `ledger.json`: the knowledge ledger (teaching contract, 2026-10-24).
- `coverage.md`: the old "Synthetic data and post-training data" page's post-training claims, verified or corrected.
  `viz_ideas.md`: visuals built and rejected.

## Runs (Apple M1 Pro CPU, 2026-10-15, nice 15, 2 to 4 threads; shared venv; large outputs outside the repo, under the shared setup folder dc/pd/)
| Script | What |
|---|---|
| `pd_get.py` | samples and whole files (manifest); `pd_stats_api.py`: HF statistics |
| `pd_selfinst.py` | ROUGE-L of every instruction against every other (Alpaca 52k, Dolly 15k, seeds) |
| `pd_sft.py` | lineage metrics, tulu-template masking, near duplicates, lid.176 |
| `pd_pref.py` | 8 preference sets; UltraFeedback raw binarization rules and rating-length correlation |
| `run_check.sh pd_check.py`, `pd_check_sum.py` | 6 extractors on 12,358 R1 answers, two views |
| `run_check.sh pd_rlcheck.py` | OLMo 3 RL rollouts re-checked (math extractors, open-instruct IFEvalVerifier) |
| `pd_code.py 300 50` | mutation testing in a sandbox-exec sandbox |
| `pd_env.py` | SWE task rows and trajectories |
| `pd_contam.py`, `pd_contam_pairs.py` | the Decontamination child's scanner on 8 sets; IFEval check |
| `pd_quality.py` | prompt reuse and exact overlap across sets |

Reused, not rebuilt: the root lab's `src/post/pt_common.py` (records, tokenizer, MinHash) and `pt_checkers.py`
(extractors); the Decontamination child's `dg_contam.py` and `dg_common.py`; open-instruct at commit 72f46040.

## GPU run (`scripts/run_pending.sh`, 2026-10-16)
Qwen3-4B (Q4_K_M GGUF, llama.cpp, M1 Pro GPU, 4 parallel requests, `-cram 0`) scores both answers of 300 UltraFeedback
H4 pairs, each pair in both orders (600 calls); `pd_pending_sum.py` writes `data/out/pending.json` (position bias,
consistency, agreement with GPT-4, length preference); Reading section 6 shows it. Dropped by Khalid's decision of
2026-10-15 (cost against what they teach): local answers to OpenR1 problems (the Checker lab uses R1's and OLMo 3's
real answers) and our own delta pairs (the Dolci DPO sample and Geng et al., arXiv 2507.06187, cover it). The page says
"not run here" for both. Scripts for them remain in `pd_generate.py` (modes `answers`, `delta`).

## Departures from the method
- Child-page shape (Part B). Three labs instead of one data tab, as the brief asked: a dataset atlas, a pair inspector
  and a checker lab. The root's lab already has a per-dataset browser and checkers on reference solutions; these labs
  add other datasets, other measurements and model answers, and link the root's lab instead of repeating it.
- Quoted dataset text keeps its wording except em dashes, shown as a spaced hyphen (house style).
- WildChat and other real-user rows are counted but not shown; examples are synthetic or public task rows.

## The 2026-10-24 rebuild to the teaching contract
Editing only, no new runs (two published facts added, checked 2026-10-24: FLAN and the Flan 2022 collection in the lineage;
HelpSteer2 as a fifth preference recipe, both named in OWNERS.md for this page and missing before).
- **Top**: the core idea in one sentence ("a prompt plus a signal of what good looks like"), a new static hero (four kinds of row:
  prompt, signal, what it trains, the failure measured here), "You need" and seven new terms. The old one-screen table and the
  real-row cards moved into a closed block; the "Words you need" list lost the terms the reader already has.
- **Visuals inline, by kind of concept**: the 16-row lineage table became a dot plot (published sizes on a log axis by date,
  coloured by who wrote the answers; the table is a closed block); section 4 is now a before/after of one real Tulu 3 row (stored
  messages, then the rendered, tokenized, masked training example), linking Alignment's loss-mask widget and Tokenizers for the
  mechanics instead of teaching them; section 8 got a static diagram of one prompt pool feeding three stages.
- **Lab tabs folded**: the Pair inspector and the Checker lab each served one section, so they are closed blocks there
  (`#pd-pp`, `#pd-pc`); their headline numbers stay in the core. The Dataset atlas stays a tab (used across the page).
- **Moved to closed depth**: licence quotes, published trace recipes, open-instruct's masking code and template pitfalls, the
  lineage metrics table, prompt pools, IFBench details, open-r1's test attrition, newer environment-building papers, the
  overlap heatmap, flagged contamination pairs and the IFEval check, judge flip examples, table arithmetic, the small-model
  suggestion, four mistakes that teach something new, a design rehearsal and the method notes.
- **Deleted as fat** (39 ledger units): navigation and headings, the pending-run notice (the run is done), restated
  mistakes and interview answers that repeated a section, a recap of the filters.
- **No autoplay**: the skill's `21_js_rd_common.js` replaced the old one (which started each animation when it scrolled into view).

## Length judgement
| | Before (2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 48.4 min | 29.8 min |
| Reading, closed details | 2.9 min | 22.7 min |
| Other tabs, core | atlas 2.0 + pair inspector 2.4 + checker lab 3.3 + further 2.1 = 9.8 min | atlas 2.0 + further 2.4 = 4.4 min |
| SVG visuals drawn in Reading (audit count; the HTML bar charts are not counted) | 0 | 4 |

Why about 30 minutes is right: the page owns four different kinds of data (SFT, preference, verifiable reward, environments)
plus quality control, and each needs its construction recipe, the way it fails and the measurement that shows it; about a
fifth of the core words are captions, counters and labels of the eight interactive visuals. Everything that is evidence
rather than understanding (per-set tables, code locations, the labs' explorers, quotes, dated research) is closed. It sits
with the rebuilt siblings (28 to 40 minutes).

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
350 units: core 222, depth 89, fat 39. 343 drafted by `ledger.py init` from the old page, 7 added by hand (the two new
published facts and the script-drawn visuals). No unit is `owned:` elsewhere: Synthetic data does not carry Self-Instruct,
Evol-Instruct or Magpie, so they stay here.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed. The root card names its Post-training data lab (20 min).
