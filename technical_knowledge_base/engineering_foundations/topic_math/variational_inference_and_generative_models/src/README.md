# Source of the Variational inference and generative-model maths page

Child of Topic: math (page prefix `vi`, storage key `vi8-tab`). Built October 2026; rebuilt 2026-10-24 to the teaching contract (editing only, no new runs).

## Build
`sh build.sh` writes `../index.html`: it generates `parts/23_js_data.js` from `inputs/numbers.json`, `inputs/vae.json` and `inputs/dm.json`, concatenates the parts, expands `{{text|url}}` links, and converts LaTeX to MathML with `html_utils/tex2mathml.mjs` (display formulas sit in a scrolling `div.dm`).

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen: core sentence, hero, you need, new terms; section 1), `20_read_b` (2 posterior and VI), `20_read_c` (3 ELBO three ways, with the ELBO widget and the IWAE chart), `20_read_d` (4 mean field, amortised, richer families), `20_read_e` (5 gradients, with the optimiser), `20_read_f` (6 the ELBO in VAEs and diffusion), `20_read_g` (7 derivations D1 to D8, closed; generated, see below), `20_read_h` (8 measured on this page's models M1 to M3 plus the dated systems table, closed; generated), `20_read_i` (9 common mistakes, each closed) | sections 1 to 6 core, 7 to 9 closed |
| Further reading `t-more` | `39_tab_more.html` | |

JS: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (nothing moves before the reader acts); `22_js_core.js` (all maths and both trained networks as pure functions); `24_js_read_a.js` (CAVI stepper, estimator chart, VAE curves, beta table, schedules); `25_js_read_b.js` (forward-then-back animation, straightness); `26_js_rd_new.js` (hero, VAE against diffusion diagram, IWAE chart, gap split, and the closed-block helpers: a block redraws its charts when opened, and a link to a block opens it); `31_js_elbo.js` (the former ELBO lab, now the section 3 widget and the section 5 optimiser); `32_js_diff.js` (sampler lab, block M3); `33_js_vae.js` (VAE explorer, block M1).

`20_read_g.html` and `20_read_h.html` were assembled on 2026-10-24 from the pre-rebuild parts by two one-off scripts (verbatim moves with section references renumbered), then edited by hand; edit them directly from now on.

## Checks
- `recompute.py` (NumPy): every closed-form number with a Monte Carlo or independent check, written to `inputs/numbers.json`. `check_js.mjs`: runs `22_js_core.js` in Node against `numbers.json` and the NumPy sampler (`inputs/sampler_ref.json`): 42 values, 0 mismatches, largest sample difference 5e-11 (2026-10-24).
- `test_page.mjs` (run from `html_utils/`): opens every closed block, clicks every control at 390 dark (reduced motion) and 920 light (normal motion), checks that no animation moves before the reader acts, screenshots each card: 248 clicks, 0 problems (2026-10-24).
- `ledger.json`, `python3 html_utils/ledger.py check`: problems 0.
- `data/`: `vae.py`, `vae_gap.py`, `diffusion.py`, `sampler.py`, `sampler_ref.py`, `extract.py` as before (rerun: `cd data; OMP_NUM_THREADS=2 uv run --no-project --with torch --with numpy python vae.py 30`, needing the four MNIST .gz files, then `vae_gap.py`, `diffusion.py 64 30000`, `python3 extract.py`, `python3 sampler_ref.py`, `python3 ../recompute.py`, `node ../check_js.mjs`, `sh ../build.sh`).

Papers quoted (arXiv versions): Kingma and Welling 1312.6114v11, Ho et al. 2006.11239v2, Song et al. DDIM 2010.02502v4, Ho and Salimans 2207.12598v1, Lipman et al. 2210.02747v2, Song et al. SDE 2011.13456v2, Rezende and Mohamed 1505.05770v6, Blei et al. 1601.00670v9, Burda et al. 1509.00519v4, Cremer et al. 1801.03558v3, Bowman et al. 1511.06349v4, Liu et al. 2209.03003v1, Esser et al. 2403.03206v1, Song and Ermon 1907.05600v3, Nichol and Dhariwal 2102.09672v1, Kingma et al. VDM 2107.00630.

## The 2026-10-24 rebuild: what changed and why
Per OWNERS.md this page owns only the ELBO derivation and variational inference as mathematics; the VAE, diffusion and flow-matching models are owned by the children of Topic: generative-and-multimodal. The old page taught all of them as a 20-section course.
- **Top**: the core sentence, a hero figure (model A's prior, posterior and a poor \(q\), beside \(\log p(x) = -1.9305\) split into ELBO \(-3.1689\) plus the gap 1.2384), "You need", new terms.
- **Core, sections 1 to 6** (the subject this page owns): latent-variable models and the intractable evidence; the posterior and VI as optimisation (old 2 and 3 merged); the ELBO three ways with the gap drawn (the ELBO lab moved inline as the section's widget, plus a new IWAE chart); mean field (the CAVI stepper; its update derivation now closed), amortised inference (old section 9, with a new gap-split chart) and richer families (one paragraph on flows); the two gradient estimators (the variance chart plus the lab's optimiser moved inline); one paragraph each on how the ELBO reappears in VAEs and in diffusion, with a new static diagram of the two choices of \(q\).
- **Section 7, closed derivations D1 to D8**: the Gaussian KL and the loss in code, normalising flows, the forward process and schedules (with the schedule widget), the diffusion ELBO in eight steps, scores and Tweedie, DDIM, classifier-free guidance, conditional flow matching. They stay here because the generative pages cite them here rather than deriving them (Diffusion from zero: "derivations (the elbo, tweedie's formula, ddim) are on" this page; Flow matching: Theorem 2 and the probability-flow ODE).
- **Section 8, closed measurements M1 to M3**: the MNIST VAE (curves, test numbers, the former VAE tab's latent map, grid and reconstructions), the \(\beta\) sweep, and the two toy diffusion networks (forward-then-back animation, step and guidance tables, straightness, the former Diffusion lab), plus the dated systems table. These are this page's own runs; no owner carries them yet (see the report list below).
- **Tabs**: ELBO lab, Diffusion lab and A VAE on MNIST were removed as tabs; the first is inline in sections 3 and 5, the other two are inside blocks M3 and M1.
- **Moved to owners (ledger label owned)**: the VAE's parts and the KL's role (Autoencoders and VAEs, "plain autoencoder"), \(\beta\)-VAE motivation, free bits and VQ-VAE against collapse (same page), DPM-Solver, EDM and distillation (Diffusion from zero).
- **No autoplay**: the templates replace the old controller, which played once on first view.
- **Deleted as fat**: the old one-screen summary (the core sentence and hero carry it), the per-section "The question" wind-ups, "How to read it", pointers to removed tabs, "What it is used for" boxes folded into one sentence each.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 73 min | 31 min |
| Reading, closed details | 3 min | 45 min |
| Other tabs, core | ELBO lab 1.7 + Diffusion lab 1.4 + VAE 1.5 = 4.6 min (plus Further reading 3.5) | Further reading 4.0 min |
| Visuals in Reading (audit count) | 6, plus 5 in tabs | 14: 8 in the open core (hero, two panels; ELBO widget; IWAE chart; CAVI stepper; gap split; estimator chart; VAE against diffusion diagram) and 6 inside closed blocks (schedules, two; VAE curves; latent grid; reconstructions; forward-then-back), which the audit counts because closed blocks keep their layout size; the optimiser trace, latent map, straightness and sampler-lab charts draw on use |

The audit counts MathML twice (rendered tokens and the LaTeX annotation), so formula-heavy sections read faster than their minutes. Why 31 minutes is right: the core is now only what this page owns (the evidence, the posterior, VI, the ELBO three ways, three families, two estimators, and how the bound reappears), each with numbers on a model checkable by hand, a picture and the formula; nothing in it restates a generative page. The closed 45 minutes are the derivations other pages link here for and this page's own measured runs; they shrink when the owning pages absorb the measurements (listed in the rebuild report).

## Knowledge ledger (`ledger.json`)
593 units: core 191, depth 325, owned 9, fat 68, volatile 0. 584 were drafted by `ledger.py init` from the old page; 9 were added by hand for script-drawn visuals and tables (section "added by hand"). Keys were drafted as the longest stretch of each unit's text surviving on the rebuilt page, then set by hand for rewritten units. Fat units carry a `note`.

## Departures from the page-kind shape
- Sections 7 and 8 are long closed blocks of material outside this page's ownership; they are kept until the owning pages absorb or link them, rather than deleted, because other pages cite the derivations here and no owner carries these runs.
- No real images: the subject is mathematics, and every figure is a mechanism drawn from the page's own numbers.
