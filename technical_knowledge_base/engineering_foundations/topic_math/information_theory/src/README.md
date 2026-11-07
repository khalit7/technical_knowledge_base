# Source of the Information theory page

`sh build.sh` writes `../index.html`: it generates `parts/23_js_data.js` from `inputs/measured.json` and `inputs/darwin_fn.json`, concatenates the parts, expands `{{text|url}}` links, and converts LaTeX to MathML with `html_utils/tex2mathml.mjs`.

- `parts/`: `01_head` (copied from the root), `10_header`, `20_read_a` to `20_read_m` (Reading: the idea in one screen, sections 1 to 11, closed depth section 12), `31_tab_lab` (Entropy and KL lab), `32_tab_real` (Real text, measured), `39_tab_more` (Further reading); JS: `21_js_rd_common` (the skill template: autoplays on view since 2026-11-06), `02_split.html`, `25_js_s3.js` and the scenes `28_js_sc_*` (see the 2026-11-06 section), `22_js_core` (all maths as pure functions), `24` to `26` (Reading visuals), `27_js_read_d` (hero and temperature slider), `31_js_lab`, `32_js_real`, `99_js_tabs`.
- `recompute.py` (stdlib only): every number on the page, written to `inputs/numbers.json`. `check_js.mjs`: runs `22_js_core.js` in Node and compares 72 values with it (including the Monte Carlo charts, which use the same seeded mulberry32 generator in both languages). `test_page.mjs` (run from `html_utils/`): clicks every control on every tab at 390 dark and 920 light.
- `data/`: `prep.py`, `prep_fr.py` (cut the passages from Project Gutenberg #1228 and #17489), `score.py` (per-token losses from four models; run with `uv run --no-project --with torch --with transformers` in scratch), `comp.py` (compressors), `fn.py` (plug-in conditional entropies on the whole book), `extract.py` (builds `inputs/measured.json`).
- `inputs/`: the three texts (public domain), `measured.json` (summaries and the first 40 tokens per model), `darwin_fn.json`, `numbers.json`.
- `live.md`: the old page, verbatim; `coverage.json`: where each of its facts went; `handoff_variational_inference_and_generative_models.md`: what sibling #8 owns.

Departures from the child-page method: the page stays ordered by the subject's own logic (each section builds on the last); it uses the textbook letters (p truth, q model), the reverse of the root's, and says so at the top.

## The 2026-10-24 rebuild to the teaching contract
- **Top**: the core sentence (every log-loss is a code length: entropy floor plus removable KL), a new static hero (`it-hero`: the two-code stream and GPT-2 against Qwen2.5 on one passage, whose 0.153 bits per byte gap is all KL because both share the passage's unknown floor), "You need", the notation box, and a new-terms table that replaces the six summary cards and the closing cheat sheet.
- **Merged**: surprise and entropy (old 1, 2); cross-entropy and KL (old 5, 6); joint and conditional entropy into mutual information (old 4, 8), with the sequence chain rule moved to the loss-floor section; the conditional-entropy chart moved to the estimation section, where its point (count estimates collapse) is made.
- **New**: section 5, temperature and the entropy of a sampling distribution (slider on the tiny model's scores, derived dH/dT = Var(z)/T^3, checked numerically in `recompute.py` and in `check_js.mjs`), with the information-theoretic reading of distillation (teacher entropy plus forward KL, the 1/T^2 gradient scale, on-policy reverse KL), linking the Distillation page that owns the recipes. Pinsker's inequality moved from f-divergences into the KL-penalty section, checked on the tiny policy (0.122 within 0.18).
- **Into closed blocks**: Shannon's axiom and grouping example, maximum entropy and differential entropy, Shannon code and block Huffman with the theorem's statement, BCE and proper scoring, the Gibbs proof, moment matching, the chain-rule and DPI proofs, InfoNCE's exact bound and CLIP's temperature, the DPO closed-form derivation, the k1/k2/k3 numbers, the ELBO derivation, BPC conversions, Delétang Table 2, f-divergences, which quantity to use when.
- **Deleted as fat**: the "The question" openers, "In plain words" restatements a caption now carries, section 15's mistakes (each restated a section; the two that taught something new, perplexity as e^loss not 2^loss and "same gradient, different value" for CE and KL, moved into sections 1 and 3), the old nav and reading-time line.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `it6-tab`); the lab and real-text tabs register their render functions on `TAB_RENDER` directly. A check scrolled each of the four animations into view and all stayed on step 0.
- **Tabs kept**: the Entropy and KL lab is a tool used across sections 1 to 4 and 12; Real text, measured is the dataset view behind sections 6, 7 and 11.
- **No real image**: the subject is abstract; every mechanism is a diagram. No photo or paper figure would teach more than the drawn ones.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 81.8 min (18,813 words) | 47.6 min (10,954) |
| Reading, closed details | 2.0 min | 16.3 min |
| Lab / Real text / Further reading | 2.2 / 3.3 / 5.2 min | unchanged |
| Visuals drawn in Reading | 8 | 10 |

Why 48 minutes is right: the page owns eleven ideas (surprise and entropy, codes, CE and KL, KL direction, temperature, perplexity and BPB, the floor and compression, MI and data processing, InfoNCE, KL penalties, estimation), each with a concrete number, a visual and its formula, and the ledger's core units are all needed for one of them. The audit counts each formula twice (MathML tokens and the TeX annotation), and formulas are about 40% of the counted core words, so the prose a reader actually reads is closer to 30 minutes. What made the old page long (question openers, plain-words restatements, step-by-step derivations, the mistakes list, the cheat sheet) is now closed or deleted.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
697 units: core 566, depth 83, fat 48. 684 were drafted by `ledger.py init` from the old page and kept as sentences; keys were chosen automatically (the longest number or a 4-word phrase found on the rebuilt page) and by hand for formula sentences; 13 were added by hand for script-rendered tables and the new temperature, distillation and Pinsker content. Fat units carry a `note`.

## The 2026-11-06 pass: split layout, four 3D stages, explained step lists, autoplay
Khalid's standing rules of 2026-11-06 (`teaching/teaching-contract.md` "Page layout", `visuals/mechanics.md`, `visuals/three-d.md`), with the Attention Is All You Need page's Fig. 3 scene as the style reference and Calculus and optimisation as the sibling example. Nothing was re-condensed; per-step captions moved into step lists.
- **Templates**: `02_split.html` (included after the head in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (storage key `it6-tab`) copied from `.claude/skills/explainer-page/build/templates/`.
- **Split layout**, Reading: the idea (stage); section 1 three times (surprise | surprise bars; entropy | binary-entropy chart; the definition and its readings | stage); section 2 (Huffman animation); section 3 (stage); section 4 (forward against reverse animation); section 5 (temperature slider); section 6 twice (four perplexities table; the four-model table); section 7 twice (arithmetic coding; compression ladder); section 8 twice (the shared-bits bars; stage); section 9 (InfoNCE chart); section 10 (KL-optimum table); section 11 twice (F_N chart; plug-in bias chart). Full width: "You need", the letter convention, new terms, section 2's real-text paragraph, the training-loss and never-negative parts of 3, where each KL direction shows up, distillation, the loss floor, Delétang's correction and counting the model, the data processing inequality, the KL estimators and the ELBO, the estimation checklist, section 12. Lab: notes, identity line and codes table left; presets, editors, results and bars right. Real text: notes and "What was run" left, table and bars right; the token strip full width; "What reproduces" left, the prefix chart right. Further reading unchanged.
- **Four 3D stages** (`28_js_sc_*.js`; shared helpers in `28_js_sc_0util.js`: the probability triangle of cat, dog, sat, a shaded height field over it, signed bars on a plinth), all computed from `IT` (`22_js_core.js`) on the page's own distributions:
  - `28_js_sc_1hero.js`, Fig. 1 (replaces the static 2D hero): the cross-entropy H(p, q) of every bet against the soft target (dog 0.2, sat 0.8; illustrative, section 3), the floor H(p) = 0.500 nats as a plane, the 1.707 KL column above the tiny bet (2.208 nats in all), and gradient descent on the scores (step 1, 40 steps; illustrative) taking the KL to 0.017. The GPT-2 against Qwen2.5 bars of the old hero became a sentence (the ladder of section 7 draws both models).
  - `28_js_sc_2ent.js`, Fig. 2 (new): entropy over the triangle, the uniform peak 1.585 bits, the tiny bet 1.201, an edge as the binary entropy curve, and the temperature path (T = 0.5, 1, 2).
  - `28_js_sc_3kl.js`, Fig. 3 (replaces the 17-frame 2D two-code stream, which broke the long-replay rule): 16 symbols, the 28-bit and 38-bit codeword stacks with flows, the per-outcome KL terms (+1, -0.25, -0.125, 0) and the reverse direction's (-0.25, +0.5, +0.25, 0).
  - `28_js_sc_4mi.js`, Fig. 4 (new): the 80%-agreement joint as bars, marginals on the edges, independence as glass lids, the per-cell MI terms (+0.271, -0.132) on a plinth, then Y = X^2 (0.918 bits at zero correlation).
  - `recompute.py` writes every number these stages quote (`hero3d_*`, `ent3d_*`, `kl3d_*`, `mi3d_*`); `check_stages.mjs` compares the scenes' exported values with them.
- **2D animations with step lists**: Huffman (`sx-huf`, 5 steps) and arithmetic coding (`sx-ac`, 4) lost their caption carousels to the lists; forward against reverse KL (`sx-fr`) is now four explained stretches of the 200 gradient steps (0, 10, 40, 200), each step playing its frames (none under reduced motion).
- **Kept 2D**: the binary entropy curve and the temperature slider (one variable), the F_N, InfoNCE and plug-in bias charts (log axes or curves), the compression ladder, the tables, the lab and the real-text views. A 3D stage for the KL-penalty table (reference against the optimum for four betas) was considered and not built: the table already reads in one glance.
- **Corrected**: the soft-target cross-entropy is 2.208 nats (\(-0.2 \ln 0.245 - 0.8 \ln 0.090 = 2.2077\)), not 2.207.
- **Fixed** a pre-existing clip at 390 px (two long inline formulas in closed details, now split).
- **Checks**: `check_stages.mjs [shots dir]` (stages and animations play on view, step to the end with one list item per step, flows stop off screen, nothing moves under reduced motion, splits are two columns at 1400 px, stage numbers match `numbers.json`); `test_page.mjs` and `check_js.mjs` as before.

| | Before (2026-11-06) | After |
|---|---|---|
| Reading core (230 words a minute) | 34.2 min (7,860 words) | 38.3 min (8,820) |
| Reading closed details | 8.3 min | 8.3 min |
| Lab / Real text / Further reading | 2.0 / 3.3 / 5.3 min | unchanged |
| Visuals in Reading (audit) | 10 | 12 (four stages; the 2D hero and two-code stream replaced) |

The four extra minutes are the seven step lists (each step says what its picture shows, with its numbers); one restated MI computation and one Huffman restatement were cut. Ledger: 697 units, core 564, depth 83, fat 50; 4 units re-keyed to the new wording (203, 206, 218, 297); `ledger.py check` problems 0.
