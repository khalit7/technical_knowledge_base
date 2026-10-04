# Visualisation ideas: Bandits and exploration

The page's question: how much does an agent lose while finding out, and which ways of exploring lose least, from one-state bandits to sparse-reward MDPs?

Scores follow `html_utils/interactive-html-ideas.md` section 2 (0 to 2 per question; reproduction and computability double; +1 for a before/after animation; build cost subtracted).

| # | Idea | What it shows | Reproduces | Score | Placement | Status |
|---|---|---|---|---|---|---|
| BE1 | **10-armed testbed run live** (Figures 2.2, 2.3, 2.4, 2.5, 2.6; all methods + Thompson; Exercise 2.5 nonstationary), seeded, sliced, 200 / 500 / 2,000 tasks | Learning curves and the parameter study computed in the browser, with a per-figure reproduction box | 1.54 (mean max q* 1.536 at 2,000 tasks; E[max of 10 normals] 1.539 by integration), greedy "about 1" (1.02) and "one-third" (34.9%), ε = 0.1 below 91% (80.0%): independently. Shapes of 2.3 to 2.6 (step-11 spike, inverted U, UCB best) checked; no curve values read | 15 | Own tab | built |
| BE2 | **Five strategies on one bandit, animated** (greedy, ε-greedy, optimistic, UCB with bound whiskers, Thompson with posteriors drawn sideways and the step's draws), same reward table, regret of all five | Before/after on one input: greedy locks on, UCB and Thompson keep probing uncertain arms | Illustrative (arms, seeds), labelled | 13 | Reading, section 3 | built (extends the root archive's rd-bd) |
| BE3 | **Regret against the Lai and Robbins line**, Bernoulli arms, log time axis, close and far presets, slope readouts | Linear against logarithmic regret; the bound is an asymptotic slope, Thompson sits below it at finite T | Lai and Robbins constant from its formula (12.28, 4.00); behaviour of UCB1's large constant matches Auer et al.'s remark | 12 | Reading, section 4 | built |
| BE4 | **Sparse-reward gridworld, animated** (ε-greedy, + count bonus, optimistic starts), visit heatmap, episode path, 20-seed table | Shallow dithering against directed exploration; optimism faster than a bonus with pessimistic starts | Illustrative; 2 / 20 / 20 seeds reach +1 (Python and JS agree) | 12 | Reading, section 6 | built |
| BE5 | Montezuma's Revenge table with conditions | Scores from DQN 0 to Go-Explore, each with its human baseline and conditions | Transcribed from tables and text | static | Reading, section 6 | built |
| BE6 | LinUCB toy on synthetic contexts | Context-dependent arms | Nothing published to reproduce; Li et al.'s data is not public in-browser | 6 | none | rejected: illustrative only, adds size; the formula and the replay method carry the section |
| BE7 | Exponential recency weights bar chart | (1 − α)^(n − i) against 1/n | Derived only | 5 | none | rejected: the formula and the Nonstationary preset show it |
| BE8 | Combination-lock chain, random walk against deep exploration | 2^N attempts | Derived | 7 | none | rejected: one sentence with the derivation says it; the gridworld shows the same failure with a trap |
| BE9 | Re-plotting RND or Go-Explore learning curves | | | | none | rejected: values exist only as figure images (method forbids reading curves); the table carries printed numbers |
| BE10 | Agent57 meta-controller bandit replay | | | | none | rejected: no released per-episode arm choices; quoted instead |

What the methodology lacked for this page: a rule for asymptotic bounds drawn next to finite-time simulations (the page draws the bound and states plainly that it constrains a slope, not a level), and a rule for runs computed in the browser (the page shows progress, computes only when the tab or card is visible, and checks its engine value for value against Python).
