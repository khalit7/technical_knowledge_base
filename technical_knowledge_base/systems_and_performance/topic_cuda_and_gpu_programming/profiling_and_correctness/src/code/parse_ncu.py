"""Parse the text that `ncu --import <rep> --page details --print-details all` printed
(out/ncu/*.details.txt) and the session pages into out/ncu_reports.json.

Nothing is computed here: every value is copied as printed by Nsight Compute 2026.3.1
reading NVIDIA's own sample reports (extras/samples, profiled by NVIDIA on an RTX A4500).
Usage: python3 code/parse_ncu.py   (from src/)
"""
import json, re, os, csv

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
NCU = os.path.join(SRC, "out", "ncu")

REPORTS = [
    # (file stem, sample folder, short label, role in the pair)
    ("addConstDouble3", "uncoalescedGlobalAccesses", "double3 per thread (strided loads)", "before"),
    ("addConstDouble", "uncoalescedGlobalAccesses", "one double per thread", "after"),
    ("transposeCoalesced", "sharedBankConflicts", "tile[32][32] (bank conflicts)", "before"),
    ("transposeNoBankConflicts", "sharedBankConflicts", "tile[32][33] (padded)", "after"),
    ("sobelDouble", "instructionMix", "Sobel in double", "before"),
    ("sobelFloat", "instructionMix", "Sobel in float", "after"),
]
SKIP_SECTIONS = {"PM Sampling", "NVLink Topology", "NUMA Affinity", "GPU Speed Of Light Roofline Chart",
                 "Memory Workload Analysis Chart"}


def cols_from_dash(line):
    """Column spans from a separator line like '    ----- ---- -----'."""
    spans = []
    for m in re.finditer(r"-+", line):
        spans.append((m.start(), m.end()))
    return spans


