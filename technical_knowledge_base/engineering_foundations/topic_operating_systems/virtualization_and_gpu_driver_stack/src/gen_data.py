"""Turn raw/ into parts/22_js_rd_data.js (window.VD): the only measured data the page embeds."""
import json, re, statistics as st, pathlib
R = pathlib.Path("raw")
def secs(text):
    out, cur, name = {}, [], None
    for line in text.splitlines():
        if line.startswith("### "):
            if name is not None: out[name] = "\n".join(cur).strip("\n")
            name, cur = line[4:].strip(), []
        else: cur.append(line)
    if name is not None: out[name] = "\n".join(cur).strip("\n")
    return out
def find(d, start):
    ks = [k for k in d if k.startswith(start)]
    assert len(ks) == 1, (start, ks); return d[ks[0]]
med = lambda xs: round(st.median(xs), 3)
D = {}
# ---- IPIs and wake-ups inside the VM
ipi = secs((R / "ipi.txt").read_text())
def vals(sec, key):
    return [float(m) for m in re.findall(key + r" ([0-9.]+)", sec)]
def ipis(sec, kind, cpu):
    return [float(m) for m in re.findall(kind + r"[^\n]*cpu%d=([0-9.]+)" % cpu, sec)]
s_same, s_idle, s_busy = find(ipi, "same CPU"), find(ipi, "cross-CPU: pipe ping-pong, CPUs 1 and 2 idle"), find(ipi, "cross-CPU: pipe ping-pong, a nice 19")
s_spin = find(ipi, "cross-CPU: no sleeping")
m0, m1, m3 = find(ipi, "membarrier from CPU 1, no other"), find(ipi, "membarrier from CPU 1, one thread"), find(ipi, "membarrier from CPU 1, threads")
D["ipi"] = {
  "same_one_way": vals(s_same, "one_way_us"), "idle_one_way": vals(s_idle, "one_way_us"),
  "busy_one_way": vals(s_busy, "one_way_us"), "spin_one_way": vals(s_spin, "one_way_us"),
  "mb0": vals(m0, "us_per_call"), "mb1": vals(m1, "us_per_call"), "mb3": vals(m3, "us_per_call"),
  "idle_resched_cpu1": ipis(s_idle, "IPI0 reschedule", 1), "idle_resched_cpu2": ipis(s_idle, "IPI0 reschedule", 2),
  "same_resched_cpu1": ipis(s_same, "IPI0 reschedule", 1), "spin_resched_cpu2": ipis(s_spin, "IPI0 reschedule", 2),
  "mb1_call_cpu2": ipis(m1, "IPI1 function-call", 2), "mb3_call_cpu4": ipis(m3, "IPI1 function-call", 4),
}
for k in ["same_one_way", "idle_one_way", "busy_one_way", "spin_one_way", "mb0", "mb1", "mb3"]:
    D["ipi"][k + "_med"] = med(D["ipi"][k])
# ---- the macOS contrast
hv = (R / "hvf_macos.txt").read_text()
def hvf(name):
    return [float(x) for x in re.findall(re.escape(name) + r"[^\n]*median_us ([0-9.]+)", hv)]
D["hvf"] = {"hvc": hvf("exit hvc"), "mmio": hvf("exit str x1"), "wfi": hvf("exit wfi"), "kick": hvf("kick ("),
  "pipe_one_way": [float(x) for x in re.findall(r"native pipe[^\n]*one_way_us ([0-9.]+)", hv)],
  "wake": hvf("wake an idle thread"), "wake_p10": [float(x) for x in re.findall(r"wake an idle[^\n]*p10_us ([0-9.]+)", hv)],
  "wake_p90": [float(x) for x in re.findall(r"wake an idle[^\n]*p90_us ([0-9.]+)", hv)],
  "header": hv.splitlines()[0][4:]}
for k in ["hvc", "mmio", "wfi", "kick", "pipe_one_way", "wake", "wake_p10", "wake_p90"]:
    D["hvf"][k + "_med"] = med(D["hvf"][k])
