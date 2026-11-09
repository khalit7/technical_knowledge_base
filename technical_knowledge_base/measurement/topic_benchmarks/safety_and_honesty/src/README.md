# Source of the Safety and honesty benchmarks page

Child of Topic: benchmarks. Built 2026-10-04 as a new page; rebuilt 2026-10-24 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and checks
- Data: `sh fetch_inputs.sh` (downloads XSTest into the gitignored `inputs/raw/`), `python3 mk_data.py` (writes `parts/22_js_data.js`: XSTest prompts, labels from three graders for five configurations, short excerpts for two; HarmBench ASR tables from `inputs/harmbench_asr_raw.csv`).
- Build: `sh build.sh` (the skill template, plus `02_css.html` and `03_css_page.html` after the head). Header minutes are set by hand in `10_header.html` from `html_utils/audit_pages.mjs`.
- Checks (from `src/`): `node checks/check_page.mjs` (every control at 390 dark and 920 light, every closed block opened, the abstention toggle, the HarmBench block; confirms the XSTest animation has not moved before the reader acts; 358 actions, 0 problems on 2026-10-24; dumps the page's computations to `checks/js_out.json`), then `python3 recompute.py` (ALL OK on 2026-10-24: XSTest Tables 1 and 2 for all five configurations, the string-match rule against all 2,250 released labels, the grader table and note, animation counters, HarmBench readings, Spearman, and the SimpleQA table scored four ways, static and in the toggle), `python3 mk_coverage.py` (37 of 37), `sh html_utils/checkpage.sh <page>` and `python3 html_utils/ledger.py check <page>` (problems 0). `checks/shots.mjs` takes element screenshots.
- `ledger_keys.py` drafted the ledger's keys and labels against the rebuilt page (adapted from the Agentic sibling); labels were then reviewed by hand, and units whose numbers now live only in the dated table were relabelled volatile.

## Shape (2026-10-24)
Tabs: Reading, Check every XSTest prompt (a dataset tool used by sections 1 and 2), Further reading. Storage key `bench-safety-tab`. Prefixes: `xa` XSTest animation, `gr` grader table, `hb` HarmBench, `xs` XSTest tab, `sh` the new Reading visuals (`27_js_sh_vis.js`).

Reading, thirteen numbered sections:
- **Top**: the core idea in one sentence (four questions, every number beside its mirror); a static hero (four quoted numbers beside their mirrors, each from a later section); "You need" with the owners linked; new terms.
- **1 Refusal**: XSTest construction, the before/after animation on real answers (unchanged, now paused until the reader acts) with a predict prompt; lab pairs named, values moved to the dated table; OR-Bench, PHTest, FalseReject closed.
- **2 Who grades**: new dot chart (three graders, five configurations) computed from the released labels; the exact table closed; HarmBench's judge agreement; StrongREJECT's formula.
- **3 Jailbreaks**: HarmBench and the one-model-many-ASRs chart; the former Attack matters tab as a closed block (heatmap and bump chart); StrongREJECT, JailbreakBench, adaptive campaigns measured as success against attempts; AIR-Bench and HELM Safety closed. Measurement only.
- **4 Agents**: AgentHarm as a new dumbbell chart (table closed); MOLE with its visible correction; Emergence World; Agent security and trajectory evaluation linked.
- **5 Facts and abstention** (new ownership): TruthfulQA's formats with a new chart of methods that never see the question; SimpleQA's launch table under four scoring rules (new toggle) with the formulas, AA-Omniscience's definitions (read 2026-10-24); the full table closed.
- **6 Honesty**: MASK's own pipeline figure (CC BY 4.0, `img/`), the formula, P(lie) bars, splits, DecepEval.
- **7 Sycophancy**: SycEval's progressive and regressive split and "Are you sure?" as a chart; Sharma's probes; the GPT-4o rollback; other tests closed.
- **8 Bias**: BBQ's own example set redrawn as a 2 by 2 diagram; the two scores.
- **9 Dangerous capabilities**: a new format-ladder diagram (biology and cyber); WMDP, VCT, Cybench; uplift trials with a new chart against Anthropic's pre-set lines; the cyber replacements, internal ladders and Draguns et al. closed.
- **10 Third-party testing**: a compact table (evaluator, what, access and window).
- **11 Thresholds**: the framework table (unchanged).
- **12 Scheming and awareness**: a new three-panel chart (stated belief, anti-scheming before and after, audits against real sessions); the scenario suites closed; the Hugging Face incident box.
- **13 Reading a safety score**: nine questions, each with this page's case (replaces Common mistakes and the Checklist); **the dated readings** (the old In one screen table plus every volatile card and leaderboard value) closed.

Removed: the Attack matters tab (one mechanism; now inline and closed), the In one screen table (now the closed dated table), the Common mistakes list and the Checklist (merged), the ownership box (now "You need").

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm) | 32.6 min | 27.9 min |
| Reading, closed details | 0 | 9.1 min |
| Other tabs, core | XSTest 19.0 + Attack matters 4.3 (+ Further reading 2.5) | XSTest 19.0 (+ Further reading 2.8) |
| Visuals drawn in Reading (audit count) | 2 inline, 1 in tabs | 14 inline (13 drawn, 1 real figure) |

