Source of the interactive HTML on the Notion page "Topic: benchmarks".

Build: `sh build.sh` writes `../index.html` from `parts/`.

Shape (agreed with Khalid 2026-10-04; rebuilt as a map 2026-10-24, below): an intuitive root of about 15 to 20 minutes (the rule recorded in `.claude/skills/explainer-page/page-kinds/topic-root.md`). The Reading tab combines both spines Khalid chose: how to read a benchmark number (lifecycle, then what a number leaves out: version, split, harness, sampling, answer key, contamination, index version, each with one real case) and the families in brief, each linking its child. "Benchmark methodology" is folded into the root. Tabs: Benchmark atlas (t-atlas), Saturation timeline (t-sat), Same model, many numbers (t-same), Further reading.

Part ownership (parallel build): `20_read*`, `2x_js_*`, `39_tab_more*` Reading and Further reading (ids `rd-`); `32_*` atlas (`at-`); `33_*` saturation (`sa-`); `34_*` same model (`sm-`). CSS scoped under each tab id.

## The 2026-10-24 close-out: the root rebuilt as a map (teaching contract)
After the seven children were rebuilt, the Reading tab was rebuilt with `rebuild-page.md`'s method as a map; the data tabs stay because each spans every family.

- **Top**: the core idea in one sentence; a static hero (`#rd-hero`): every family's chain of replacements, each benchmark coloured by status (saturated or retired, saturating, still discriminating); the three questions; "You need"; new terms.
- **Sections**: 1 the life of a benchmark (the MMLU against Terminal-Bench-Science stepper kept; it no longer plays on a mode switch); 2 **the families compared** (new: one table, a row per family with what a score measures, how it is graded, what bends its number most and what still discriminates, with each child's header time; every family's status line in a closed block); 3 **what a number leaves out** (new static figure `#rd-same`: one published same-weights pair per knob, eight knobs; each knob is now one orienting paragraph and a link to the child that owns its case; the error-bar widget kept; index version kept here); 4 **contamination and score inflation** (owned here: a new before/after figure `#rd-cont-fig` of published contamination effects, 67 points to none, the four signs, the defences, closed depth with the older evidence; then the five forms of gaming); 5 reading any score (seven questions, merged with the old Common mistakes); 6 the child pages as cards with their header times.
- **Retired** (each unit labelled `owned:<child>` with a key found there, or kept here): the ten family blocks (now the comparison table and the closed status lines; intuition owned by the children), the per-knob case detail (ARC-AGI-3 pairs, SWE-bench Pro V2, OSWorld scoring, Real-SWE, SchrodingerRepo, Hyper-tau-bench, HarnessDev, MOLE, Emergence World: owned by Knowledge and reasoning, Coding, Agentic, Safety), the Common mistakes section (merged into section 5).
- **Absorbed**: contamination evidence from Decontamination, PII and data governance (85.9, 92.2, Table 51, "memorization does not guarantee exploitation", MMLU 51.8 to 52.7) and Knowledge and reasoning (Testset Slot Guessing 52% and 57%; GPT-4 overlap 3.4% of ARC, 0.9% of WinoGrande).
- **Instruction following** (IFEval, IFBench, MultiChallenge) stays on Human preference and arenas (section 6, closed), beside the other judge-free and judge-graded stand-ins for preference; the comparison table gives it a row pointing there.
- **Tabs**: Same model, many numbers stays (its twelve cases span five families, and the gap calculator is used across them); its lead now points to Agentic section 3 for the harness-alone experiment, and its animation no longer starts when the tab opens. Atlas and Saturation timeline unchanged (FrontierMath v2 sizes, GSM1k v4 and the Vals AI Verified reading were already in the atlas). `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (key `bench-tab`). Further reading: child times and descriptions as their headers state, removed child tabs no longer named.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm) | 22.5 min (5,172 words) | 19.6 min (4,509 words) |
| Reading, closed details | 1.1 min | 5.7 min |
| Other tabs, core | atlas 31, saturation 13, same model 5, further reading 7 | unchanged (data tabs) |
| Visuals in Reading | 2 widgets | 2 widgets plus 3 static figures (hero, same-weights pairs, contamination) |

About 20 minutes is right for this root because, beyond the map, it owns three cross-cutting subjects no child carries: the protocol tuple (every knob, with the figure), contamination and score inflation, and the cross-family comparison. Everything family-specific is one orienting sentence and a link.

## Ledger
`ledger.json` (new): 389 units drafted from the pre-rebuild page; core 277, depth 50, owned 31, fat 31 (old navigation, old reading times, pointers to removed sections and child tabs, headings, wind-ups; each with a `note`). `python3 html_utils/ledger.py check` reports problems 0.

## Reading tab and Further reading (first build, 4 October 2026)

About 21 minutes (about 4,750 words at 230 wpm, counted on the same basis as the first build's 4,340; it grew when the seven children were linked and the families' status lines were reconciled with them), on Khalid's two spines (2026-10-04). Outline: one screen (three questions); the life of a benchmark (stages, then/now animation MMLU against Terminal-Bench-Science 0.1, replacement, aggregators); what a number leaves out (protocol tuple, then version, split, harness with who-ran-it, retrieval and cost, sampling with the error-bar widget, answer key, contamination, index version, subject); gaming; the ten families, each with a Go deeper note linking its child page with its reading time (seven children: Knowledge and reasoning, Math, Coding, Agentic, Long-context and multimodal, Human preference and arenas, Safety and honesty; multilingual and tool use have no page of their own and say where their benchmarks are covered); how to read the landscape; common mistakes. "Benchmark methodology" is folded in; its depth is kept in `for_children/methodology_depth.md`.

Files (since 2026-10-24): `parts/20_read.html` (CSS, the idea, hero, terms, life), `20_read_b.html` (families compared, what a number leaves out), `20_read_c.html` (contamination and score inflation, gaming), `20_read_d.html` (reading any score, child cards, closes the tab div); JS `21_js_rd_common.js` (skill template, never autoplays), `22_js_rd_life.js`, `23_js_rd_err.js`; `39_tab_more.html`. Checks: `python3 read/recompute.py && node read/check_read.mjs` (numbers in the JS against recompute, every control at 390 dark and 920 light). Coverage: `coverage.md` (old root, `live.md`), `coverage_methodology.md` (`live_methodology.md`). Visual ideas: `read/viz_ideas.md`.

## Reconciliation with the child pages (4 October 2026)
After the seven children were built, their verified facts were folded back: links (no "planned" left, no link to the old Math and coding page), family status lines, and atlas rows (owners per child; SWE-bench Verified Vals AI reading; FrontierMath v2 sizes; HLE tools effect by set; Terminal-Bench 4.0 task count and the StateM issue; GDP.pdf in the Reading; NIAH, MRCR, HarmBench, Arena rows; six new rows). The list is in `coverage.md`, last section. The atlas additions live in `atlas/rows_fix.py` ("child-page reconciliation").
