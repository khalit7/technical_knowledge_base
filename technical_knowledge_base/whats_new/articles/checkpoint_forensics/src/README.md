# How this page is built

Article method: `.claude/skills/explainer-page/page-kinds/article.md`; reference folder `../weight_space_programming/src/` (build.sh, extract_article.py, label_ledger.py, template parts copied unchanged; mk_article.py copied from `../qorl_query_plans/src/`).

## Build and check (from the repo root)
```sh
bash <page>/src/build.sh                         # stops on a missing text fragment, an em-dash or an unexpanded macro
node <page>/src/check_page.mjs <page>/index.html # controls at 390 dark, 920 and 1400 light; JS generator against the Python replay; replay peaks; toy counts; embedded data and prose numbers
python3 <page>/src/label_ledger.py && python3 html_utils/ledger.py check <page>
```
To regenerate the replay data: clone github.com/macrogrants/checkpoint-forensics (MIT, commit b633870) to scratch, then `python3 -I <page>/src/replay/replay_rows.py <clone>/rows <clone>/models.json` (under a second on a CPU).

## Files specific to this page
| File | What |
|---|---|
| `replay/replay_rows.py` | Our own port of PyTorch's CUDA `normal_` placement (Philox4x32-10 checked on the Random123 known answers, Box-Muller, position i from thread i mod G, value i div G). Runs on the author's released rows; writes `replay/out/replay.json` (r for SM counts 100 to 160, rows above 0.99, seed+1 control) and `replay/out/rows_slice.json` (1,024 bf16 values of one row per model for the page, plus reference values). It does not run the author's code. |
| `inputs/figures.json` | Table 1 with Appendix 1's evidence, and Table 2 in the three archived versions, transcribed by hand. |
| `mk_article.py` | `DATA_EXTRA` ships the replay rows (base64) and the figure data. |
| `parts/23_js_cf_figs.js` | Timeline, GPU-estimate versions, toy grid and live replay; `window.CF.normalAt` is the JS generator. |

## Departures from page-kinds/article.md
- **A live ingredient in Reading (no tab)**: the replay on real released rows. Reason: the report's whole claim rests on one mechanism that a reader can run; seeing r jump from 0 to 1 at exactly one SM count on DeepSeek's own weights teaches the mechanism and the evidence at once, faster than reading Figures 4 and 6. Defaults reproduce the report's peaks (132, 148, 152) independently: the inputs are the seed and rows, not the answer.
- **The hero is an inference chain, not a chart**: what this article most needs a reader to keep is what the evidence does and does not establish.
- **The archived versions are a figure**: three versions of Table 2 within four hours, and the removed DeepSeek-V3 calibration, are evidence about how far to trust the estimates.
- **The KB link in the Since block** points to our 2026-11-23 issue (a Notion URL, rewritten by the site build).

## Length judgement
Reading 20 minutes core plus 2 in closed details (measured 2026-11-27 with `audit_pages.mjs`), against the article's 26 (about 18 before its appendices). That is close to the article's body: the page adds what the report lacks (an evidence judgement, seven responses, three archived versions, a replay), and the article's own long parts (appendix tables, citation, sources) are cut to the timeline and links. Ledger: 206 units, core 145, depth 56, volatile 3, fat 2, problems 0.

## Sources read (27 November 2026)
The report and nine Wayback copies (12 Nov 21:56 UTC to 14 Nov); the author's repository (README, gpuid.py, replay.py, gpu_check.py, fetch.py, models.json, rows); PyTorch DistributionTemplates.h at 58c7687 (lines 49 to 81); peterjliu/checkpoint-forensics-repro README; atripathy86/gpu-forensics-hf README; the Hacker News thread in full (item API: 458 points, 199 comments); The Register (13 Nov), The Decoder (13 Nov, paywalled after the opening), HuggingNews (author's replies on X), the author's X thread via threadreaderapp; DeepInfer README; the Atlantic Council piece (cited, not read in full).
Unconfirmed: the author's X replies are known only through HuggingNews; the ERNIE-5.5 seed (2760, the same as MiniMax-M3's) may be a slip; NVIDIA does not publish B300 or GB200 enabled SM counts; the RTX 5090's 1,536 threads per SM is from the CUDA guide's compute-capability 12.0 limits, not re-read today.
