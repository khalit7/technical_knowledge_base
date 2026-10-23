"""Fill <span data-al="key"></span> in the built page with the SFT sample statistics from inputs/derived.json
(written by recompute.py), so the numbers are static text that a reader, a search and ledger.py all see.
usage: python3 fill.py <built html> > <out html>"""
import json, re, sys
from pathlib import Path

S = json.loads((Path(__file__).parent / "inputs" / "derived.json").read_text())["sft"]
pct = lambda x: f"{100 * x:.1f}%"
V = {
    "median_total": f"{S['median_total']:,}", "mean_total": f"{round(S['mean_total']):,}", "over": str(S["over"]),
    "pad8": pct(S["pad_eff"]["8"]), "pad16": pct(S["pad_eff"]["16"]), "pack": pct(S["pack_eff"]), "cross": pct(S["cross_share"]),
    "p10": f"{S['loss_p10']:,}", "p90": f"{S['loss_p90']:,}", "wr": f"{S['loss_p90'] / S['loss_p10']:.1f} times",
    "short_share": pct(S["loss_p10"] / (S["loss_p10"] + S["loss_p90"])),
}
h = open(sys.argv[1], encoding="utf-8").read()


def sub(m):
    k = m.group(1)
    if k not in V:
        sys.exit(f"fill.py: no value for data-al={k}")
    return f'<span data-al="{k}">{V[k]}</span>'


h = re.sub(r'<span data-al="(\w+)"></span>', sub, h)
sys.stdout.write(h)
