# RL for LLMs: RLHF, GRPO, RLVR: page source

Notion: https://app.notion.com/p/3c65c17b0d0d818c9bcff7177325fe56, a child of Topic: rl. `sh build.sh` writes `../index.html`, the whole page. The old written page is saved verbatim in `live.md` (fetched 4 October 2026); its earlier interactive embed in `inputs/old_embed.html`. The Notion page has no child pages, databases or video; its only non-text block is that old embed (`<embed ...>Interactive: RL for LLMs: RLHF, GRPO, RLVR</embed>`), which the new HTML replaces.

## Shape

Part B of `html_utils/methods/topic_pages.md` (a child page): Reading tab in the subject's own order (in one screen; the token MDP; RLHF with PPO in full; GRPO and RLOO; RLVR; a before/after animation on one real response; R1; the 2025 to 2026 corrections; off-policy corrections; teach or elicit; reward hacking specific to LLM RL; agents; infrastructure; which when; mistakes; checklist; the unverified box), three data tabs on real rollouts (Real rollouts, Verifier gallery, Rollout mismatch) and Further reading.

Departure: the page's "real data" is generated for it. No public dataset gives per-token log-probabilities under several numerical set-ups with verifier verdicts and reward-model scores on the same responses, so `rollouts/` samples 160 responses from Qwen2.5-0.5B-Instruct on ten GSM8K test problems and records all of it. A 0.5B model and grade-school maths keep it small enough to run on a laptop; the page says where that limits what the numbers show (magnitudes of KL and mismatch, response lengths).

## What is reused, linked, or new

- Reused from `../../src/for_children/reading_full/` (section 18 and helpers): the step-animation controller (`22_js_rd_common.js`, now `parts/22_js_common.js` with per-tab rendering), the GRPO group widget (`29_js_rd_llm.js`, now `parts/25_js_group.js`, with real groups and lengths added as presets and the advantage spread computed by `tokenWeights`), section 18's text (InstructGPT, DeepSeekMath and R1 numbers and corrections), and `groupAdv` from its engine.
- Not reused: reading_full's PPO clipped-against-unclipped widget and its policy-gradient baseline widget. Both teach the generic mechanism, which belongs to Policy gradients and actor-critic; this page's rare-token toy (section 7) is the LLM-specific successor of the PPO widget (same idea: repeated steps on one sample, clip on and off) extended to clip-higher and CISPO.
- Linked, not rebuilt: "Same batch, three algorithms" and the KL leash (training topic, Axes 3 and 4); PPO against GRPO, six methods trained live, "Then and now" (DeepSeekMath page); a tiny R1-Zero (R1 page); the RLHF pipeline (InstructGPT page); DPO family and RLVR lineage (Alignment); case gallery and over-optimisation curves (Reward Hacking); sandboxes (DSec page); the root's Method atlas and Milestones tabs.
- New: the before/after animation on a real response (PPO-RLHF with a real reward model and Monte Carlo values against GRPO with a verifier, and Dr. GRPO); the rare-token toy; the synchronous/asynchronous timeline on real lengths; pass@k crossing; k3 on real tokens; the three tabs.

## Files

- `parts/`: `01_head.html` (Topic: rl's CSS), `02_css.html` (reading_full's animation CSS, unscoped, plus this page's), `10_header.html`, `20_read_a/b/c.html`, `21_js_engine.js` (pure functions), `22_js_common.js`, `23_js_data.js` (generated), `24_js_one.js` (section 5), `25_js_group.js`, `26_js_clip.js`, `27_js_small.js` (k3, overlong, pass@k, worked-example numbers, checklist), `28_js_async.js`, `3x_tab_*.html` and `3x_js_*.js` (tabs), `39_tab_more.html`, `99_js_tabs.js`.
- `rollouts/`: `dl.py` (model downloads), `rollouts.py` (sampling and log-probabilities; `rollouts_lib.py` holds the verifiers), `rollouts_rp.py` (the stray repetition-penalty variant), `rm_score.py`, `mc_values.py` (Monte Carlo prefix values), `mk_data.py` (writes `parts/23_js_data.js` and `inputs/rollouts_extract.json`). Run with `uv run --with torch --with transformers --with accelerate`, 2 CPU threads plus Apple MPS; about 40 minutes in all. The full `rollouts.json` (every token's log-probabilities, several MB) is not committed.
- `recompute.py` then `node check_engine.mjs`: every closed-form number and toy, recomputed in Python and compared with the page's engine.
- `check_page.mjs` (from the repo root): every control in light 920 and dark 390, reduced motion, text checked for NaN/undefined; element screenshots in `../.shots/`.
- `mk_coverage.py`: `coverage.json` against `live.md`.
- `inputs/`: `old_embed.html` (the previous interactive embed, for coverage), `recompute.json`, `rollouts_extract.json`, `ver_notes.json` (notes on the real verifier disagreements).

## Checks

See the bottom of this file after the last build.
Last build, 4 October 2026: `checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 249 KB; `check_page.mjs` 590 actions, 0 problems (both themes, 920 and 390 px, reduced motion); `check_engine.mjs` PASS (42 checks against `recompute.py`); `mk_coverage.py` 134 of 134 facts of `live.md` found. Reading tab about 42 minutes by the build's count (9,550 words), against the old page's 19: the page now owns CISPO, the off-policy corrections with real data, teach or elicit, reward hacking in LLM RL, agentic RL and infrastructure, which the old page touched in a line or not at all.
