# Ai2: OLMo (fully open models): visualisation ideas

The question the page keeps returning to: **what does a fully open release let you see and do that an open-weights release does not?** A visual is worth building when it shows something only a fully open release makes visible (the data mix, the training log, the checkpoints) or makes the difference between the two kinds of release concrete.

Existing page: text only, no visuals. Outbound links: OLMo 2 paper, Olmo 3 blog, Interconnects, Ettin paper, Ai2 Hugging Face org; mentions of Other notable providers, Topic: llm-training-and-post-training, Reasoning models, the OLMo 2 and Ettin paper pages.

## Sources read (all fetched 1 October 2026)
- Olmo 3 technical report, arXiv HTML: https://arxiv.org/html/2512.13961 (Tables 4, 5, 11, 13, 14, 33 to 35; section 2.4 costs; section 3.5 decontamination and souping)
- Olmo 3 blog (with the 12 Dec 2025 Olmo 3.1 update): https://allenai.org/blog/olmo3
- OLMo 2 report, arXiv HTML: https://arxiv.org/html/2501.00656 (Tables 4 and 13, sections 2.3, 3.3, 4.5); OLMo 2 blog https://allenai.org/blog/olmo2; OLMo 2 32B blog https://allenai.org/blog/olmo2-32B
- Abstracts: OLMo 1 (2402.00838), Dolma (2402.00159), OLMoE (2409.02060), Molmo (2409.17146), Tulu 3 (2411.15124), model ladder (2412.04403), Ettin (2507.11412, plus HTML body for the recipe)
- Olmo Hybrid blog https://allenai.org/blog/olmohybrid ; Molmo 2 blog https://allenai.org/blog/molmo2 ; Qwen3 blog https://qwenlm.github.io/blog/qwen3/
- **Weights & Biases public logs, entity ai2-llm** (GraphQL API, anonymous, sampledHistory): projects Olmo-3-1125-32B (69 runs), Olmo-3-1025-7B (39), OLMo-2-1124-7B (14), OLMo-7B (90, including the OLMo 1.7 7B runs). Raw pulls in src/.
- **Hugging Face refs API** for allenai models (branch lists = public intermediate checkpoints), e.g. https://huggingface.co/api/models/allenai/Olmo-3-1125-32B/refs
- Artificial Analysis Intelligence Index v4.3 (pages/topic-llms/aa_snapshot.json, read 1 Oct 2026): Olmo 3.1 32B Think 7.1 (estimated by AA).
- KB pages: OLMo 2 paper page, Ettin paper page, Other notable providers (K2 Horizon; the IFM press release returned 403 to a direct fetch).
- Inspiration: the Olmo 3 blog's clickable "model flow" diagram; the OLMo 2 report's spike figure (OLMo-0424 against OLMo 2); Pythia-style checkpoint suites; the DeepSeek MLA animation pattern (Khalid's favourite).

## Candidates, scored
Scores 0 to 2 on: parameter the reader moves (P), defaults reproduce a published figure (R, counts double), computable from public data (C, counts double), shows what a sentence cannot (S), corrects a misconception (M), measures the central question (Q), absent from existing explainers (A), animation of a process or a before/after (Anim); minus build cost (B).

| # | Idea | P | R2 | C2 | S | M | Q | A | Anim | -B | Total | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Training log tab**: Olmo 3 32B and 7B loss and in-loop evals across the whole pretraining run from Ai2's public W&B logs, every restart segment, token or calendar axis, every public checkpoint as a tick, an "open-weights view" switch that hides all but the last point | 2 | 4 | 4 | 2 | 1 | 2 | 2 | 0 | -2 | 15 | **Own tab** |
| 2 | **Model flow animation**: the Olmo 3 32B Think path, stage by stage on a to-scale time axis (56 days on 1,024 H100s, then 21 more days of RL for 3.1), with a toggle that runs the same flow as an open-weights release (everything inside the lab until one artefact comes out); counters for checkpoints, data, logs and answerable questions | 1 | 2 | 4 | 2 | 2 | 2 | 1 | 2 | -2 | 14 | **Reading, after the artefact list** |
| 3 | **Data mix tab**: pool against mix per source for each stage (Dolma 3 Mix, Dolmino, Longmino; OLMo 2 Mix and Dolmino 1124), with the sampling factor mix/pool | 2 | 4 | 4 | 2 | 1 | 2 | 1 | 0 | -1 | 15 | **Own tab** |
| 4 | **Before/after the stability fixes**: grad norm and loss of OLMo 1.7 7B (Apr 2024) against OLMo 2 7B (Nov 2024), both from W&B, with spike counts | 1 | 2 | 4 | 2 | 1 | 1 | 2 | 0 | -1 | 12 | **Inside the Training log tab** (shares its axis and data source) |
| 5 | **Question explorer**: pick a research question, see which artefacts it needs and whether open weights suffice | 2 | 0 | 2 | 1 | 2 | 2 | 1 | 0 | -1 | 9 | **Reading, "why each matters"** (it carries those bullets) |
| 6 | **Stage scores**: Table 13 base scores after pretraining, each midtraining ingredient, the soup and long-context extension, for OLMo 2 7B and 32B and Olmo 3 7B and 32B | 2 | 2 | 4 | 1 | 1 | 1 | 1 | 0 | -1 | 11 | **Reading, curriculum paragraph** |
| 7 | **Six times fewer tokens**: Olmo 3 32B training tokens by stage against Qwen3's 36T, with the scores the claim rests on | 1 | 2 | 4 | 1 | 2 | 1 | 1 | 0 | -1 | 11 | **Reading, efficiency paragraph** |
| 8 | Lineage strip: releases Feb 2024 to Mar 2026 with public checkpoint counts | 1 | 0 | 4 | 1 | 0 | 1 | 1 | 0 | -1 | 7 | **Reading, Lineage** (compact, not a tab: 11 releases do not need room) |
| 9 | QK-norm animation (logit growth with and without the norm) | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | -1 | 4 | Rejected: illustrative only, no Ai2 data; owned by the architecture gallery |
| 10 | KV cache of Olmo 3 32B with sliding windows | 2 | 2 | 4 | 1 | 0 | 0 | 0 | 0 | -1 | 8 | Rejected: off the page's question; owned by the architecture gallery page |
| 11 | Training-bill calculator (GPU-hours times price) | 1 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | -1 | 6 | Rejected: Khalid removed training-bill tabs; kept as one formula in the text |
| 12 | Ettin encoder against decoder bars | 1 | 2 | 2 | 1 | 1 | 0 | 0 | 0 | -1 | 6 | Rejected: owned by the Ettin paper page |
| 13 | Benchmark heatmap Olmo against Qwen and others | 1 | 2 | 4 | 0 | 0 | 0 | 0 | 0 | -1 | 6 | Rejected: single numbers with nothing to move; a short table carries them |

## Data and formulas
- Tokens per step: 32B 8,388,608 (Table 35, and `throughput/total tokens` / `_step` in every log row); 7B 4,194,304. Tokens = step x batch.
- Restart segments: one W&B run per launch; a segment's start step is the checkpoint it resumed from. Steps re-run = sum over consecutive segments of max(0, previous end step minus this start step). Gaps = sum of the time between one segment's last log row and the next one's first. Both derived, labelled as such.
- In-loop evals: `eval/downstream/mmlu_*_test_mc_5shot_fast (length-normalized accuracy v2)` averaged over the four MMLU groups; `arc_challenge_test_mc_5shot_fast (accuracy v2)`; `basic_skills_arithmetic_rc_5shot (accuracy v2)`. These are Ai2's quick in-loop versions, not the report's OlmoBaseEval numbers.
- Spikes (stability panel): the OLMo 2 report's own spike score (section 3.2: share of values at least 7 standard deviations from the rolling mean of the previous 1,000), applied to W&B's sampled points. OLMo 1.7 7B: gradient norm 0.32%, loss 0.06% (89 and 18 of 28,285 scored points); OLMo 2 7B: 0.09% and 0.00% (13 and 0). Sampling density differs (about one point per 19 steps against one per 62), and the sample can miss single-step spikes. (Replaced an ad hoc median-of-neighbours rule used in the first draft.)
- Sampling factor = mix tokens / pool tokens (Table 4, Table 5, Table 11; OLMo 2 Table 13 gives "source %" directly).
- Six times: 36T / (5.5 + 0.1 + 0.1 + 0.1)T = 6.2; with Table 13's cumulative 6.2T, 5.8.
- Bill: 1,024 x 56 x 24 = 1,376,256 GPU-hours, x $2 = $2.75M (report). RL extension 224 x 21 x 24 = 112,896 GPU-hours (derived).

## What the defaults reproduce
- Training log, 32B: wall clock from the first to the last pretraining log row is 44.5 days, against the report's "about 9.5 days on 512 GPUs, followed by an additional 35 days on 1024 GPUs" (44.5): **independent**. Step rate rises 1.84 times between 1 and 3 October 2025, the cluster doubling (independent, derived). Step 656,000 = 5.50T tokens, the report's 5.5T truncation and the last stage-1 checkpoint on Hugging Face (independent). The log continues to step 678,990 (5.70T); the report does not say what those steps were for.
- Training log, 7B: 1,412,815 steps x 4,194,304 = 5.93T, Table 35's 5.93T (independent).
- Stability panel: reproduces the OLMo 2 report's qualitative claim (frequent spikes in OLMo-0424, none after the fixes) independently from the logs; the report's own figure is an image and has no numbers to match.
- Data mix: shares and totals are Table 4/5/11 values (by construction); the sampling factors are derived.
- Stage scores: Table 13 values (by construction). The report's text says souping improved Math by 2.9 and 1.6 over the two 32B runs; Table 13 gives 2.9 and 4.3. Both shown.

## Rejected and why
See table rows 9 to 13. Also rejected: an "OLMo against open-weights labs" release matrix (other labs' release contents would need a source per cell; the page's claim is about the typical case), and a price chart (no first-party API price exists; AA lists none).

## What the methodology lacked for this page
- A rule for **logs as a primary source**. W&B's public GraphQL API returns sampled history anonymously; that is a new class of source (a lab's own telemetry) with its own caveats: sampling hides single-step spikes, run names are internal code names (stego32, OLMo25), and gaps between runs are not labelled as failures or planned stops. The page says all three.
- A rule for **counting public checkpoints**: the Hugging Face refs API lists branches; branch count is a dated measurement like an index score.
- The methodology's "contradictory primary sources side by side" rule applied inside one report (souping text against Table 13; Table 13's 6.2T against Table 35's 5.5T).

## Built (final)
- Reading: artefact grid; model-flow animation (#2) with open-weights toggle, to-scale day axis, captions, six running counters, play/pause/step/scrub/speed, on-screen and visible-tab only, paused under reduced motion; question explorer (#5); AA bars for the capability price; lineage rows plus public checkpoint bars (#8); OLMo 2 norm formulas with spike scores from the logs; stage-score chart (#6); six-times bar, formula and Table 14 (#7).
- Training log tab (#1 with #4 inside), Data mix tab (#3).
- Further check from Table 35: midtraining and long-context token totals reproduce from checkpoint step counts times batch size (32B 100.0B twice and 100.0B; 7B 100.0B and 50.0B), independently.
