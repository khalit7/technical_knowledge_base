# Source of "Policy gradients and actor-critic: from REINFORCE to PPO and SAC"

Child page of Topic: rl (Notion 3ee5c17b0d0d8101a262d3620e75747c), new on 2026-10-04. Build: `sh build.sh` writes `../index.html` from `parts/`.

## Where the content comes from
The old page "Deep RL: from DQN to PPO to MuZero" (Notion 3c65c17b0d0d8180b808c8c0cf8ddbe6) is split three ways; this page takes its policy-gradient and actor-critic part. `live_deep_rl.md` is that page as fetched read-only (copied from `../../value_based_deep_rl/src/live_deep_rl.md`; a fresh fetch on 2026-10-04 returned the same content, last edited 2026-09-30, apart from the signed embed URL). `coverage_deep_rl_share.json` (from `mk_coverage.py`) lists the 78 facts of it this page carries and where; the DQN family belongs to Value-based deep RL and AlphaGo to MuZero to Model-based RL and planning. The old page's interactive embed is in `../../value_based_deep_rl/src/inputs/old_embed_deep_rl.html`; its three explorers (baseline, GAE, PPO clip) and its quiz were rebuilt here.

Beyond the old page, every claim was checked against the primary sources (PDFs read in full): Sutton and Barto ch. 13, Williams 1992, Sutton et al. 1999, Greensmith et al. 2004, Kakade 2001, TRPO, GAE, A3C, the A2C blog (Wayback copy), PPO, Engstrom et al. 2020, Huang et al.'s 37 details, Andrychowicz et al. 2021, Henderson et al. 2018, Agarwal et al. 2021, DPG, DDPG, TD3 (paper and repo), SAC 2018a and 2018b, Stable-Baselines3 docs.

## Shape
Part B of `html_utils/methods/topic_pages.md`: Reading tab in the subject's own order (one-screen table; why optimise the policy; the theorem derived; REINFORCE; baselines; actor-critic; GAE; A2C/A3C; natural gradient and TRPO; PPO; implementation; DPG/DDPG; TD3; SAC; continuous control in practice; which when; mistakes; next; check yourself), one experiment tab (Short corridor, live) and Further reading. The Reading tab is long (about 43 minutes) because the page owns the derivations and the full algorithms; the root keeps the intuition.

## Reused from Topic: rl (`../../src/for_children/`)
- `reading_full/` sections 13 to 15: prose, the policy-gradient with and without baseline animation (`rd-pgc`, engine functions `pgStats`, `pgRun`, `pgSpread` unchanged; its 86 of 200 figure re-verified) and the PPO ten-epoch animation (`rd-pp`, `ppoL`, `ppoRun` unchanged).
- The RD animation controller (`22_js_rd_common.js`, unchanged) and the page CSS (from Model-free prediction and control, with the Reading-only rules unscoped so the corridor tab can use them).

## New here
- Baseline explorer (`rd-bx`): exact variance against any constant baseline and the variance-minimising b*.
- GAE backward-recursion animation (`rd-ga`): the worked example and an 8-step chain with a wrong critic.
- Clipped objective against the ratio for both advantage signs (`rd-cl`).
- Maximum-entropy toy (`rd-sa`): soft-optimal policy, best Gaussian actor and SAC's automatic temperature on an illustrative 1-D reward, exact.
- Short corridor tab: Example 13.1 exact, one run of three learners animated on J(p), Figures 13.1 and 13.2 rerun (100 runs x 1,000 episodes in the browser), plus a one-step actor-critic with an aliased critic.

## Files
`parts/`: `01_head.html`, `05z_errbox.js.html`, `10_header.html`, `20_read_a.html` to `20_read_d.html`, `21_js_pg_engine.js` (all computations, no DOM, window.PGE), `22_js_rd_common.js`, `23_js_rd_base.js`, `24_js_rd_gae.js`, `25_js_rd_ppo.js`, `26_js_rd_sac.js`, `31_tab_cor.html`, `31_js_cor.js`, `39_tab_more.html`, `99_js_tabs.js`.

## Checks
- `cd checks && node dump_js.mjs && python3 recompute.py` (add `--full` to recompute the 600 corridor runs, a few minutes): independent Python of every engine function, same mulberry32 stream; the GAE check uses the k-step weighted-average form, the SAC check integrates numerically, the corridor values are solved by iteration. Last run: all pass (289 checks with `--full`).
- `cd checks && node check_page.mjs`: every control at 390 dark and 920 light. Last run: 538 probes, 0 fails.
- `sh html_utils/checkpage.sh <page folder>`: fail=0, emdash 0, errbox 1.
