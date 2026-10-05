# Coverage: old Topic: math root (live.md) against the new root

Every fact of the old root (fetched 2026-10-05, saved verbatim in `live.md`), where the new page carries it, and corrections. "Reading sN" means section N of the Reading tab (ids rd-s1 to rd-s6; rd-hats, rd-eq, rd-gloss). "Child" means a rebuilt child page (proposed with the root); the old child pages are linked from Further reading meanwhile. Numbers are recomputed in `read/recompute.py` (`read/numbers.json`) and `read/recompute_children.py`.

## Elements of the page
| Old element | New home |
|---|---|
| Embed `topic-math.html` (out-of-repo interactive; saved as `inputs/old_embed_topic-math.html`) | Replaced by this page. It held a Read tab mirroring the text, a map of four areas and two shared objects, "follow cross-entropy" and "follow curvature" tours, a softmax/InfoNCE slider and a Bernoulli curvature chart, a Q and A ("which area should I reach for"), a 20-term glossary, resources and flashcards. The tours and Q and A are now the hats section and the diagnosis box (rd-hats); the curvature chart's content is the Bernoulli example (rd-hats); the glossary is rd-gloss (now 60+ terms); flashcards belong to Practice drills (t-drill). |
| Video "Topic: math: what each area lets you see" (7 min, 22 Sep 2026) and its caveat line | Stays on the Notion page; it describes the old structure. Ask Khalid whether to keep, remake or delete it (method: "the narrated video may describe the old page: leave it and ask"). |
| "10 min read, +19h 50m resources" | New: about 29 min main line (stated at the top of Reading); resources timed individually in Further reading. |
| Mermaid map of the four areas and subtopics | The one-screen picture (rd-one) organises by the training step instead; every subtopic node is placed below. |

