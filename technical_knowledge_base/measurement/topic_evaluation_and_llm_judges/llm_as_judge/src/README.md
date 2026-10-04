# Build notes: LLM-as-judge

- `sh src/build.sh` writes `../index.html` from `parts/` and embeds `inputs/mtbench_votes.json` as `window.MTB`.
- `mk_data.py RAW` builds `inputs/mtbench_votes.json` (about 100 KB) from the released MT-Bench files (URLs in its docstring; raw files about 70 MB, kept outside the repo).
- `extract_calm.py` extracts CALM Table 4 from the arXiv HTML into `inputs/calm_table4.tsv`; `22_js_calm.js` was generated from that file.
- `recompute.py` recomputes, independently of the page, every derived number (Table 5 reproduction, protocol-lab readings, win rates and Spearman, every calibration slice and the 200-draw coverage with the same mulberry32 draw) into `recompute.json`.
- `check_page.mjs` (run from the repo root) clicks every control at 390 dark and 920 light, checks for errors, NaN, undefined, sideways scroll and small SVG text, and compares the page's numbers with `recompute.json`.
- `inputs/source_excerpts.md`: verbatim excerpts of the 2026 papers the page leans on (Lee et al., RoPoLL, Norman et al.) and others.
- Shape: Part B of `html_utils/methods/topic_pages.md` (Reading by the subject's logic, then labs, then Further reading). The parent's Judge bias lab and Judge atlas are linked, not rebuilt.
