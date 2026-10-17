"""Parse the boxes in out/<model>_ground.json and score them under three readings of the numbers (CPU, no model)
-> out/ground_scored.json

  k1000    the numbers are on a 0 to 1,000 scale of the image (Qwen2-VL, Qwen3-VL)
  resized  the numbers are pixels of the image as the processor resized it (Qwen2.5-VL); for SmolVLM, whose views are
           512-pixel squares, the 512 x 512 global view
  orig     the numbers are pixels of the original image
The first bracketed list of four numbers is taken as x1, y1, x2, y2; answers without one are unparsed.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(os.path.dirname(HERE), "out")


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy; ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


S = {"readings": ["k1000", "resized", "orig"], "models": {}}
for who in ("smol", "qwen"):
    p = os.path.join(OUT, f"{who}_ground.json")
    if not os.path.exists(p): continue
    R = json.load(open(p)); rows = []
    for r in R["rows"]:
        m = re.search(r"\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]", r["answer"])
        nums = [float(x) for x in m.groups()] if m else []
        rec = {"key": r["key"], "obj": r["obj"], "answer": r["answer"], "truth": r["truth"], "parsed": len(nums) >= 4}
        if rec["parsed"]:
            x1, y1, x2, y2 = nums[:4]; W, H = r["w"], r["h"]
            rw, rh = r.get("resized", [512, 512])
            boxes = {"k1000": [x1 * W / 1000, y1 * H / 1000, x2 * W / 1000, y2 * H / 1000],
                     "resized": [x1 * W / rw, y1 * H / rh, x2 * W / rw, y2 * H / rh],
                     "orig": [x1, y1, x2, y2]}
            rec["boxes"] = {k: [round(v, 1) for v in b] for k, b in boxes.items()}
            rec["iou"] = {k: round(iou(b, r["truth"]), 3) for k, b in boxes.items()}
        rows.append(rec)
    par = [r for r in rows if r["parsed"]]
    mean = {k: round(sum(r["iou"][k] for r in par) / len(rows), 3) for k in S["readings"]} if par else {}
    hit = {k: sum(r["iou"][k] >= 0.5 for r in par) for k in S["readings"]} if par else {}
    best = (max(mean, key=mean.get) if max(mean.values()) > 0 else "orig") if mean else None
    S["models"][who] = {"rows": rows, "n": len(rows), "parsed": len(par), "mean_iou": mean, "iou_ge_05": hit, "best": best}
    print(who, "parsed", len(par), "/", len(rows), "mean IoU", mean, "IoU>=0.5", hit, "best", best)
json.dump(S, open(os.path.join(OUT, "ground_scored.json"), "w"), indent=1)
