"""Recompute every derived number the page states, from parts/22_js_rd_data.js (the embedded data). Writes recompute.txt."""
import json, pathlib
s = pathlib.Path("parts/22_js_rd_data.js").read_text(); D = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
out = []
def say(k, v): out.append(f"{k} = {v}")
I, H, V = D["ipi"], D["hvf"], D["virtio"]
say("same-CPU hand-off one way us (median of 3)", I["same_one_way_med"])
say("cross-CPU idle one way us (median of 3)", I["idle_one_way_med"])
say("cross-CPU busy one way us (median of 3)", I["busy_one_way_med"])
say("cross-CPU spin one way us (median of 3)", I["spin_one_way_med"])
say("idle cross-CPU / same-CPU (x)", round(I["idle_one_way_med"] / I["same_one_way_med"], 1))
say("busy cross-CPU / same-CPU (x)", round(I["busy_one_way_med"] / I["same_one_way_med"], 1))
say("idle cross-CPU / spin (x)", round(I["idle_one_way_med"] / I["spin_one_way_med"]))
say("reschedule IPIs per hand-off, idle cross-CPU (cpu1, cpu2)", (I["idle_resched_cpu1"], I["idle_resched_cpu2"]))
say("membarrier no peer us", I["mb0_med"]); say("membarrier 1 peer us", I["mb1_med"]); say("membarrier 3 peers us", I["mb3_med"])
rt1 = I["mb1_med"] - I["mb0_med"]; rt3 = I["mb3_med"] - I["mb0_med"]
say("one IPI round trip (membarrier 1 peer minus no peer) us", round(rt1, 1))
say("three IPIs, per peer us", round(rt3 / 3, 1))
say("three peers vs 3 x one peer (x)", round(rt3 / (3 * rt1), 1))
say("macOS: exit medians us hvc, mmio, wfi", (H["hvc_med"], H["mmio_med"], H["wfi_med"]))
say("macOS: kick median us", H["kick_med"]); say("macOS: native pipe one way us (median of 3 runs)", H["pipe_one_way_med"])
say("macOS: wake an idle thread from pselect, median of 3 run medians us", H["wake_med"])
say("VM idle cross-CPU one way / macOS native pipe one way (x)", round(I["idle_one_way_med"] / H["pipe_one_way_med"], 1))
# exits on one idle wake-up, counted from the source (see page section 5): sender GICD_SGIR write; target WFI (already
# taken before the wake), GICC_IAR read, GICC_EOIR write
exits_wake = 3; ex = H["mmio_med"]
say("exits on the wake path (sender SGIR write, target IAR read, EOIR write)", exits_wake)
say("their bare exit cost us (3 x MMIO exit median)", round(exits_wake * ex, 1))
say("plus one kick us", round(exits_wake * ex + H["kick_med"], 1))
say("remainder of the idle one-way wake not explained by exits and kick us", round(I["idle_one_way_med"] - exits_wake * ex - H["kick_med"], 1))
say("remainder of the busy one-way wake not explained by exits and kick us", round(I["busy_one_way_med"] - exits_wake * ex - H["kick_med"], 1))
# two-dimensional page walk: guest levels g, host levels h: g*(h+1) + h = (g+1)(h+1) - 1
for g, h, note in [(4, 4, "4 KiB pages both stages"), (4, 3, "host 2 MiB pages"), (4, 2, "host 1 GiB pages"), (3, 3, "2 MiB pages both stages"), (5, 5, "five-level both")]:
    say(f"2D walk memory references, guest {g} levels, host {h} levels ({note})", (g + 1) * (h + 1) - 1)
# the ioctl libcuda sent: _IOC(dir, type, nr, size) on Linux: nr bits 0-7, type 8-15, size 16-29, dir 30-31
req = 0xC020462A
say("ioctl 0xc020462a: dir, size, type, nr", ((req >> 30) & 3, (req >> 16) & 0x3FFF, chr((req >> 8) & 0xFF), hex(req & 0xFF)))
say("NVOS54_PARAMETERS size (4 handles/words + 8-byte pointer + 2 words)", 4 + 4 + 4 + 4 + 8 + 4 + 4)
say("NV_ESC_CHECK_VERSION_STR number (NV_IOCTL_BASE 200 + 10)", 210)
dev = 0xC3FF; say("mknodat dev 0xc3ff: major, minor", (dev >> 8, dev & 0xFF))
q1, q32 = V["qd1"], V["qd32"]
say("virtio QD1 interrupts per request", q1["irq_per_req"]); say("virtio QD32 interrupts per request", q32["irq_per_req"])
say("virtio QD32 completions per interrupt", round(q32["reads"] / q32["irqs"], 1))
say("virtio QD1 us per request from IOPS (1e6/iops)", round(1e6 / q1["iops"], 1))
say("virtio QD32 Little's law latency us (32/iops)", round(32 / q32["iops"] * 1e6, 1))
say("virtio QD32 / QD1 IOPS (x)", round(q32["iops"] / q1["iops"], 1))
feat = D["vmid"]["virtio"].splitlines()
for l in feat:
    name, bits = l.split()[0], l.split()[-1]
    say(f"{name} feature bits 28 INDIRECT_DESC, 29 EVENT_IDX, 32 VERSION_1", (bits[28], bits[29], bits[32]))
# compare with the derived numbers gen_data.py embedded
mine = {"idle_x_same": round(I["idle_one_way_med"] / I["same_one_way_med"], 1), "ipi_rt": round(rt1, 1), "ipi3_per": round(rt3 / 3, 1),
  "ipi3_x": round(rt3 / (3 * rt1), 1), "vm_x_mac": round(I["idle_one_way_med"] / H["pipe_one_way_med"], 1),
  "exit3": round(exits_wake * ex, 1), "exit3_kick": round(exits_wake * ex + H["kick_med"], 1),
  "walk44": 24, "walk43": 19, "walk42": 14, "walk33": 15, "walk55": 35,
  "vq32_per_irq": round(q32["reads"] / q32["irqs"], 1), "vq32_little": round(32 / q32["iops"] * 1e6, 1)}
bad = [k for k in mine if D["der"][k] != mine[k]]
say("embedded derived numbers that disagree with this recomputation", bad or "none")
assert not bad, bad
pathlib.Path("recompute.txt").write_text("\n".join(out) + "\n"); print("\n".join(out))
