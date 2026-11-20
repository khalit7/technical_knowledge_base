# Running things locally

When a page should run code on the build machine instead of citing a published number, how the result is labelled, and how it survives a reboot. Before any heavy run, read [resource-safety.md](resource-safety.md).

## Why pages run things at all
Khalid approved the reasons (2026-10-15): to verify what papers and docs claim, to see inside a mechanism (real vectors, real logits, real schedules), to give runnable code whose output is pasted from a real run, and to hit the real pitfalls a reader will hit. A run earns its place by showing something; machine time is not free and the machine is shared.

## The decision: one question
**What does the reader learn from this run that the published number, or a cheap CPU toy, does not?** If little, cite the published result (labelled, dated) and write "not run here" with the reason.

Keep runs that are cheap and show:
- **a mechanism** (one image through an encoder, cross-attention maps, a sampler's trajectory, a scheduler placing eight jobs);
- **a failure** (posterior collapse, codebook collapse healing, a guidance scale that saturates pixels, a hang on a missing rendezvous, an OOM on a wrong VAE dtype);
- **a before/after on the same input** (with and without prompt caching, flow against diffusion at equal steps, FIFO against backfill);
- **internals** that no paper prints (what the processor actually tiles, how many tokens an image becomes, which detector catches a bit flip).

Drop runs that are expensive (roughly over an hour) and mostly reproduce a published curve, enlarge a sample, or sweep a grid the paper already swept. Quality and depth are not capped; waste is.

Example: on the data curation topic this rule cut the GPU queue from about 14 hours to about 4, keeping the short runs that showed a mechanism or a before/after and citing the rest as "not run here". Small models train in minutes; larger open models run for inference only.

## Labels
- **Measured results:** "measured on one RTX 5090 (CUDA)" or "(CPU)", plus what was shared (a container, capped threads at low priority, a shared machine). Pages measured on an earlier machine keep their own label (for example "Apple M1 Pro (MPS)").
- **What transfers:** one or two sentences on what carries to a datacenter GPU or TPU (orders, ratios, counts, which method wins) and what does not (absolute speed, memory headroom, kernel availability).
- **Not run here:** the result taken from a source, with why it was not run (hours of GPU, needs a cluster, licence, network).
- **Calculations:** derived numbers say "calculated" with the formula, never "measured".
- **Code shown on the page** is real code that ran (kept in `src/<tab>/`), with its output pasted from the run.

## Timings against deterministic results
- **Timings** (throughput, latency, startup, checkpoint write speed, documents per second) are rough on a shared machine: label them "rough, measured on a shared machine", repeat them, report the spread, and never present them as hardware facts. If a timing matters, script it as a pending timed run for a quiet machine.
- **Deterministic results** need no caveat and are the bulk of most labs: counts, which job ran where and when, kept and dropped fractions, duplicate rates, token counts, losses at a fixed seed, outputs of a fixed model on fixed inputs, logs, configs. Fix seeds and record versions so a rerun gives the same numbers.

## Pending-run boxes
When a run is worth doing but cannot happen now (the GPU queue is busy, the agent is CPU-only, the machine is loaded):
- script it in the page's `src/scripts/run_pending.sh` with a time estimate per job;
- show it on the page as a dashed pending box with its command and what it will fill;
- leave the fact unfilled in the data, so the data check flags it until the run lands;
- report it, so the lead puts it in the GPU queue. A page is not published with a pending box unless Khalid accepts it.

## Durability: rebuild from the repo
- Scratch is not durable (a reboot or a temp cleaner can clear venvs, models, run outputs and locks); before relying on scratch after any gap, check `last reboot`.
- Everything a page needs to rebuild goes in the page's `src/` in the repo: recorded outputs as small JSON, small inputs (`src/inputs/`), sample images as small thumbnails, the scripts that made them, and a manifest of every download (URL, revision, sha256).
- Models live in `~/.cache/huggingface` (durable; leave `HF_HOME` unset). Large downloads and intermediates stay in scratch.
- Commit nothing over about 1 MB, no MP4s, no PDFs.
