# Visual ideas: built and rejected

Central question: between "the scheduler gave me nodes" and "step 1 ran", which link is a job stuck in, how long will each link wait, and how do you find the one rank that is different?

Scores 0 to 2 on: moves with a parameter, reproduces a source, computable from real data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere (the root's Launch lab, the Distributed PyTorch and Streams pages).

| # | Idea | Data | Placement | Score | Status |
|---|---|---|---|---|---|
| 1 | Workers' store before/after: the same crash and restart with the store shared (two runs) and not shared, keys and ports per attempt | rz/share_a, share_b, noshare, store probes | Reading 5 | 13 | built (the before/after) |
| 2 | Rendezvous state machine replayed from logged events: lanes A/B/C, round, participants, wait list, last-call deadline; modes c10d, static, c10d with shared store | rz/elastic, elastic_share, static (event handler switched on) | Reading 4 (moved from the Rendezvous lab tab, 2026-10-24) | 13 | built |
| 3 | Hang triage drills: logs first, predict, then every rank's py-spy stack, watchdog dump, flight recorder; DETAIL toggle | hang/* | Reading 8 (moved from the Hang triage tab, 2026-10-24) | 12 | built |
| 4 | Timeout ladder on a log scale with measured error times as dots | source defaults, own and root runs | Reading 7 | 11 | built |
| 5 | NCCL interface choice: NCCL's rule (socket.cc, os/linux.cc) applied to real interface lists, NCCL_SOCKET_IFNAME selector | net/if_*.json | Reading 6 | 10 | built (rule from source; NCCL not run) |
| 6 | Launcher variable matrix with source lines and recorded values | source + root env.json | Launcher variables | 10 | built |
| 7 | Launch chain explorer per system | root launch_times.json | Reading 1 | 8 | built |
| 8 | NCCL bootstrap ring animation | source order only | none | 4 | rejected as an animation: no run possible |
| 8b | NCCL start-up stepper over the static list (8 stills of the 2 x 2 job, the matching list item highlighted) | source order only, labelled illustrative | Reading 6 | 7 | built 2026-10-24: a process with no visual; a stepper claims only the order |
| 11 | Hero: two nodes, agents, store, four ranks, the communicator, six links numbered with default timeouts | source defaults, Launch lab total | Reading top | 9 | built 2026-10-24 |
| 12 | The agent's loop with the restart run's times | rz/noshare | Reading 3 | 8 | built 2026-10-24 |
| 13 | Real image (a photo) | none suitable | none | 0 | rejected: software start-up; real logs and stacks are the real objects here |
| 9 | torchfrtrace walkthrough | stuck case dumps | Reading 8 (one block) | 5 | text only: the Distributed PyTorch page owns it |
| 10 | Extrapolated rendezvous time at 1,000 nodes | none published that could be checked | none | 2 | rejected: invented numbers |
