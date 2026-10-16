#!/usr/bin/env python3
"""Storage lab: recompute the calculator's defaults and the derived numbers quoted in the prose.
usage: python3 recompute.py   (prints each check; exits 1 on a mismatch)"""
import json, os, sys

here = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(here, "out", "io_data.json")))
bad = 0


def check(name, got, want, tol=0.01):
    global bad
    ok = abs(got - want) <= tol * max(abs(want), 1e-12)
    bad += not ok
    print(("ok   " if ok else "FAIL ") + f"{name}: {got:.6g} (expected {want:.6g})")


def calc(n, b, g, gpn, agg_GBps, link_GBps=50, pcie_GBps=63, ivl_min=30, target_s=60):
    S = n * b; nodes = max(1, -(-g // gpn)); A = agg_GBps * 1e9; L = link_GBps * 1e9
    return {"S": S, "shard": S / g, "t_cons": S / min(L, A), "t_shard": S / min(A, nodes * L),
            "t_block": S / g / (pcie_GBps * 1e9), "need_GBps": S / target_s / 1e9,
            "lustre1000_TiB": S / target_s / 1e9 / 1.0, "lustre125_TiB": S / target_s / 1e9 / 0.125}


# 405B default: Llama 3 on Tectonic
r = calc(405e9, 14, 16384, 8, 2000)
check("405B checkpoint TB", r["S"] / 1e12, 5.67)
check("405B per-GPU MB (inside Llama 3's 1 MB to 4 GB)", r["shard"] / 1e6, 346.07)
check("405B sharded write at 2 TB/s, s", r["t_shard"], 2.835)
check("70B checkpoint TB (Reading tab: 0.98)", calc(70e9, 14, 1024, 8, 100)["S"] / 1e12, 0.98)
check("70B at 100 GB/s sharded, s (interview answer: about 10)", calc(70e9, 14, 1024, 8, 100)["t_shard"], 9.8)
check("70B consolidated through a 50 GB/s link, s (about 20)", calc(70e9, 14, 1024, 8, 100)["t_cons"], 19.6)
check("PCIe Gen5 x16 nominal GB/s", 32e9 * 16 * 128 / 130 / 8 / 1e9, 63.0, 0.005)

# anatomy adds up
A = D["anatomy"]
check("anatomy parts sum to file", A["model_fp32_bytes"] + A["adamw_moments_bytes"] + A["adamw_step_tensors_bytes"] + A["pickle_bytes"] + A["zip_overhead_bytes"] + A["other_entries_bytes"], A["file_bytes"], 0)
check("file bytes = 1,386,049", A["file_bytes"], 1386049, 0)
check("weights share %", 100 * A["model_fp32_bytes"] / A["file_bytes"], 32.5, 0.005)
check("moments share %", 100 * A["adamw_moments_bytes"] / A["file_bytes"], 65.0, 0.005)
check("moments = 2 x weights", A["adamw_moments_bytes"], 2 * A["model_fp32_bytes"], 0)
check("bytes per param", A["file_bytes"] / A["params"], 12.31, 0.001)

# prose ratios
T = D["tiers"]; C = D["clusters"]
check("k8s/slurm ckpt ratio (prose: 36)", round(C["k8s"]["median_s"] / C["slurm"]["median_s"]), 36, 0)
lb = D["slow_bind"]["layouts"]
check("every-rank bytes = 4 x rank0 (approx)", lb["ddp_every"]["total_bytes"] / lb["ddp_rank0"]["total_bytes"], 4, 0.001)
check("every-rank time / rank0 time on slow folder (prose: about three)", round(lb["ddp_every"]["wall_s"] / lb["ddp_rank0"]["wall_s"]), 3, 0)
for tr in ["none", "sync", "async"]:
    check(f"slow_bind {tr} final loss equal to none", D["slow_bind"]["train"][tr]["loss_last"], D["slow_bind"]["train"]["none"]["loss_last"], 0)
print("FAILED", bad if bad else "") if bad else print("all checks passed")
sys.exit(1 if bad else 0)
