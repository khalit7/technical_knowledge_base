# Debug lab: visual ideas, built and rejected (2026-10-05)

Question the tab answers: "my training job died, hangs or is slow: which part of the operating system is
it, and what do I run to prove it?" Every case is a real reproduction, so the main visual is the
recorded terminal output itself; the interactions are ways into the 27 cases.

## Built
| Idea | Why it earns its place | Data |
|---|---|---|
| Case cards: symptom as the user sees it, then the recorded commands and outputs, cause, fix, ML context, OSTEP chapter | The output is the evidence; nothing paraphrased | raw/*.txt via build_data.py, checked by check_embed.py |
| Filters: free-text search over error text, subsystem chips, tool select | "I have this error message" is how people arrive | case metadata |
| Decision tree, symptom to subsystem to cases | Teaches the order of reasoning: died / slow / hangs / grows / left behind | build_data.py TREE |
| Drill, "what would you check first?" | Belief elicitation; the first command matters more than the full list | case.first |
| To-scale bars inside eight cases (USS per worker list/numpy/arrow; step time 2 vs 0.5 CPU; 5 vs 1 thread on 1 CPU; ms per step by workers; docker stop duration by setup; swap pass time; readahead requests; seconds by read size; cold vs warm first batch) | One glance shows the size of the effect; values are regex-extracted from the recording and shown with the recorded digits | raw/*.txt |
| Index table by subsystem with OSTEP chapter | Maps the lab onto the book Khalid is reading | case.ostep, TOC checked 2026-10-05 |

## Rejected or not possible here
| Idea | Why not |
|---|---|
| Animated SIGTERM timeline (docker stop, grace period, SIGKILL) | The four measured stop durations as bars carry the same message; the Syscall tracer tab already animates signal delivery |
| Crash simulation for the fsync case (loop device ext4, snapshot of the backing file) | Needs a privileged container, which this session was not allowed to run; the case shows the dirty-page window with memory.stat and says plainly that the loss itself is not shown |
| drop_caches for cold reads | Needs privileges and would empty the page cache for every other agent's container; per-file POSIX_FADV_DONTNEED is used instead and verified with fincore |
| dmesg lines for the OOM kills | Not readable without privileges (EPERM recorded); memory.events is the evidence instead |
| Hugging Face tokenizers' fork warning | tokenizers 0.23.2 (installed in kb-os-dbg:1) printed no warning after fork and its binary contains no such string; dropped rather than quoted from an older version without a source |
| CUDA OOM reproduction | No GPU; quoted from CUDACachingAllocator.cpp at v2.14.1 with line numbers |
| Readahead shown with random 4 KiB reads | Measured, but readahead does not trigger on random access (1,990 requests either way); replaced by sequential 4 KiB reads, 516 against 16,384 requests |
| Hardware counters (perf stat cycles, cache misses) for the thread-oversubscription case | Not supported in this VM (OS simulators agent); getrusage context switches and cgroup cpu.stat used instead |
