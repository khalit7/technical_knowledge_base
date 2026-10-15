"""Build ../parts/22_js_pk_data.js (window.PK) from out/*.json and the kernel sources. Plain Python, no JAX.
    python3 -I -B pk_data.py
The page embeds exactly these values; check_page.py verifies the embedding and every number quoted in the prose.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
PARTS = os.path.join(os.path.dirname(HERE), "parts")
ROOT_TPU = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(HERE))), "src", "tpu")
J = lambda n: json.load(open(os.path.join(OUT, n)))


def rnd(x, n=6):
    if isinstance(x, float):
        return float(f"{x:.{n}g}")
    if isinstance(x, list):
        return [rnd(v, n) for v in x]
    if isinstance(x, dict):
        return {k: rnd(v, n) for k, v in x.items()}
    return x


def snippets():
    src = open(os.path.join(HERE, "pk_kernels.py")).read()
    out = {}
    for m in re.finditer(r"# ---- (\w+)\n(.*?)# ---- end", src, re.S):
        out[m.group(1)] = m.group(2).rstrip() + "\n"
    root = open(os.path.join(ROOT_TPU, "tp_kernels.py")).read()
    i = root.find("def matmul_kernel"); j = root.find("# bug 1")
    out["matmul_root"] = root[i:j].rstrip() + "\n"
    return out


K = J("kernels.json")
G = J("grid.json")
PL = J("pipeline.json")
TI = J("tiles.json")
SR = J("source.json")

# grid: compact steps [g..., run, idx pairs..., copied bits]
grid = []
for L in G["kernels"]:
    steps = [[s["g"], 1 if s["run"] else 0, [x for ij in s["idx"] for x in ij], [1 if c else 0 for c in s["cp"]]]
             for s in L["steps"]]
    grid.append(dict(name=L["name"], variant=L["variant"], title=L["title"], grid=L["grid"], axes=L["axes"],
                     sem=L["sem"], note=L["note"], ops=L["ops"], steps=steps, copies=L["copies"], moved=L["moved"],
                     min_bytes=L["min_bytes"], runs=L["runs"]))
order = {k: v for k, v in G["order"].items()}
qo = []
for pt in order["flash_1core"]:
    if pt[1] not in qo:
        qo.append(pt[1])
order["flash_qorder"] = qo
ix = {(L["name"] + ("_" + L["variant"] if L["variant"] else "")): dict(copies=L["copies"], runs=L["runs"], moved=L["moved"])
      for L in G["kernels"]}

pipe = dict(buffered=rnd(PL["buffered"]), peak=PL["peak"], bw=PL["bw"], cases={})
for k, c in PL["cases"].items():
    pipe["cases"][k] = dict(title=c["title"], t_serial=rnd(c["t_serial"]), t_overlap=rnd(c["t_overlap"]),
                            dma_total=rnd(c["dma_total"]), mxu_total=rnd(c["mxu_total"]),
                            serial=[[a, rnd(b, 5), rnd(cc, 5), d, e] for a, b, cc, d, e in c["serial"]],
                            overlap=[[a, rnd(b, 5), rnd(cc, 5), d, e] for a, b, cc, d, e in c["overlap"]],
                            steps=[dict(g=s["g"], in_us=rnd(s["in_us"]), mxu_us=rnd(s["mxu_us"]), out_us=rnd(s["out_us"]),
                                        in_bytes=s["in_bytes"], flops=s["flops"]) for s in c["steps"]])

tiles = dict({k: v for k, v in TI.items() if k not in ("scores", "steps")},
             scores=[[None if x is None else round(x, 2) for x in r] for r in TI["scores"]],
             steps=[dict(j=s["j"], m=rnd(s["m"]), l=rnd(s["l"]), alpha=rnd(s["alpha"]), tile_max=rnd(s["tile_max"]),
                         focus_acc=rnd(s["focus_acc"]), focus_out=rnd(s["focus_out"]),
                         focus_out_wrong=rnd(s["focus_out_wrong"]), focus_alpha=rnd(s["focus_alpha"]))
                    for s in TI["steps"]])
tiles["probs_focus"] = rnd(TI["probs_focus"], 3)
tiles["v_focus_dims"] = rnd(TI["v_focus_dims"])

kern = rnd({k: v for k, v in K.items() if k not in ("pipeline", "backends", "paged")})
kern["pipeline"] = rnd({k: v for k, v in K["pipeline"].items() if k != "mosaic_manual"})
kern["paged"] = rnd({k: v for k, v in K["paged"].items() if k != "mosaic_head"})


def excerpt(txt, keep):
    lines = txt.splitlines()
    return "\n".join(l for l in lines if any(re.search(p, l) for p in keep))


mos_manual = K["pipeline"]["mosaic_manual"]
clean_loc = lambda t: re.sub(r'\s*"[^"\n]*"\(#loc\d+\)', "", t)
backends = dict(triton=clean_loc(K["backends"]["triton"]), mosaic=clean_loc(K["backends"]["mosaic"]),
                triton_ops=K["backends"]["triton_ops"], mosaic_ops=K["backends"]["mosaic_ops"])
texts = dict(mosaic_manual="\n".join(mos_manual.splitlines()[:3]) + "\n    ...\n" +
             excerpt(mos_manual, [r"tpu\.enqueue_dma", r"tpu\.wait_dma", r"scf\.for", r"tpu\.matmul"]),
             paged_head=K["paged"].get("mosaic_head", ""), backends=backends)

SR["line"] = {it["key"]: it["line"] for it in SR["items"]}
OLD = J("old.json")
RP = json.load(open(os.path.join(ROOT_TPU, "out", "pallas.json")))        # the root lab's recorded results (read only)
ROOT = dict(bugs=[{k: v for k, v in b.items() if k in ("k", "plain")} | {"tpu": {k: v for k, v in b["tpu"].items() if k != "order"}}
                  for b in RP["bugs"]],
            bad_block=dict(raised=RP["bad_block"]["raised"], interpret_err=RP["bad_block"]["interpret_err"]),
            matmul_err=RP["matmul"]["err_f32"], flash_err=RP["flash"]["err"])
PK = dict(ROOT=rnd(ROOT), OLD=OLD, K=kern, G=dict(kernels=grid, order=order, ix=ix), PL=pipe, TI=tiles, SR=SR, code=snippets(), T=texts)
txt = json.dumps(PK, separators=(",", ":"), ensure_ascii=False)
for bad in ("/" + "Users/", "Users" + "-", "/" + "private/"):
    assert bad not in txt, bad
with open(os.path.join(PARTS, "22_js_pk_data.js"), "w") as fh:
    fh.write("// Generated by src/runs/pk_data.py from src/runs/out/*.json and pk_kernels.py. Do not edit.\n")
    fh.write("window.PK=" + txt + ";\n")
print("wrote parts/22_js_pk_data.js", len(txt), "bytes;", {k: len(json.dumps(v)) for k, v in PK.items()})
