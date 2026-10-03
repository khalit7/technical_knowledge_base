# Sampling and Decoding: visualisation ideas

Central question: how does the rule that picks a token from the next-token distribution change the text, and what does each rule keep or throw away? A visual earns its place when it makes "which tokens survive, and with what probability" measurable on a real distribution.

Existing visuals elsewhere (not repeated here): speculative decoding calculator reproducing Leviathan Table 4 (Google DeepMind page, G18); AR against speculative against block diffusion animation (2026-08-24 tech news, N3); pass@k, majority vote, best-of-n and a sampling lab (Topic: llms, Deeper: test-time compute, R3); greedy decoding of a toy Transformer (Attention Is All You Need, PT1; its beam tree was rejected there because greedy was exact on that toy).

## Scoring (0 to 2 each; reproduces and computable count double; build cost subtracted; +1 for a step-by-step before/after animation)

| # | Idea | Param | Repro x2 | Computable x2 | Beyond a sentence | Misconception | Central | Absent elsewhere | Anim | Cost | Score | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SD1 | Sampler pipeline animation, top-p against min-p on the same real Qwen distribution, T 1 / 1.5 / 2, uncertain or confident step | 2 | 1 (x2) | 2 (x2) | 2 | 2 ("top-p keeps a handful") | 2 | 2 | 1 | -1 | 16 | built, Reading |
| SD2 | Sampler lab: 32 real distributions, temperature, top-k, top-p, min-p, typical, repetition / presence / frequency penalties, order switch, presets, draw 200 | 2 | 1 (x2) | 2 (x2) | 2 | 2 (order; penalties hurt correct repeats) | 2 | 2 | 0 | -2 | 14 | built, own tab |
| SD3 | Twelve decoders on GPT-2 small: perplexity against diversity, repetition, sample reader, human reference | 2 | 2 (x2) | 2 (x2) | 2 | 2 (beam finds better text) | 2 | 2 | 0 | -2 | 16 | built, own tab |
| SD4 | Beam search tree against greedy, real GPT-2 log-probabilities, plus 80-token runs | 1 | 1 (x2) | 2 (x2) | 2 | 2 | 1 | 2 | 1 | -1 | 13 | built, Reading |
| SD5 | Constrained decoding: JSON grammar masking the vocabulary step by step, unconstrained against constrained, real Qwen steps | 1 | 1 (x2) | 2 (x2) | 2 | 2 (constraints are free) | 2 | 2 | 1 | -1 | 14 | built, Reading |
| SD6 | Speculative decoding animation with acceptance rule and expected speed-up | 2 | 2 (x2) | 2 (x2) | 2 | 1 | 0 (owned by Topic: inference-and-serving) | 0 (G18, N3) | 1 | -1 | 9 | rejected: belongs to inference-and-serving and is built twice already; formula and links kept in text |
| SD7 | Self-consistency / best-of-n curves | 2 | 2 | 2 | 2 | 1 | 0 | 0 (Topic: llms R3) | 0 | -1 | 7 | rejected: owned by Topic: llms Deeper: test-time compute |
| SD8 | Mirostat, XTC, DRY, top-a in the lab | 1 | 0 | 1 | 1 | 0 | 1 | 2 | 0 | -2 | 4 | rejected: niche; mirostat and DRY need a generated sequence, not one distribution; kept as a table |
| SD9 | Live model in the page | 2 | 2 | 0 | 2 | 1 | 2 | 2 | 0 | -3 | n/a | rejected: no network and a 0.5B model is far beyond the page size |
| SD10 | Temperature-only slider on a toy distribution | 2 | 0 | 2 | 1 | 0 | 1 | 0 | 0 | 0 | 4 | rejected: subsumed by SD1 and SD2 on real data |
| SD11 | XGrammar context-independent / dependent token split on our tokenizer | 1 | 1 | 1 | 1 | 0 | 1 | 2 | 0 | -2 | 5 | rejected: needs XGrammar's internals; the paper's figure (1,134 of 128k) quoted instead |

