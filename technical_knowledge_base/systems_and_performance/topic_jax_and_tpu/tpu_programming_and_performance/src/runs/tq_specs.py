"""One table of published TPU numbers per generation (no TPU used; nothing measured).

Starts from the root TPU lab's out/specs.json (Cloud pages and the scaling book, read 2026-10-15, plus
jax/_src/tpu_info.py at jax-v0.11.2) and adds what this page needs: low-precision peaks, DCN and PCIe,
chips per host, the largest single slice, SparseCores, and on-demand / commitment prices. Each added
number is asserted to appear in the saved extract it comes from (src/inputs/), so a typo fails here.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tq_common as T

CLOUD = open(os.path.join(T.INPUTS, "cloud_tpu_pages_extract.txt")).read()
SB = open(os.path.join(T.INPUTS, "scaling_book_extracts.txt")).read()
PRICE = open(os.path.join(T.INPUTS, "cloud_tpu_pricing_extract.txt")).read()


def need(text, s, what):
    assert s in text, (what, s)
    return s


root = T.root_json("specs.json")
G = {g["gen"]: g for g in root["gens"]}
ADD = {
    "v4": dict(int8=275e12, int8_src="Cloud: '275 teraflops (bf16 or int8)'; scaling book 2.75e14", fp8=None,
               dcn=6.25e9, dcn_src="scaling book default 6.25e9 B/s per chip (Cloud v4 page lists none)",
               pcie=1.6e10, host_chips=4, max_slice="8x16x16 (2,048 chips; v4-4096)", sparse=None,
               price=None, price_note="v4 pod $3.22 per chip-hour on demand (us-central2)", price_v=3.22,
               c1=2.0286, c3=1.449, flex=None, region="us-central2", name_rule="v4-N: N = TensorCores (v4-8 = 4 chips)"),
    "v5e": dict(int8=393e12, int8_src="Cloud: 393 TOPs (scaling book 3.94e14)", fp8=None,
                dcn=3.125e9, dcn_src="Cloud: 2 x 100 Gbps NIC per 8-chip host = 25 Gbps per chip; scaling book 3.125e9 B/s",
                pcie=1.6e10, host_chips=8, max_slice="16x16 (256 chips, the whole pod)", sparse=None,
                price_v=1.20, c1=0.84, c3=0.54, flex=0.60, region="us-central1", name_rule="Cloud lists topologies (2x2 ... 16x16); counts are chips"),
    "v5p": dict(int8=918e12, int8_src="scaling book 9.18e14 only; Cloud lists FP8 459 and no INT8", fp8=459e12,
                dcn=6.25e9, dcn_src="Cloud: 50 Gbps per chip = 6.25e9 B/s (scaling book agrees)",
                pcie=1.6e10, host_chips=4, max_slice="16x16x24 (6,144 chips, 96 cubes)", sparse=4,
                price_v=4.20, c1=2.94, c3=1.89, flex=2.10, region="us-east5", name_rule="Cloud table lists Cores = 2 x chips (v5p-128 = 64 chips)"),
    "v6e": dict(int8=1836e12, int8_src="Cloud: 1836 TOPs (scaling book 1.84e15)", fp8=None,
                dcn=12.5e9, dcn_src="Cloud: 4 x 200 Gbps per 8-chip host = 100 Gbps per chip; scaling book 12.5e9 B/s",
                pcie=3.2e10, host_chips=8, max_slice="16x16 (256 chips, the whole pod)", sparse=2,
                price_v=2.70, c1=1.89, c3=1.22, flex=1.35, region="us-east1", name_rule="v6e-N counts chips (v6e-8 = one 8-chip host)"),
    "7x": dict(int8=4.61e15, int8_src="scaling book 4.61e15 (int8); Cloud lists FP8 4,614 TFLOPs, no INT8", fp8=4614e12,
               dcn=12.5e9, dcn_src="Cloud: 100 Gbps per chip; scaling book 12.5e9 B/s",
               pcie=1.6e10, host_chips=4, max_slice="8x16x16 (2,048 chips) in Cloud's list; pod 9,216 chips (scaling book 4x4x576)", sparse=4,
               price_v=12.00, c1=8.40, c3=5.40, flex=6.00, region="us-central1", name_rule="Cloud lists topologies (2x2x1 ... 8x16x16); counts are chips"),
}
# assertions against the extracts
need(CLOUD, "275 teraflops (bf16 or int8)", "v4 int8"); need(CLOUD, "393", "v5e int8"); need(CLOUD, "1836 TOPs", "v6e int8")
need(CLOUD, "Peak compute per chip (FP8) (TFLOPs) | 459", "v5p fp8"); need(CLOUD, "4614", "7x fp8")
need(SB, "9.18e14", "v5p int8 sb"); need(SB, "4.61e15", "7x int8 sb"); need(SB, "3.125e9", "dcn"); need(SB, "3.2e10 for TPU v6e", "pcie")
need(CLOUD, "Data center network (DCN) bandwidth per chip (Gbps) | 50", "v5p dcn"); need(CLOUD, "4 x 200 Gbps", "v6e nic")
need(CLOUD, "shape is 16x16x24 (6144 chips, 96 cubes)", "v5p max"); need(CLOUD, "200 GBps per", "7x per axis")
need(PRICE, "| Ironwood | us-central1 | Iowa | $12.00 | $6.00 / 1 hour | $8.40 / 1 hour | $8.40 | $5.40", "7x price")
need(PRICE, "| Trillium | us-east1 | South Carolina | $2.70 | $1.35 / 1 hour | $1.89 / 1 hour | $1.89 | $1.22", "v6e price")
need(PRICE, "| TPU v5p | us-east5 | Columbus | $4.20 | $2.10 / 1 hour | $2.94 / 1 hour | $2.94 | $1.89", "v5p price")
need(PRICE, "| TPU v5e | us-central1 | Iowa | $1.20 | $0.60 / 1 hour | $0.84 / 1 hour | $0.84 | $0.54", "v5e price")
need(PRICE, "| TPU v4 pod | us-central2 | Oklahoma | $3.22 | N/A | N/A | $2.0286 | $1.449", "v4 price")

gens = []
for k in ("v4", "v5e", "v5p", "v6e", "7x"):
    g = dict(G[k]); g.update(ADD[k])
    g["ridge_int8"] = round(g["int8"] / g["bw"], 1)
    g["bcrit_bf16"] = round(g["bf16"] / g["bw"], 1)                 # tokens, bf16 weights and activations
    g["bcrit_w8"] = round(g["bf16"] / g["bw"] / 2, 1)               # int8 weights, bf16 compute
    g["ici_axis_oneway"] = g["sb"]["link_oneway"]
    g["ici_ridge_link"] = round(g["bf16"] / g["sb"]["link_oneway"])  # D/2 must exceed this for a 2-chip split (scaling book)
    g["usd_per_pflop_hour"] = g["price_v"] / (g["bf16"] * 3600 / 1e15)
    gens.append(g)
    print(k, g["bf16"], g["int8"], g["bw"], g["bcrit_bf16"], g["bcrit_w8"], g["ici_ridge_link"], round(g["usd_per_pflop_hour"], 4))

notes = list(root["notes"]) + [
    dict(k="v5p_int8", t="v5p low precision: the scaling book lists 9.18e14 int8 OPs/s (twice bf16); Cloud's v5p page lists FP8 459 TFLOPs (the same as bf16) and no INT8 row. Cloud's v4 page gives int8 equal to bf16 (275). So 'int8 is 2x' holds for v5e, v6e and, per the scaling book, v5p, not for v4."),
    dict(k="7x_ici", t="TPU7x ICI: Cloud's comparison table says 1,200 GBps bidirectional per chip; the same page's text says '200 GBps per axis'. Six links (two per axis, both directions) at 100 GBps each way would reconcile the two readings, but the page does not say which it means."),
    dict(k="v5p_pod", t="v5p pod: the scaling book calls the full pod a 16x20x28 'superpod' (8,960 chips = 140 cubes; Cloud agrees on 8,960). Cloud's v5p page says 'The largest job that can be scheduled is a 96 cube (6144 chip) job', topology 16x16x24; beyond that you use Multislice (up to 18,432 chips). So 16x20x28 is the pod's size, not a slice you can request."),
    dict(k="7x_slices", t="TPU7x: Cloud's table of common slice shapes stops at 8x16x16 (2,048 chips); the pod is 9,216 chips (Cloud), written 4x4x576 by the scaling book."),
]
T.save("gens.json", {"gens": gens, "notes": notes, "free": root["free"], "sources": root["sources"],
                     "price_src": "https://cloud.google.com/tpu/pricing", "price_read": "2026-10-15",
                     "gpu": {"h100": {"bf16": 989.5e12, "bw": 3.35e12, "hbm": 80e9, "price": 3.99},
                             "b200": {"bf16": 2250e12, "bw": 8e12, "hbm": 180e9, "price": 6.69},
                             "src": "the Hardware topic's Performance math page (NVIDIA datasheets, dense); prices Lambda on demand 8-GPU, read 2026-10-15"}})
