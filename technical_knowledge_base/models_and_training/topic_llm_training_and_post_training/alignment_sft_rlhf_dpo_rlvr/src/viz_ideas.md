# Visualisation ideas: Alignment: SFT, RLHF, DPO Family, RLVR

The question the page keeps returning to: **how does each post-training method turn a signal ("imitate this", "this answer is better", "this answer passes") into a gradient on which tokens, and what does each successor remove or fix?**

Ownership fixed before scoring: the parent (Topic: llm-training-and-post-training) owns the stage comparison and already animates the same prompt through five checkpoints, one batch through PPO, GRPO and DPO with memory, the KL leash, and a bytes-per-parameter calculator. RL for LLMs (Topic: rl child, 3c65c17b0d0d818c9bcff7177325fe56) explicitly owns PPO/GAE, GRPO, Dr. GRPO, DAPO, GSPO and off-policy corrections, and names this page as the owner of SFT, reward-model training, the DPO family and online against offline. The paper pages already hold live toys: InstructGPT (RLHF pipeline, RM widget), DPO (enumerable toy, push-against-margin morph for Unlikelihood, DPO, SLiC, IPO, cDPO, SimPO), DeepSeekMath (six methods, PPO against GRPO animation, GRPO then-and-now), DeepSeek-R1 (tiny R1-Zero), Constitutional AI (soft against hard labels), Learn What's Left (multi-reward GRPO).

Scores: Q quantity moved by the reader, R reproduces a stated figure (x2), C computable from public data (x2), S shows what a sentence cannot, M corrects a misconception, P measures the central question, N new against the page, its neighbours and the main explainers, A step-by-step animation against the method it replaced; minus build cost.

| # | Idea | Q | R | C | S | M | P | N | A | Cost | Total | Placement | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **One preference pair through eight losses, animated** (reward model as "before", DPO, cDPO, IPO, length-normalised DPO, SimPO, ORPO, KTO): what each reads (sum or average, reference or not), scores, margin, loss on its curve, per-token push with the shared prefix, then 400 training steps on this pair alone with the chosen and rejected log-probabilities against DPO's | 2 | 1 (x2: cDPO stops at ln 9 / β, IPO at 1/(2τ) by construction) | 2 (x2) | 2 | 2 (shared tokens cancel in DPO, not under length normalisation; DPO's margin grows by crushing the rejected answer) | 2 | 2 (adds RM, KTO, ORPO, LN-DPO and the per-token view; the DPO page's morph covers the curves only) | 2 | -2 | 18 | Reading, section 4 | built |
| 2 | **Which tokens carry the loss**, on a real Tulu 3 conversation tokenized with Tulu 3's tokenizer: every token, assistant turns, last answer, instruction modelling; counters | 1 | 1 (x2: the template markers really are 5 plain tokens each) | 2 (x2) | 2 | 2 (TRL's default trains on user turns of conversational data) | 2 | 2 | 0 | -1 | 15 | Reading, section 1 | built |
| 3 | **Eight real conversations padded against packed, animated** (before: pad to longest; after: best-fit packing, plain causal mask leaking, then boundaries), with masks to scale and counters for positions computed and cross-conversation attention | 1 | 1 (x2) | 2 (x2) | 2 | 2 (plain packing leaks attention: 61.8% of pairs on the sample) | 1 | 2 | 2 | -2 | 15 | Reading, Packing | built |
| 4 | **Method family tree**: 33 methods by first-arXiv date and signal lane, edges to the method each changed, detail with what it removed or fixed, successors, and the KB page | 1 | 0 | 2 (x2) | 2 | 1 | 2 | 1 (DPO page's then-and-now is DPO-only; parent's "How we got here" is all stages by year) | 0 | -1 | 10 | Own tab | built |
| 5 | Sum against mean loss widget (token weights in a batch under per-example mean, per-batch mean, sum) | 1 | 1 | 2 | 1 | 2 | 1 | 2 | 0 | -1 | 11 | | folded into prose with the sample's derived 56.5x; a widget would repeat one ratio |
| 6 | RLVR pipeline animation (prompt, group, verifier, advantages, update) with GRPO against Dr. GRPO, DAPO clip-higher and dynamic sampling, GSPO sequence ratios | 2 | 1 | 2 | 2 | 1 | 1 | 0 | 2 | -2 | | | rejected: owned by RL for LLMs and the DeepSeekMath page (animation, live trainer, GRPO then-and-now); the parent animates GRPO's group. Linked by tab name |
| 7 | Bradley-Terry reward-model widget on its own | 1 | 1 | 2 | 1 | 1 | 1 | 0 | 0 | -1 | | | rejected as a separate visual: InstructGPT page has K = 4 to 9 pairs live, Constitutional AI the soft/hard labels; the BT loss is the first method of idea 1 |
| 8 | Online against offline simulator | 2 | 0 | 0 | 1 | 1 | 1 | 1 | 1 | -2 | | | rejected: no public numbers would let a toy say anything not built in; the published comparisons are listed with numbers instead |
| 9 | pass@k curves for RLVR against base | 2 | 1 | 1 | 2 | 1 | 0 | 0 | 0 | -1 | | | rejected: the parent's Axis 1 and the DeepSeekMath and R1 pages carry the evidence; curves would be read off images |
| 10 | KTO and ORPO trained on the DPO page's enumerable toy | | | | | | | | | | | | rejected: belongs to the DPO paper page (which rejected it for the same reason); idea 1 shows their mechanics |

## Data and formulas

- Token chips: `mk_lengths.py` with `allenai/Llama-3.1-Tulu-3-8B` tokenizer.json and its chat_template (tokenizer_config.json); the conversation is the page's own example. `inputs/example_tokens.json`.
- Sample: 1,000 rows of `allenai/tulu-3-sft-mixture` (100 seeded offsets x 10 rows, datasets-server API), counts with the same tokenizer and template, loss = assistant content + eos (open-instruct's rule). `inputs/tulu3_lengths.json`. recompute.py: padding efficiency by micro-batch (random batches, 50 seeds), best-fit-decreasing packing into 4,096 (Tulu 3's max length, Table 11), cross-document causal pairs Σ l_i x (tokens before i in its row) over all causal pairs, p10 and p90 of graded tokens. Truncation at 4,096 scales loss tokens proportionally (24 of 1,000 rows).
- Pair: token probabilities illustrative; formulas from each paper (research notes in `inputs/research_dpo.md`); token log-prob = log σ(θ); gradient descent with step size fixed at step 0 so the largest parameter moves 0.1. JS port checked against Python to 1.4e-14 (`check_pair.mjs`).
- Tree: dates from arXiv identifiers, verified on arxiv.org on 3 October 2026.

## Defaults that reproduce something

- cDPO's stopping margin ln((1 − ε)/ε)/β = 2.197 and IPO's 1/(2τ) = 5 are reproduced by the toy, **by construction** (they are the losses' fixed points).
- The sample statistics reproduce nothing published (the sample is new); Krell et al.'s 50% padding and HF's 2x are quoted beside them, not reproduced.

## Inspiration

DeepSeek MLA explainer (before/after, counters); the DPO page's push-against-margin morph (kept separate, linked); HF packing blog's figure of position ids; the parent's RD.anim controller (reused).

## What the methodology lacked

A rule for ownership across topics: a sibling under another topic (RL for LLMs) can own a mechanism that the caller listed as a candidate here. Checking the neighbour's own scope statement before scoring saved building a duplicate. Also: when a toy's dynamics depend on the optimiser (Adam made every loss run away at the same rate), fix the step size from the first step so the loss shape, not the optimiser, decides the ending, and say so.
