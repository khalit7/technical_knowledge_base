# Brief template: one entry per root agent (setup, labs, map, Reading)

Purpose: the fill-in format for `{{PREFIX}}_tabs.md`, the file that gives each agent building the root its own job, one entry per agent, read together with the topic's common brief ([common.md](common.md)).

## How to fill it
- One entry per agent, in launch order: setup first, then the labs, the map, the Reading tab. Every agent skims the other entries so data, code and links serve everyone.
- Entry header: `== {{PREFIX}}-<key> | NAME (files owned, id prefix, notes folder). ` then the body in plain prose, one paragraph (a numbered list for setup).
- A lab entry names: what to teach from zero (the concepts in teaching order, each with its problem and mechanism), what to measure on the running example (with sizes that keep runs to minutes), what to read in source at pinned versions, and what to show in-page (at least one before/after on the same input, plus explorers or calculators over recorded runs).
- Placeholders as in [common.md](common.md). Keep the scratch path out of the repo.
- Typical root: five labs plus a tool or model map; tab keys `t-read`, `t-<lab>` x5, `t-map`, `t-more`; parts `31_` to `36_`.

---

## Entry: setup (always first; heavy; writes no page parts)

```
== {{PREFIX}}-setup | SHARED SETUP AND RUNNING EXAMPLE (writes {{SCRATCH}}/{{PREFIX}}/{venv,data,src,SETUP.md,FACTS.md} and the root's src/data/; no page parts). {{MACHINE_NOTE: "GPU under the bench lock only for short smoke tests" | "CPU only, nice -n 15, 4 threads"}}.
1. Env {{SCRATCH}}/{{PREFIX}}/venv: {{PACKAGES}}. Record exact versions with release dates (PyPI) in SETUP.md and FACTS.md. Check what each later lab needs actually imports and runs (one tiny call each); record what works and what does not.
2. Data: {{DATASET_CHOICE}} (choose and justify: small, public, clear licence, fast to train on). Fixed splits, a fixed small test set (thumbnails or extracts committed in src/data/), recorded URL, licence and sha256. Baselines the labs will compare against (for example a metric floor) computed once here.
3. Models (inference only unless tiny; in ~/.cache/huggingface): {{MODELS}}. Check licence, size and revision. Smoke-test each once (under the bench lock if GPU): time and peak memory, recorded.
4. Source: shallow clones at pinned tags or commits in {{SCRATCH}}/{{PREFIX}}/src under the download lock: {{CLONES}}. Record URL, ref, commit sha and date. Measure size before cloning anything large.
5. Shared code in the root's src/data/: loaders, the running example's model(s), a common training loop with fixed seeds and logged losses, plotting or thumbnail helpers; paths via an env var such as {{PREFIX_UPPER}}_SCRATCH, never hard-coded user paths. Train nothing big: one short smoke run of each model to prove the loop.
6. Write: src/data/README.md (the running example, data, models with licences and sizes, shared code, how labs take locks, measured smoke-test times and memory, known caveats), src/data/manifest.json (files, sizes, sha256), {{SCRATCH}}/{{PREFIX}}/FACTS.md with a "setup" section, and {{SCRATCH}}/{{PREFIX}}/SETUP.md ending with the line READY. Then report.
```

## Entry: one lab (repeat per lab)

```
== {{PREFIX}}-{{KEY}} | {{LAB NAME}} (parts/{{NN}}_*, ids {{IDP}}-, notes src/{{KEY}}/). {{CONCEPT}} from zero: {{CONCEPTS IN TEACHING ORDER, each with the problem it solves, how it works, the cost, when it matters}}. Read {{LIBRARY FILES}} at the pinned version (file:line). Measured on the running example: {{RUNS: small, minutes not hours, under the bench lock if GPU; sweeps over one movable parameter; failures reproduced on purpose with their real error messages}}. Published: {{PUBLISHED NUMBERS to cite, labelled and dated; "not run here" with the reason for anything too expensive}}. In-page: {{BEFORE/AFTER ANIMATION on the same input}}, {{EXPLORER OR SLIDER over recorded runs}}, {{CALCULATOR or predict-then-reveal drill}}. Common mistakes with real error messages. Data budget about {{LAB_DATA_KB}} KB.
```

