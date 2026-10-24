# RL for LLMs: RLHF, GRPO, RLVR: page source

Notion: https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56, a child of Topic: rl. `sh build.sh` writes `../index.html`, the whole page. The old written page is saved verbatim in `live.md` (fetched 4 October 2026); its earlier interactive embed in `inputs/old_embed.html`. The Notion page has no child pages, databases or video; its only non-text block is that old embed (`<embed ...>Interactive: RL for LLMs: RLHF, GRPO, RLVR</embed>`), which the new HTML replaces.

## Shape

`.claude/skills/explainer-page/page-kinds/topic-child.md`, rebuilt on 24 October 2026 to `teaching/teaching-contract.md` (see "The 2026-10-24 rebuild" below). Reading tab in the subject's own order: the idea in one screen (core sentence, hero, you need, new terms, comparison table); 1 the token MDP; 2 PPO for RLHF; 3 GRPO and RLOO; 4 one real response, three updates; 5 RLVR and verifiers; 6 R1; 7 GRPO's fixes (Dr. GRPO, DAPO, entropy, CISPO, GSPO); 8 off-policy corrections and the measured mismatch; 9 pass@1 against pass@k; 10 reward hacking specific to LLM RL; 11 agents; 12 infrastructure; 13 which when; 14 depth (mistakes, checklist, the unverified RLCD box), all closed. Tabs: Reading, Real rollouts (the per-answer dataset view), Further reading.

Departure: the page's "real data" is generated for it. No public dataset gives per-token log-probabilities under several numerical set-ups with verifier verdicts and reward-model scores on the same responses, so `rollouts/` samples 160 responses from Qwen2.5-0.5B-Instruct on ten GSM8K test problems and records all of it. A 0.5B model and grade-school maths keep it small enough to run on a laptop; the page says where that limits what the numbers show (magnitudes of KL and mismatch, response lengths).

## What is reused, linked, or new

- Reused from `../../src/for_children/reading_full/` (section 18 and helpers): the step-animation controller (`22_js_rd_common.js`, now `parts/22_js_common.js` with per-tab rendering), the GRPO group widget (`29_js_rd_llm.js`, now `parts/25_js_group.js`, with real groups and lengths added as presets and the advantage spread computed by `tokenWeights`), section 18's text (InstructGPT, DeepSeekMath and R1 numbers and corrections), and `groupAdv` from its engine.
- Not reused: reading_full's PPO clipped-against-unclipped widget and its policy-gradient baseline widget. Both teach the generic mechanism, which belongs to Policy gradients and actor-critic; this page's rare-token toy (section 7) is the LLM-specific successor of the PPO widget (same idea: repeated steps on one sample, clip on and off) extended to clip-higher and CISPO.
- Linked, not rebuilt: "Same batch, three algorithms" and the KL leash (training topic, Axes 3 and 4); PPO against GRPO, six methods trained live, "Then and now" (DeepSeekMath page); a tiny R1-Zero (R1 page); the RLHF pipeline (InstructGPT page); DPO family and RLVR lineage (Alignment); case gallery and over-optimisation curves (Reward Hacking); sandboxes (DSec page); the root's Method atlas and Milestones tabs.
- New: the before/after animation on a real response (PPO-RLHF with a real reward model and Monte Carlo values against GRPO with a verifier, and Dr. GRPO); the rare-token toy; the synchronous/asynchronous timeline on real lengths; pass@k crossing; k3 on real tokens; the verifier comparison, mismatch histograms and reward-model scatter on real data; the hero (2026-10-24).
- No longer linked as existing (2026-10-24): "the KL leash animated on the training topic's Axis 4" (gone); the leash is now linked to Reward Hacking section 2, the RL loop figures to Alignment sections 4 and 7, the general clip and GAE to Policy gradients and actor-critic sections 9 and 6.

## Files

