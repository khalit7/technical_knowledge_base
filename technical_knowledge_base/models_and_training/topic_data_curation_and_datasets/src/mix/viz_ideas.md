# Mixing lab: visual ideas, built and rejected

Root tab, overview depth. Rule used: build what the root needs to compare and define; anything the child page
(Data mixing, curricula and continued-pretraining ratios) already does in depth is linked, not rebuilt.

## Built
1. **Five domains at their real sizes, with the unit conversion shown** (table plus log bar chart). The cards use five
   different units (NeoX tokens, bytes, Comma tokens, FineMath's own counts, words); converting them is the first
   step of any plan and a common mistake. Ratios measured on the topic's samples.
2. **Mixture calculator** (temperature with the published multilingual settings, UniMax with an epoch cap, manual):
   natural against current weights as two stacked bars that slide (before/after on the same pools), per-domain epochs
   and Muennighoff fresh-token equivalent, and the repetition-value curve with each domain as a dot.
3. **RegMix Table 4 re-plotted** (axis from 44, stated): one picture of how small mixture gains are and that web-only ties DoReMi.
4. **Same budget before/after mid-training** (OLMo 2 7B, 5 steps, toggle static mix vs staged): whole run to scale,
   zoom on the last 200B, math only (30% of the math in 1.2% of the tokens), learning-rate sketch, summary. Counters per step.
5. **Final-stage size by lab** on a log scale (Llama 3 40M tokens to Nemotron-CC's 6T phase): kills the "final 10 to 30%" rule.
6. **Long horizons**: a run drawn from one corpus's unique tokens, at 1T and 15T, valued with the repetition law
   (Nemotron-CC Table 4). Connects quality filtering and dedup to mixing.
7. **CMR bars** (finance by size, academic at 460M).
8. **Proxy experiment**: design table, measured smoke stats, dashed pending box with the command, fit explorer that
   fills from the child's `proxy_runs.json` (scatter of measured against fitted loss, anchors, five weight sliders on the fitted law).

## Rejected
- A second DoReMi animation, mixing-law fitter on RegMix's runs, or stage planner: on the child page (brief: do not duplicate).
- A Muennighoff curve as its own chart: folded into the calculator, where the dots make it concrete.
- SmolLM2/SmolLM3 stage-by-stage composition animation: the child's planner has the presets; the root uses OLMo 2 only,
  the one recipe with both stage compositions and before/after scores published.
- Embedding RegMix's 1,088 runs: about 170 KB, and the root page is already near 1 MB.
