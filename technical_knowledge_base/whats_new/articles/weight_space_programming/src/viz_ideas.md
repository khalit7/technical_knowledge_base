# Visuals: built and rejected (ids A-weight_space_programming.k)

The question the page keeps returning to: what did Astra actually have, and what did it actually do, in each experiment?

## Built
| Id | Visual | Kind | Why |
|---|---|---|---|
| A-wsp.1 | Hero: the ten experiment arms by network size (log) and by access (no tools / Python / Python plus runs), reads against writes, failures hollow | static diagram | Answers the page's question in one picture; the claim's strength falls as access rises. Data: the post's Setup boxes, checked against Honnibal's table and the logs' README. |
| A-wsp.2 | Copying heads, 4 x 6 grid per model | static diagram | Shows "found every copying head and no other" at a glance; redrawn from the post's table (its Figure 1 not reused: no open licence). |
| A-wsp.3 | MinAtar scores, three bars per game, log scale | chart | The headline "beats PPO" and the counter-fact (PPO 500M leads in two of three) on one axis. |
| A-wsp.4 | Experiment 8: MATH-500 against forward passes, every run of the released results table | chart | Shows single runs, unreported runs that made no edit, and the Gemma control; from the logs, not the post. |
| A-wsp.5 | The measured edit: 3,584 neurons sorted by write strength along u, the 64 edited marked, layer toggle | chart of real weights | Real data the post does not show: the edited neurons are not the top 64 by weight, so they came from activations. |
| A-wsp.6 | Toy of W <- W - alpha u (m * u^T W): slider alpha, mask toggle, two contexts | widget (live ingredient) | Shows why the edit is steering (effect proportional to activations), what alpha = 1 and 6 do, and what a full projection costs. Labelled illustrative. |

## Rejected
| Idea | Reason |
|---|---|
| Embed the post's figures (hero cards, Figure 1, Figure 2, Kinetix scene) | No open licence on the post's content (the site's MIT licence comes from its template); redrawn where they teach. |
| Sycophancy attention bars (head 10.2, 94.3/0.75 against 3.5/85.7) | Four numbers a sentence says completely. |
| A Breakout "program compiled into weights" diagram | Would need reading Astra's network from the logs; the replication paper's decompilation shows it better (linked). |
| LessWrong ablation bar chart | The post gives exact numbers for only some conditions (others are images); a sentence carries the ones that exist. |
| A 3D stage of the residual stream with u | Flat figures teach the same; 3D would be for looks. |
| An animated rollout of the Go network | Decorative; the result is two numbers. |
