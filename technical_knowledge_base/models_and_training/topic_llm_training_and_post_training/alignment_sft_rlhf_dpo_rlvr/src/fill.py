"""Fill <span data-al="key"></span> in the built page with the SFT sample statistics from inputs/derived.json
and the 3D stages' numbers (derived["stage"], 2026-11-10) from inputs/derived.json (written by recompute.py),
so the numbers are static text that a reader, a search and ledger.py all see.
usage: python3 fill.py <built html> > <out html>"""
import json, re, sys
from pathlib import Path

D = json.loads((Path(__file__).parent / "inputs" / "derived.json").read_text())
S, ST = D["sft"], D["stage"]
pct = lambda x: f"{100 * x:.1f}%"
V = {
    "median_total": f"{S['median_total']:,}", "mean_total": f"{round(S['mean_total']):,}", "over": str(S["over"]),
    "pad8": pct(S["pad_eff"]["8"]), "pad16": pct(S["pad_eff"]["16"]), "pack": pct(S["pack_eff"]), "cross": pct(S["cross_share"]),
    "p10": f"{S['loss_p10']:,}", "p90": f"{S['loss_p90']:,}", "wr": f"{S['loss_p90'] / S['loss_p10']:.1f} times",
    "short_share": pct(S["loss_p10"] / (S["loss_p10"] + S["loss_p90"])),
}
sg = lambda x: ("\u2212" if x < -0.005 else "+" if x > 0.005 else "") + f"{abs(x):.2f}"   # signed, two decimals, a real minus sign
n2 = lambda x: ("\u2212" if x < 0 else "") + f"{abs(x):.2f}"
B = S["batch"]
V.update({
    # section 2: the eight-conversation batch
    "b_min": f"{ST['b_min']:,}", "b_max": f"{ST['b_max']:,}", "b_sum_t": f"{ST['b_sum_t']:,}", "b_sum_l": f"{ST['b_sum_l']:,}",
    "b_pad_pos": f"{ST['b_pad_pos']:,}", "b_pad_real": pct(ST["b_pad_real"]), "b_rows": str(len(ST["b_bins"])),
    "b_pack_pos": f"{ST['b_pack_pos']:,}", "b_pack_real": pct(ST["b_pack_real"]), "b_cross": pct(ST["b_cross"]),
    "b_ratio": f"{ST['b_ratio']:.1f}", "b_sh_s": pct(ST["b_share_short_sum"]), "b_sh_l": pct(ST["b_share_long_sum"]),
    "b_l_short": f"{B[ST['b_short']]['l']:,}", "b_l_long": f"{B[ST['b_long']]['l']:,}",
    "b_no_short": f"#{ST['b_short'] + 1}", "b_no_long": f"#{ST['b_long'] + 1}", "b_mean_share": pct(1 / 8),
    # section 3: Bradley-Terry on one ranking of four
    "rm_a": n2(ST["rm_end"][0]), "rm_b": n2(ST["rm_end"][1]), "rm_c": n2(ST["rm_end"][2]), "rm_d": n2(ST["rm_end"][3]),
    "rm_mad": f"{ST['rm_margin_ad']:.2f}", "rm_p": f"{100 * ST['rm_p_ad']:.2f}%", "rm_loss0": f"{ST['rm_loss0']:.3f}", "rm_loss": f"{ST['rm_loss_end']:.3f}",
    # sections 4 and 7: group-relative advantages (illustrative groups)
    "g_rm_r": ", ".join(n2(x) for x in ST["grpo_rm"]["r"]), "g_rm_mean": f"{ST['grpo_rm']['mean']:.2f}", "g_rm_std": f"{ST['grpo_rm']['std']:.2f}",
    "g_rm_adv": ", ".join(sg(x) for x in ST["grpo_rm"]["adv"]),
    "g_v_mean": f"{ST['grpo_ver']['mean']:.2f}", "g_v_std": f"{ST['grpo_ver']['std']:.2f}",
    "g_v_hi": sg(max(ST["grpo_ver"]["adv"])), "g_v_lo": sg(min(ST["grpo_ver"]["adv"])), "g_v_n": str(sum(x > 0 for x in ST["grpo_ver"]["r"])),
})
h = open(sys.argv[1], encoding="utf-8").read()


def sub(m):
    k = m.group(1)
    if k not in V:
        sys.exit(f"fill.py: no value for data-al={k}")
    return f'<span data-al="{k}">{V[k]}</span>'


h = re.sub(r'<span data-al="(\w+)"></span>', sub, h)
sys.stdout.write(h)
