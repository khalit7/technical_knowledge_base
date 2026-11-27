# Visuals: built and rejected

## Built
- **Hero: one layer over six tokens, one draw** (input, per-token noise, each token's own loss change, the estimated error, the outer product). The page hangs on per-token credit, so the hero is the mechanism, with one line on what weight-space ES does instead.
- **One token's estimate against the exact error** at K = 16, 256 and 4,096: concrete numbers before the formula, from the toy's own run.
- **Live toy: three estimators of one layer's gradient** (weight noise, activation noise with one batch reward, activation noise with per-token rewards) against the exact gradient, cosine against forward passes, one width at a time, with the fitted law. Shows Section 2.1's whole argument, including its "naive" case, and lands on Werfel et al.'s factors. Recorded curves on load, a button reruns seed 1 live.
- **Compute per update, log scale**: backprop, Dust at each population (calculated from Appendix E), and the extrapolated EGGROLL spend to match Dust at 64. The post has no compute figure; this is the question the page most needed answered.
- **Gap to backprop by token budget**: Table 1 re-expressed as Dust minus backprop, with update counts, the Adam point and the lab's later Noise measurements. Shows the trend Figure 2 spreads over four panels.
- **Model-size gaps**: Figure 4 re-expressed against each size's own backprop (the post shows absolute losses).
- **Cosines at 16k per layer type**: Table 8's law evaluated at the training population, with ceilings.

## Rejected
- Embedding the post's figures (no licence stated); redrawn from its numbers instead.
- Redrawing Figure 2 as four panels: the gap chart carries its message in one.
- An animation of draws accumulating: the token table and the toy's slider show convergence with less motion.
- Training Dust on a toy language model in the browser: hours of CPU to show a loss curve whose relation to the 37.7M-parameter results would be unclear; the gradient-estimate toy isolates the mechanism the claims rest on.
- 3D anything: nothing here has spatial structure.
