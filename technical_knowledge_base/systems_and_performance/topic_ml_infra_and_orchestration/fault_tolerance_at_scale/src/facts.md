# Facts verified or measured for this page (2026-10-16)

## Measured (Apple M1 Pro, natively, macOS, torch 2.14.1, gloo on loopback, shared machine)
- Running example natively with a DDP comm hook and bucket rebuild off: gloss at step 10 = 3.190476894378662, equal to the container runs.
- Bit flips at step 120 on replica 2 (largest gradient element or fc weight index 1000): gradient bit 3 no logged change; bit 27 max |dloss| 1.29e-5; bit 30 value 1.58e37, global grad norm 3.94e36, max |dloss| 9.8e-5, final 2.2637792 vs 2.2638769; weight bit 3 max 4.8e-7 (first diff step 124); bit 27 2.8e-5; bit 30 NaN on replica 2 at step 121, all replicas NaN at 122.
- Cross-replica weight checksum: missed all gradient flips; caught all weight flips at step 120. Replay from the step-100 checkpoint: local-gradient fingerprints differ only at (step 120, replica 2) for gradient flips, (121, 2) for weight flips; replayed global losses equal the clean run's.
- Loss-spike rule (6 MAD over 20 steps) false alarm on the clean run at step 84.
- One-weight AdamW, gradient 3.944e36 at step 120: exp_avg_sq becomes inf; update falls from 1.2e-3 to 7.7e-7 per step and stays.
- Stragglers (300 steps): baseline compute about 4.5 ms, wait about 2.8 ms, step about 9 ms; rank 2 +6 ms sleep -> compute 12.84 ms, its wait 2.6 ms vs 10.96 ms for rank 0; periodic rank 0 spikes about 34 ms; rank 3 +2 ms -> 7.1 ms. Losses identical across the three runs.
- Relative score cutoff 0.75, 10-step median: rank 2 flagged at step 84, rank 3 at 204, no false alarms on any run.

## Source (PyTorch v2.14.1; see inputs/source_quotes.json)
- NCCL default timeout 10 min (ProcessGroupNCCL.hpp 159-160); gloo/backends 30 min (Backend.hpp 37); TORCH_NCCL_ASYNC_ERROR_HANDLING default 3 SkipCleanUp (cpp 976); heartbeat monitor 480 s (cpp 1775), on (1787); dump on timeout on (1782), 15 s extra (1777); flight recorder 2000 entries (FlightRecorder.hpp 110); torchrun monitor interval 0.1 s (run.py 572), --max-restarts 0 (564).
- Watchdog message: "Watchdog caught collective operation timeout: ... ran for ... milliseconds before timing out." (cpp 735-739); heartbeat: "ProcessGroupNCCL's watchdog got stuck for ... seconds without making progress in monitoring enqueued collectives." (cpp 1954). No "Heartbeat monitor timed out" string at this tag.

## Published (extracts in inputs/)
- Meta 32K-GPU job table (arXiv 2602.00277v1, 2026-01-30): 678 interruptions, HBM3 155 (22.9%) top, PCIe 122, NCCL watchdog 61, faulty GPU compute 50 (7.4%); 2.3 per 1,000 servers per day; 95-97% ETT; its "failure every 18 minutes at 100K GPUs" inconsistent with its own rate (about 50 min).
- ByteRobust (arXiv 2509.16293v4): Table 1 55,365 incidents; text 38,236/5,948 vs table 39,687/6,096; detection Table 3 (NIC 30 s, driver hang 10 s, kernel fault 2 s); warm standby 10.87x vs requeue; "Only 1.23% of failures required dual-phase replay".
- Acme (NSDI 2024 Table 3): 2,575 failed jobs; script 73.4% of jobs, 3.2% of GPU time; infrastructure 10.9% / 82.1%.
- Philly (ATC 2019 Table 7): 39,776 failure events; "top-8 cover 88.9%" computes to 87.6%.
- Kokolis et al. (HPCA 2025): RSC-1 hardware ends 0.2% of jobs, 18.7% of GPU runtime; 6.50 and 2.34 failures per 1,000 node-days. The page's model reproduces "around 0.9" at 2,048 GPUs (0.891) and ~10 s writes for 0.9 at 12k (0.922).
- Lin et al. (arXiv 2505.05713v2): 42.5% of jobs >= 10% slower; 10.4% of GPU hours wasted.
- NVRx v0.7.0: straggler score cutoff 0.75, report every 60 s; in-process restart needs PyTorch >= 2.5.1, NCCL >= 2.26.2.
- DCGM diag levels r1 < 2.5 s; r2 < 2.5/10.5 min; r3 < 10/35 min; r4 < 45 min / 2.25 h (4/8 GPUs, Hopper).
- PyTorch DCP async_save: 0.78 s blocking, Llama3-70B on 1,856 H200 (blog Apr 2025).
- Gemini SOSP 2023 recovery breakdown: detect 15 s, serialise 162 s, replacement 4-7 min, warm-up > 4 min.
- Just-in-time checkpointing (EuroSys 2024): only the abstract readable; numbers unconfirmed.
