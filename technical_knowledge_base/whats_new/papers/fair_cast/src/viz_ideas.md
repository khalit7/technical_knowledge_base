# Visual ideas for the Fair Cast page

| id | Idea | Status | Why |
|---|---|---|---|
| P-fair_cast.1 | Hero: Figure 2's training loop redrawn, with a Round-to-nearest / Fair Cast toggle that changes the export and trainer boxes and the two ratio labels | built | the paper's whole argument is where the two ratios live; static diagram plus a click, nothing moves |
| P-fair_cast.2 | One weight between two bf16 neighbours with a slider: round-to-nearest's fixed choice against stochastic rounding's probability bar and E[q] | built | the unbiasedness claim in one picture |
| P-fair_cast.3 | Simulator: one fp32 master, three export rules on real float32 bits, 300 steps, Play after a click, average of 256 stochastic runs | built (tab) | a tool used across the page: dead zone, first change, same-sign stretches, learning rate making Fair Cast inert |
| P-fair_cast.4 | Dot plot of the 25 released matched pairs with a one-standard-error band per pair, sort and zebra-repeat toggle | built | shows the direction is consistent and most differences sit inside the noise; the mean is carried by zebra |
| P-fair_cast.5 | The paper's Figures 4, 5 and 9 as real images (CC BY 4.0) | built | measurements no redraw could add to: the hidden ratio, the zebra length blow-up, list functions' collapse to bare answers |
| P-fair_cast.6 | Population view: many weights with a distribution of sizes and Adam updates, fraction changed per step | rejected | the paper does not publish either distribution, so any curve would be tuned to land on 0.4 to 0.5% |
| P-fair_cast.7 | Rebuilt learning curves (Figures 1, 5, 7) from logs | rejected | the per-step logs and evals.json the figure scripts read are not in the repository; reading curves by eye is not allowed |
| P-fair_cast.8 | "Average lag in steps" column in the simulator | rejected after building | for a steady drift round-to-nearest's error is a sawtooth that averages near zero (the copy leads after each jump), so the column misled; replaced by the longest same-sign stretch, which is what "sign-coherent across steps" means |
