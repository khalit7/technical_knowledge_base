# Child-page links still in plain text (wire Notion ids here when the 9 child pages exist)

Written 2026-10-16 in the root fix pass. None of the 9 children has a Notion id yet, so every mention is the child title in plain text (bold), not a {{text|n:<id>}} link. When the ids exist, replace each mention below with a link (keep the title as the link text) and rebuild.

| Part file | Line | Children named |
|---|---|---|
| `20_read_a.html` | 16 | Cluster anatomy |
| `20_read_a.html` | 41 | Slurm from zero |
| `20_read_a.html` | 46 | Kubernetes for ML, Slurm from zero |
| `20_read_b.html` | 168 | Kubernetes for ML, Ray, Slurm from zero |
| `20_read_c.html` | 26 | Launching distributed training |
| `20_read_d.html` | 34 | Fault tolerance at scale |
| `20_read_e.html` | 13 | Storage and data movement |
| `20_read_e.html` | 28 | Observability and cost |
| `20_read_e.html` | 40 | ML platforms and workflows |
| `20_read_f.html` | 66 | Cluster anatomy |
| `20_read_f.html` | 67 | Slurm from zero |
| `20_read_f.html` | 68 | Kubernetes for ML |
| `20_read_f.html` | 69 | Ray |
| `20_read_f.html` | 70 | Launching distributed training |
| `20_read_f.html` | 71 | Fault tolerance at scale |
| `20_read_f.html` | 72 | Storage and data movement |
| `20_read_f.html` | 73 | Observability and cost |
| `20_read_f.html` | 74 | ML platforms and workflows |
| `31_tab_sched_c.html` | 74 | Kubernetes for ML |
| `31_tab_sched_d.html` | 37 | Slurm from zero |
| `31_tab_sched_d.html` | 78 | Kubernetes for ML, Ray, Slurm from zero |
| `32_tab_launch_e.html` | 28 | Kubernetes for ML, Launching distributed training, Ray, Slurm from zero |
| `33_tab_fail_c.html` | 108 | Launching distributed training (added 2026-10-16, restart-store mechanism) |
| `33_tab_fail_d.html` | 35 | Ray |
| `33_tab_fail_d.html` | 47 | Fault tolerance at scale, Kubernetes for ML, Ray |
| `34_tab_io_d.html` | 83 | Fault tolerance at scale, Storage and data movement |
| `35_tab_cost_d.html` | 47 | Observability and cost, Slurm from zero |
| `36_tab_map_b.html` | 33 | Kubernetes for ML, Launching distributed training, ML platforms and workflows, Observability and cost, Ray, Slurm from zero, Storage and data movement |
| `39_tab_more.html` | 23 | Cluster anatomy |
| `39_tab_more.html` | 24 | Slurm from zero |
| `39_tab_more.html` | 25 | Kubernetes for ML |
| `39_tab_more.html` | 26 | Ray |
| `39_tab_more.html` | 27 | Launching distributed training |
| `39_tab_more.html` | 28 | Fault tolerance at scale |
| `39_tab_more.html` | 29 | Storage and data movement |
| `39_tab_more.html` | 30 | Observability and cost |
| `39_tab_more.html` | 31 | ML platforms and workflows |

Where they are, by kind:
- Reading deepnotes ("Go deeper (optional)") at the end of sections 1 to 8: `20_read_a.html` to `20_read_e.html`.
- Reading child-page grid `#rd-kids` (`20_read_f.html`) and the Further reading child grid (`39_tab_more.html`): one card per child, title, reading time, one line; all nine built; Launching distributed training (36 min) and ML platforms and workflows (35 min) filled in 2026-10-16 from their own pages.
- One "Go deeper (optional)" line per lab tab: Scheduling `31_tab_sched_d.html`, Launch `32_tab_launch_e.html`, Failure `33_tab_fail_d.html` (also `33_tab_fail_a.html`), Storage `34_tab_io_d.html`, Cost `35_tab_cost_d.html`, Tool map `36_tab_map_b.html`.
- In-text mentions: Reading section 2 (Slurm from zero, backfill log), Scheduling lab sections 5 and 9 (Kubernetes for ML, Slurm from zero), Failure lab mistakes (Ray).

Reading times used (2026-10-16): Cluster anatomy 22, Kubernetes for ML 50, Storage and data movement 29, Observability and cost 25 (stated on each page); Ray 45 (its README); Slurm from zero 32 and Fault tolerance at scale 30 (not stated: counted with the root's own rule, words of the Reading tab without style, nav, cards, details, pre and predict boxes, at 200 a minute; the same rule gives 22 for Cluster anatomy, matching its stated 22).