## Data and formulas

- Logits: `make_data.py lab`, Qwen/Qwen2.5-0.5B-Instruct (Apache 2.0), float32 CPU, 2 threads, chat template with default system prompt; 4 prompts x first 8 positions of the greedy reply; top-200 logits per position plus a 160-bin histogram of the rest ([mean logit, count]) and the exact T=1 top-token probability and entropy. 230 KB in `inputs/lab_logits.json`.
- Page approximation: top 60 exact, tokens 61 to 200 rounded to 0.05 logit, the rest to 0.1 logit, as [logit, count] bins (`make_page_data.py`). Checked: top-token probability at T=1 within 0.002 at all 32 positions; kept-token counts for top-p and min-p within 1% of the exact full-vocabulary result (`recompute.py --exact`, output in `recompute_output.txt`).
- Sampler rules: transformers order (temperature, top-k, top-p, min-p, typical; `generation/utils.py`), vLLM (penalties, temperature, min-p, top-k/top-p; `v1/sample/sampler.py`), llama.cpp default chain (penalties, DRY, top-n-sigma, top-k, typical, top-p, min-p, XTC, temperature; `common/common.h`). Repetition penalty: divide positive logits, multiply negative (transformers `RepetitionPenaltyLogitsProcessor`, CTRL). Presence/frequency: OpenAI formula mu_j - c_j a_f - [c_j>0] a_p (developers.openai.com advanced-usage).
- Degeneration: `make_data.py degen`, GPT-2 small, 4 paragraphs of Three Men in a Boat (Gutenberg #308; em-dashes replaced), 48-token prompt, 48 new tokens, 16 samples per sampler (seed 1234), greedy and HF beam search (4 beams, no length stop). Perplexity = exp(-mean log p at T=1); repetition = 1 - unique 4-grams / 4-grams; diversity = distinct-2 over pooled samples (deterministic decoders: single-text distinct-2 / 16).
- Beam tree: `make_data.py beam`, B=3, top 3 extensions per beam, 6 steps, no length normalisation; greedy with its top-3 alternatives; 80-token greedy, beam-4 and top-p 0.95 runs.
- Constrained JSON: `make_data.py json`, regex `{"name": string, "age": int}` with whitespace capped at 2 characters, checked with `regex` partial matching against all 151,665 tokenizer strings at every step; unconstrained greedy steps recorded with the same check.
- Speculative decoding expected tokens per pass: (1 - a^(g+1)) / (1 - a), Leviathan et al. eq. 1; 3.36 at a = 0.8, g = 4.

## Reproductions

- Holtzman et al. Table 1 ordering (independently, GPT-2 small vs Large): greedy 2.26 and beam 2.37 against human 31.0 (theirs 1.50, 1.48, 12.38); pure 47.2 (22.73); top-p 0.95 closest at 31.6 (13.13). Absolute values not comparable.
- Min-p paper's high-temperature mechanism (qualitatively): at T 1.5 min-p 0.1 gives perplexity 16.1 against top-p 0.95's 3,945. Not a reproduction of its quality claims, which are disputed (Schaeffer et al. 2025).
- Thinking Machines' 80 of 1,000, XGrammar's 1,134 of 128k and <40 us, llguidance's ~50 us, OpenAI's 100% against <40%: quoted, not reproduced.

## Inspiration

Holtzman et al. Figures 2 and 3 (probability of beam text against human text; example generations); Chip Huyen's sampling post; the min-p paper's Figure 1 (top-p against min-p bars); Transformer Explainer's temperature slider; XGrammar's mask diagrams.

## What the methodology lacked here

Nothing in the methodology covered generating data with a model offline. Rules learned: record the exact full-vocabulary result next to any approximation the page uses; save the generation script and seeds; filter displayed model output for slurs and sexual content (GPT-2 at high temperature produces them) while computing metrics on everything; and replace any em-dash the model writes in displayed text, saying so.
