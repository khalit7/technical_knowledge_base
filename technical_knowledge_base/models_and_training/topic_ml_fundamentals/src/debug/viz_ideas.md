# Visualisation ideas: "When training goes wrong" tab (t-debug)

Central question: **"My training curve looks like this: what is most likely wrong, in which band of the training step, and how do I confirm it?"** Khalid chose a symptom-to-cause debugger across all the bands, with a loss-curve gallery, large-scale spike cases and at least one before/after animation.

Scoring as in `html_utils/interactive-html-ideas.md` section 2 (0 to 2 each: quantity moves with a control; reproduces a stated figure; computable from public data; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; animation point), reproduce and computable counted double, build cost subtracted.

| # | Idea | What it shows, what the reader does | Score | Data | Placement | Status |
|---|---|---|---|---|---|---|
| DG-1 | **Symptom map and debugger** | 10 symptoms x 10 bands grid, cell = cause rank; pick a symptom, open causes ordered most likely first, each with band, check, fix, owner child page, Training-lab reproduction, and a recorded bug/fix chart that swaps per cause | 13 | 31 recorded digit runs (`runs_digits.py`), sources per cause | Tab, top | built |
| DG-2 | **Loss-curve gallery** | 19 real curves, one per pathology, train solid and validation dashed, log scale; click opens the symptom | 11 | same runs plus the toy Transformer | Tab | built |
| DG-3 | **Bug and fix, step by step (animation)** | Replays recorded logs: per-layer gradient norms of a 20-layer net, sigmoid against ReLU + He (vanishing), N(0,1) against He (exploding, NaN at step 2), and the toy Transformer without and with QK-norm + z-loss (loss, largest attention logit, running spike count); caption per phase, counters, play/pause/step/scrub/speed, on-screen only, paused under reduced motion | 13 | `lay` rows recorded every 10 (vanishing) or every step (exploding); per-step spike logs | Tab | built |
| DG-4 | **Learning-rate sweep at toy scale** | Final validation loss and largest attention logit against peak rate (1e-3 to 1e-1), with and without QK-norm + z-loss | 12 | `runs_spike.py sweep` (10 runs); reproduces Wortsman et al.'s qualitative claim independently (the fixes widen the usable rate range; the best loss does not need them) | Tab, Spikes | built |
| DG-5 | **Spike score live** | OLMo 2's definition on the toy's per-step loss, gradient norm or attention logit; window and threshold sliders; five variants compared | 11 | per-step logs, 2-char log-quantised (max error under 0.15%) | Tab, Spikes | built |
| DG-6 | **Loss at initialisation calculator** | ln K for any K with presets (10, 1,000, 50,257, 128,256) and four recorded first-step losses (2.301, 2.933, 4.724, 2.8e16) | 9 | ln K exact; runs | Tab, Recipe | built |
| DG-7 | **Overfit one batch, three versions of the code** | Healthy (0.0012), stale optimiser (stays 2.37), shuffled labels (0.0012): the check separates code bugs from data bugs | 10 | recorded | Tab, Recipe | built |
| DG-8 | **Imbalance remedies table** | Accuracy, recall, precision, F1, AUPRC for plain, re-weighted, focal, oversampled, prior bias (3 seeds) | 10 | `runs_imbalance.py` | Tab, symptom "Good accuracy, useless on the minority class" | built |
| DG-9 | Large-scale spike curves redrawn (OLMo 2 Figures 2 to 10) | The OLMo 2 paper page already replays them from the vector PDFs with the spike score; repeating them breaks "each fact said once" | 6 | | link instead | rejected |
| DG-10 | PaLM or Llama 3 loss curves | Images only, no printed values: the method forbids reading curves | 3 | | | rejected |
| DG-11 | Live in-browser trainer that injects bugs | Belongs to the Training lab tab (another agent); this tab names the lab setting that reproduces each cause instead | 8 | | link | rejected (owned elsewhere) |
| DG-12 | Loss-landscape contour view for unscaled features | Illustrative only; the recorded unscaled run shows the effect on a real curve | 6 | | | rejected |
| DG-13 | Animation of the NaN appearing (log of an underflowed softmax) | Would need per-step minimum probabilities, not recorded; the chart's NaN marker and the validation-inf note carry it | 7 | | | rejected for now |

## Departures and findings
- Every curve is recorded here rather than taken from papers, because published pathology curves exist only as images. Large-scale numbers are printed values (PaLM §5.1, OLMo 2 §3, Llama 3 §3.4.1 and §7.3, Tuning Playbook text).
- At 3e-2 the toy's attention logits run away (2,620 against 14) but the loss never spikes and the gradient norm stays below 1 (clipping at 1.0 changed nothing); the per-step runs were therefore recorded at 1e-1, where the sweep shows the damage. The 3e-2 per-step log is kept out of the page.
- A real bug was hit while building: the scaler divided by std + 1e-6 for always-zero border pixels; kept as a recorded case (validation wrong from step 0).
- The order of causes is a judgement (Karpathy, the Tuning Playbook, these runs): no source counts cause frequencies, and the tab says so.

## What the methodology lacked
A rule for "debugger" pages, where the visual is a lookup rather than a mechanism: the recorded pair (same seed, same batches, bug and fix) played the role that "defaults reproduce a published figure" plays elsewhere.
