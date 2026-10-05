# Part 2: TypeScript (key `tb`)

Part 2 of the JavaScript and TypeScript page: TypeScript from zero for a Python programmer.
Files: `../parts/12_tabs_tb.html` (tab buttons), `../parts/40_tab_tb_read_{a..e,z}.html` (Reading), `43_tab_tb_narrow.html`, `45_tab_tb_drill.html`, `47_tab_tb_zod.html`, and JS `40_js_tb_0data.js` (generated), `41_js_tb_core.js`, `42_js_tb_read.js`, `44_js_tb_narrow.js`, `46_js_tb_drill.js`, `48_js_tb_zod.js`.

Tabs: `t-tb-read` (Reading, sections `tb-one` .. `tb-more`), `t-tb-narrow` (Narrowing stepper), `t-tb-drill` (Will it type-check?), `t-tb-zod` (LLM JSON lab).
Stable anchors Part 3 can link: `#tb-setup` (tsconfig), `#tb-zod` (zod, LLM JSON, toJSONSchema), `#tb-narrow` (discriminated unions), `#tb-async`, `#tb-lint`.

## Reproduce
- `run_all.sh`: runs every snippet in `code/` and `drill/` with `run_one.sh` (fresh work dir in the scratchpad, `tsconfig.base.json`, tsc 7.0.2 then node 22.22.2), `extra.sh` (npm ERESOLVE), `zodlab/run.sh`, `gen_narrow.mjs`, then `gen_data.mjs` writes `../parts/40_js_tb_0data.js`.
- `bench.sh`: the timings (tsc 7.0.2 vs 6.0.3 on zod 4.6.5's sources; node/tsx/bun start-up). Not in run_all (minutes, load-dependent).
- `check_embed.mjs`: confirms the built page embeds exactly `outputs/`.
- Toolchains live in the session scratchpad `pl/tb` (TypeScript 7 project) and `pl/tb/eslint6` (TypeScript 6.0.3 + ESLint + typescript-eslint, which cannot install next to TypeScript 7). Versions in `versions.txt`.

## Snippet directives
`// run: no|always`, `// check: no`, `// cfg: {json merged into compilerOptions}`, `// cmd: ...`, `// file: name`, `// nm: eslint6`. Helper files: `code/<name>__<file>`. Directive lines are removed before compiling, so line numbers in errors match the page.

## Departures from the method
One part of a multi-part page, so no own Further reading tab: a Further reading section closes the Reading. Narrowing probes: a line that held only a probe marker shows `// what is x here?` on the page.
