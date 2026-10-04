# Visualisation ideas: Model-free prediction and control

Question the page makes measurable: what stands in for DP's expectation (MC return, TD target, n-step / lambda blend, SARSA's A', Q-learning's max, importance-weighted return), and what each choice costs in bias, variance and online reward. Scores follow `html_utils/interactive-html-ideas.md` section 2 (0-2 each; reproduction and computability x2; +1 animation; cost subtracted).

| # | Idea | Placement | Score | Reproduces | Decision |
|---|---|---|---|---|---|
| MF-1 | One episode, four learners (MC, SARSA, Expected SARSA, Q-learning on the same recorded episode, small cliff), before/after per step, counters | Reading, inline | 15 | Worked SARSA -53 / Q-learning -5 logic on a whole episode; checked by recompute.py | built |
| MF-2 | TD or Monte Carlo (Example 6.2, Figure 6.2) | tab | 16 | shape; start error sqrt(1/18) | reused from Topic: rl lab |
| MF-3 | n-step and TD(lambda) (Figures 7.2, 12.3, 12.6) | tab | 14 | shape | reused |
| MF-4 | Cliff walking (Example 6.6) with exact eps-greedy return -50.80 | tab | 16 | shape + exact | reused |
| MF-5 | Maximisation bias (Figure 6.5) with one run animated and E[max] widget | tab | 15 | shape; 10 B actions assumed (book: "many"; Zhang uses 10) | built |
| MF-6 | Importance sampling: Example 5.4 (Figure 5.3) with exact state value; Example 5.5 (Figure 5.4) | tab | 15 | Example 5.4 value independently (-0.277204 vs -0.27726); figures in shape | built |
| MF-7 | lambda-return weights slider on the worked episode | Reading | 9 | 0.625 worked value | built (from old embed) |
| MF-8 | One transition, two targets calculator (+ Expected SARSA) | Reading | 8 | -53 / -5 | built (from old embed) |
| MF-9 | Cliff edge fall chance (eps, m, k) | Reading | 7 | 0.776, 22% | built (from old embed) |
| MF-10 | Which method decision tree | Reading | static | old embed | built |
| MF-11 | Blackjack MC ES policy against the exact optimal policy (Figure 5.2) | tab | 12 | would need the book's policy read off an image; millions of episodes to settle near-ties | rejected for cost; candidate if Khalid wants MC control shown live |
| MF-12 | Expected SARSA step-size sweep (Figure 6.3) | tab | 10 | asymptotic curve needs 100,000 episodes per setting | rejected (phone cost); Expected SARSA offered as an agent in the cliff tab |
| MF-13 | Quiz / flashcards like the old embed | Reading | n/a | n/a | kept as a collapsible "Check yourself" list (content carried, no scoring UI) |

What the methodology lacked: guidance for a figure whose free parameter the book leaves unstated (number of actions in B, cliff alpha): expose it as a control, label the default as assumed with a source for the choice, and test only claims that hold across it.
