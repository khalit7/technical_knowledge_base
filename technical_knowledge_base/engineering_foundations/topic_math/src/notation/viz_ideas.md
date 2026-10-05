# Notation decoder (t-notation): visual ideas

Question the tab answers: "what does each mark in a real paper's equation mean, what shape is it, and can I run it once by hand?"

## Built
1. **Tap-a-symbol decoder on 14 real equations** (attention, multi-head attention, LayerNorm, GPT-1's LM objective, Adam, LoRA, Chinchilla's parametric loss, InfoNCE, DDPM's L_simple, InstructGPT's KL-regularised objective, PPO's clipped objective, DPO, GRPO's advantage, GRPO's k3 KL estimator). Equations are LaTeX in the part file, converted to MathML at build; `31_js_nd.js` finds each symbol's MathML nodes by text content (longest match first, minimal node) and makes them tappable, with chips as the accessible fallback. Detail: name, meaning, shape with concrete sizes, where defined (section and page).
2. **Worked example per equation**, each step a formula with the numbers in, recomputed by `recompute.py` (262 checks, including that every displayed decimal appears in its card on the built page).
3. **Attention decoded step by step, before/after** (13 steps: inputs, transpose, QK^T row by row, scale, softmax row by row, times V row by row, summary), real 3-token matrices, shapes and a multiply-add counter at every step; toggle runs the same input as plain dot-product attention (no 1/sqrt(d_k)), the method Eq. (1) modified. Uses `RD.anim` (play, pause, step, scrub, speed; on-screen only; paused under reduced motion). JS numbers checked against Python (`page_numbers.json`).
4. **Conventions reference panel** (22 cards, filterable, "Seen in" jumps to the equations): columns, row-per-example, shapes, transpose/Hermitian, numerator vs denominator layout (worked: dL/dW for L = u^T W x, both layouts, nudge check), nabla, argmax, E_{x~p}, ~, log base, indicator, norms, := and triangleq, proportional, hats/bars/tildes/stars, sg (VQ-VAE Eq. 3), bar vs semicolon, odot/otimes/circ, sum indices, sub/superscripts, letters with two jobs, big-O.

## Rejected
- **\class-tagged MathML for tap targets:** Temml refuses \class/\data without `trust`, and the shared tex2mathml.mjs must not change; text-content matching gives the same result and is checked by `check_page.mjs` (every chip lights at least one node).
- **A runtime TeX engine for live-number formulas:** forbidden by the brief; numbers that change (animation) are plain HTML grids.
- **Animating every equation:** only attention has a process with steps and a predecessor; for the others the static steps teach as much.
- **Showing all 14 cards at once:** too long on a phone; a picker with prev/next keeps one card visible, remembered in localStorage.
- **Old page's notation content:** the old page has none beyond the layout-convention remark, which is carried (and made precise: autograd returns the parameter's shape; numerator layout gives its transpose).

## Sources
Paper PDFs (arXiv versions as linked on each card; GPT-1 from OpenAI's PDF) read with pdftotext; LaTeX cross-checked against ar5iv where it rendered. PyTorch 2.14 LayerNorm docs (biased variance, eps 1e-5). TRL commit 14c8d70 (`utils.py` nanstd L986 divides by G-1; `grpo_trainer.py` L2702 adds 1e-4). Schulman 2020 for k3. Wikipedia "Matrix calculus" for layout conventions.