# ---- virtio-blk
vt = secs((R / "virtio.txt").read_text())
D["virtio"] = {}
for qd in (1, 32):
    s = find(vt, "4 KiB random O_DIRECT reads, queue depth %d," % qd)
    D["virtio"]["qd%d" % qd] = {"iops": float(re.search(r"iops ([0-9.]+)", s).group(1)),
        "clat_us": float(re.search(r"latency ([0-9.]+)", s).group(1)),
        "reads": int(re.search(r"completed (\d+)", s).group(1)), "irqs": int(re.search(r"interrupts (\d+)", s).group(1)),
        "irq_per_req": float(re.search(r"per request ([0-9.]+)", s).group(1))}
# ---- the guest's view of its VM
vm = secs((R / "vmid.txt").read_text())
intr = find(vm, "/proc/interrupts")
D["vmid"] = {"kernel": find(vm, "kernel and command line").splitlines()[0],
  "cmdline": find(vm, "kernel and command line").splitlines()[1],
  "cpus": int(find(vm, "CPU (first").splitlines()[-1]),
  "pci": find(vm, "PCI devices"), "virtio": find(vm, "virtio devices"),
  "interrupts": "\n".join(l for l in intr.splitlines() if re.search(r"CPU0|arch_timer|virtio|IPI[01]:", l)),
  "clocksource": find(vm, "clock sources").split()[-1], "cpuidle": find(vm, "cpuidle"),
  "kvm": find(vm, "hypervisor hints").splitlines()[0], "iommu": find(vm, "iommu"),
  "steal": [int(l.split()[8]) for l in find(vm, "steal time").splitlines() if l.startswith("cpu")],
  "config": find(vm, "kernel config")}
D["vmid"]["gic"] = "GIC-0" if "GIC-0" in intr else "?"
hq = secs((R / "host_qemu.txt").read_text())
D["host"] = {"title": [k for k in hq if k.startswith("Docker Desktop")][0], "args": find(hq, "the VM process"),
  "version": find(hq, "version"), "threads": int(find(hq, "host threads").strip())}
# ---- CUDA without a GPU
cu = secs((R / "cuda.txt").read_text())
D["cuda"] = {k: cu[k] for k in cu}
D["cuda_dev"] = (R / "cuda_dev.txt").read_text().strip()
# ---- derived numbers the prose states (recompute.py recomputes each one independently and compares)
I, H, Vt = D["ipi"], D["hvf"], D["virtio"]
rt1 = I["mb1_med"] - I["mb0_med"]; rt3 = I["mb3_med"] - I["mb0_med"]
D["der"] = {"idle_x_same": round(I["idle_one_way_med"] / I["same_one_way_med"], 1),
  "busy_x_same": round(I["busy_one_way_med"] / I["same_one_way_med"], 1),
  "idle_x_spin": round(I["idle_one_way_med"] / I["spin_one_way_med"]),
  "ipi_rt": round(rt1, 1), "ipi3_per": round(rt3 / 3, 1), "ipi3_x": round(rt3 / (3 * rt1), 1),
  "vm_x_mac": round(I["idle_one_way_med"] / H["pipe_one_way_med"], 1),
  "exit3": round(3 * H["mmio_med"], 1), "exit3_kick": round(3 * H["mmio_med"] + H["kick_med"], 1),
  "busy_rem": round(I["busy_one_way_med"] - 3 * H["mmio_med"] - H["kick_med"], 1),
  "walk44": 24, "walk43": 19, "walk42": 14, "walk33": 15, "walk55": 35,
  "vq32_per_irq": round(Vt["qd32"]["reads"] / Vt["qd32"]["irqs"], 1), "vq1_us": round(1e6 / Vt["qd1"]["iops"], 1),
  "vq32_little": round(32 / Vt["qd32"]["iops"] * 1e6, 1), "vq_x": round(Vt["qd32"]["iops"] / Vt["qd1"]["iops"], 1)}
js = "// generated by src/gen_data.py from src/raw/; do not edit\nwindow.VD=" + json.dumps(D, separators=(",", ":")) + ";\n"
pathlib.Path("parts/22_js_rd_data.js").write_text(js)
print("wrote parts/22_js_rd_data.js", len(js), "bytes")