Why 28 minutes is right: the page owns about twenty benchmarks across four different questions (refusal and jailbreaks, factuality and honesty, dangerous capability with its thresholds, behaviour under observation), and the core keeps for each only its construction, its grader, what broke and what its number means, with corrections visible. A new section (factuality and abstention) was added because the page now owns hallucination-rate and abstention scoring. Captions now carry what prose used to describe. Everything not needed on first read (the HarmBench explorer, larger over-refusal sets, regulatory sets, judge selection, OpenAI's StrongREJECT history, the scenario suites, the cyber replacements, the hidden-capability limit, every volatile reading) is closed. The XSTest tab's 19 minutes are its 450-prompt list, a dataset, not prose.

## Knowledge ledger (`ledger.json`, problems 0)
295 units: core 249, depth 32, volatile 10 (all in the dated table), fat 4 (old header minutes and tab names, the old section navigation, one wind-up; each carries a `note`). 286 drafted by `ledger.py init`; 9 added by hand for the new SimpleQA scoring, AA-Omniscience, the BBQ example, the MASK figure and the uplift lines.

## Inputs (read 2026-10-04 unless marked)
XSTest repository (prompts CC BY 4.0; completions under the model owners' licences, only labels and short excerpts extracted), HarmBench appendix tables transcribed from arXiv 2402.04249v2 (`inputs/harmbench_asr_raw.csv`), SimpleQA Table 3 (arXiv 2411.04368, rechecked 2026-10-24), BBQ Figure 1 (ACL Findings 2022, CC BY 4.0, read 2026-10-24), the AA-Omniscience page (read 2026-10-24). Image: `img/mask_pipeline.webp`, credits in `img/CREDITS.md`. Research notes from papers, leaderboards (Scale MASK, HELM AIR-Bench, Artificial Analysis) and system cards (Claude Opus 4, Sonnet 4.5, Mythos Preview, Opus 5.5; GPT-5, 5.2, 5.4, 5.5, 5.6 Preview, 6 Astra, 6.1 Sol) are cited inline.

Root data reused: `../../src/data/atlas.json` (safety rows, corrections, dated readings); MOLE and Emergence World paper pages for corrected facts.

## 2026-11-09: split layout, three 3D stages, explained and autoplaying step lists (the 2026-11-06 rollout)
- **Templates** `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `bench-safety-tab`) copied unchanged; `build.sh` cats `02_split.html` after `03_css_page.html`. The page's own helpers that the template lacks (`RD.pct`, `RD.n`, `onRender`/`onResize` with a tab, script-written tab links) moved to `21b_js_rd_page.js`. No 2D step animation is left, so `RD.anim` is unused.
- **Three stages**, each with an `ol.sx` step list on the left and no per-step caption; scenes publish what they compute in `window.SHN`, which `check_stages.mjs` compares with the step lists and `recompute.py` recomputes from the raw label files:
  - Fig. 1 `stg-xs` (`31_js_sc_xs.js`, 3 model modes of 5 steps) replaces the 2D squares animation of section 1: the 250 safe prompts and the 200 unsafe contrasts as two fields of cubes in eight family rows, lit by the human labels (flat green right call, half-height yellow partial, tall orange wrong call); the worst row in close-up (chosen by the data: safe contexts for Llama 2, the contrasts of definitions for Mistral, privacy for GPT-4); the two failure rates as bars fed by flows. The per-family captions and their example pairs moved into a closed block, "One pair from each family" (`23_js_xsanim.js` now fills it; the tap-a-square detail is gone, the XSTest tab has every prompt).
  - Fig. 2 `stg-gr` (`32_js_sc_gr.js`, 2 model modes of 6 steps): one model's 450 answers as a block read in turn by string match, the GPT-4 classifier and people, each a flat glass plate carrying its two refusal rates, then each automated grader's disagreements with people raised out of the block. New computed facts in the step lists: disagreement counts and their label breakdown.
  - Fig. 3 `stg-ag` (`33_js_sc_ag.js`, 5 steps) replaces the AgentHarm dumbbells: the transcript plate (what the agent says, read by the refusal judge) against the environment plate (what it does, read by the rubrics), a labelled schematic; then the paper's Table 2 and 3 values as a butterfly on the floor (refusal left, harm score right), no attack, with the template, and tasks not refused against benign twins. Data `window.SHD.ah` in `27_js_sh_vis.js`, checked against the closed table.
- **Splits**: the idea (hero), 1 (Fig. 1), 2 (Fig. 2; then the five-configuration dot chart beside the HarmBench and StrongREJECT text), 3 (HarmBench text beside the one-model-many-ASRs chart), 4 (Fig. 3), 5 (TruthfulQA beside its chart; SimpleQA abstention beside the four-rule toggle), 6 (MASK figure and P(lie) bars), 7 (SycEval chart), 8 (BBQ diagram), 9 (format ladder; uplift chart), 12 (awareness panels). Full width: the closed explorers and lists, MOLE and Emergence World, 10 (a table), 11 (a table), 13 (checklist and dated table), the XSTest tab (a reader-driven tool).
- **Kept 2D**: the hero (four pairs of numbers on one axis), every bar and dot chart (TruthfulQA, SimpleQA under four rules, MASK, SycEval, uplift lines, awareness panels, the five-configuration grader chart, HarmBench ranges, the heatmap and bump chart), the BBQ 2 by 2 and the format ladder (structure that reads flat), every table.
- **Checks**: `check_stages.mjs` (new: autoplay in view, last step in every mode, list lengths, off-screen and reduced-motion stillness, splits, step-list numbers against `SHN`, AgentHarm scene data against the table; problems 0); `checks/check_page.mjs` now steps the three stages in every mode instead of the removed `xa-ctl` controls (its never-autoplay assertion is gone; autoplay is asserted in `check_stages.mjs`), 386 actions, 0 problems; `recompute.py` checks the Fig. 1 counts and worst rows and the Fig. 2 counts, rates and disagreements from the raw CSVs (ALL OK, 68 checks); `checks/shots.mjs` shoots the stages.
- **Ledger**: 305 units (core 258, depth 32, fat 5, volatile 10; problems 0): the tap-a-square instruction became fat (the interaction is gone), the AgentHarm caption's key moved to the step list, 6 units added by hand for the new computed step-list facts.
- **Length**: Reading core 29.6 to 34.9 min (6,802 to 8,033 words; the audit counts all three hidden mode lists of Fig. 1 and both of Fig. 2, so one reading path is about 3 min shorter), closed 9.2 to 13.1 (the pair block, now static and counted), XSTest tab 19.0 and Further reading 2.8 unchanged. Nothing was cut; the growth is the step lists, which explain each stage and carry what the old script captions said.
