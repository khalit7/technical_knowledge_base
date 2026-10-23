# Visualisation ideas: Distributed and disaggregated serving

The page's question: for each way of splitting serving across GPUs, what crosses between GPUs per token, how long does it take on its link, and what does the split buy in latency, users and cost? Scores 0 to 2 on the Methodology's questions (moving parameter, reproduces a source, computable from public data (double), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere (checked against the root's section 7 diagram, the Capacity planner, the Serving simulator, Interconnects and scaling, Distributed Training, DeepSeek's EPLB view), animation against the method it replaced), minus build cost.

## Built
| # | Idea | Placement | Score | Data and sources | Notes |
|---|---|---|---|---|---|
| DD1 | **One decode step on eight H200s, four ways** (1 GPU, 8 replicas, TP 8, PP 8; 1 user or 64), lanes drawn to one time scale with fixed work, weight reads, all-reduces and micro-batches; counters for time per token, tokens/s, weights per GPU, bytes sent, conversations that fit | Reading s3 | 13 | planner step() and setup() via recompute.py | Before/after on the same input; shows TP's 3.6x not 8x and PP's no-speedup; the root's static five-mode diagram shows what each holds, this shows time |
| DD2 | **A prompt arrives at two busy GPUs**: colocated (budget 8,192 and 512) against disaggregated, timeline with the transfer arrow; counters TTFT, longest pause, normal TPOT, busy GPU-time | Reading s6 | 12 | planner step() for B=32/64 and c=512/2000; KV bytes / 50 GB/s | Shows the trade honestly: no pause but a fuller decode GPU and an idle prefill GPU |
| DD3 | KV transfer calculator: model, prompt length, link; bytes, time per link, share of the prefill (70B) | Reading s6 | 9 | hardware root kv_per_token; links | Small; makes "625 MiB in 13 ms" concrete for other models (MLA 4.7x smaller) |
| DD4 | **Disaggregation lab**: SLO attainment against rate for colocated and all 7 splits, goodput bars, per-run percentiles, three workloads, 3 TTFT x 4 TPOT targets, two links, predict-then-reveal | Own tab | 13 | root sim.py unchanged (pd/pd_sim.py), 720 runs | The only measurable answer to "when does it pay" for the running example; reproduces the direction of DistServe and TaiChi (no number reproduced: different model and hardware) |
| DD5 | **Expert balancer**: real Granite 3.1 MoE routing on WikiText-2, per-GPU load default against EPLB (unchanged code), held-out batches, layer/GPUs/redundancy controls; step-by-step animation of EPLB's decisions; table of every setting | Own tab | 12 | ep/route.py, ep/balance.py, eplb.py (MIT) | DeepSeek page has the README's toy example; this one is real routing judged on unseen traffic |
| DD6 | Runs on this laptop: llama.cpp layer split and tensor split over RPC; vLLM CPU TP 2 and PP 2; two llama-servers handing over a real KV file; vLLM ExampleConnector | Own tab | 10 | exp/ scripts, out/ | Evidence that the mechanisms behave as taught, labelled for what transfers to GPUs |
| DD7 | Section 7 summary table and three lessons computed from the grid in the page | Reading s7 | 8 | DDP | Keeps prose and lab consistent by construction |
| DD8 | Predict-then-reveal: TP 8 speed-up; colocated vs split at 50 ms | Reading s1; lab | 7 | planner, grid | |

## Rejected
| Idea | Why |
|---|---|
| A rebuilt parallelism planner (TP/PP/EP sweep with memory and step time) | The parent's Capacity planner already does it with the same model; linked instead |
| Collective simulator (ring vs tree all-reduce, all-to-all) | Owned by Interconnects and scaling's Collective simulator |
| Animated Megatron column/row split | Owned by the Megatron-LM paper page (live split of real matrices) |
| Dynamo router cost-function toy | Would invent load numbers; the formula is quoted instead and the root's routing animation and the production child own routing |
| Expert-parallel all-to-all timeline at DeepSeek scale | Inputs (per-kernel times at EP 144) only exist as vendor tables from an older README; quoted in text instead |
| Vendor claim chart (30x, 7x, 6.11x side by side) | Different hardware, models and baselines: a chart would invite comparison the numbers do not support; a table with conditions instead |

## What the methodology lacked here
A rule for simulated evidence about a mode the simulator has not been validated in (disaggregated): the page labels it "simulated, not checked against a real disaggregated engine", lists what is not modelled, and claims directions rather than numbers.

## 2026-10-23 rebuild (teaching contract)
| Idea | Placement | Kind | Notes |
|---|---|---|---|
| Hero: five splits, what crosses per token and over which link | top | static annotated | numbers from DDC; replaces the four summary cards |
| Memory to scale, one H200 against TP 2 | section 1 | static, drawn to scale | `mem` added to recompute.py from the planner's setup() |
| Dynamo router cost on three workers, A's load on a slider | section 2 | one slider | loads illustrative; formula quoted; the root's round-robin animation is linked, not redrawn |
| One MoE layer under EP: attention local, dispatch and combine | section 5 | static annotated | |
| Serving-layer map: project against job | section 8 | static matrix | filled, ring or blank (not covered here) |
| DD4, DD5 moved inline | sections 7, 5 | | lab tabs folded; tables closed |
| DD6 moved into closed blocks | sections 4, 6 | | |
Rejected: a prefix-routing before/after (the parent root draws it, section 9; LLM serving in production has a routing toy).