def parse_details(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    head = None
    sections = []
    cur = None
    i = 0
    table_title = None
    while i < len(lines):
        ln = lines[i]
        if head is None and re.match(r"^  \S", ln):
            head = ln.strip()
        m = re.match(r"^    Section: (.+)$", ln)
        if m:
            cur = {"name": m.group(1).strip(), "tables": [], "rules": []}
            sections.append(cur)
            table_title = None
            i += 1
            continue
        if cur is None:
            i += 1
            continue
        m = re.match(r"^    Table Name : (.+)$", ln)
        if m:
            table_title = m.group(1).strip()
            i += 1
            continue
        # a table: dash line, header, dash line, rows..., dash line
        if re.match(r"^    -+( -+)+\s*$", ln) and i + 2 < len(lines) and re.match(r"^    -+", lines[i + 2]):
            spans = cols_from_dash(ln)
            header = [lines[i + 1][a:b + 1].strip() if k < len(spans) - 1 else lines[i + 1][a:].strip()
                      for k, (a, b) in enumerate(spans)]
            rows = []
            j = i + 3
            while j < len(lines) and not re.match(r"^    -+", lines[j]) and lines[j].strip():
                r = lines[j]
                cells = []
                for k, (a, b) in enumerate(spans):
                    cells.append((r[a:spans[k + 1][0]] if k < len(spans) - 1 else r[a:]).strip())
                rows.append(cells)
                j += 1
            cur["tables"].append({"title": table_title, "header": header, "rows": rows})
            table_title = None
            i = j + 1
            continue
        m = re.match(r"^    (OPT|INF|WRN|ERR)\s+(.*)$", ln)
        if m:
            kind, text = m.group(1), [m.group(2).strip()]
            j = i + 1
            while j < len(lines) and re.match(r"^          \S", lines[j]):
                text.append(lines[j].strip())
                j += 1
            t = " ".join(text)
            t = re.sub(r"\s+", " ", t)
            sp = re.match(r"^(Est\. (?:Local )?Speedup: [\d.]+%)\s*(.*)$", t)
            cur["rules"].append({"kind": kind, "speedup": sp.group(1) if sp else None,
                                 "text": sp.group(2) if sp else t})
            i = j
            continue
        i += 1
    return head, sections


def parse_session(path):
    out = {}
    for ln in open(path, encoding="utf-8"):
        for key in ("Created", "CUDA Version", "Display Driver Version", "Nsight Compute Target",
                    "display_name", "multiprocessor_count", "compute_capability_major",
                    "compute_capability_minor"):
            if ln.startswith(key + " "):
                out[key] = ln[len(key):].strip()
        if ln.startswith("Profiler Command Line"):
            out["command"] = ln[len("Profiler Command Line"):].strip()
    return out


def raw_metrics(path, names):
    rows = list(csv.reader(open(path, encoding="utf-8")))
    hdr, units, vals = rows[0], rows[1], rows[2]
    got = {}
    for n in names:
        if n in hdr:
            k = hdr.index(n)
            got[n] = [vals[k], units[k]]
    return got


RAW = [
    "gpu__time_duration.sum", "sm__throughput.avg.pct_of_peak_sustained_elapsed",
    "gpu__compute_memory_throughput.avg.pct_of_peak_sustained_elapsed",
    "dram__throughput.avg.pct_of_peak_sustained_elapsed", "dram__bytes_read.sum", "dram__bytes_write.sum",
    "sm__warps_active.avg.pct_of_peak_sustained_active",
    "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum", "l1tex__t_requests_pipe_lsu_mem_global_op_ld.sum",
    "l1tex__t_sectors_pipe_lsu_mem_global_op_st.sum", "l1tex__t_requests_pipe_lsu_mem_global_op_st.sum",
    "l1tex__data_bank_conflicts_pipe_lsu_mem_shared_op_ld.sum",
    "l1tex__data_bank_conflicts_pipe_lsu_mem_shared_op_st.sum",
    "l1tex__data_pipe_lsu_wavefronts_mem_shared_op_ld.sum", "l1tex__data_pipe_lsu_wavefronts_mem_shared_op_st.sum",
    "smsp__thread_inst_executed_per_inst_executed.ratio", "sm__pipe_fp64_cycles_active.avg.pct_of_peak_sustained_active",
    "smsp__inst_executed.sum", "gpc__cycles_elapsed.max", "sm__cycles_active.avg",
    "launch__registers_per_thread", "launch__grid_size", "launch__block_size",
    "smsp__sass_thread_inst_executed_op_dfma_pred_on.sum", "smsp__sass_thread_inst_executed_op_ffma_pred_on.sum",
    "smsp__cycles_active.avg", "device__attribute_display_name", "sm__cycles_elapsed.avg.per_second",
    "dram__cycles_elapsed.avg.per_second", "gpc__cycles_elapsed.avg.per_second",
    "device__attribute_max_gpu_frequency_khz", "device__attribute_multiprocessor_count",
    "device__attribute_l2_cache_size", "profiler__replayer_passes", "profiler__replayer_bytes_mem_backed_up.avg",
    "launch__waves_per_multiprocessor", "sm__maximum_warps_per_active_cycle_pct",
    "l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum", "lts__t_sectors_srcunit_tex_op_read.sum",
    "smsp__sass_inst_executed_op_shared_ld.sum", "dram__bytes.sum",
]


def main():
    out = {"tool": open(os.path.join(NCU, "ncu_version.txt")).read().strip().split("\n")[-1],
           "reports": []}
    for stem, folder, label, role in REPORTS:
        head, secs = parse_details(os.path.join(NCU, stem + ".details.txt"))
        secs = [s for s in secs if s["name"] not in SKIP_SECTIONS]
        # keep tables short: Memory Workload Analysis Tables carries long per-unit tables
        for s in secs:
            for t in s["tables"]:
                if len(t["rows"]) > 40:
                    t["rows"] = t["rows"][:40]
                    t["cut"] = True
        out["reports"].append({
            "stem": stem, "sample": folder, "label": label, "role": role, "kernel": head,
            "session": parse_session(os.path.join(NCU, stem + ".session.txt")),
            "raw": raw_metrics(os.path.join(NCU, stem + ".raw.csv"), RAW),
            "sections": secs,
        })
    p = os.path.join(SRC, "out", "ncu_reports.json")
    json.dump(out, open(p, "w"), indent=1)
    print("out/ncu_reports.json", os.path.getsize(p), "bytes")
    for r in out["reports"]:
        print(r["stem"], r["kernel"][:70], len(r["sections"]), "sections,",
              sum(len(s["rules"]) for s in r["sections"]), "rules,", len(r["raw"]), "raw")


if __name__ == "__main__":
    main()
