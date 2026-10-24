# Source of the Information theory page

`sh build.sh` writes `../index.html`: it generates `parts/23_js_data.js` from `inputs/measured.json` and `inputs/darwin_fn.json`, concatenates the parts, expands `{{text|url}}` links, and converts LaTeX to MathML with `html_utils/tex2mathml.mjs`.

- `parts/`: `01_head` (copied from the root), `10_header`, `20_read_a` to `20_read_m` (Reading: the idea in one screen, sections 1 to 11, closed depth section 12), `31_tab_lab` (Entropy and KL lab), `32_tab_real` (Real text, measured), `39_tab_more` (Further reading); JS: `21_js_rd_common` (the skill template: never autoplays), `22_js_core` (all maths as pure functions), `24` to `26` (Reading visuals), `27_js_read_d` (hero and temperature slider), `31_js_lab`, `32_js_real`, `99_js_tabs`.
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
