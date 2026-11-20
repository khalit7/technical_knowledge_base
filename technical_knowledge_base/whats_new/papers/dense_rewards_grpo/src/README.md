# Are Dense Rewards Worth Their Tokens in GRPO?: page source

`sh build.sh` writes `../index.html`. The paper is arXiv 2611.13560v1 (10 November 2026, Vikash Singh and 18 co-authors, Case Western Reserve University), the only version on 16 November 2026. The announced code repository (github.com/vicky157/grpo-validation) held only a README ("CODE WILL BE AVAILABLE SOON", one commit of 11 November 2026) on 16 November 2026, so nothing could be checked against code or run records. The Papers row was created by the lead. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces copied from the Fair Cast page (`01_css`, `02_split`, `05z_errbox`, `10_js_common`, `mk_paper.py`, `build.sh`, `label_ledger.py`, `extract_paper.py`) and the templates `21_js_rd_common.js` (RD.anim) and `99_js_tabs.js` (storage key `dr-tab`); everything else written for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (takeaway, three headline numbers, verdict); the idea in one sentence beside Fig. 1 (the four yardsticks, RD.anim, four explained steps), You need, new terms; the cost of a dense reward beside Fig. 2 (the Monte-Carlo reward on one completion, RD.anim, six steps); the protocol (recipe details closed); per update (full width); per token and per GPU-hour beside Fig. 3 (budget strips); the gradient test beside Fig. 4; prompt selection and when it helps beside Fig. 5 (Table 8 scatter); what the gain is worth beside the paper's Figures 5 (cropped) and 6; verifier drift; How much to believe; What it takes (lessons closed); Since the paper (closed, checked 2026-11-16); Why it matters and connections. |
| The paper's numbers, rebuilt | `t-tables` | Tables 3 and 4 by block with interval bars, 13, 14 (plus the unstaged remainder), 15, 8, 1, 11, and all 21 recompute checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **No live ingredient tab.** The paper is a validation protocol, and its claims are compute accounting at real model scale (tokens, GPU-hours, paired seeds over 1,668 runs). A CPU toy could not have the paper's token costs or GPU timing and would only be tuned to agree, and the trainer is not released. The "live" part is instead two step animations of the argument (the yardstick flip and the reward's mechanism) built from the paper's own numbers, and the tables tab, where every derived number is recomputed.
- **No predict-then-reveal questions.** Fig. 1's first step (the per-update lead) plays the role of the prediction: the reader sees the result the cheap checks give before the matched-compute result replaces it.
- **No 3D.** Nothing in the mechanism is spatial (`viz_ideas.md` P-dense_rewards_grpo.7).
- **Two of the paper's figures are embedded as images** (CC BY 4.0, `../img/CREDITS.md`): the lead over training (three of ten panels of Figure 5, cropped) and the learning-rate retune (Figure 6). The paper prints no per-evaluation data, and curves are never read by eye.
- **No "Then and now"**: the paper is six days old.
- **Topics**: `paper.json` keeps the two requested chips (RL for LLMs, Alignment); Eval statistics, Test-time compute and reasoning (owns process reward models as selectors) and Policy gradients are in `topics_extra`.

## Corrections and findings

- **Takeaway**: the draft said the prompt filter "gained 0.8 to 1.7 points at equal tokens" on models of 0.6B to 4B without saying it gained on only two of six models; the per-update lead (1.5) and the GPU-hour deficit (7.8) are exploratory. The takeaway in `paper.json` scopes all three.
- The paper's "within half a point" for the retuned baseline rests on two different retunes: a doubled constant rate on Qwen3-0.6B (−0.03 against the filter) and, on Qwen2.5-1.5B where a doubled constant rate hurt both, a rate decaying from twice the usual (0.5 below the filter). The page says so.
- The extrapolation's overestimate is "0.8 to 1.8 points on average" over all evaluations; at the budget alone it is 1.6, 2.0 and 1.2 for k = 1, 2, 4 (recomputed from the printed predictions and results), so the size depends on where it is read.
- The token arithmetic is self-consistent: 12.25M / 584 updates is about 21k tokens per iteration (328 per completion against the 380 limit); with S25's printed update counts (599, 163, 92, 50) and continuation shares (70, 83, 91%) every configuration spends 20.5k to 22.6k tokens on its own rollouts per update.
- Table 14's totals exceed the four printed stages by 1 to 10 s per run (the weight copy, which the paper counts in training time but does not print separately).
- Two gradient measurements of the k = 4 reward differ by resampling (1.56× and 0.145× in §3, 1.63× and 0.15× in C.3.2); the page uses §3's.
- Not verified: the preregistration timing (the plan files are not public), and anything that needs the code or run records.

## Files

- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`.
- `mk_tables.py` (tables.json from the extracts: Tables 1, 3, 4, 8, 11, 13, 14, 15), `recompute.py` (`inputs/recompute.json`: 21 checks, 21 agree; exits 1 on a disagreement, so the build stops), `mk_paper.py` (card, Further reading, `window.PAPER`).
- `parts/30_js_figs.js`: Figs. 1 to 5, drawn from `PAPER.tables` (Fig. 2's completion is illustrative); `parts/24_js_tables.js`: the tables tab.
- `check_page.mjs` (every control at 1400 light, 920 light, 390 dark and 1400 reduced motion; text at least 11 px, overlaps, NaN; autoplay once half in view, stop on a reader control, no motion under reduced motion; list items per step; prose numbers against the figures' data and recompute.json) and `check_stages.mjs` (splits two columns at 1400 and stacked below 1100, each animation in its split's right column beside its list, pause off screen, stop at the last step, Fig. 2's list values).
- `reading.json`: the header's minutes, measured with `html_utils/audit_pages.mjs` and `audit_pages.py` (230 words a minute, one pass with default modes).
- `label_ledger.py`: labels `ledger.json` after `html_utils/ledger.py init`.

## Teaching contract and length

Core sentence, hero, You need and new terms at the top; GRPO's mechanics, dynamic sampling and verifier failures linked to RL for LLMs, the score-function estimator to Policy gradients, paired tests and equivalence to Eval statistics, process reward models at inference to Test-time compute. Recipe details, the seven lessons and the volatile "Since the paper (checked 2026-11-16)" are closed. Reading: 27 minutes plus 3 in closed details (measured; the build's own count gives 26). A paper page owns every detail of its paper; the length comes from the paper having two case studies (dense rewards and prompt selection), each with four or five distinct claims, and the verdict needs both. Ledger: 293 units (core 262, depth 21, owned 4, volatile 4, fat 2: two sentence fragments), `ledger.py check` problems 0.

## Checks (16 November 2026)

`sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/dense_rewards_grpo` fail=0, emdash 0, errbox 1, clipped 0; `node src/check_page.mjs` and `node src/check_stages.mjs` (from the repo root, with CHROME_PATH set) 0 problems; `node html_utils/verify_layout.mjs` problems 0; `python3 html_utils/ledger.py check` problems 0; `python3 src/recompute.py` 21 of 21. Measured on a Linux cloud container (no GPU); everything is deterministic CPU work.
