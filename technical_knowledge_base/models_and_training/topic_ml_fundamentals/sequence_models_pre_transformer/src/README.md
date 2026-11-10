Source of the interactive HTML on the Notion page "Sequence models: the pre-transformer lineage" (child of Topic: ml-fundamentals).

Build: `sh build.sh` runs `export_data.py` (writes `parts/21_js_data.js` from `inputs/` and `model/runs/`), then writes `../index.html` from `parts/` (HTML and JS parts listed explicitly in `build.sh`; links as {{text|url}}, n:<notion id> or #t-<tab>), and fills in the reading time (`RT_CORE`, `RT_DET` in `build.sh`, set by hand from `html_utils/audit_pages.mjs` after a rebuild) and the best-resources total. `02_split.html`, `25_js_s3.js`, `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates, copied unchanged (storage key `sq-tab`). Since 2026-11-10 the stages and the gradient animation play by themselves once in view (see the section at the end).

Tabs: Reading (the idea in one screen: core sentence, hero, you need, new terms; recurrence and BPTT; the gradient through time; the LSTM gate by gate; GRU; measured memory results; seq2seq, the bottleneck and attention; convolutions for sequences (WaveNet); why the transformer replaced them; static word vectors; closed depth blocks), Word vectors (real GloVe: neighbours, analogies, the test, a projection), Further reading.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page owns its subject's depth), rebuilt 2026-10-24 to the teaching contract (below). The parent root's lineage table and BPTT slider, the Attention paper page's RNN-against-self-attention animation and Mamba's gated-RNN slider are linked, not rebuilt (see `viz_ideas.md`). Size is about 382 KB (368 KB before the 2026-10-24 rebuild), over the 300 KB guide of the time (retired 2026-10-17; now about 1 MB for a child page), because the page ships 2,000 real GloVe vectors (133 KB as base64 int8) and two trained seq2seq models (about 40 KB); smaller vectors or a smaller vocabulary would have dropped analogy-test words.

Files:
- `live.md`: the old Notion text, verbatim (Notion copy dated 2026-09-22, fetched 2026-10-03). No child pages, databases or video. `mk_coverage.py` writes `coverage.json` (59 facts, all found in the built page; corrections noted).
- `glove_subset.py`: reads GloVe 6B 50d (gensim-data mirror `glove-wiki-gigaword-50`, 66 MB, kept in scratch, not committed) and `questions-words.txt`; runs the analogy test on all 400,000 words; writes `inputs/glove_subset.json` (2,000 words, int8), `inputs/glove_questions_subset.json`, `inputs/glove_eval.json`.
- `model/train_memory.py`: remember-the-first-symbol task, plain RNN, GRU, LSTM (8 units), training lengths 10/20/50/100 x learning rates 0.003/0.01/0.03 x 3 seeds; `runs/memory_results.json`, `memory_weights.json`. About 10 minutes on 2 CPU threads.
- `model/train_seq2seq.py`: copy task, GRU encoder-decoder with a fixed context vector, with the source reversed, and with Bahdanau attention, 2 seeds; int8 weights and PyTorch reference outputs in `runs/seq2seq_weights.json`. About 7 minutes.
- `recompute.py` -> `inputs/recompute.json`: every number the text states (34 checks, 0 failures), including the page's own analogy-test output against a numpy recomputation.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`). `coverage.json` and `mk_coverage.py` are the older migration check against `live.md` (2026-10-03); the ledger supersedes them and some of their phrases no longer match the rewritten text.
- `check_page.mjs` (node, needs html_utils/node_modules): every control in light 920 and dark 390 under reduced motion (1,166 actions since 2026-11-10: the four-cell widget in every mode, key and length, every step of the gradient animation, every step of Fig. 2 to 5, the digit input), scanning for NaN, undefined, Infinity, null and errors; seq2seq forward pass against PyTorch; dumps the page's cell outputs to `model/runs/page_dump.json`; screenshots `x-*.png` in `../.shots/` (or the folder given).
- `check_stages.mjs` (2026-11-10, from the repository root, about 4 minutes): the rollout checks (below).
- `check_cells.py`: the page's LSTM, GRU and RNN against PyTorch's on 16 sequences (max difference 7.5e-8).
- `viz_ideas.md`: candidates scored, chosen and rejected.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core sentence (the first token reaches the last output only through one multiplication per step; each model shortened or protected that path) and a new static hero (`32_js_hero.js`): eight tokens under five designs (RNN, LSTM/GRU, RNN with attention, dilated convolution, self-attention), the path from x1 to the output highlighted, path length and sequential steps per lane (Vaswani et al. 2017, Table 1, at n = 8). Then "You need" and seven new terms. The old "In one screen" card chain became the hero.
- **New visual where a core mechanism had none**: vanishing gradients were only prose plus a second view hidden inside the Measured chart. They now have their own section with a before/after animation (`33_js_grad.js`): the gradient travelling back from the answer, plain RNN (before) against LSTM (after), with the GRU, on the same 256 sequences, from the recorded PyTorch autograd numbers (`grad_init`); the step controller shows per-step factors (derived) and the 10^5.7 gap at 50 steps. The Measured chart keeps only accuracy.
- **Order follows the subject**: recurrence, the gradient, gates, the measured consequence, seq2seq and attention (one section now: the fixed-vector against attention animation is the before/after), convolutions, why the transformer replaced them. Static word vectors moved from first to last: they are the inputs, not a step of the recurrence argument, and the reader knows them; the mechanism detail (skip-gram, CBOW, negative sampling, GloVe's objective, Levy and Goldberg, Table 2) is closed.
- **Concrete, then picture, then formula**: the LSTM section now opens with the task and the animation, then the gate table; seq2seq opens with the toy and the animation, then Bahdanau's formula.
- **No autoplay**: the old `10_js_common.js` played each animation when it first scrolled into view and on every mode switch; replaced by the template, and the three `anim.play()` calls on mode switches were removed. A normal-motion check confirms every animation stays at step 0 after 2.5 s on screen and after a mode switch.
- **Closed depth**: peepholes and the variant history, the GRU-against-LSTM studies, Sutskever et al.'s BLEU result, WaveNet's μ-law, gated activation and listening test, the modern recurrences (Mamba, RWKV, xLSTM, minimal GRUs), the word-vector objectives, Luong's variants, the common misreadings (each answered in the core), what reproduces what.
- **Linked, not taught**: modern attention (Attention variants), modern recurrences (Beyond attention), the KV cache (The transformer from zero, section 9), positional encodings.
- **SVG text at least 11 px** in every Reading visual (was 9 to 10 px in the Measured and seq2seq charts and the cell animation; cell values now show only where boxes are 34 px or wider).
- **No real images**: the page is about mechanisms, and the canonical figures (Bahdanau's alignment matrix, WaveNet's Figure 3, Olah's LSTM diagram) are not openly licensed; the hand-built diagrams draw the same things with the page's notation.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 21.4 min | 18.9 min |
| Reading, closed details | 1.5 min | 5.0 min |
| Word vectors tab | 3.5 min | 3.5 min (unchanged) |
| Further reading | 2.9 min | 3.1 min |
| Visuals drawn in Reading (audit count) | 5 | 11 (hero counts 5 lanes; 7 figures) |

Why about 19 minutes is right: the page owns six mechanisms (recurrence and BPTT, vanishing and exploding gradients, LSTM, GRU, seq2seq with attention, dilated convolutions) plus the reason the transformer replaced them, each with a visual on real trained weights; the hero and the new gradient section added about 3 minutes of core that the old page lacked, and about 5.5 minutes of detail moved into closed blocks. About a fifth of the core words are captions and counters of the animations. What could still be cut is the word-vectors section (1.8 min core), kept because no other page owns static embeddings.

## Knowledge ledger
`ledger.json`, 220 units: core 173, depth 35, fat 12, owned 0, volatile 0; `python3 html_utils/ledger.py check`: problems 0. 211 drafted by `ledger.py init` from the old page, 9 added by hand for the new hero and gradient visual and for script-rendered charts (keys placed in static captions). Fat: header boilerplate, the old navigation and reading-time phrasing, wind-ups, transitions, chart-control labels. No unit is labelled owned: Beyond attention does not carry xLSTM or "Were RNNs all we needed?", so those stay here, closed.

Checks (24 October 2026): `sh html_utils/checkpage.sh <folder>`: tabs 3, fail=0, emdash 0, errbox 1, clipped 0. `node src/check_page.mjs`: 1,580 actions, 0 problems, seq2seq forward OK. `check_cells.py`: 16 of 16 equal, max difference 7.5e-8. `recompute.py`: 34 checks, 0 failures. Earlier checks (3 October 2026): 1,496 actions, 0 problems.

- 2026-10-24, topic close: Further reading times set to headers (root 23 min, plus 1; Normalisation and initialisation, Activation, Contrastive, Tokenizers, Positional Encodings).

## 2026-11-10: the split layout and four 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (after `01_head.html`, which closes `<head>`), `25_js_s3.js` (after the data, engines and 2D parts, before the scenes), `21_js_rd_common.js`, `99_js_tabs.js` (key `sq-tab`). `build.sh` now lists the JS parts explicitly. Removed: `26_js_s2sanim.js` and `28_js_wave.js` (each replaced by a stage; the WaveNet blocks calculator moved to `28_js_wavecfg.js`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, you need, terms) | split | hero, 2D static diagram (five lanes) | no |
| Reading | Recurrence | split | **3D** `stg-rnn`, Fig. 2 (new: the section had no visual) | yes, 6 |
| Reading | The gradient through time | split | 2D animation (`RD.anim`), regrouped from 21 frames into 6 explained stops | yes, 6 (three modes, one list) |
| Reading | The LSTM, gate by gate | split | **3D** `stg-lstm`, Fig. 3 | yes, 5 |
| Reading | The GRU (now its own section) | split | the four-cell gate animation as a widget (40 to 120 frames: no autoplay, no step list, opens on the answer, live caption) | no |
| Reading | Measured | split | 2D chart | no |
| Reading | Seq2seq, the bottleneck and attention | split | **3D** `stg-s2s`, Fig. 4 (replaces the 2D animation; the digit input sits under its step list) | yes, 6 |
| Reading | What the toy reproduces | split | 2D chart | no |
| Reading | Convolutions (WaveNet) | split | **3D** `stg-wave`, Fig. 5 (replaces the 2D animation and its layer slider); blocks calculator inline | yes, 6 |
| Reading | Why the transformer, word vectors, Depth | full width | stats, none | no |
| Word vectors | intro and box | full width | none | no |
| Word vectors | Neighbours, Analogies, The test, Directions | split (notes left, tool right) | 2D tools | no |
| Further reading | | unchanged | | |

**The stages and their data.** Fig. 2 (`34_js_sc_rnn.js`): the plain RNN trained on lengths 5 to 10 (it holds the key) on `b w w z y y x w w ?`: its real states as signed bars, U and W as glass plates repeated per copy, the answer (P(b) = 0.999), then the gradient factor back to each copy, the Frobenius norm of the Jacobian product from the real states and W (log-scale columns), and every copy's gradient streaming into one shared W. Fig. 3 (`35_js_sc_lstm.js`): the trained LSTM at length 40, key b (key a on the same distractors for contrast), its four layers as glass plates with their 8 outputs, the cell state as a conveyor; unit 4's cell at all 40 steps. Fig. 4 (`36_js_sc_s2s.js`): the two trained encoder-decoders on the reader's digits (default 12 digits of pi): encoder states as 32-number strips, the last as the bottleneck, outputs right or wrong, the attention weights as a bar field (the alignment matrix), streams as dense as the weights. Fig. 5 (`37_js_sc_wave.js`): structural, a dilated stack (dilations 1, 2, 4, 8) behind a plain one, one output traced back layer by layer.
**Kept 2D:** the hero (five lanes compared side by side read best flat), the gradient curve (a log axis), the measured charts, the four-cell widget (a heatmap over time), the Word vectors tools and the projection (a scatter).
**Correction found by the stage.** The old LSTM prose said the trained LSTM shuts its input gate on the distractors and holds the key with a forget gate near 1. Its real activations do not show that: on unit 4 the input gate averages 0.88 over the distractors and the forget gate 0.95; the key is written as a sign and re-written in its direction at every step (the candidate reads h), so the cell grows to +15.2 (key b) or -5.8 (key a). Fig. 3's steps and the note under its list now say this; the ledger unit was re-keyed with a note.
**Text.** The old per-step captions of the gradient, seq2seq and WaveNet animations became the step lists; their numbers are static spans (`data-rn`, `data-gt`, `data-ls`, `data-s2`, `data-wv`) checked against what the scenes compute. The running example is now written with its real distractors (`b w w z y y x w w ?`); the four-cell widget opens on key b. `check_page.mjs` drives the stages through their lists instead of the removed 2D controls; `mk_coverage.py` phrases updated to the rebuilt wording (14 had been stale since 2026-10-24; 59 of 59 found, two link facts noted as replaced by the Topic: llm-architecture link).

### Length judgement
| | Before (2026-10-24, audit 2026-11-10) | After (2026-11-10) |
|---|---|---|
| Reading, core (230 words a minute) | 19.0 min (4,363 words) | 24.2 min (5,576 words) |
| Reading, closed details | 4.5 min (1,038 words) | 4.5 min (1,038 words) |
| Word vectors | 3.5 min | 3.5 min (unchanged words) |
| Further reading | 3.2 min | unchanged |
| Visuals counted in Reading (audit) | 11 | 13 |
The 1,213 new words are almost all the five step lists (about 1,250 words). About half are not new to the reader: the gradient, seq2seq and WaveNet animations wrote the same explanations as per-step captions by script, which the audit never counted. Genuinely new are Fig. 2 (recurrence had no visual) and Fig. 3's honest account of what the trained gates do. The length is right: each core unit belongs to one of the page's six mechanisms or the reason the transformer replaced them.

### Ledger
225 units: core 178, depth 30, fat 13, owned (Beyond attention) 4, problems 0. Re-keyed: the LSTM gate claim (now "Not the textbook picture", with a note), the seq2seq diagonal and the streams caption, the gradient zero and 50-step units, the reading-time unit of Further reading (now keyed on "Nissim et al. 2020", the words before the minutes), the LSTM training sentence. Added five units for findings the step lists now carry (Fig. 2's gradient factor and shared W, Fig. 3's running sum, Fig. 4's counts, Fig. 5's trace).

### Checks (2026-11-10)
`sh html_utils/checkpage.sh <folder>`: tabs 3, fail=0, emdash 0, errbox 1, clipped 0. `node src/check_stages.mjs [shots dir]` (about 4 minutes): problems 0. `node src/check_page.mjs [dir]`: 1,166 actions, 0 problems, seq2seq forward OK. `python3 html_utils/ledger.py check`: problems 0. `mk_coverage.py`: 59 of 59.
