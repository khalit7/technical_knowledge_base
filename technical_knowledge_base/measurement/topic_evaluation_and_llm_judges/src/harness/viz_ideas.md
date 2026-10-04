# Same model, many harnesses (t-harness): visual ideas

Question the tab answers: when one model gets two different scores on one benchmark, which harness knob made the gap, and how big is each knob?

## Built

| # | Idea | Score (0-10) | Data | Placement |
|---|---|---|---|---|
| H1 | **One MMLU item read three ways**, stepped animation (play, pause, step, scrub, speed; plays only when on screen in the visible tab; paused under reduced motion). Modes: loglikelihood of the four letters (full-vocabulary top 5, then the four letters kept and renormalised); chat template, generate, then strict and lenient parsers (highlighting the matched character); lm-eval Jan 2023 answer-text loglikelihood, acc against acc_norm. 5-shot / 0-shot toggle for the loglikelihood mode. Counters: candidates compared, forward passes or characters written, tokens scored, verdict | 9 | Real next-token log-probabilities and greedy generations of Qwen2.5-0.5B-Instruct on real cais/mmlu items, computed offline (`repro_mmlu_knobs.py`); items chosen by rule in `recompute.py` | top of tab |
| H2 | **Ten settings on the same 200 items** (25 of 57 subjects; the run was stopped early to save time, extendable with the same script): accuracy bars with binomial 95% intervals and a chance line, plus a list of one-knob pairs with the paired change, its paired 95% interval and items fixed / broken; clicking a pair lights its two bars | 9 | same reproduction; every pair differs in one knob (the letter-to-text pair is labelled as carrying the old prompt and random shots with it) | tab |
| H3 | **Published case picker**: one model, one benchmark, several readings; bars coloured by who ran it; each reading opens to harness, prompt, shots, scoring, extraction, chat template, averaging, source and date, and states the knob that separates it from its neighbour | 8 | HF MMLU post table, LLaMA paper Table 9, Open LLM Leaderboard v1 and v2 result files (recomputed per subject), HELM MMLU release v1.13.0 group JSON and run specs, Llama 3.1 model card, inspect_evals MMLU README, Math-Verify post, DROP post | tab |
| H4 | **Rank slope chart**: eight models under the original code, HELM and lm-eval Jan 2023 (ranks recomputed from the post's table) | 6 | HF post table | inside the LLaMA-65B case |
| H5 | **DROP trace table**: the post's worked example through split, punctuation, float casting and bag of words to F1 = 0 | 5 | DROP post (no per-model numbers exist outside charts, so nothing is plotted) | inside the DROP case |
| H6 | **Knob table**: what each knob changes, its measured size on this page and in published cases, and what to log; cards on phones | 7 | H2 and H3 | tab |
| H7 | Status list of the harnesses with dated checks (HELM maintenance mode verified; Open LLM Leaderboard archived; current versions) | 4 | READMEs, policy page, PyPI, Space commits | tab foot |

## Rejected

- **Plotting per-model DROP or Math-Verify changes for many models**: only charts (PNG) in the posts; values would have to be read off images. Two Qwen models were taken from the result files instead.
- **Putting vendor MATH (all levels) beside the leaderboard's MATH Level 5**: different subsets; never on one axis.
- **Splicing Open LLM Leaderboard v1 MMLU with v2 MMLU-Pro for one model** (LLaMA-65B: 63.93 and 30.78 raw): different benchmarks; the v2 number stays in the extracts only.
- **A slider "simulator" of harness noise**: illustrative only; the real ten-setting run teaches the same with real items.
- **Repeating the benchmarks root's spreads** (Gemini Ultra 5-shot against CoT@32, effort, tools, splits): owned by Topic: benchmarks, "Same model, many numbers"; linked instead.
- **One-token generation on the raw prompt as the generative mode of H1**: on this model the first greedy token is the loglikelihood letter on almost every item (see `agree_top1`), so the animation would show no difference; the chat-template path is where generative scoring diverges, and it is what chat API evaluations do.

## What the methodology lacked

- A rule for confounded published gaps: the Llama 3.1 8B Instruct HELM gap (FP8 serving, raw prompt on an instruct model, one-token budget) cannot be attributed to one knob from public runs; the tab says "not isolated" rather than picking one.
- The reproduction is a small model; the tab tells the reader to read gaps, not levels.
