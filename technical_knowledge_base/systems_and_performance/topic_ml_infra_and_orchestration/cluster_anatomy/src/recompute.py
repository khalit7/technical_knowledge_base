"""Cluster anatomy: every number the page shows, with its source, and the derived ones recomputed.

Writes out/expected.json (everything, plus sizing and path test cases) and parts/22_js_ca_data.js
(window.CA, the same data without the test cases). Stdlib only.
usage: python3 -I recompute.py
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
U = {
    "dgxh100": "https://docs.nvidia.com/dgx/dgxh100-user-guide/introduction-to-dgxh100.html",
    "gb200": "https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html",
    "dgxb200": "https://www.nvidia.com/en-us/data-center/dgx-b200/",
    "sp_comp": "https://docs.nvidia.com/dgx-superpod/reference-architecture-scalable-infrastructure-b200/latest/dgx-superpod-components.html",
    "sp_net": "https://docs.nvidia.com/dgx-superpod/reference-architecture-scalable-infrastructure-b200/latest/network-fabrics.html",
    "sp_sto": "https://docs.nvidia.com/dgx-superpod/reference-architecture-scalable-infrastructure-b200/latest/storage-architecture.html",
    "rsc": "https://ai.meta.com/blog/ai-rsc/",
    "meta24k": "https://engineering.fb.com/2024/03/12/data-center-engineering/building-metas-genai-infrastructure/",
    "metaroce": "https://engineering.fb.com/2024/08/05/data-center-engineering/roce-network-distributed-ai-training-at-scale/",
    "llama3": "https://arxiv.org/html/2407.21783v3",
    "ff2": "https://arxiv.org/html/2408.14158v2",
    "dsv3net": "https://arxiv.org/html/2505.09343",
    "colossus": "https://nvidianews.nvidia.com/news/spectrum-x-ethernet-networking-xai-colossus",
    "rainier": "https://www.aboutamazon.com/news/aws/aws-project-rainier-ai-trainium-chips-compute-cluster",
    "olmo2": "https://arxiv.org/abs/2501.00656",
    "hpn": "https://ennanzhai.github.io/pub/sigcomm24-hpn.pdf",
    "fattree": "https://dl.acm.org/doi/10.1145/1402958.1402967",
    "hopper": "https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/",
    "nccl_env": "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/env.html",
}

# ---------- link levels: per-GPU bandwidth one direction (GB/s) and latency (us) ----------
# Bandwidths and latencies are the same values the interconnects page uses (its window.IC.links),
# so the two pages agree: NVLink 4 450 GB/s each way (900 total, Hopper in depth); NVLink 5 900;
# 400 Gb/s NIC 50 GB/s; latencies from DeepSeek's measurements (Zhao et al. 2025, Table 5):
# NVLink 3.33 us, InfiniBand 2.8 us same leaf, 3.7 us across leaves.
LINK = {
    "nvl4": {"bw": 450.0, "lat": 3.33, "nm": "NVLink 4 through NVSwitch"},
    "nvl5": {"bw": 900.0, "lat": 3.33, "nm": "NVLink 5 through NVSwitch trays", "lat_note": "assumed equal to NVLink 4 (no published figure)"},
    "pcie5": {"bw": 63.0, "lat": None, "nm": "PCIe 5.0 x16"},
    "ib_leaf": {"bw": 50.0, "lat": 2.8, "nm": "400 Gb/s InfiniBand, same leaf"},
    "ib_spine": {"bw": 50.0, "lat": 3.7, "nm": "400 Gb/s InfiniBand, across leaves"},
}

# ---------- what is in one node ----------
NODES = [
    {"id": "dgxh100", "nm": "DGX H100 (8 x H100, 2023)", "label": "vendor", "src": U["dgxh100"],
     "gpus": 8, "gpu_mem_gb": 640, "scaleup": "4 x 4th-gen NVLink (NVSwitch) per system, 900 GB/s GPU to GPU (both directions)",
     "cpus": "2 x Intel Xeon 8480C, 56 cores each (112)", "ram": "2 TB (32 DIMMs)",
     "net_compute": "8 x ConnectX-7 single port, up to 400 Gb/s, InfiniBand by default, through 4 OSFP cages",
     "net_storage": "2 x ConnectX-7 dual port, Ethernet by default (storage and in-band management)",
     "net_mgmt": "dual 100 GbE + 10 GbE RJ45; BMC 1 GbE RJ45 (out of band)",
     "disk": "2 x 1.92 TB NVMe M.2 (OS, RAID 1); 8 x 3.84 TB NVMe U.2 data cache (RAID 0)",
     "power": "6 x 3.3 kW supplies, 4+2 redundancy; 10.2 kW max"},
    {"id": "gb200tray", "nm": "GB200 NVL72 compute tray (one of 18 per rack)", "label": "vendor", "src": U["gb200"],
     "gpus": 4, "gpu_mem_gb": None, "scaleup": "NVLink to 9 NVLink switch trays: all 72 GPUs of the rack in one domain",
     "cpus": "2 x Grace", "ram": None,
     "net_compute": "4 x ConnectX-7 single port 400G OSFP (cluster network)",
     "net_storage": "2 x BlueField-3 DPU, dual-port 400G InfiniBand or Ethernet (storage and management)",
     "net_mgmt": "1 GbE BMC + 2 x 1 GbE from the BlueField-3 BMCs",
     "disk": "4 x 3.84 TB E1.S NVMe (RAID 0) + 1.92 TB M.2 boot",
     "power": "rack about 120 kW, liquid cooled (CPUs, GPUs); network and storage air cooled"},
    {"id": "ff2", "nm": "Fire-Flyer 2 node (DeepSeek, 8 x PCIe A100)", "label": "authors", "src": U["ff2"],
     "gpus": 8, "gpu_mem_gb": 320, "scaleup": "none: PCIe A100 40 GB cards (the paper pairs GPUs with NVLink bridges)",
     "cpus": "2 x AMD EPYC Rome/Milan, 32 cores each", "ram": "512 GB DDR4-3200",
     "net_compute": "1 x ConnectX-6 200 Gb/s InfiniBand for the whole node (shared with storage)",
     "net_storage": "same NIC", "net_mgmt": "not stated", "disk": "not stated",
     "power": "2,500 W per node in Table II, against 4,200 W for a DGX-A100"},
]

# ---------- scale-up domains ----------
SCALEUP = [
    {"nm": "HGX / DGX H100 or B200 server", "n": 8, "link": "NVLink 4 / 5 via NVSwitch", "src": U["dgxh100"], "label": "vendor"},
    {"nm": "GB200 / GB300 NVL72 rack", "n": 72, "link": "NVLink 5 via 9 switch trays", "src": U["gb200"], "label": "vendor"},
    {"nm": "AWS Trn2 UltraServer", "n": 64, "link": "NeuronLink across 4 servers of 16 chips", "src": U["rainier"], "label": "operator"},
    {"nm": "Fire-Flyer 2 PCIe node", "n": 8, "link": "PCIe (NVLink bridges pair GPUs)", "src": U["ff2"], "label": "authors"},
]

# ---------- published cluster designs ----------
DESIGNS = [
    {"id": "rsc", "nm": "Meta Research SuperCluster", "date": "2022-01-24", "who": "Meta", "label": "operator", "src": U["rsc"],
     "acc": "A100 (DGX A100)", "n": 16000, "n_note": "760 DGX A100 = 6,080 GPUs in phase 1; 16,000 planned",
     "fabric": "InfiniBand, Quantum 1600 Gb/s, two-level Clos, no oversubscription",
     "storage": "175 PB Pure FlashArray, 46 PB cache (Penguin Altus), 10 PB FlashBlade; 16 TB/s target", "power": None},
    {"id": "meta24k", "nm": "Meta GenAI clusters (two)", "date": "2024-03-12", "who": "Meta", "label": "operator", "src": U["meta24k"],
     "acc": "H100 (Grand Teton servers)", "n": 24576, "n_note": "24,576 each; one RoCE, one InfiniBand",
     "fabric": "RoCE (Arista 7800, Wedge400, Minipack2) and InfiniBand (Quantum-2); 400 Gb/s endpoints",
     "storage": "Tectonic behind a FUSE API; parallel NFS with Hammerspace", "power": None},
    {"id": "llama3", "nm": "Llama 3 405B training cluster", "date": "2024-07-23", "who": "Meta", "label": "operator", "src": U["llama3"],
     "acc": "H100, 8 per server, 2 CPUs", "n": 24576, "n_note": "up to 16K used for 405B; 24K in the cluster",
     "fabric": "RoCE, three-layer Clos: 16 GPUs per rack switch, 192 racks per pod of 3,072, 8 pods; 1:7 between pods",
     "storage": "Tectonic: 240 PB on 7,500 SSD servers, 2 TB/s sustained, 7 TB/s peak", "power": None},
    {"id": "ff2", "nm": "DeepSeek Fire-Flyer 2", "date": "2024-08-31", "who": "DeepSeek (High-Flyer)", "label": "authors", "src": U["ff2"],
     "acc": "PCIe A100 40 GB, 8 per node", "n": 10000, "n_note": "about 1,250 nodes",
     "fabric": "InfiniBand 200 Gb/s, one NIC per node; two zones, each a two-layer fat tree of 800 ports (40 leaf + 20 spine QM8700, 40 ports); 122 switches",
     "storage": "3FS on 180 nodes (16 x 15.36 TB NVMe each), 8 TB/s read; storage on the same fabric",
     "power": "under 4 MW, \"approximately just over 3 MW\""},
    {"id": "dsv3", "nm": "DeepSeek-V3 training cluster", "date": "2025-05-14", "who": "DeepSeek", "label": "authors", "src": U["dsv3net"],
     "acc": "H800, 8 per node", "n": 2048, "n_note": "2,048 GPUs",
     "fabric": "multi-plane fat tree: GPU-NIC pair k of every node on its own two-layer plane; 8 planes reach 16,384",
     "storage": "3FS", "power": None},
    {"id": "colossus", "nm": "xAI Colossus", "date": "2024-10-28", "who": "xAI (as described by NVIDIA)", "label": "vendor", "src": U["colossus"],
     "acc": "Hopper", "n": 100000, "n_note": "100,000; doubling to 200,000 announced",
     "fabric": "Spectrum-X Ethernet (SN5600 switches, 800 Gb/s ports; BlueField-3 SuperNICs); \"95% data throughput\" claimed",
     "storage": "not stated", "power": "not stated; built in 122 days"},
    {"id": "rainier", "nm": "AWS Project Rainier (for Anthropic)", "date": "2025-10-29", "who": "AWS", "label": "operator", "src": U["rainier"],
     "acc": "Trainium2", "n": 500000, "n_note": "\"nearly half a million\"",
     "fabric": "UltraServers of 64 chips (4 servers x 16) on NeuronLink; EFA between UltraServers and across data centres",
     "storage": "not stated", "power": "several US data centres (Indiana named)"},
    {"id": "olmo", "nm": "AI2 Jupiter (OLMo 2)", "date": "2024-12-31", "who": "AI2", "label": "operator", "src": U["olmo2"],
     "acc": "H100", "n": 1024, "n_note": "1,024", "fabric": "not detailed here", "storage": "WEKA (761 Gbps with 64 clients)", "power": None},
    {"id": "superpod", "nm": "NVIDIA DGX SuperPOD (B200) reference", "date": "2025", "who": "NVIDIA", "label": "vendor", "src": U["sp_net"],
     "acc": "B200, 8 per DGX", "n": 1016, "n_note": "4 scalable units of 32 DGX (127 usable: one slot goes to fabric management)",
     "fabric": "four networks; compute: rail-optimised non-blocking fat tree, QM9700 NDR 400 Gb/s, 32 leaf + 16 spine at 4 SU",
     "storage": "40 GB/s (standard) to 125 GB/s (enhanced) read per SU; write half of read", "power": "2 DGX B200 per rack"},
]

# ---------- storage tiers per node (per DGX H100 unless stated) ----------
TIERS = [
    {"nm": "GPU memory (HBM3)", "cap": "8 x 80 GB = 640 GB", "bw": "3.35 TB/s per GPU", "life": "this step", "src": U["dgxh100"], "label": "vendor"},
    {"nm": "Host memory (DRAM)", "cap": "2 TB", "bw": "PCIe 5.0 x16 to each GPU, about 63 GB/s each way", "life": "this job; page cache", "src": U["dgxh100"], "label": "vendor"},
    {"nm": "Local NVMe (data cache)", "cap": "8 x 3.84 TB = 30.72 TB, RAID 0", "bw": "not given in the guide", "life": "this job or node (lost if the node dies)", "src": U["dgxh100"], "label": "vendor"},
    {"nm": "Shared high-performance file system", "cap": "PBs", "bw": "SuperPOD guidance: 40 to 125 GB/s read per 32 nodes", "life": "the project", "src": U["sp_sto"], "label": "vendor"},
    {"nm": "Object storage / data lake", "cap": "tens to hundreds of PB", "bw": "Llama 3's Tectonic: 2 TB/s sustained, 7 TB/s peak for the cluster", "life": "years", "src": U["llama3"], "label": "operator"},
]

# ---------- the toy cluster (measured) ----------
def load_meas():
    out = os.path.join(HERE, "meas", "out")
    pings = [json.loads(l) for l in open(os.path.join(out, "ping.jsonl")) if l.strip()]
    def med(path, key):
        v = sorted(p["r"][key] for p in pings if p["path"] == path)
        return v[len(v) // 2]
    return {
        "date": "2026-10-16",
        "cpus": {"vm": 5, "cgroup": 2.0, "slurm": 4, "nproc": 1, "nproc_no_omp": 5, "os_cpu_count": 5},
        "mem_mb": {"vm_meminfo": round(10189984 / 1024), "cgroup": 838860800 // 2**20, "slurm": 4000},
        "gpus": {"slurm": 4, "real": 0, "files": 4},
        "eth_speed_mbps": 10000, "pci_devices": 2, "numa_nodes_visible": 0,
        "rtt_bridge_us": [p["r"]["rtt_us_median"] for p in pings if p["path"] == "c1->c2 bridge"],
        "rtt_loop_us": [p["r"]["rtt_us_median"] for p in pings if p["path"] == "c1 loopback"],
        "bw_bridge_GBps": [p["r"]["bulk_GBps_median"] for p in pings if p["path"] == "c1->c2 bridge"],
        "bw_loop_GBps": [p["r"]["bulk_GBps_median"] for p in pings if p["path"] == "c1 loopback"],
        "rtt_bridge_med": med("c1->c2 bridge", "rtt_us_median"),
        "rtt_loop_med": med("c1 loopback", "rtt_us_median"),
    }

# ---------- sizing model (mirrored in parts/32_js_ca_size.js) ----------
def size(p):
    """p: gpus, gpn (GPUs per node), nics (NICs per node), gbps (per NIC), k (switch ports at that speed),
    o (oversubscription at the top tier; 1 = none), rails (bool), node_kw, rack_kw, nodes_per_rack (0 = from power),
    pue, sto ('std'|'enh')."""
    nodes = math.ceil(p["gpus"] / p["gpn"])
    E = nodes * p["nics"]
    k, h = p["k"], p["k"] // 2
    if p["rails"] and p["nics"] > 1:
        leaves = p["nics"] * math.ceil(nodes / h)
    else:
        leaves = math.ceil(E / h)
    r = {"nodes": nodes, "endpoints": E, "leaves": leaves}
    if E <= k * k // 2:
        r["tiers"] = 2
        r["spines"] = math.ceil(leaves * h / k)
        r["cores"] = 0; r["pods"] = 1
        r["links"] = E + leaves * h
        r["top_share"] = 1.0
    else:
        o = p["o"]
        d = round(k * o / (o + 1)); u = k - d
        pods = math.ceil(leaves / d)
        r["tiers"] = 3; r["pods"] = pods; r["pod_endpoints"] = d * h
        r["spines"] = pods * h
        r["cores"] = math.ceil(pods * h * u / k)
        r["links"] = E + leaves * h + pods * h * u
        r["top_share"] = u / d
        r["too_big"] = pods > k
    r["switches"] = r["leaves"] + r["spines"] + r["cores"]
    npr = p["nodes_per_rack"] or max(1, int(p["rack_kw"] // p["node_kw"]))
    r["nodes_per_rack"] = npr
    r["racks"] = math.ceil(nodes / npr)
    r["it_mw"] = nodes * p["node_kw"] / 1000
    r["site_mw"] = r["it_mw"] * p["pue"]
    per_su = 40 if p["sto"] == "std" else 125
    r["sto_read_GBps"] = per_su * nodes / 32
    r["gpu_net_GBps"] = p["nics"] * p["gbps"] / 8 / p["gpn"]
    return r

PRESETS = [
    {"id": "superpod", "nm": "DGX SuperPOD B200, 4 scalable units", "gpus": 1016, "gpn": 8, "nics": 8, "gbps": 400, "k": 64, "o": 1, "rails": True,
     "node_kw": 14.3, "rack_kw": 30, "nodes_per_rack": 2, "pue": 1.2, "sto": "std",
     "pub": {"leaves": 32, "spines": 16, "links_spine_leaf": 1024}, "src": U["sp_net"]},
    {"id": "superpod3", "nm": "DGX SuperPOD B200, 3 scalable units", "gpus": 760, "gpn": 8, "nics": 8, "gbps": 400, "k": 64, "o": 1, "rails": True,
     "node_kw": 14.3, "rack_kw": 30, "nodes_per_rack": 2, "pue": 1.2, "sto": "std",
     "pub": {"leaves": 24, "spines": 16}, "src": U["sp_net"]},
    {"id": "ff2zone", "nm": "Fire-Flyer 2, one zone (800 ports)", "gpus": 6400, "gpn": 8, "nics": 1, "gbps": 200, "k": 40, "o": 1, "rails": False,
     "node_kw": 2.5, "rack_kw": 20, "nodes_per_rack": 0, "pue": 1.2, "sto": "std",
     "pub": {"leaves": 40, "spines": 20}, "src": U["ff2"]},
    {"id": "lab1k", "nm": "A 1,024-GPU lab (128 HGX H100)", "gpus": 1024, "gpn": 8, "nics": 8, "gbps": 400, "k": 64, "o": 1, "rails": True,
     "node_kw": 10.2, "rack_kw": 40, "nodes_per_rack": 0, "pue": 1.3, "sto": "std", "pub": None, "src": None},
    {"id": "big24k", "nm": "24,576 H100 (Llama 3 scale), 64-port switches, 1:7 on top", "gpus": 24576, "gpn": 8, "nics": 8, "gbps": 400, "k": 64, "o": 7, "rails": True,
     "node_kw": 10.2, "rack_kw": 21, "nodes_per_rack": 2, "pue": 1.2, "sto": "std", "pub": None, "src": U["llama3"]},
    {"id": "nvl72", "nm": "16 GB200 NVL72 racks (1,152 GPUs)", "gpus": 1152, "gpn": 72, "nics": 72, "gbps": 400, "k": 64, "o": 1, "rails": False,
     "node_kw": 120, "rack_kw": 120, "nodes_per_rack": 1, "pue": 1.2, "sto": "std", "pub": None, "src": U["gb200"]},
]

# ---------- path model (mirrored in parts/31_js_ca_path.js) ----------
# Each route from rank 0 (node A, GPU 0) to a peer, as the list of hops; bandwidth is the slowest
# hop's per-GPU one-direction rate; latency from the DeepSeek table where it exists.
ROUTES = {
    "node": {"hops": ["GPU 0", "NVSwitch", "GPU 3"], "switches": 0, "nsw": 1, "bw": 450.0, "lat": 3.33},
    "rail": {"hops": ["GPU 0", "PCIe switch", "NIC 0", "leaf (rail 0)", "NIC 0", "PCIe switch", "GPU 0"], "switches": 1, "nsw": 0, "bw": 50.0, "lat": 2.8},
    "xrail": {"hops": ["GPU 0", "PCIe switch", "NIC 0", "leaf (rail 0)", "spine", "leaf (rail 3)", "NIC 3", "PCIe switch", "GPU 3"], "switches": 3, "nsw": 0, "bw": 50.0, "lat": 3.7},
    "pxn": {"hops": ["GPU 0", "NVSwitch", "GPU 3", "PCIe switch", "NIC 3", "leaf (rail 3)", "NIC 3", "PCIe switch", "GPU 3"], "switches": 1, "nsw": 1, "bw": 50.0, "lat": None},
    "pod": {"hops": ["GPU 0", "PCIe switch", "NIC 0", "leaf (rail 0)", "spine", "core", "spine", "leaf (rail 0)", "NIC 0", "PCIe switch", "GPU 0"], "switches": 5, "nsw": 0, "bw": 50.0, "lat": None},
}


# ---------- levels of each design, for the Cluster explorer (per-GPU bandwidth one direction, GB/s) ----------
A100 = "https://www.nvidia.com/en-us/data-center/a100/"
LEVELS = {
 "superpod": {"nm": "DGX SuperPOD B200 (4 scalable units)", "label": "vendor", "lv": [
   {"k": "gpu", "nm": "GPU", "n": 1, "bw": 8000, "via": "HBM3e, 64 TB/s per 8 GPUs = 8 TB/s", "sw": 0, "src": U["dgxb200"], "note": "180 GB per GPU (1,440 GB per DGX B200)"},
   {"k": "node", "nm": "Node (DGX B200)", "n": 8, "bw": 900, "via": "NVLink 5 through NVSwitch (14.4 TB/s aggregate per 8 GPUs, both directions)", "sw": 0, "src": U["dgxb200"], "note": "scale-up domain: tensor and expert parallelism live here"},
   {"k": "rack", "nm": "Rack", "n": 16, "bw": 50, "via": "no rack switch: each GPU's 400 Gb/s NIC goes to its rail's leaf", "sw": 1, "src": U["sp_comp"], "note": "two DGX B200 per rack (28.6 kW)"},
   {"k": "pod", "nm": "Scalable unit (32 nodes)", "n": 256, "bw": 50, "via": "rail leaf: same-rail GPUs one hop apart", "sw": 1, "src": U["sp_net"], "note": "8 leaf switches, one per rail"},
   {"k": "cluster", "nm": "4 scalable units", "n": 1016, "bw": 50, "via": "16 spines, non-blocking (1:1)", "sw": 3, "src": U["sp_net"], "note": "127 nodes: one slot goes to the fabric manager (UFM)"}]},
 "nvl72": {"nm": "GB200 NVL72 racks", "label": "vendor", "lv": [
   {"k": "gpu", "nm": "GPU", "n": 1, "bw": 8000, "via": "HBM3e, 576 TB/s per 72 GPUs = 8 TB/s", "sw": 0, "src": "https://www.nvidia.com/en-us/data-center/gb200-nvl72/", "note": "13.4 TB of HBM3e per rack"},
   {"k": "node", "nm": "Compute tray", "n": 4, "bw": 900, "via": "NVLink 5 (the tray is not its own domain)", "sw": 0, "src": U["gb200"], "note": "2 Grace CPUs, 4 GPUs, 4 x 400G NICs"},
   {"k": "rack", "nm": "Rack (NVL72)", "n": 72, "bw": 900, "via": "NVLink 5 through 9 switch trays", "sw": 0, "src": U["gb200"], "note": "the scale-up domain is the whole rack: about 120 kW, liquid cooled"},
   {"k": "cluster", "nm": "Racks on a fat tree", "n": 1152, "bw": 50, "via": "one 400 Gb/s ConnectX-7 per GPU", "sw": 3, "src": U["gb200"], "note": "16 racks here, the calculator's preset"}]},
 "llama3": {"nm": "Meta Llama 3 cluster (24K H100, RoCE)", "label": "operator", "lv": [
   {"k": "gpu", "nm": "GPU", "n": 1, "bw": 3350, "via": "HBM3, 3.35 TB/s", "sw": 0, "src": U["hopper"], "note": "H100 SXM"},
   {"k": "node", "nm": "Server", "n": 8, "bw": 450, "via": "NVLink 4", "sw": 0, "src": U["llama3"], "note": "8 GPUs, 2 CPUs; tensor parallelism of 8 stays here"},
   {"k": "rack", "nm": "Rack", "n": 16, "bw": 50, "via": "rack switch (RTSW, the leaf), 400 Gb/s RoCE per GPU", "sw": 1, "src": U["llama3"], "note": "two servers per rack"},
   {"k": "pod", "nm": "Pod (AI zone)", "n": 3072, "bw": 50, "via": "cluster switches (CTSW), full bisection", "sw": 3, "src": U["llama3"], "note": "192 racks"},
   {"k": "cluster", "nm": "Cluster", "n": 24576, "bw": 7.14, "via": "aggregation switches (ATSW), 1:7 oversubscribed", "sw": 5, "src": U["llama3"], "note": "8 pods; 50/7 GB/s per GPU if every GPU crosses at once (derived)"}]},
 "ff2": {"nm": "DeepSeek Fire-Flyer 2 (10K PCIe A100)", "label": "authors", "lv": [
   {"k": "gpu", "nm": "GPU", "n": 1, "bw": 1555, "via": "HBM2, 1,555 GB/s (A100 40 GB PCIe)", "sw": 0, "src": A100, "note": ""},
   {"k": "node", "nm": "Node", "n": 8, "bw": 31.5, "via": "PCIe 4.0 x16, about 31.5 GB/s each way (derived)", "sw": 0, "src": U["ff2"], "note": "no NVSwitch; NVLink bridges pair GPUs"},
   {"k": "pod", "nm": "Zone", "n": 4800, "bw": 3.125, "via": "one 200 Gb/s NIC per 8 GPUs, two-layer fat tree", "sw": 3, "src": U["ff2"], "note": "about 600 nodes per 800-port zone"},
   {"k": "cluster", "nm": "Cluster (two zones)", "n": 10000, "bw": None, "via": "\"a limited number of links\" between zones", "sw": None, "src": U["ff2"], "note": "the scheduler allows at most one cross-zone job"}]},
}

def ring_time(n, size_gb, bw):
    """Ring all-reduce bandwidth term: each GPU sends 2(n-1)/n of the data; seconds."""
    return 2 * (n - 1) / n * size_gb / bw

def placements():
    # the same 16-rank all-reduce of 1 GB, packed on 2 nodes of one scalable unit vs one rank on each of
    # 16 nodes spread over 2 pods of a 1:7 cluster. Idealised bandwidth term only.
    o = 7
    packed = ring_time(16, 1.0, 50.0)          # the inter-node hops ride NICs at 50 GB/s (NCCL uses all 8 rails)
    spread_idle = ring_time(16, 1.0, 50.0)     # idle cluster: the core is not the limit
    spread_busy = ring_time(16, 1.0, 50.0 / o)  # every GPU in the pod sends across the core at once
    return {"packed_ms": packed * 1e3, "spread_idle_ms": spread_idle * 1e3, "spread_busy_ms": spread_busy * 1e3,
            "busy_bw": 50.0 / o, "o": o}

def derived():
    d = {}
    d["dgx_gpu_net_GBps"] = 8 * 400 / 8 / 8          # 8 NICs x 400 Gb/s over 8 GPUs, GB/s each way per GPU
    d["ff2_gpu_net_GBps"] = 1 * 200 / 8 / 8          # one 200 Gb/s NIC for 8 GPUs
    d["ff2_ratio"] = d["dgx_gpu_net_GBps"] / d["ff2_gpu_net_GBps"]
    d["dgx_nics_total"] = 8 + 2 * 2                  # 8 single-port compute + 2 dual-port = 12 high-speed ports
    d["dgx_local_nvme_tb"] = 8 * 3.84
    d["nvl72_trays_nics"] = 18 * 4
    d["ff2_power_mw"] = 1250 * 2.5 / 1000
    d["ff2_switches_two_zones"] = 2 * (40 + 20)
    d["fattree_2tier_64"] = 64 * 64 // 2
    d["fattree_3tier_64"] = 64 ** 3 // 4
    d["fattree_2tier_40"] = 40 * 40 // 2
    d["superpod_rack_kw"] = 2 * 14.3
    d["rack_h100_4"] = 4 * 10.2
    d["meta_pod"] = 192 * 16
    d["meta_cluster"] = 8 * 3072
    d["nvlink_vs_nic"] = 450 / 50
    d["ff2_gpus_per_nic"] = 8
    return d

def main():
    meas = load_meas()
    cases = []
    for pr in PRESETS:
        cases.append({"in": {k: v for k, v in pr.items() if k not in ("id", "nm", "pub", "src")}, "out": size(pr)})
    for g in (64, 512, 2048, 4096, 16384, 65536, 100000):
        for o in (1, 3, 7):
            p = dict(PRESETS[3]); p.update(gpus=g, o=o)
            cases.append({"in": {k: v for k, v in p.items() if k not in ("id", "nm", "pub", "src")}, "out": size(p)})
    pres = []
    for pr in PRESETS:
        r = size(pr); row = {k: pr[k] for k in pr}; row["calc"] = r
        if pr["pub"]:
            row["resid"] = {k: (r.get(k) if k != "links_spine_leaf" else r["leaves"] * pr["k"] // 2) - v for k, v in pr["pub"].items()}
        pres.append(row)
    data = {"links": LINK, "nodes": NODES, "scaleup": SCALEUP, "designs": DESIGNS, "tiers": TIERS,
            "meas": meas, "presets": pres, "routes": ROUTES, "place": placements(), "levels": LEVELS, "der": derived(), "urls": U}
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    full = dict(data); full["size_cases"] = cases
    json.dump(full, open(os.path.join(HERE, "out", "expected.json"), "w"), indent=1, sort_keys=True)
    js = "// ---- Data: written by src/recompute.py; do not edit ----\nwindow.CA=" + json.dumps(data, sort_keys=True, separators=(",", ":")) + ";\n"
    open(os.path.join(HERE, "parts", "22_js_ca_data.js"), "w").write(js)
    for pr in pres:
        print(pr["id"], {k: pr["calc"][k] for k in ("nodes", "tiers", "leaves", "spines", "cores", "switches", "racks", "it_mw")}, pr.get("resid"))
    print("place", data["place"]); print("der", data["der"]); print("meas", meas["rtt_bridge_med"], meas["rtt_loop_med"])

if __name__ == "__main__":
    main()
