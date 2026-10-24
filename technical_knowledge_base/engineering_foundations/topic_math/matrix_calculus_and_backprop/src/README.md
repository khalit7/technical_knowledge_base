# src: Matrix calculus and backprop

Build: `sh src/build.sh` (concatenates `parts/`, converts LaTeX to MathML with `html_utils/tex2mathml.mjs`, writes `../index.html`). Page prefix `mc`, storage key `mcb-tab`.

Numbers, in order:
1. `uv run --no-project --with numpy --with torch python src/recompute.py`: recomputes every number of the original page in numpy, checks each hand-derived gradient against PyTorch autograd (and JAX outputs in `inputs/measure/jax.json`), summarises the measurements, writes `expected.json`. Must print `checks failed: none`.
2. `uv run --no-project --with numpy --with torch python src/two_layer.py` (added 2026-10-24): the two-layer network of section 5 (the root's Gradient lab network) checked against PyTorch autograd, and the gradient-product toy of section 10; writes `two_layer.json`.
3. `python3 src/make_data.py`: writes `parts/22_js_data.js` (window.MCD) from `expected.json` and `inputs/measure/`.
4. `node src/check_js.mjs`: runs `parts/22b_js_core.js` against `expected.json` (72 checks). `node src/check_new.mjs`: runs `parts/22c_js_new.js` against `two_layer.json` (25 checks).
5. `node src/test_page.mjs` (from the repository root): clicks every control at 390 dark and 920 light, opens every closed block, checks for NaN, errors and sideways scroll, and confirms nothing animates before the reader acts (normal and reduced motion).

Measurements (`inputs/measure/`, scripts beside their JSON outputs; PyTorch 2.14.1, JAX 0.11.2, NumPy 2.5.3, Apple silicon, 2 CPU threads): `graph.py` (the real grad_fn graph), `cost.py` (FlopCounterMode; first timing run), `timing2.py` (interleaved timing, final run in `timing2.json`), `prof.py` (per-op profiler), `memtl.py` (MPS allocator timeline per op), `savedops.py`, `hvp.py`, `jaxdemo.py`, `tiny_autograd.py`, `custom_fn.py`. Source quotes with locations: `inputs/sources_quotes.md`. Pinned PyTorch source lines are linked at tag v2.14.1.

Old material: `live.md` holds the inherited sections of the old Linear algebra and Calculus and optimisation pages verbatim; `coverage.json` maps each fact (2026-10-05); `ledger.json` is the knowledge ledger of the 2026-10-24 rebuild; `handoff_*.md` record what went to siblings.

## Parts (2026-10-24)
| Part | What |
|---|---|
| `10_header.html` | title, subtitle with reading time, tabs: Reading, Further reading |
| `20_read_a.html` | styles; the idea in one screen: core sentence, hero, you need, new terms, the running example |
| `20_read_b.html` | 1 shapes (gradient, Jacobian, the shape table, dz/dW figure; softmax derivation and a gradient refresher closed); 2 layouts (figure, frameworks, correction; sources closed) |
| `20_read_c.html` | 3 chain rule as Jacobian products, VJP, order, paths add; 4 forward against reverse mode (stepper, measured jacfwd/jacrev; dual numbers, JAX cost notes, history closed) |
| `20_read_d.html` | 5 backprop through the two-layer network by hand (new stepper); the old logistic unit closed |
| `20_read_e.html` | 6 the layer gradients: the Derivative workbench (moved inline from its tab), 6a to 6f; layer-norm derivation, kernel, RMSNorm, attention numbers and derivatives.yaml closed; attention shapes figure (new) |
| `20_read_f.html` | 7 the trace trick (rules, derivations, identities closed); 8 cost (measured chart; the 6N gap closed) |
| `20_read_g.html` | 9 memory and checkpointing (stepper, measured timeline; table and breakdown closed); 10 vanishing and exploding gradients (new slider; numbers closed) |
| `20_read_h.html` | 11 gradient checking (new error chart; custom Function closed); 12 what autograd records (JAX and torch.func closed; the real autograd graph, moved from its tab, closed) |
| `20_read_i.html` | depth: HVPs (measured chart), einsum (calculator), mistakes the core does not show, research directions |
| `21_js_rd_common.js`, `99_js_tabs.js` | the skill templates (never autoplay; storage key `mcb-tab`) |
| `22c_js_new.js`, `27_js_figs.js` | maths and drawings added 2026-10-24 (hero, section 5 stepper, figures for sections 1, 2, 6f, 10, 11) |
| `23_js_mem.js`, `24_js_fr.js`, `25_js_charts.js`, `26_js_ein.js`, `41_js_bench.js`, `42_js_graph.js` | the original visuals; the two mode toggles no longer start playback; bench and graph now live inside Reading |

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`).
- **Top**: the core sentence (backprop is the chain rule multiplied from the loss end, one VJP per layer, about twice forward in FLOPs, paid for in stored activations) and a hero of the two-layer network forward and backward with shapes and kept activations. The old "in one screen" table was dropped as a restatement of the sections.
- **Expertise reversal**: the "landscape" introduction to partial derivatives, its worked example and the gradient's uses are a closed refresher; the "The question" wind-ups at the top of every section are gone.
- **Owned units added, as the brief asked**: backprop through a two-layer network by hand with real numbers (section 5, a stepper on the root Gradient lab's own network so the numbers agree with the root: logits (2, 1, 0), unit 3 off, every gradient checked against autograd to 4.4e-16, one step 2.408 to 0.728); vanishing and exploding gradients as a property of the product (section 10, a slider over the per-layer gain on a seeded 30-layer chain, linear against tanh against g^30).
- **Visuals inline**: the Derivative workbench and the Real autograd graph were tabs; the workbench is now the visual of section 6 (its derivation card was removed because the text beside it is the derivation), the graph a closed block in section 12 (the engine itself is owned by Tensors, the dispatcher and autograd). New static figures for dz/dW, the two layouts, attention's backward shapes and finite-difference error. Eleven SVG visuals drawn in Reading against four before.
- **Linked, not taught**: PyTorch's engine details (next_functions, AccumulateGrad, retain_graph, version counters, no_grad and inference_mode) now live on Tensors, the dispatcher and autograd (ledger units labelled owned, keys found there); JAX's transforms are summarised in a closed block and linked to JAX core; losses to Loss functions; optimisers and clipping to their page; activation memory at scale to Distributed Training.
- **No autoplay**: `21_js_rd_common.js` is the skill template; the forward/reverse and memory steppers no longer start when the reader switches mode; `test_page.mjs` checks it.
- **Section numbers changed** (5x became 6x, old 7 became 4, old 10 became 12, HVPs and einsum went to Depth); every in-page reference and the graph's node notes were updated.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 75.4 min (17,334 words) | 44.0 min (10,127) |
| Reading, closed details | 1.5 min | 32.6 min |
| Other tabs, core | workbench 6.1 + graph 3.8 = 9.9 min | none (both moved into Reading) |
| Further reading | 5.0 min | 5.1 min |
| Visuals drawn in Reading (SVG at least 120 x 80) | 4 | 11 |

The audit counts every MathML token and the TeX annotation tex2mathml keeps inside each formula, so formulas weigh heavily: of the 10,127 core words about 5,400 are prose, 4,000 formula tokens and 700 the text of the steppers and workbench. Measured as prose, the core is about 25 minutes. Why this length is right: the page owns a whole subject (shapes, layouts, the chain rule as products, both AD modes, a full backward pass by hand, six layer rules, the trace trick, cost, memory, vanishing gradients, gradient checking) and every core unit is needed for one of them; each section is now concrete, then picture, then formula, with derivations, quotes, provenance, measured tables, the custom Function code, HVPs, einsum, mistakes and research in closed blocks. The closed time grew because nothing important was deleted: only wind-ups, recaps, restated mistakes and pointers to removed tabs were.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
548 units: core 294, depth 176, owned 7 (Tensors, the dispatcher and autograd), fat 71. 538 were drafted by `ledger.py init` from the old page; keys were proposed by a script that looks for each sentence's longest phrase or number on the new page (label core if found outside closed blocks, depth if inside), and the 96 it could not place were labelled by hand (fat units carry a `note`). 10 units were added by hand for the new content (section "added 2026-10-24").

## Departures from the page-kind shape, and why
- No lab tabs: the workbench explains one section's rules and the graph one mechanism, so both moved into Reading.
- No real image: a mechanism page about derivatives has no physical object to show.
- The gradient-product toy uses random weights (seeded, labelled illustrative): the point is the product of factors, which any draw shows; the numbers are recomputed in `two_layer.py` with the same generator.
