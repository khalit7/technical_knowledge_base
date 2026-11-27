# Visuals: built and rejected (ids A-end_to_end_4bit_training.k)

The question the page keeps returning to: where does 4-bit rounding error stay random (and average away), and where does it become bias (and compound)?

## Built
| Id | Visual | Kind | Why |
|---|---|---|---|
| A-e4.1 | Hero: the article's priorities table (four stages by error, bias, speed, memory) with the format each stage got | static diagram | The article's argument in one picture: 4 bits where bias does not matter. Redrawn from the table the post prints (its own is an HTML table under the site's copyright). |
| A-e4.2 | The transpose toy: a 32 x 16 illustrative tile, forward NVFP4 rows against five backward operands, with exact bias, noise, noise after 1,000 draws and zero counts | widget (live ingredient) | Shows what the post argues but never measures: the naive mismatch is a fixed error, 16 x 16 tiles lose the forward pass's small values, stochastic NVFP4 is unbiased but noisy, stochastic MXFP8 is unbiased and quiet, and nearest MXFP8 (what replications run, for lack of a stochastic quantiser in Transformer Engine) is a small fixed error. Exact statistics, port of `recompute.py`, checked by `check_page.mjs`. |
| A-e4.3 | One MoE layer's NVLink hops with bits per value (dispatch 4.5, combine 8.25 instead of 16) | static diagram | The structure of section 5; the post's Figure 5 is a timing sketch without numbers, so only its boxes are reused, redrawn. |
| A-e4.4 | Cost calculator: Amdahl on the 4-bit share of the step, and the time to MXFP8's loss after the 2% CE cost | calculator (type 8) | Answers "why 3x matmuls give 8%" and "what 8% at 2% CE is worth" (about 5.5% less time to equal loss); defaults reproduce 8% and 20% by construction. |

## Rejected
| Idea | Reason |
|---|---|
| Embed or rebuild the post's Figure 1 (bit-level NVFP4 widget) | The owner (Quantization and Precision) has a bit explorer; the post's own is linked from Further reading. |
| Rebuild the post's Figures 2 and 3 (row against column scales, 1 x 16 against 16 x 16 around an outlier) on their own | The toy covers both cases (presets "One large row" and "One outlier") and adds the bias and noise the figures do not show. |
| Redraw Figure 4 (the quantised linear layer) | Quantization and Precision's Fig. 10 already draws this recipe ("NVFP4 MoE experts") beside the others: linked. |
| A Hadamard before/after scatter (the post's Figure 6) | Quantization and Precision's Fig. 8 owns the Hadamard rotation, on real activations: linked. |
| An animated Gantt of dispatch, matmuls and combine (Figure 5) | The post prints no timings; any bar lengths would be invented. |
| A 3D stage of the tile | A flat grid shows rows against columns at once; depth would add nothing. |
