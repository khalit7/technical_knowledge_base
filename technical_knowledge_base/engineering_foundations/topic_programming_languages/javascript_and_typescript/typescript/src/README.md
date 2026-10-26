# Source of "TypeScript: the type system, narrowing and runtime validation"

Child page 3 of JavaScript and TypeScript: the essentials (page prefix `tb`, storage key `tb-tab`), section 4 child 3 of the language split plan. Built 2026-10-26 by splitting the language page's Part 2; no new measurements were run.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Further reading `t-more`).
- Generated (never edit by hand): `parts/22_js_tb_0data.js` (`window.TB`: every snippet as compiled, its recorded output, the narrowing probes, the LLM JSON lab, the timings), written by `tb/gen_data.mjs`.
- Hand-written: `parts/01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; title and storage key set), `10_header.html`, `20_read_a.html` to `20_read_f.html`, `20_read_z.html`, `39_tab_more.html`.
- Adapted from the language page: `23_js_tb_core.js` (from `41_js_tb_core.js`: `TBX` renders each `[data-tb-s]` block from the data; new flags `data-tb-fold` for a closed block and `data-tb-drill` for a "Does npx tsc accept this?" prediction whose answer is read from the recorded output; every reveal is a closed `<details>`), `24_js_tb_read.js` (from `42_js_tb_read.js`: erasure stepper and timing bars), `25_js_tb_narrow.js` (from `44_js_tb_narrow.js`), `26_js_tb_zod.js` (from `48_js_tb_zod.js`). A mode or program switch now resets to step 1 instead of playing.
Order after a rerun: `sh tb/run_all.sh` (needs the toolchains in the scratchpad, see `tb/README.md`), `sh build.sh`, `node tb/check_embed.mjs`.

## Provenance (copied with `cp -R` from the language page's `src/`, which was left unchanged)
| Here | From the language page | What |
|---|---|---|
| `tb/` (code, drill, narrow, zodlab, outputs, scripts) | `src/tb/` | whole; `gen_data.mjs` writes `22_js_tb_0data.js`; `run_one.sh` finds the topic root by walking up to `topic_programming_languages` |
| `parts/20_read_a.html` to `20_read_f.html` | `parts/40_tab_tb_read_a.html` to `_e`, `43_tab_tb_narrow.html`, `45_tab_tb_drill.html` (and the drill notes in `46_js_tb_drill.js`), `47_tab_tb_zod.html` | rewritten to the teaching contract |
| `parts/39_tab_more.html` | `parts/40_tab_tb_read_z.html` | Further reading, with the split's sibling pages |
New here: the hero diagram (compile time against run time, the zod schema straddling both), the "What differs from Python's typing" table (it replaces six "From Python" boxes), the new-terms list, and Python's `Never`/`NoReturn` row.

## Departures from the topic-child shape, and why
- **No lab tabs.** The Narrowing stepper explains one mechanism, so it sits inline in section 4; the LLM JSON lab is the evidence for section 7, so it sits there; the 20 drills became predictions in the sections that teach each one (8 in the core, 12 in closed "More drills" blocks), next to the six old predict-then-reveal boxes, so the core has 14 predictions. The drills' localStorage score is gone: a prediction reveals once, nothing is scored.
- **Code and outputs mostly closed.** A reader who knows Python's typing needs the claim and, for the surprising ones, the program as a question. So the core keeps the predictions (code shown, real output behind "Show the answer") and a few outputs that are the point (`31_narrow_err`, `33_exhaustive`, `43_satisfies`, `64_floating`, `70_zod_basics`); every other snippet is a closed block beside its claim.
- **Toolchain condensed.** Classes, `.d.ts`, vitest and the lint comparison keep one core sentence each; their full text and runs are closed. TypeScript 7 keeps the measured bars in the core; Microsoft's numbers, removed options and the 7.1 beta are closed.
- **Structured output is not taught here.** One sentence plus links: constrained decoding to Sampling and decoding, schema-to-tool plumbing in agent libraries to Typed agent libraries, SDK tool calling to the LLM apps sibling. The TypeScript-specific validation (zod, `z.infer`, `toJSONSchema` input against output, the LLM reply lab) stays here.

## Length judgement
| | Language page, Part 2 (all four tabs) | This page |
|---|---|---|
| Core reading (230 words a minute, `html_utils/audit_pages.mjs`) | 15,571 words, about 68 min (Reading 14,428 with every snippet and output open, labs 1,143) | 6,114 words, 26.6 min |
| Closed details | 737 words | 11,216 words, 48.8 min (mostly code and real outputs) |
The plan estimated 20 min. The extra is the price of keeping every topic of Part 2 with its evidence: the Python-difference table and the hero (about 4 min) replace six bridge boxes and the "In one screen" summary, the narrowing stepper's code panel and the LLM JSON lab grid are counted as words, and the 14 core predictions are the drills the plan asked to keep inline. Nothing familiar to a Python typing user is taught twice; each section keeps only what TypeScript does differently and the measured result. A further cut would have to drop whole subjects (tsconfig strictness, the unsound holes) that the ledger labels core.

## Ledger
`ledger.json`: 302 units of this page (core 189, depth 107, volatile 4 for the dated 7.1 beta and tsrs block, kept closed here; fat 2: the reading-time line and the section nav), `ledger.py check` problems 0. `from_master.json`: all 289 units of the language page's master ledger in Part 2's four tabs (274 owned by this page, 15 fat: the section nav, "How to use this part", the lab mentions, the predict prompt, cross-references to Part 1 sections and the old tabs, the drill tab's filter buttons, the Further reading headings).

## Added 2026-10-26 (essentials pass)
Section 8 gained the package.json `"exports"` map (a core paragraph sourced to the Node.js packages docs, and a closed block with an illustrative dual ESM and CommonJS layout and when TypeScript reads the map, sourced to the TypeScript modules reference), because the language child points here for publishing. Two ledger units added.

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node tb/check_embed.mjs`: 85 recorded outputs and 79 snippet references, all identical. Screenshots of the hero, both steppers, the lab grid and a prediction looked at in light 920 and dark 390.
