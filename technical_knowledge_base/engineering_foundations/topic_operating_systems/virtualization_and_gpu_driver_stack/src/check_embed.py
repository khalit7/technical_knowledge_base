"""After sh build.sh: confirm the page embeds exactly the data gen_data.py derives from raw/, that every number marked
data-k in the prose matches that data at its displayed precision, that the hand-written numbers listed below agree with
the data, and that no private path or token is in the page or src/."""
import json, re, pathlib, subprocess, sys
here = pathlib.Path(__file__).parent
page = (here.parent / "index.html").read_text()
data_js = (here / "parts/22_js_rd_data.js").read_text()
bad = []
# 1. the page embeds the generated data unchanged, and regenerating it from raw/ gives the same file
if data_js.strip() not in page: bad.append("page does not embed parts/22_js_rd_data.js")
before = data_js
subprocess.run([sys.executable, "gen_data.py"], cwd=here, check=True, capture_output=True)
if (here / "parts/22_js_rd_data.js").read_text() != before: bad.append("22_js_rd_data.js is stale against raw/")
D = json.loads(data_js[data_js.index("=") + 1:].rstrip().rstrip(";"))
def get(k):
    v = D
    for part in k.split("."):
        v = v[int(part)] if isinstance(v, list) else v[part]
    return v
# 2. every data-k number
n = 0
for k, shown in re.findall(r'data-k="([a-z0-9_.]+)">([0-9.,]+)<', page):
    n += 1; v = float(get(k)); s = shown.replace(",", "")
    dec = len(s.split(".")[1]) if "." in s else 0
    tol = 0.5 * 10 ** -dec + 1e-9
    if s.startswith("0.0"):  # two significant figures
        tol = 0.5 * 10 ** -(dec) + 1e-9
    if abs(float(s) - v) > tol: bad.append(f"{k}: page shows {shown}, data {v}")
# 3. hand-written numbers in prose and scripts
I, H = D["ipi"], D["hvf"]
checks = [
  ("about 0.9 µs per exit", 0.8 <= H["mmio_med"] <= 1.0),
  ("about 1.1 µs kick", round(H["kick_med"], 1) == 1.1),
  ("about 29 µs idle host thread", round(H["wake_med"]) == 29),
  ("drill: busy 15.4 vs idle 25.3", f"{I['busy_one_way_med']:.1f}" == "15.4" and f"{I['idle_one_way_med']:.1f}" == "25.3"),
  ("eight attempts to open /dev/nvidiactl", D["cuda_dev"].count("openat(-100, \"/dev/nvidiactl\"") == 8),
  ("0.112 interrupts per request at QD32 (virtqueue caption)", D["virtio"]["qd32"]["irq_per_req"] == 0.112),
  ("1 interrupt per request at QD1", D["virtio"]["qd1"]["irq_per_req"] == 1.0),
  ("runtime and compat driver report 13040", "runtime version 13040" in json.dumps(D["cuda"]) and "driver version 13040" in json.dumps(D["cuda"])),
  ("ioctl 0xc020462a recorded", "0xc020462a" in D["cuda_dev"]),
  ("mknodat dev 0xc3ff recorded", "0xc3ff" in json.dumps(D["cuda"])),
  ("five directories searched for libcuda.so.1", sum(1 for l in json.dumps(D["cuda"]).split("\\n") if "trying file=" in l and "libcuda.so.1" in l) == 5),
  ("GIC-0 in /proc/interrupts", D["vmid"]["gic"] == "GIC-0"),
  ("5 vCPUs", D["vmid"]["cpus"] == 5),
  ("steal 0 on every CPU", set(D["vmid"]["steal"]) == {0}),
]
for label, ok in checks:
    if not ok: bad.append("prose number disagrees: " + label)
# 4. privacy
for p in [here.parent / "index.html", *[q for q in here.rglob("*") if q.is_file()], here.parent / "README.md"]:
    try: t = p.read_text()
    except Exception: continue
    for w in ["/" + "Users/", "gl" + "pat", "sk-" + "ant", "vpnkit.connect=" + "tcp", "192." + "168."]:
        if w in t: bad.append(f"private string {w!r} in {p.relative_to(here.parent)}")
print(f"data-k numbers checked: {n}; prose checks: {len(checks)}")
print("\n".join(bad) if bad else "all checks passed")
sys.exit(1 if bad else 0)
