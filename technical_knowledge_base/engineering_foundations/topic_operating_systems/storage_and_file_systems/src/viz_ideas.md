# Visualisation ideas: Storage and file systems

What the text needs to be understood: where data is at each moment (program, page cache, device cache, media); how the kernel turns small reads into few requests; when dirty data leaves memory; what each durability call actually does; what a crash leaves behind for each write protocol; what checkpoints cost.

Scores: teaching value (1 to 5) x data reality (1 to 3), minus clutter.

## Built
| Idea | Score | Placement | Data | Why it earns its place |
|---|---|---|---|---|
| Crash lab: seven checkpoint protocols, every crash point, two persistence models (POSIX only, ext4 as configured), grid of all points | 5 x 3 | own tab | call sequences from strace of the real job's checkpoint (`raw/ckpt_trace.txt`); rules from man pages and ext4 source | The question "what does a crash leave?" has a combinatorial answer that prose cannot enumerate; the root's simulator does it at block level, this does it at the system-call level (ALICE's method in miniature). Shows that DCP-in-the-same-directory is unsafe and the fixes are not |
| Readahead window, before/after (default, doubled, off, random), animated read by read with the source-rule prediction outlined in the caption | 5 x 3 | Reading section 4 | io.stat after every read() (`raw/readahead.txt`); mm/readahead.c v5.10 rules | Reproduces the kernel's algorithm independently against the device counters: all 20 and 13 requests match |
| fsync vs fdatasync vs sync_file_range stepper on one 4 KiB overwrite, layer by layer | 4 x 2 | Reading section 6 | order from fs/ext4/fsync.c and fs/jbd2/commit.c; totals measured | Explains why the measured costs differ (journal commit or not, flush or not) and why sync_file_range is not durable |
| Writeback timelines (dirty, writeback, device, program) for eight runs | 4 x 3 | Reading section 5 | memory.stat and io.stat every 100 ms | Shows the surprise: 2 to 32 s for the same 16 MiB; throttling in the 1.5 GiB run |
| Durability cost bars, ext4 vs tmpfs, append vs overwrite, log scale | 4 x 3 | Reading section 6 | `raw/synccost.txt` | The fdatasync-on-overwrite win and "nothing to flush" contrast |
| Checkpoint bars with dirty-after | 4 x 3 | Reading section 11 | `raw/ckpt_time.txt` | Cost of safety (+102 ms on 263) and the dirty data plain saves leave |
| Queue-depth bars with Little's law check | 3 x 3 | Reading section 1 | fio | Throughput vs latency vs queue depth in one view |
| Small files vs one file bars | 3 x 3 | Reading section 3 | `raw/meta.txt` | Metadata cost, 56x cold |
| Clickable storage stack with "write() returns here" and "flush passes here" lines | 3 x 1 | One screen | none | The map for the whole page |
| Real debugfs output of an ext4 inode and extent | 3 x 3 | Reading section 3 | `raw/fsimage.txt` | The inode stops being abstract |

## Rejected
- A second writeback "replay" tab (animated cursor over the timelines): the static chart with a run selector already shows everything; an animation added nothing.
- A real crash test with dm-flakey or dm-log-writes: needs privileges (device-mapper); the root brief forbids privileged containers.
- Re-animating one write's journey with a Dirty counter: the root's section 7 already has it; linked instead.
- A block-level crash simulator: the root's OS simulators tab owns it; the Crash lab is one level up.
- NVMe queue animation: no NVMe device here and nothing measured; a static description with the spec link teaches enough.

## What the methodology lacked
Nothing structural. One addition worth recording: when a measurement contradicts the textbook (writeback timing), keep the contradiction, repeat the run several times, show the spread, and label the explanation "likely, not traced" rather than choosing one run.
