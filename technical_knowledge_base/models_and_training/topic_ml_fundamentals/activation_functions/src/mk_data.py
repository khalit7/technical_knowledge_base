"""Build parts/20_js_data.js from inputs/ (run after real_models.py or dead_relu_toy.py change)."""
import json, os, base64, struct
HERE = os.path.dirname(os.path.abspath(__file__))
I = lambda f: json.load(open(os.path.join(HERE, "inputs", f)))
toy, real, cfg = I("dead_relu_toy.json"), I("real_models.json"), I("configs.json")

summ = {}
frames = []
for r in toy["runs"]:
    k = r["act"] + "|" + str(r["lr"])
    summ.setdefault(k, []).append([None if r["nan"] else sum(r["dead_layers"]), None if r["nan"] else round(r["acc"], 4), 1 if r["nan"] else 0])
    if "frames" in r:
        frames.append(dict(act=r["act"], lr=r["lr"], seed=r["seed"],
                           f=[[x["ep"], None if x.get("loss") is None else round(x["loss"], 4), None if x.get("acc") is None else round(x["acc"], 4), x.get("m"), 1 if x.get("nan") else 0] for x in r["frames"]]))
order = [("relu", 0.04), ("relu", 0.08), ("leaky", 0.08)]
frames.sort(key=lambda r: order.index((r["act"], r["lr"])))

def q16(v):
    # int16 quantisation with one scale per vector (largest |value| maps to 32767), little-endian, base64
    sc = max(abs(a) for a in v) or 1.0
    b = struct.pack("<%dh" % len(v), *[round(a / sc * 32767) for a in v])
    return [sc, base64.b64encode(b).decode()]

def pairs(a, head, tot=None):
    # (h: bin 0 is below 1e-5, then 30 bins of 0.2 decades to 10, then above 10; exact zeros are z)
    # keep the first `head` entries, then merge neighbouring bins two by two; express as parts per million of tot
    tot = tot or sum(a)
    b = a[:head] + [a[i] + (a[i + 1] if i + 1 < len(a) else 0) for i in range(head, len(a), 2)]
    return [round(v / tot * 1e6) for v in b]

models = []
for m in real["models"]:
    mm = dict(key=m["key"], name=m["name"], act=m["act"], tokens=m["tokens"], width=m["width"], d=m["d"],
              L=[dict(z=round(l["zero"], 6), n=round(l["neg"], 5), h=pairs(l["hist"][:-1], 1, l["nz"] / (1 - l["zero"])) + [round(l["hist"][-1] / (l["nz"] / (1 - l["zero"])) * 1e6)], nz=l["nz"], dead=l["dead"], on=[l["onhist"][0]] + pairs(l["onhist"][1:], 0), om=round(l["onmean"], 5)) for l in m["layers"]])
    t = m.get("token")
    if t:
        tt = dict(layer=t["layer"], tokens=t["tokens"], pos=t["pos"])
        for k in ("x", "y", "pre", "gate", "up"):
            if k in t: tt[k] = q16(t[k])
        mm["tok"] = tt
    models.append(mm)

# Shazeer 2020, Table 1 (log-perplexity, 65,536 steps with standard deviation; 524,288 steps) and the GLUE and SuperGLUE averages (Tables 2, 3)
SZ = [
    ["FFN-ReLU", 0, 1.997, 0.005, 1.677, 83.80, 72.76],
    ["FFN-GELU", 0, 1.983, 0.005, 1.679, 83.86, 72.98],
    ["FFN-Swish", 0, 1.994, 0.003, 1.683, 83.60, 72.40],
    ["FFN-GLU", 1, 1.982, 0.006, 1.663, 84.20, 73.95],
    ["FFN-Bilinear", 1, 1.960, 0.005, 1.648, 83.79, 73.81],
    ["FFN-GEGLU", 1, 1.942, 0.004, 1.633, 84.12, 73.96],
    ["FFN-SwiGLU", 1, 1.944, 0.010, 1.636, 84.36, 74.56],
    ["FFN-ReGLU", 1, 1.953, 0.003, 1.645, 84.67, 73.66],
]
C = {k: dict(url=v["url"], d=v.get("hidden_size") or v.get("n_embd"), h=v.get("intermediate_size") or v.get("ffn_dim") or (4 * v["n_embd"] if v.get("n_embd") else None),
             act=v.get("hidden_act") or v.get("hidden_activation") or v.get("activation_function")) for k, v in cfg.items()}
data = dict(toy=dict(summ=summ, frames=frames, units=toy["units"], images=toy["images"]), real=dict(text=real["text"], bins=[real["bins"][0], real["bins"][1], real["bins"][2] // 2], fbins=[real["fbins"][0], real["fbins"][1] // 2], models=models), sz=SZ, cfg=C)
s = "window.DATA=" + json.dumps(data, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "20_js_data.js"), "w").write(s)
print("20_js_data.js", len(s), "bytes")
