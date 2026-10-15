"""TPU generations from the programmer's side: published specs, the pinned JAX source's own table, derived numbers.

Writes out/specs.json. Three kinds of number, kept apart:
  pub  : Google Cloud TPU documentation pages (docs.cloud.google.com/tpu/docs/<gen>, all "Last updated 2026-10-13 UTC",
         read 2026-10-15) and the scaling book (jax-ml.github.io/scaling-book/tpus/, published 2025-02-04, read 2026-10-15).
  src  : jax/_src/tpu_info.py at jax-v0.11.2 (the table Pallas uses for VMEM, MXU and lane sizes), read by running it.
  der  : arithmetic on the above, formula given.
Also the free-access facts (TRC, Colab, Kaggle) with what could and could not be confirmed.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # -I drops the script folder
import tp_common as T
from jax._src import tpu_info as TI   # runs on CPU: a plain table, no TPU needed

CLOUD = "https://docs.cloud.google.com/tpu/docs/"
SB = "https://jax-ml.github.io/scaling-book/tpus/"

# ---- published, per chip (Cloud docs, last updated 2026-10-13, read 2026-10-15) ------------------------------
# bf16 TFLOP/s, HBM bytes, HBM bytes/s, ICI bidirectional bytes/s per chip (None: not on the page), pod chips, topology
PUB = {
 "v4":  dict(name="TPU v4", year="2020 (Cloud GA 2022)", bf16=275e12, hbm=32 * 2**30, hbm_txt="32 GiB", bw=1200e9, bw_txt="1,200 GBps",
             ici=None, ici_txt="not listed (\"six interconnect links per chip\")", pod=4096, topo="3D (page says \"3D mesh\"; optical circuit switches give the wraparound)",
             tc=2, mxu_per_tc=4, url=CLOUD + "v4"),
 "v5e": dict(name="TPU v5e", year="2023", bf16=197e12, hbm=16e9, hbm_txt="16 GB", bw=819e9, bw_txt="800 GiBps (see note)",
             ici=400e9, ici_txt="400 GBps", pod=256, topo="2D torus", tc=1, mxu_per_tc=4, url=CLOUD + "v5e"),
 "v5p": dict(name="TPU v5p", year="Dec 2023", bf16=459e12, hbm=95 * 2**30, hbm_txt="95 GiB", bw=2765e9, bw_txt="2,765 GBps",
             ici=1200e9, ici_txt="1,200 GBps", pod=8960, topo="3D torus", tc=2, mxu_per_tc=4, url=CLOUD + "v5p"),
 "v6e": dict(name="TPU v6e (Trillium)", year="2024", bf16=918e12, hbm=32e9, hbm_txt="32 GB", bw=1638e9, bw_txt="1,638 GBps",
             ici=800e9, ici_txt="800 GBps", pod=256, topo="2D torus", tc=1, mxu_per_tc=2, url=CLOUD + "v6e"),
 "7x":  dict(name="TPU7x (Ironwood)", year="2025", bf16=2307e12, hbm=192 * 2**30, hbm_txt="192 GiB", bw=7380e9, bw_txt="7,380 GBps",
             ici=1200e9, ici_txt="1,200 GBps", pod=9216, topo="3D torus", tc=2, mxu_per_tc=None, url=CLOUD + "tpu7x"),
}
# scaling book table (2025-02-04): HBM bytes/s, bf16 FLOP/s, ICI per link one-way and bidirectional, links per chip from the text
SBT = {"v4": (1.2e12, 2.75e14, 4.5e10, 9.0e10, 6), "v5e": (8.2e11, 1.97e14, 4.5e10, 9.0e10, 4),
       "v5p": (2.8e12, 4.59e14, 9.0e10, 1.8e11, 6), "v6e": (1.6e12, 9.20e14, 9.0e10, 1.8e11, 4),
       "7x": (7.4e12, 2.30e15, 9.0e10, 1.8e11, 6)}
CV = {"v4": TI.ChipVersion.TPU_V4, "v5e": TI.ChipVersion.TPU_V5E, "v5p": TI.ChipVersion.TPU_V5P,
      "v6e": TI.ChipVersion.TPU_V6E, "7x": TI.ChipVersion.TPU_7X}
CASE = {"v4": r"case ChipVersion\.TPU_V4:", "v5e": r"case ChipVersion\.TPU_V5E:", "v5p": r"case ChipVersion\.TPU_V5P:",
        "v6e": r"case ChipVersion\.TPU_V6E:", "7x": r"case ChipVersion\.TPU_7 \| ChipVersion\.TPU_7X:"}

gens = []
for g, p in PUB.items():
    cv = CV[g]
    phys = cv.num_physical_tensor_cores_per_chip
    info = TI._get_tpu_info_impl(cv, 1)          # per TensorCore
    flops_cycle_chip = phys * info.num_mxus * info.mxu_column_size ** 2 * 2
    sb = SBT[g]
    row = dict(gen=g, **{k: v for k, v in p.items()},
        ridge=round(p["bf16"] / p["bw"], 1),                                   # der: FLOP per HBM byte
        hbm_gb=round(p["hbm"] / 1e9, 1),
        src=dict(file="jax/_src/tpu_info.py", line=T.src_line("jax/_src/tpu_info.py", CASE[g]),
                 tc_per_chip=phys, megacore=cv.supports_megacore, mxus_per_tc=info.num_mxus, mxu=info.mxu_column_size,
                 lanes=info.num_lanes, sublanes=info.num_sublanes, vmem_mib=info.vmem_capacity_bytes / 2**20,
                 smem_kib=info.smem_capacity_bytes / 1024,
                 hbm_bytes_chip=info.hbm_capacity_bytes * phys,
                 bw_chip=info.mem_bw_bytes_per_second * phys,
                 bf16_chip=info.bf16_ops_per_second * phys),
        sb=dict(bw=sb[0], bf16=sb[1], link_oneway=sb[2], link_bidi=sb[3], links=sb[4]),
        flops_per_cycle=flops_cycle_chip,                                       # der: TCs x MXUs x side^2 x 2
        clock_needed_ghz=round(p["bf16"] / flops_cycle_chip / 1e9, 2),          # der: peak / FLOPs per cycle
        ici_from_links=sb[3] * sb[4],                                           # der: links x per-link bidirectional
        vmem_chip_mib=info.vmem_capacity_bytes / 2**20 * phys,
        weights_7b_fit=round(p["hbm"] / (7e9 * 2), 2),                          # der: HBM / 14 GB of bf16 weights
    )
    gens.append(row)

# disagreements found while reading (each with both sides)
notes = [
 dict(k="v5e_bw", t="Cloud's v5e page (2026-10-13) gives HBM bandwidth as \"800 GiBps\", which read literally is 859 GB/s; the scaling book and jax/_src/tpu_info.py give 8.2e11 B/s (819 GB/s). This page keeps 819 GB/s, as the Reading tab and the Hardware topic do; with 859 GB/s the ridge point would be 229 instead of 241.",
      v=round(800 * 2**30 / 1e9), ridge_alt=round(197e12 / (800 * 2**30))),
 dict(k="v5p_bw", t="v5p HBM bandwidth: Cloud docs 2,765 GBps; jax/_src/tpu_info.py 2.46e12 B/s (it splits 2.46e12 across the 2 TensorCores); the scaling book 2.8e12. The roofline here uses Cloud's figure; with tpu_info's the ridge point would be 187 instead of 166.",
      ridge_alt=round(459e12 / 2.46e12)),
 dict(k="v5p_hbm", t="v5p HBM: Cloud 95 GiB (102 GB); tpu_info 103,000,000,000 bytes; scaling book 96GB. Same memory, different rounding and units."),
 dict(k="clock", t="Peak = TensorCores x MXUs x side^2 x 2 FLOPs x clock reproduces v4 (275 TF at 1,050 MHz) and v5e (197 TF at 1.5 GHz). For v6e (1 TensorCore x 2 MXUs of 256 x 256, Cloud and tpu_info agree) it needs a 3.5 GHz clock, and for 7x (2 x 2 x 256 x 256, tpu_info) 4.4 GHz, far above any published TPU clock. Either the per-MXU rate is not side^2 MACs per cycle on these chips or a count is wrong; Google publishes neither clock. Unconfirmed; the Hardware topic's TPU page shows the same gap for v6e."),
 dict(k="7x_cores", t="TPU7x has 2 TensorCores per chip (one per chiplet) and no megacore (tpu_info.py: supports_megacore is True only for v4 and v5p), so each TensorCore is a separate JAX device: a 4-chip host shows 8 devices. On v4 and v5p the two cores are fused into one device by default."),
 dict(k="ici", t="Per-chip ICI: Cloud gives 400 (v5e), 800 (v6e), 1,200 (v5p, 7x) GBps bidirectional. The scaling book's per-link figures times the link count give 360, 720, 1,080 and 1,080 GB/s: the same order, about 10% lower each time. Use per-link numbers for a single ring, per-chip numbers only when every link is busy."),
]

# free access (rd-todo-free), each claim with its source and status
free = [
 dict(k="trc", status="confirmed", t="TPU Research Cloud: accepted researchers get Cloud TPUs \"at no charge\" from \"a cluster of more than 1,000 Cloud TPU devices\"; in return they share their research (papers, open code, blog posts) and give Google feedback. Quota is granted \"on a temporary basis\"; other Google Cloud services (the VM, storage) are not free. Neither page names TPU generations or a duration.",
      src=["https://sites.research.google/trc/about/", "https://sites.research.google/trc/faq/"], read="2026-10-15"),
 dict(k="colab", status="confirmed (what Colab says)", t="Colab's FAQ: \"The types of GPUs and TPUs that are available in Colab vary over time\"; \"Colab does not publish these limits\"; free notebooks \"can run for at most 12 hours\"; \"Colab resources are not guaranteed and not unlimited\". So the TPU type and quota on Colab are not published; check the runtime menu on the day.",
      src=["https://research.google.com/colaboratory/faq.html"], read="2026-10-15"),
 dict(k="kaggle", status="unconfirmed", t="Kaggle's TPU documentation page renders only in a browser and could not be read. Third-party guides say 20 hours a week and 9-hour sessions; they disagree on the chip (TPU v3-8 in older guides, TPU v5e-8 in a 2025 article). Kaggle shows your remaining quota in account settings. The old page's \"20 h/month\" matches no source.",
      src=["https://www.kaggle.com/docs/tpu"], read="2026-10-15"),
]

T.save("specs.json", dict(gens=gens, notes=notes, free=free,
       sources=dict(cloud=CLOUD, cloud_updated="2026-10-13", scaling_book=SB, scaling_book_date="2025-02-04", read="2026-10-15",
                    vmem_quote="VMEM ... much smaller than HBM (for example, 128 MiB on TPU v5e) ... VMEM bandwidth is around 22x higher than HBM bandwidth which means an MXU operation reading from/writing to VMEM requires an arithmetic intensity of only 10-20",
                    mxu_quote="Weight matrices need to be padded to at least size 128 (256 on TPU v6e) in both dimensions to fill up the MXU.",
                    vpu_quote="The VPU is a 2D vector arithmetic unit of shape (8, 128)")))
for r in gens:
    print(r["gen"], "ridge", r["ridge"], "clock", r["clock_needed_ghz"], "vmem/core", r["src"]["vmem_mib"], "mxu", r["src"]["mxus_per_tc"], r["src"]["mxu"], "ici_links", r["ici_from_links"] / 1e9)
