# Visual ideas: Storage and data movement

Central question: where does a training job's I/O go, and which part of the storage (stripes, metadata servers, request rates, the burst) sets its speed?

| # | Idea | Score /14 | Data | Placement | Status |
|---|---|---|---|---|---|
| 1 | Same 128 MiB file written with stripe count 1, 2, 4 on one clock, squares coloured by object server | 13 | measured on tpfs (22.2, 44.8, 88.7 MB/s) | Striping lab | built (before/after on the same input) |
| 2 | Same 8 MiB write through one NFS server and through Lustre, step by step with counters | 11 | Lustre manual I/O path, nfs(5); illustrative sequence, to scale in bytes | Reading, section 2 | built |
| 3 | Resharding as byte-range reads: one DCP checkpoint loaded by 4, 2, 3 ranks | 13 | measured: every read logged; 1.00x, 1.00x, 1.50x | Reading, section 8 | built; found the 1.5x read amplification, explained from filesystem.py |
| 4 | 16 clients against one metadata server and two (DNE), one clock | 11 | measured on tpfs, CPU sampled (server at its cap) | Metadata storm | built (before/after) |
| 5 | Ops/s and latency against clients, 1 to 32 | 10 | measured | Metadata storm | built |
| 6 | Real stores by operation (create, stat, miss, unlink), log scale | 10 | measured on volume, host folder, SeaweedFS S3 | Metadata storm, Reading table | built; showed the cached-stat / uncached-miss asymmetry |
| 7 | Start-up storm calculator from strace counts | 11 | measured counts, FSx metadata IOPS (vendor) | Metadata storm, predict in Reading | built |
| 8 | Four writers in four layouts (file per process, pinned, shared 1 and 4 stripes) | 10 | measured | Striping lab, predict in Reading | built |
| 9 | Byte locator: Lustre's lov_stripe_number arithmetic with plain and PFL layouts | 9 | lov_offset.c at 2.17.0; manual and FSx PFL examples | Striping lab | built |
| 10 | Sizing calculator: write, restore, data, metadata, capacity, FSx tiers and cost | 12 | derived; FSx and S3 prices from the root's snapshot; MLPerf Storage sizes | own tab | built; defaults agree with the root's calculator (same formula) |
| 11 | Object-store semantics table with SeaweedFS's real responses | 9 | measured | Reading, section 5 | built |

Rejected: a real Lustre or BeeGFS in containers (kernel client modules; would need privileged containers and a different VM); striping on SeaweedFS (it places chunks wherever the master assigns, which the chunk map showed, but has no stripe count to vary: the toy shows the mechanism directly); a lock-contention demo on the toy (would be a model of LDLM, not LDLM: said in words with the manual's quote instead); large multi-node checkpoint runs on the shared clusters (their /shared targets were measured by the root's lab already); a cross-region transfer animation (prices and times are a line of arithmetic); a 3FS/WEKA/VAST throughput chart (vendor numbers on different hardware; a table with labels serves better).

What the methodology lacked: as for the root's lab, a rule for "the real system cannot run here". Used: build the smallest honest toy that runs the mechanism with real code, state the one imposed input (25 MB/s per server), measure what it does, and say exactly what it does not model.
- 2026-10-19: built from the root Storage lab (moved here): six-tier stand-ins, checkpoint anatomy bar and scale table, write layouts, async animation, small-files table and prefetch chart, restore-error gallery.
- 2026-10-24 rebuild to the teaching contract. Built: the hero (the storage ladder, static, `24_js_sd_hero.js`: four tiers with sourced numbers, the checkpoint path down and the data path up, the three bottlenecks marked in the highlight colour); section 3's two-families diagram (static: a separate metadata tier handing out layouts against metadata on every server with distributed locking), because the old section explained the split in a paragraph and a table with no picture. Two licensed photos (a storage enclosure drawer beside Lustre's OSS/OST row; a U.2 NVMe drive beside the local tier), credited in `img/CREDITS.md`. Moved inline: rows 4 to 9 above (the Striping lab and Metadata storm tabs explained one mechanism each, so their visuals now sit beside the claims in sections 2 and 4; the byte locator and the CPU table sit in closed blocks). Kept as a tab: the Sizing calculator (used by sections 4, 8 and 9). Rejected: a photo of a Lustre rack (no openly licensed one found on Wikimedia Commons); an animated hero (the ladder is a structure, so a static diagram); a second sizing visual in Reading (the tab is the owner).
