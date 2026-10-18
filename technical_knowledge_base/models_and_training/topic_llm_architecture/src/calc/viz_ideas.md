# Config calculator: visuals built and rejected

Built
- Drawn-to-scale stacked bar, total over active, same scale (where parameters live). Shows MoE's whole point at a glance.
- Formula cards with the model's own numbers substituted (one per distinct mixer and FFN kind): the "show your work" view.
- Context sweep, two log-log panels (decode FLOPs; memory for the batch), crossover lines, a second model dashed,
  attention variant switch (configured / MHA / MQA, MLA mapped to its MHA or MQA counterpart). Before/after on the
  same model: the same layers as MHA vs as configured; the animation sweeps context from 1k to the model's maximum.
- Dense twin vs MoE stepper (6 steps) with expert grid; last two steps show experts touched at batch 8 and 64.
- Predict-then-reveal drills computed live from configs (6).
- Check table: calc vs Hub count, residual, extras explained, published headline and which accounting reproduces it.

Rejected
- Per-layer heat strip of parameters: repeats the bar, and per-layer detail belongs to the Architecture map.
- Prefill vs decode roofline plot with hardware: the hardware side belongs to Performance math (linked); kept as a stat.
- Animated token through the block with FLOP counters: owned by the Block lab.
- KV-cache-to-scale per attention variant drawing: owned by the Attention lab.
