# Inside a real model (t-inside): visuals built and rejected

Scores 0 to 2 on the criteria of `.claude/skills/explainer-page/visuals/choosing.md` (reproduces a source and public inputs count double), minus build cost.

## Built
| Visual | Kind | Score | Notes |
|---|---|---|---|
| Head atlas + attention-map explorer (SmolLM2, 30 x 9 heads, map + text row view) | explorer (type 9) + attention map (type 7) | 11 | Scores for all 270 heads; maps stored for 7 layers (0, 2, 11, 12, 16, 18, 29) at weights >= 0.06 (68% of the mass) to keep the data near 100 KB. The text view (tap a token, see what it reads) is easier to read at 390 px than the canvas. |
| Pythia-70M checkpoints: same repeated random sequence, step 0 to 143,000 | before/after on the same input (type 1), stepped | 14 | The induction phase change on published checkpoints. Shows loss by position and the best head's attention row from one query, with the target marked. |
| Phase-change chart: induction score and copy-2 loss against tokens trained (log x), Pythia plus the tiny GPT's trajectory | one axis (type 13) | 12 | Shows the tiny GPT's entire run sits left of the phase change: the honest reason it has no induction head. |
| Sliding window with and without the sink, same 1,024-token text | before/after (type 1), stepped | 15 | Reproduces StreamingLLM's two abstract claims independently on SmolLM2; the strip shows visible keys per rule, the curves reveal block by block. |
| Weight on token 0 by layer (SmolLM2, Qwen3, tiny GPT; with <|endoftext|> prepended) | toggle-compare (type 3) | 10 | |
| Residual stream size by layer, log scale (max and median entry, token-0 norm) | toggle-compare | 10 | Ties the sink's layer to the massive activation's layer. |
| Logit-lens strip (layers x positions, top-1 token, coloured by p(true next)) | attention/token map (type 7) | 9 | |
| Lens quality by depth for four models (agreement, loss) | toggle-compare | 9 | tiny GPT init vs trained is the before/after. |
| Roxy chart: loss on each "x" of Roxy, init / 600 steps / 1,500 steps | before/after | 9 | What the tiny GPT does learn about context use. |
| Three predict-then-reveal drills | type 10 | | random-copy loss, window without sink, masked <|endoftext|> sanity check. |

## Rejected
- Full attention maps for all 270 SmolLM2 heads: about 375 KB even sparse; scores for all plus maps for 7 layers instead.
- Attention maps of Qwen3-0.6B (448 heads): size; Qwen3 appears in scores, sink, window, activation and lens charts.
- Training the tiny GPT long enough to form induction heads: Pythia needed between 1.07B and 2.10B tokens; the tiny GPT runs at about 40k tokens/s here, so 1B tokens is about 7 hours of GPU for something the published checkpoints show for free (cheap-runs rule). Not run.
- Tuned lens: needs training a probe per layer; cited instead.
- Sparse autoencoders, feature dictionaries: outside this tab's scope (interpretability may become its own topic).
- An animated "two-head circuit" cartoon of induction: the checkpoint animation shows the real head doing it; a cartoon would repeat the prose.