Real examples of the body (2026-10-17, generative topic): "the same image noised along the forward process (before/after slider), the same noise denoised through 1/4/20/50 steps (animated), a guidance-scale strip, a schedule explorer (SNR curves)"; (2026-10-15, JAX topic) "the same Python function before/after tracing into a jaxpr (animated, line by line), a 'will this recompile?' predict-then-reveal drill with real recompile counts".

## Entry: tool or model map (light; no heavy runs)

```
== {{PREFIX}}-map | {{TOOL MAP | MODEL MAP}} (parts/36_*, ids {{IDP}}-, notes src/map/). Light agent, no GPU, no heavy runs. The landscape with status (alive, maintained, deprecated, archived), dated and sourced: {{CATEGORIES AND NAMES}}. For each: one line on what it is, owner, licence (open weights vs open source vs closed; non-commercial clauses), latest release and date, status with a primary source, what it actually does inside (verified in source or docs), and when to choose it. Small real checks where cheap (install in a separate env {{SCRATCH}}/{{PREFIX}}/mapenv, not the shared venv; confirm version and import); label everything else "from docs" or "from source". If a check needs the shared env, script it as pending and say so in your report; never wait for READY. In-page: a filterable table, a timeline coloured by family, a "which one for which job" picker with reasons.
```

## Entry: Reading and Further reading (light; starts with setup)

```
== {{PREFIX}}-read | READING and FURTHER READING (parts/20_read*.html, 2x_js_*.js except 21_js_rd_common.js, 39_tab_more.html, ids rd-, notes src/read/). FIRST save the old root and its children verbatim to src/read/old/ (Notion fetch, read only, copied with a script, never retyped; or, if Notion is disconnected, write src/read/coverage.md as a TODO) and mark each old fact verified, corrected or unconfirmed in src/read/coverage.md. Spine: {{ONE SENTENCE SPINE, for example "follow one question from words to vectors to the prompt"}}. Teach the whole topic from zero at root depth (comparisons plus definitions; as tight as clarity allows; state the reading time; aim for 15 to 30 minutes and flag anything longer): {{SECTIONS}}, choosing, common mistakes, and interview questions including design ones ({{TWO DESIGN QUESTIONS}}). Each section links its lab tab ({{text|#t-key}}), its child page (plain text until ids exist; list every such mention in src/read/links_todo.md) and the neighbouring pages by id. Numbers from the labs: leave numbered TODOs in src/read/todo.md and fill them when the lead resumes you with the labs' out/ files. Further reading: dated, timed links, vendor vs independent labelled.
```

## Launcher prompt for a root agent
"You are the {{ROLE}} agent for the knowledge-base topic {{TOPIC_TITLE}}. Scratchpad: {{SCRATCH}} (call it $S; never write this path into the repo). Read $S/{{PREFIX}}_common.md in full (RESOURCE SAFETY overrides everything), then do the section `== {{PREFIX}}-{{KEY}}` of $S/{{PREFIX}}_tabs.md (skim the other sections). Your prefix: {{IDP}}. {{ONE OR TWO LINES specific to this launch: what to reuse, what is still running, when READY is expected}}. Report once, when done: what you built, runs, check results, reading time, and suggestions for other tabs and FACTS.md."

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 9ee6d1ea, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

`gm_tabs`, `jx_tabs`, `dc_tabs`, `rag_tabs`, `pt_tabs` briefs (2026-10-12 to 2026-10-17) and the lead's launcher prompts for the generative setup and Reading agents (2026-10-17); memory logs of the RAG topic (map agent idling for READY) and data curation topic.