- `parts/`: `01_head.html` (Topic: rl's CSS), `02_css.html` (animation CSS, unscoped, plus this page's), `10_header.html`, `20_read_a/b/c.html` (a: top and sections 1 to 3 with the Reading tab's scoped style; b: 4 to 8; c: 9 to 14, closes the tab), `21_js_engine.js` (pure functions), `21_js_rd_common.js` (the skill template, unchanged: `RD.anim` never autoplays), `22_js_common.js` (this page's helpers: `RD.onRender`/`RD.onResize` with a tab id, number formats, `RD.t` with a 10.5 px floor), `23_js_data.js` (generated), `23_js_hero.js` (the hero), `24_js_one.js` (section 4), `25_js_group.js`, `26_js_clip.js`, `27_js_small.js` (k3, overlong, pass@k, worked-example numbers, checklist), `28_js_async.js`, `30_tab_roll.html` and `30_js_roll.js` (Real rollouts tab, plus the reward-model scatter now in section 10), `31_js_ver.js` (section 5's verifier table and cases), `32_js_mis.js` (section 8's mismatch card), `39_tab_more.html`, `99_js_tabs.js` (the skill template, storage key `rl4llm-tab`).
- `rollouts/`: `dl.py` (model downloads), `rollouts.py` (sampling and log-probabilities; `rollouts_lib.py` holds the verifiers), `rollouts_rp.py` (the stray repetition-penalty variant), `rm_score.py`, `mc_values.py` (Monte Carlo prefix values), `mk_data.py` (writes `parts/23_js_data.js` and `inputs/rollouts_extract.json`). Run with `uv run --with torch --with transformers --with accelerate`, 2 CPU threads plus Apple MPS; about 40 minutes in all. The full `rollouts.json` (every token's log-probabilities, several MB) is not committed.
- `recompute.py` then `node check_engine.mjs`: every closed-form number and toy, recomputed in Python and compared with the page's engine.
- `check_page.mjs` (from the repo root): every control in light 920 and dark 390, reduced motion, text checked for NaN/undefined, then a normal-motion pass that scrolls every animation into view and fails if any moved by itself; element screenshots in `../.shots/`.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`); it supersedes `coverage.json` (kept, needles updated to the new wording).
- `mk_coverage.py`: `coverage.json` against `live.md`.
- `inputs/`: `old_embed.html` (the previous interactive embed, for coverage), `recompute.json`, `rollouts_extract.json`, `ver_notes.json` (notes on the real verifier disagreements).

## The 2026-10-24 rebuild: what changed and why

- **Top**: the core idea in one sentence; a new static hero drawn from real data (`23_js_hero.js`): one wrong 242-token answer, the verifier's 0 at its end, and the per-token credit under PPO (measured critic, GAE with λ = 1, KL left out), GRPO (−0.775 on every token) and Dr. GRPO (−0.375); "You need" (Policy gradients and actor-critic sections 4, 6, 9; Alignment sections 4 and 7); new terms; the comparison table. The "what this page owns" box became one links sentence.
- **Order and inline visuals**: the before/after animation moved from section 5 to 4, right after the two methods it compares; RLVR became section 5. The Verifier gallery tab became section 5's three-checker comparison (agreement table inline, the eight real disagreements in a closed block, the documented failures merged into the verifier table); the Rollout mismatch tab became section 8's histogram with TIS and MIS sliders and the sequence-ratio chart; the reward-model scatter moved from Real rollouts to section 10, beside the claim it measures. Concrete numbers now come before the formula in section 3 (worked group, group widget, then the objective).
- **Ownership** (OWNERS.md): the general clip and GAE are taught on Policy gradients and actor-critic and linked (sections 9 and 6); only the LLM-specific use stays (shaped reward, telescoping with γ = λ = 1, the clip's effect on rare tokens). The leash is linked to Reward Hacking section 2 (the old "KL leash animated on the training topic's Axis 4" no longer exists). Absorbed from Alignment section 4: MiniMax's own phrase for CISPO, "clips importance sampling weights rather than token updates". Entropy collapse got its own subsection with the clip asymmetry as its mechanism and the rare-token toy as its visual.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the four mode toggles no longer start playback.
- **Closed depth**: InstructGPT's lineage, results and corrections; the clip on the worked example, published settings and the std convention; the real verifier disagreements; router drift and the low-precision recipes in detail; the rest of the pass@k evidence; agentic recipe details (SWE-2's numbers, multi-objective, Mercor); environments and the ScaleRL recipe; mistakes, the checklist and the unverified RLCD box.
- **Deleted as fat** (18 ledger units): navigation, the old tab bar and reading-time line, wind-ups, pointers to the removed tabs, and four mistakes that restated a section (length normalisation, pass@1 as capability, trusting the verifier).
- **Fixed**: the uniform-group count printed before scripts ran said 3 of 10; the data says 4 of 10 (the script already printed 4). Reward Hacking's section names had changed ("Verbosity...", "Read the chain of thought...") and are now cited by number.
- **Images**: none. This is a mechanism page; every figure is a diagram or a chart of the page's own data, and no photo or paper figure would teach more than they do.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 45.5 min | 41.7 min |
| Reading, closed details | 1.9 min | 11.2 min |
| Other tabs, core | Real rollouts 2.4 + Verifier gallery 5.3 + Rollout mismatch 1.5 = 9.2 min | Real rollouts 1.8 min |
| Core total, excluding Further reading | 54.7 min | 43.5 min |
| Visuals drawn in Reading | 8 | 12 |

Why about 42 minutes is right: the page owns a whole family of algorithms (PPO for RLHF, GRPO, RLOO, Dr. GRPO, DAPO, CISPO, GSPO), verifiable rewards, the engine/trainer mismatch with its corrections and low-precision rollouts, entropy collapse and pass@k, each with its numbers and a picture, and it absorbed two tabs (the verifier comparison and the mismatch measurement) into the sections that explain them. About an eighth of the core words are captions and counters of the visuals. What made it long and is not needed on first read (provenance, published settings, per-case verifier disagreements, the second-tier evidence on pass@k, agentic and infrastructure recipe detail, mistakes, the checklist) is now closed, which is why the closed time grew.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
419 units: core 265, depth 135, fat 18, owned 1 (the RLVR lineage, AlphaCode to Olmo 3 RL-Zero, carried by Alignment section 7). 405 were drafted from the old page by `ledger.py init` (run on the committed page); 14 were added by hand for script-rendered numbers (hero, verifier agreement, mismatch statistics, rare-token toy, pass@k toy, reward-model scatter, async timeline, the per-answer table), the absorbed CISPO unit and the owned lineage unit. Keys were matched against the rebuilt page's static text; fat units carry a `note`.

## Checks

Last build, 24 October 2026: `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0, 3 tabs, 254 KB; `check_page.mjs` 590 actions, 0 problems (both themes, 920 and 390 px, reduced motion; no autoplay under normal motion); `check_engine.mjs` PASS (42 checks against `recompute.py`); `mk_coverage.py` 134 of 134 facts of `live.md` found; `ledger.py check` problems 0.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; Fault tolerance at scale and the DSec paper page quoted as their headers; ledger keys that quoted old times re-keyed.
