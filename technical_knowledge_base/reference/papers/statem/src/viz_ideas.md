# StateM: visualisation ideas

Ranked by how much interacting teaches over reading (1 to 5), with data source and placement.

| id | Idea | Score | Data | Placement | Status |
|---|---|---|---|---|---|
| P-statem.1 | Replay of real StateM runs: each released trial's history stepped on the runbook graph, the token moving along the edge, refused gotos in red with the failing check's output, counters for time, commits, refusals, cost and cached tokens; six runs picked by stated rules (paper's worked example, most refusals, straight through, gated but failed, timeout, a judge-flagged task) | 5 | authors' DeepSeek artifact (440 trials, every state, check and receipt) | own tab | built |
| P-statem.2 | Before/after of the checked goto on configure-git-webserver: the same run as a soft plan (stops on self-declared done, verifier fails) and with StateM (handoff refused by the end-to-end gate, repair, pass), with live system state and a context bar showing plan dilution and the state anchor | 5 | paper §4.6, released git_webserver_deploy runbook; labelled illustrative | inline, Method | built |
| P-statem.3 | Raw against reviewed accuracy for every comparator submission and StateM's, as the reveal of "what did review do to the comparator?" | 5 | leaderboard PRs via GitHub API | inline predict reveal, tables tab | built |
| P-statem.4 | 88 × 5 trial grid (pass, refused-at-least-once outline), sortable, with per-trial detail and replay links | 4 | DeepSeek artifact | replay tab | built |
| P-statem.5 | Figure 5 rebuilt (accuracy against log cost) with a toggle from the paper's plotting to review outcomes and the $52.22 campaign | 4 | paper §4.4, leaderboard PRs | inline | built |
| P-statem.6 | How often a host check refused a transition (runs by number of refusals) as a predict reveal | 4 | DeepSeek artifact | inline predict reveal | built |
| P-statem.7 | Table 3 joined with the DeepSeek outcome, gate selection and the judge's harness-cheating flags | 4 | Table 3, artifact, PR #142 | tables tab | built |
| P-statem.8 | Figure 1 design space rebuilt from the figure's text positions, marker shape for who can edit the control layer | 3 | figure PDF text coordinates | inline | built |
| P-statem.9 | Check-strength ladder (command/predicate, manual, llm_review, checklist/message) | 2 | §3.2 (ordering only) | inline | built |
| P-statem.10 | Run the YAML runbook live in JS (port of core.py's goto) on user-edited checks | 3 | released core.py | none | rejected: replaying real histories teaches the same protocol with real outputs; a JS port of a 70 KB runtime adds risk without new evidence |
| P-statem.11 | Toy "harness evolution" simulator showing development-set overfit | 3 | illustrative only | none | rejected: the leaderboard review and the BusinessBench held-out numbers make the point with real data |

Methodology note: for agent and harness papers, look for the public leaderboard submission and its review thread, and for released per-trial artifacts; adjudication outcomes and per-trial histories can change the reading of a raw headline score, and a gate-to-task map from the artifact measures how task-shaped a "general" harness is.
