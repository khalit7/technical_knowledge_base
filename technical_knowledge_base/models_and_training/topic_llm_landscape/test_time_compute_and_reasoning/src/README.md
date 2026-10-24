# Source of "Test-time compute and reasoning"

Child of Topic: llm-landscape (prefix `ttc`, storage key `tc-tab`). Built 2026-10-24 from the root's "Deeper: test-time compute" tab (its parts, `src/ttc/` inputs, `recompute.py` and `viz_ideas.md` were moved here) and rebuilt to the teaching contract as a standalone child.

## Build and checks
- `sh build.sh` writes `../index.html` from `parts/` (template build).
- `python3 recompute.py`: every default the page reproduces (pass@k, Chen, majority and plurality votes with a brute-force check, best-of-n KL and gold reward, GRPO advantages and zero-signal share, KV and serial depth, Brown fits, the Beta preset, the cost example). Standard library only.
- `node src/check_controls.mjs index.html` (from the repo root): every button, range, select and closed block in 390 px dark (reduced motion) and 920 px light; fails on errors, NaN, sideways scroll, or any animation moving before the reader acts.
- `node src/shot_el.mjs`: element screenshots for review (one browser).
- `inputs/`: the fetched sources (moved from the root; `lightman2023_abs.txt` added). Ten are 0.9 to 1.5 MB text extracts, already committed under the root before the move.

## Tabs and parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles) to `20_read_z`; `30_js_ttc0_common.js` (`window.TTC`: helpers, sampling maths, the step-animation engine, now paused until the reader acts), `31_js_ttc1_anim.js` (one chain against five; depth by writing, looping, carrying state), `32_js_ttc2_widgets.js` (T slider, selectors, best-of-n, GRPO zero-signal, sharpening, Chen), `33_js_ttc3_curves.js` (selector bars, Yue chart; Brown fits for the lab), `35_js_ttc5_new.js` (hero, PRM beam-search stepper on `RD.anim`, cost slider), `21_js_rd_common.js` (template) |
| Benchmark sampling lab `t-lab` | `36_tab_lab_a.html` (styles), `36_tab_lab_b.html`, `34_js_ttc4_lab.js`, Brown fits in `33_js_ttc3_curves.js` |
| Further reading `t-more` | `39_tab_more.html` |

## What changed, and why
- **Shape**: core idea in one sentence; a static hero (one question, serial / parallel / latent, learned by RLVR, controlled by budget, effort or router); You need; eight new terms; nine sections in the subject's order.
- **Visuals inline**: the two animations, the selector chart, best-of-n chart, Yue's measured chart and the selector bars (from the old "Published curves" section) now sit beside their claims. The KV calculator became one slider (T) on the illustrative model, since KV sizing is owned by Long context (linked).
- **New content the brief asked this page to own**: process reward models (Lightman et al. abstract numbers, Snell et al.'s Monte Carlo PRM labels, a beam-search stepper of their Section 5.2 procedure, over-optimisation on easy questions); compute-optimal allocation by difficulty (Snell's takeaways, static three-panel diagram); budget forcing drawn as two trace strips; the cost of reasoning tokens (billed as output, Claude 3.7 Sonnet's $3 and $15, billed for full thinking not the summary, a one-slider cost figure, recomputed).
- **Moved to closed blocks**: Merrill and Sabharwal, Chen's estimator, Gao's RL form, vendor budget, effort and router details, GRPO zero-signal widget, the illustrative sharpening widget, RLT details, the GPT-6 Astra debate, the four mistakes.
- **Owned elsewhere, linked**: KV formula and calculator (Long context), serving techniques (Batching, KV cache and scheduling, the old "Inference techniques" label fixed), GRPO algorithm and PPO comparison (RL for LLMs), lab-by-lab controls and heavy tiers (the root, section 2), cost per task across labs (root section 6).
- **Never autoplay**: `makeAnim` starts paused and mode toggles no longer start playback; checked under both motion settings.
- **Tabs**: the Sampling lab stays a tab (a multi-section tool across a benchmark) with Brown et al.'s coverage fits beside it; its reproduction notes are now static text.

## Length judgement
| | Before (root tab, 2026-10-24) | After |
|---|---|---|
| Core | 7,218 words, 31.4 min (one tab, lab and curves included) | Reading 5,910 words, 26 min; lab tab 988 words, 4 min |
| Closed | 98 words | 1,665 words, 7 min |
| Visuals inline | 9 (all in one deep tab) | Reading 8, lab 3 |
The core of the subject fell from 31 to 26 minutes of Reading (30 with the optional lab) while gaining four sections the old tab lacked (PRMs, compute-optimal allocation, how long to think as its own section, cost). The ledger is 164 core against 36 depth units, and each section is one claim, its figure and its numbers; shorter would drop a mechanism the brief assigns to this page.

## Ledger
`ledger.json`: 208 units: 186 carried from the root's t-ttc units (`source_id` is the root ledger id, `tab` `absorbed:landscape t-ttc`) and 22 added by hand (script-drawn captions and the new content). core 164, depth 36, owned 1 (the PPO critic paragraph, RL for LLMs), fat 7 (old tab navigation and lead-ins). Problems 0.
