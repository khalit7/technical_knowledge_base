# The recorded TypeScript runs (key `tb`)

Copied with `cp -R` from the language page's `src/tb/` (Part 2 of the old JavaScript and TypeScript page), which stays unchanged. Every code block, error and output on this page comes from here.

## Reproduce
- `run_all.sh`: runs every snippet in `code/` and `drill/` with `run_one.sh` (a fresh work dir in the session scratchpad, `tsconfig.base.json`, tsc 7.0.2 then node 22.22.2), `extra.sh` (the npm ERESOLVE), `zodlab/run.sh`, `gen_narrow.mjs`, then `gen_data.mjs` writes `../parts/22_js_tb_0data.js`.
- `bench.sh`: the timings (tsc 7.0.2 against 6.0.3 on zod 4.6.5's sources; node, tsx and bun start-up). Not in run_all (minutes, load-dependent).
- `check_embed.mjs`: confirms the built page embeds exactly `outputs/`.
- Toolchains live in the session scratchpad `pl/tb` (the TypeScript 7 project) and `pl/tb/eslint6` (TypeScript 6.0.3 + ESLint + typescript-eslint, which cannot install next to TypeScript 7). Versions in `versions.txt`. Nothing was rerun for this page: `gen_data.mjs` was run once on the copied outputs and its file is byte-identical to the language page's `40_js_tb_0data.js`.
- `run_one.sh` links the topic root's `src/rosetta/data/chat.jsonl` for `75_count_tokens`; it finds the root by walking up to `topic_programming_languages`, so the folder can sit at any depth.

## Snippet directives
`// run: no|always`, `// check: no`, `// cfg: {json merged into compilerOptions}`, `// cmd: ...`, `// file: name`, `// nm: eslint6`, `// data: chat`. Helper files: `code/<name>__<file>`. Directive lines are removed before compiling, so line numbers in errors match the page.

`coverage.json` and `viz_ideas.md` here are the old Part 2's records (the old Notion page's facts and where they went; the visuals built and rejected), kept as provenance.
