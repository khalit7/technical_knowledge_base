"""Check that ../index.html embeds exactly the recorded data and that numbers written in the prose match it.

    python3 -I check_data.py        (standard library only)
1. window.LD in the page equals what make_data.py builds from out/ and inputs/ (re-derived here for the key fields).
2. Every number typed into the HTML prose that comes from a count or a run is recomputed from the data and must
   appear in the page text exactly as written.
3. Every GitHub link with a line anchor (#L<n>) points at the line recorded in inputs/source_lines.json.
Prints each check; exits 1 on any failure.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.LD=(\{.*?\});\n", html, re.S)
LD = json.loads(m.group(1))
O = lambda f: json.load(open(os.path.join(HERE, "out", f)))
bad = []


def ok(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        bad.append(what)


# ---------------------------------------------------------------- 1. embedded data equals recorded data
arch = {m["key"]: m for m in O("arch.json")["models"]}
for x in LD["arch"]:
    ok(x["params"] == arch[x["key"]]["params"] and x["cats"] == arch[x["key"]]["cats"], f"arch {x['key']} params and categories")
fl = O("flops.json")["models"]
for k, v in LD["flops"].items():
    ok([g[2] for g in v["grid"]] == [q["flops"] for q in fl[k]["grid"]] and v["fit"] == fl[k]["fit"], f"flops grid and fit {k}")
ex = O("extras.json")
ok(LD["stages"]["sd15"]["flops"] == ex["sd15_stages_512"]["flops"], "SD 1.5 stage FLOPs")
ok(LD["dit_count"] == ex["dit_table"], "DiT counts")
te = O("text_enc.json")
ok(LD["te"]["warning"] == te["truncation_warning"] and LD["te"]["sot_cos_g01_g06"] == te["sot_cos_g01_g06"], "text encoder outputs")
if os.path.exists(os.path.join(HERE, "out", "sd_ld.json")):
    sd = O("sd_ld.json")
    ok(LD["sd"]["prof"] == sd.get("prof") and LD["sd"]["res_sweep"] == sd.get("res_sweep") and LD["sd"]["bigres"] == sd.get("bigres"), "SD 1.5 profile, sweep, sizes")
    for k, v in (sd.get("xattn") or {}).items():
        ok(LD["xa"][k]["mass"] == v["mass_by_res"] and LD["xa"][k]["tokens"] == v["tokens"], f"cross-attention {k}")
ts = O("tiny_scores.json")
ok(LD["tiny"]["scores"] == ts, "tiny scores")
ok(LD["src"] == json.load(open(os.path.join(HERE, "inputs", "source_lines.json"))), "source lines")
ok(LD["pub"] == json.load(open(os.path.join(HERE, "inputs", "published.json"))), "published numbers")

# ---------------------------------------------------------------- 2. prose numbers
text = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
text = re.sub(r"<[^>]+>", "", text).replace("&times;", "x").replace("&minus;", "-").replace("&nbsp;", " ")
P = {k: v["params"] for k, v in arch.items()}
C = {k: v["cats"] for k, v in arch.items()}
fmt = lambda n: f"{n:,}"
M1 = lambda n: f"{n / 1e6:,.1f}M"
hub = {k: v.get("hub_check") for k, v in arch.items()}
g = lambda k, r, T=None: next(q for q in fl[k]["grid"] if q["res"] == r and q["T"] == (fl[k]["text_default"] if T is None else T))
st = ex["sd15_stages_512"]
f64 = (st["flops"]["down_blocks.0"] + st["flops"]["up_blocks.3"]) / st["total"]
p64 = (st["params"]["down_blocks.0"] + st["params"]["up_blocks.3"]) / P["sd15"]
dit256 = next(r for r in ex["dit_table"] if r["model"] == "DiT-XL/2" and r["res"] == 256)["params"]
diff_dit = 749826464 - dit256
tfo = {r["net"]: r for r in json.load(open(os.path.join(HERE, "tiny", "out_flops.json")))}
checks = [
    (fmt(P["sd15"]), "SD 1.5 U-Net parameters"), (fmt(P["sdxl"]), "SDXL"), (fmt(P["flux1"]), "FLUX.1 dev"),
    (fmt(ex["flux_schnell"]["ours"]), "FLUX.1 schnell"), (fmt(P["flux1"] - ex["flux_schnell"]["ours"]), "guidance embedder"),
    (fmt(P["flux2k"]), "FLUX.2 klein"), (fmt(P["zimg"]), "Z-Image"), (fmt(P["sd3m"]), "SD3 Medium"), (fmt(hub["sd3m"]["hub_total"]), "SD3 Medium Hub"),
    (fmt(hub["sd3m"]["hub_total"] - P["sd3m"]), "SD3 Medium gap"), (fmt(192 * 192 * 1536), "192^2 x 1536"),
    (fmt(P["sd35l"]), "SD3.5 Large"), (fmt(hub["sd35l"]["hub_total"]), "SD3.5 Large Hub"), (fmt(hub["sd35l"]["hub_total"] - P["sd35l"]), "SD3.5 gap"),
    (fmt(P["pixart"]), "PixArt-Sigma"), (fmt(diff_dit), "diffusers DiT gap"), (fmt(dit256), "DiT-XL/2 params"),
    (f"{C['dit']['mod'] / 1e6:.1f}M of its {P['dit'] / 1e6:.1f}M parameters ({100 * C['dit']['mod'] / P['dit']:.1f}%)", "DiT modulation share"),
    (f"{100 * C['dit']['mod'] / (P['dit'] + C['pixart']['cross']):.1f}%", "PixArt 27% reproduction"),
    (f"{C['pixart']['cross'] / 1e6:.1f}M of cross-attention", "PixArt cross-attention"),
    (f"{M1(C['sd35l']['mod'])[:-1]}M of {M1(P['sd35l'])[:-1]}M parameters ({100 * C['sd35l']['mod'] / P['sd35l']:.1f}%)", "SD3.5 modulation"),
    (f"{M1(C['qwen']['mod'])[:-1]}M of {M1(P['qwen'])[:-1]}M ({100 * C['qwen']['mod'] / P['qwen']:.1f}%)", "Qwen modulation"),
    (f"{arch['flux1']['top']['single_transformer_blocks'] / 1e6:,.1f}M", "FLUX single blocks"), (f"{arch['flux1']['top']['transformer_blocks'] / 1e6:,.1f}M", "FLUX double blocks"),
    (f"{100 * C['flux1']['mod'] / P['flux1']:.1f}% of FLUX.1", "FLUX.1 modulation"),
    (f"{C['flux2k']['mod'] / 1e6:.1f}M, {100 * C['flux2k']['mod'] / P['flux2k']:.1f}%", "klein modulation"),
    (f"{100 * C['zimg']['mod'] / P['zimg']:.1f}% of", "Z-Image modulation"),
    (f"{g('sd35l', 1024, 77)['flops'] / 1e12:.2f} TFLOP per pass with 77", "SD3.5 at 77 tokens"),
    (f"{g('sd35l', 1024)['flops'] / 1e12:.2f} with diffusers' 333", "SD3.5 at 333"),
    (f"(a {100 * (g('sd35l', 1024)['flops'] / g('sd35l', 1024, 77)['flops'] - 1):.1f}% difference", "text-length difference"),
    (f"two 64 x 64 levels do {100 * f64:.0f}% of the work with {100 * p64:.1f}% of the weights", "64x64 share"),
    (f"{st['params']['up_blocks.1'] / 1e6:.0f}M parameters", "up_blocks.1"),
    (fmt(tfo["dit_p4"]["params"]), "TinyDiT params"), (fmt(tfo["unet"]["params"]), "TinyUNet params"),
    (f"{100 * g('sana', 1024)['bmm'] / g('sana', 1024)['flops']:.0f}% of Sana", "Sana attention share"),
    (f"{g('flux1', 1024)['flops'] / 1e12:.0f} TFLOP per pass at 1024", "FLUX per pass in design answer"),
]
for s, what in checks:
    ok(s in text, f"prose: {what}: '{s}'")
lo = min(fl[k]["grid"][[q["res"] for q in fl[k]["grid"]].index(1024)]["bmm"] / g(k, 1024)["flops"] for k in ["dit", "pixart", "sd3m", "sd35l", "flux1", "flux2k", "qwen", "zimg"])
hi = max(g(k, 1024)["bmm"] / g(k, 1024)["flops"] for k in ["dit", "pixart", "sd3m", "sd35l", "flux1", "flux2k", "qwen", "zimg"])
ok(f"against {100 * lo:.0f} to {100 * hi:.0f}% for the softmax" in text, f"prose: softmax attention share range {100 * lo:.0f} to {100 * hi:.0f}%")
pix = None
f = fl["sd15"]["fit"]; T = fl["sd15"]["text_default"]
q = lambda N: f[0] + f[1] * N + f[2] * T + f[3] * N * N + f[4] * N * T + f[5] * T * T
ok(f"about {round(q(512 * 512) / q(4096), -1):.0f} times more per pass" in text, f"prose: pixel-space ratio {q(512 * 512) / q(4096):.0f}")
pt = LD["pub"]["dit_table4"]["rows"]
for r in pt:
    ours = next(x for x in ex["dit_table"] if x["model"] == r[0] and x["res"] == 256)
    ok(abs(ours["flops"] / 2e9 - r[1]) / r[1] < 0.006, f"DiT Table 4 Gflops reproduced: {r[0]} {r[1]} vs {ours['flops'] / 2e9:.3f}")

# ---------------------------------------------------------------- 3. source line links
SL = json.load(open(os.path.join(HERE, "inputs", "source_lines.json")))
by_file = {}
for k, v in SL.items():
    by_file.setdefault(v["file"].split("/")[-1], set()).add(v["line"])
by_file.setdefault("util.py", set()).add(299)        # BFL util.py: the "flux-dev" ModelSpec (read from the fetched file)
for url, line in re.findall(r'href="(https://github\.com/[^"#]+)#L(\d+)"', html):
    fn = url.split("/")[-1]
    ok(int(line) in by_file.get(fn, set()), f"source link {fn}#L{line}")
print("FAILED:", len(bad)) if bad else print("ALL OK")
sys.exit(1 if bad else 0)