## Facts
| Old fact | Where now | Note |
|---|---|---|
| Linear algebra is the notation; a layer is a matrix, attention two contractions, a batch one more axis | Reading s1 (matrix-vector product, batch, shapes); rd-eq (attention) | |
| Rank = independent directions; fine-tuning updates have low intrinsic rank; LoRA | Reading s1 (optional box) with the rank-1 gradient of the tiny model | Wording corrected: the paper hypothesises low intrinsic rank and shows rank 1 often suffices on GPT-3 |
| MLA and GaLore use the same low-rank factorisation | Child (linear algebra); GaLore 65.5% verified in `read/children_notes.md` | Not repeated on the root (DeepSeek page owns MLA) |
| SVD and Eckart-Young make truncation arithmetic | Reading s1 (optional box) | Worked SVD example: child |
| Condition number predicts long narrow valleys | Reading s5 (kappa, diag(1,10) example) | |
| Layout conventions: paper gradient vs autograd gradient are transposes | Reading s4 (gradient has the shape of W); Notation decoder (t-notation) owns the two layouts | |
| Choose a distribution, NLL gives the loss | Reading s2 table (Bernoulli/BCE, categorical/CE, Gaussian/MSE) | Laplace/L1 and Poisson: child |
| Proper scoring rules make calibration meaningful | Reading s2 | |
| MLE, MAP, Bayesian; loss plus regulariser is MAP | Reading s2 (MLE, MAP); Bayesian: child | |
| Paired tests, bootstrap CIs, 1/sqrt(n), 1-point gain on 500 examples | Reading s6 (SE, 95% interval, paired comparison, +-4.4 points at n 500); tests and bootstrap linked to Eval statistics | |
| Backprop = reverse-mode AD, VJPs, never builds Jacobian | Reading s4 | |
| Backward about twice forward | Reading s4 (two matrix products vs one; Kaplan 6N) | verified |
| Stored activations not FLOPs bind; activation checkpointing | Reading s4 (optional box; Chen et al. 2016) | verified |
| Hessian; GD diverges above 2/lambda_max | Reading s5 with animation and the tiny model's own limit (1.08) | |
| Ill-conditioning is what normalisation and good init fix | Reading s5 (optional box) | |
| Adam's second moment is a crude diagonal curvature proxy, closer to the empirical Fisher diagonal, not Newton | Reading s5 (optional box) | Corrected wording: exponential moving average; the Adam paper itself relates v_t to the diagonal Fisher |
| XGBoost leaves are Newton steps | Reading s5 (optional box: -G/(H + lambda)) | Worked example: child |
| Convexity marks which guarantees survive | Reading s5 (optional box) | |
| Lagrange multipliers behind TRPO's KL constraint and norm-ball regularisation | Child (calculus and optimisation); TRPO linked via Policy gradients page | Not on the root: one more concept than the step needs |
| Cross-entropy = code length; KL the gap; loss floors at data entropy | Reading s3 | |
| Perplexity is tokenizer-dependent; bits-per-byte is tokenizer-free | Reading s3 (with the Pile's 0.29335 tokens per byte) | verified |
| Forward vs reverse KL; MLE mode-covering, RLHF KL mode-seeking | Reading s3 (optional box) | |
| Cross-entropy four hats: MLE, code length, gradient p - y, InfoNCE | rd-hats, with the old worked example | |
| Worked example z = (2,1,0): e^z (7.389, 2.718, 1), sum 11.107, p (0.665, 0.245, 0.090); NLL 0.408; 0.588 bits; gradient (-0.335, 0.245, 0.090); InfoNCE bound 0.691 | rd-hats (all values), Reading s2 (softmax numbers) | verified; the running example now has sat as the truth (loss 2.408) so the step has something to fix; the old "A correct" case is the hats example |
| Symbol definitions (z_k, p_k, 1_A, N, I >= ln N - L) | rd-hats, rd-gloss | |
| Curvature one object three ways: Hessian, condition number, Fisher | rd-hats | |
| For canonical losses the Hessian wrt the logit does not depend on the label, so equals the Fisher; why natural gradient and K-FAC use the Fisher; TRPO's KL curvature is the Fisher | rd-hats (optional box) | Corrected in scope: exact wrt the logits only; wrt weights the Fisher equals the generalised Gauss-Newton part (Martens 2020) |
| Bernoulli worked example: Hessian p(1-p), variance p(1-p), Fisher p(1-p), 0.25 at z 0, 0.09 at z = ln 9 = 2.197; score y - p | rd-hats | verified with sympy; extended to the tiny model's diag(p) - pp^T |
| "Which area to reach for is a diagnosis" (probability, calculus, linear algebra, information theory) | rd-hats box, extended with statistics and optimisation | |
| Map of deep dives (four children with times and coverage) | Further reading, "The previous child pages (to be rebuilt)" | Old times kept and labelled |
| Flagged: independent vs dependent variables | Reading s2, collapsible box | Umbrella worked example: child |
| Flagged: what is entropy (1 bit fair coin, 0.47 bits for 90%) | Reading s3 | 0.469 |
| Flagged: Bernoulli and classification | Reading s2 table and note | |
| Flagged: differentiation of each cost function (prediction minus target, 2/n for MSE) | Reading s4, collapsible box (plus the 200x MSE-on-sigmoid comparison) | |
| Flagged: second-order differentiation (Hessian, Newton -H^-1 g, XGBoost -G/(H+lambda), condition number) | Reading s5 | |
| How it connects: Loss functions, Optimisers, LoRA and PEFT, TRPO and RLHF KL, Distributed Training | Further reading, related pages; deepnotes in s2, s5, s1, s3, s4 | The old "Deep RL: from DQN to PPO to MuZero" page (3c65c17b0d0d8180b808c8c0cf8ddbe6) is no longer in the manifest; replaced by Policy gradients and actor-critic and RL for LLMs |
| Best resources: MML book, Parr and Howard, Olah, Boyd and Vandenberghe, CS229 notes and probability review, Matrix Cookbook | Further reading, reading path (all links checked 2026-10-05, `read/sources_check.md`) | Times re-estimated: MML ch. 2-7 is 20-30 h, not 6 h 10 min; Boyd ch. 2-5 20-30 h (10 h for the core) not 5 h; Olah dated 14 Oct 2015 |

## Corrections made (summary)
1. LoRA rank wording (paper: rank 1 can suffice; tested 1, 2, 4, 8, 64).
2. Adam's v_t is an exponential moving average, and the diagonal-Fisher link is the Adam paper's own remark.
3. Hessian equals Fisher exactly only with respect to the logits (Martens 2020).
4. Resource reading times re-estimated (the old 6 h 10 min for MML ch. 2-7 and 5 h for Boyd ch. 2-5 were far too low).
5. From the children (`read/children_notes.md`): 11.212 -> 11.213; unpaired +-6.3 -> +-6.2 points with 1.96 SE; contraction rate holds at the optimal fixed step.
