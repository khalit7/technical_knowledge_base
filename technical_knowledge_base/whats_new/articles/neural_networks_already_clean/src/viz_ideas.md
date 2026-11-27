# Visual ideas: Neural Networks Are Already Clean (ids P-neural_networks_already_clean.k)

Scored with visuals/choosing.md (0 to 2 per criterion; reproduce and public-data count double), built 2026-11-27.

| id | Visual | Score | Status | Why |
|---|---|---|---|---|
| .1 | Hero: 24 things on a ring, N neurons (12, 8, 4), one neuron followed under generalization (an arc) and under superposition (spread far apart) | 12 | built (Fig. 1) | The essay's central distinction is a geometric prediction (local against non-local); one control (neuron count) shows "coarser, never fractured", which is what the squeezing experiments test. Illustrative, redrawn from the essay's conceptual figure, labelled so. |
| .2 | The car circuit, two readings (Zoom In 2020 against the essay), toggle | 11 | built (Fig. 2) | The method that replaced the old reading, on the same circuit; a sentence cannot show which readers feed what. Schematic, labelled. |
| .3 | InceptionV1's last layer: share judged interpretable under old tools, better tools, retraining, ConvNeXt | 10 | built (Fig. 3) | Separates "microscope" from "architecture" fixes, the essay's key historical claim; numbers printed in the essay, flagged as estimates. |
| .4 | SwiGLU sign quadrants plus the SiLU curve with its minimum | 10 | built (Fig. 4) | Shows why the double-negative output is positive and why it is usually small (bounded by 0.278 x value, calculated): something the essay states but does not explain. |
| .5 | Near-miss test bars (76%, 11%, about 1%) and won/tied/lost 164/15/4 | 11 | built (Fig. 5) | The essay's one quantitative test of its explanations, with a control; reproduces printed numbers. |
| .6 | "How clean" numbers side by side, strict to loose, by source and definition | 13 | built (Fig. 6) | Corrects the misconception that "1.7% then, 90% now" is one measure improving; every point printed by a source. |
| .7 | Local measurement: share of SwiGLU activations in the double-negative quadrant on SmolLM2-135M | 9 | rejected | Needs a model download and torch on a machine at HIGH load (19 on 10 cores) shared with two other builders; a 135M model would not test the essay's claim about Qwen3-32B's top activations, and the companion paper already measures the quadrant on Qwen3.6-35B-A3B. Not run here. |
| .8 | Re-drawing the essay's neuron grids (cat-and-car images, rapeseed-field neuron over training) | 6 | rejected | Real images from the essay carry no open licence; redrawing photos is not possible, and the essay's own interactive microscope is linked instead. |
| .9 | Interactive crush experiment (slider over layer width with per-neuron images) | 5 | rejected | Its data exists only as images in the essay. |
| .10 | Weak-activation ablation curve (accuracy against fraction kept) | 4 | rejected | The essay prints one point (69.47% against 70.08%); a curve would be invented. |
| .11 | A live ingredient tab (toy network trained live, watching a neuron grow) | 5 | rejected | A toy would show what the toy does, not whether real networks pack; the essay's evidence is case studies of real models. Fig. 1's control is the one live element. |
