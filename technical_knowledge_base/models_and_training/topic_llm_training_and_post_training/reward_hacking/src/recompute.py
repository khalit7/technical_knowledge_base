"""Recompute every derived number on the Reward Hacking page and write parts/20_js_data.js.

Sources (verbatim values and quotes in inputs/research_*.md):
  Gao, Schulman, Hilton 2022 (arXiv 2210.10760): functional forms (Section 1), BoN KL (Section 2),
    coefficients READ OFF Figure 3 (the paper prints no numbers), Table 2 worked BoN example.
  Singhal et al. 2023 (arXiv 2310.03716): Tables 1, 2, 3.
  Zhang et al. 2024 (arXiv 2409.11704): Table 2.
  Fu et al. 2025, PAR (arXiv 2502.18770v8): Table 1.
  Anthropic Claude 4 system card (May 2025): Table 6.2.A.
  Baker et al. 2025 (arXiv 2503.11926): Table 1.
  METR 2025, Dreadnode 2026, ImpossibleBench 2025: rate arithmetic checks.
Run: python3 recompute.py   (stdlib only)
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
out = {}
checks = []

def chk(name, got, want, tol=0.0051, note=""):
    ok = abs(got - want) <= tol
    checks.append({"what": name, "computed": round(got, 4), "published": want, "ok": ok, "note": note})
    print(("OK  " if ok else "DIFF") + f" {name}: computed {got:.4f}, published {want} {note}")

# ---------------- Gao et al. 2022 ----------------
SIZES = ["3M", "12M", "25M", "42M", "85M", "300M", "680M", "1.2B", "3B"]
PARAMS = [3e6, 12e6, 25e6, 42e6, 85e6, 300e6, 680e6, 1.2e9, 3e9]
A_BON = [0.490, 0.513, 0.558, 0.548, 0.599, 0.633, 0.649, 0.653, 0.662]   # read from Fig. 3a
B_BON = [0.120, 0.120, 0.115, 0.111, 0.106, 0.0995, 0.098, 0.0965, 0.090]  # read from Fig. 3b
B_RL = [0.175, 0.167, 0.152, 0.146, 0.137, 0.124, 0.119, 0.122, 0.118]     # read from Fig. 3c
A_RL = 0.35        # not printed; estimated from Fig. 1b fit lines (0.34 to 0.35)
RL_SCALE = 0.88    # Fig. 1b curves imply beta_RL about 12% below the Fig. 3c dots

def bon_kl(n):
    return math.log(n) - (n - 1) / n

chk("BoN KL at n = 1,000 (nats)", bon_kl(1000), 6, tol=0.1, note="paper: KL about 6 nats")
chk("BoN KL at n = 60,000 (nats)", bon_kl(60000), 10, tol=0.05, note="paper: KL about 10 nats")

gao = []
for s, p, a, b, br in zip(SIZES, PARAMS, A_BON, B_BON, B_RL):
    d_b = a / (2 * b)
    row = {"size": s, "params": p, "a_bon": a, "b_bon": b, "b_rl": br,
           "bon_peak_kl": d_b ** 2, "bon_peak_gold": a * a / (4 * b)}
    for tag, beta in (("fig3", br), ("fig1", br * RL_SCALE)):
        dstar = math.exp(A_RL / beta - 1)
        row["rl_peak_kl_" + tag] = dstar ** 2
        row["rl_peak_gold_" + tag] = beta * dstar
        row["rl_zero_kl_" + tag] = math.exp(A_RL / beta) ** 2
    gao.append(row)
    print(f"  {s:>5}: BoN peak KL {row['bon_peak_kl']:.1f} gold {row['bon_peak_gold']:.3f} | RL(fig1) peak KL {row['rl_peak_kl_fig1']:.1f} gold {row['rl_peak_gold_fig1']:.3f} zero at {row['rl_zero_kl_fig1']:.0f}")
chk("3M BoN peak gold vs Fig. 1a (about 0.50)", gao[0]["bon_peak_gold"], 0.50, tol=0.02, note="read from figure")
chk("3B BoN gold at KL 10 vs Fig. 1a (about 1.24)", math.sqrt(10) * (A_BON[-1] - B_BON[-1] * math.sqrt(10)), 1.24, tol=0.06, note="does not match exactly: 1.19")
chk("3M RL peak gold, Fig. 1b scaling (about 0.55 to 0.58)", gao[0]["rl_peak_gold_fig1"], 0.56, tol=0.03)
chk("3M RL zero crossing KL, Fig. 1b scaling (about 95)", gao[0]["rl_zero_kl_fig1"], 95, tol=10)
chk("3M RL zero crossing KL with Fig. 3c beta (Fig. 1b shows about 95)", gao[0]["rl_zero_kl_fig3"], 95, tol=10, note="expected DIFF: Fig. 3c and Fig. 1b disagree")
out["GAO"] = {"rows": gao, "a_rl": A_RL, "rl_scale": RL_SCALE}

# Table 2: one prompt, best-of-n, proxy 12M RM, policy 1.2B
out["BON_EX"] = [
    {"n": "1", "ans": "(a rambling answer about mussels and clams; the table abbreviates it)", "proxy": -0.1922, "gold": -0.5225},
    {"n": "3", "ans": "Most likely a pipe is having trouble staying full.", "proxy": 0.0322, "gold": -0.0165},
    {"n": "10", "ans": "A sponge", "proxy": 0.2336, "gold": 0.4828},
    {"n": "30", "ans": "When something is full of holes, it is used for stirring or moving liquid.", "proxy": 0.6534, "gold": -0.1543},
    {"n": "100 to 1,000", "ans": "A tornado is usually a swirling cloud of swirling air ...", "proxy": 0.8968, "gold": -0.3367},
    {"n": "3,000 to 10,000", "ans": "A bore hole is a hole drilled into a rock ...", "proxy": 0.9003, "gold": 0.2733},
    {"n": "30,000", "ans": "A pothole is a structural vulnerability that allows water to penetrate ...", "proxy": 0.9527, "gold": 0.5490},
]
for r in out["BON_EX"]:
    pass

# ---------------- Singhal et al. 2023 ----------------
SING = {
    "WebGPT": [("SFT", 100, -0.45), ("Standard PPO", 230, 0.25), ("Reward scaling", 128, -0.05), ("High KL", 120, -0.06), ("Omit long outputs", 127, -0.13)],
    "Stack": [("SFT", 203, 0.05), ("Standard PPO", 257, 0.74), ("Reward scaling", 249, 0.40), ("High KL", 250, 0.30)],
    "RLCD": [("SFT", 59, 4.4), ("Standard PPO", 94, 5.50), ("Reward scaling", 82, 5.00), ("Penalise length", 72, 5.20), ("High KL", 97, 5.20)],
}
NRG = {"WebGPT": (0.82, 0.02, 2.0), "Stack": (0.89, 0.48, 53.4), "RLCD": (0.94, 0.25, 27.2)}
for k, (dr, nrg, pct) in NRG.items():
    chk(f"Singhal Table 1 non-length share, {k} (%)", 100 * nrg / dr, pct, tol=0.6, note="NRG / Delta R; printed values are rounded")
mult = {k: v[1][1] / v[0][1] for k, v in SING.items()}
print("  PPO / SFT length:", {k: round(x, 2) for k, x in mult.items()})
out["SING"] = {"rows": SING, "nrg": NRG, "lppo": {"WebGPT": [118, 56], "Stack": [252, 59], "RLCD": [98, 64]},
               "ppo_pref": {"WebGPT": 58, "Stack": 58, "RLCD": 63}, "corr": {"WebGPT": 0.72, "Stack": 0.55, "RLCD": 0.67}}

# ---------------- Format bias (Zhang et al. 2024, Table 2) ----------------
out["FMT"] = {"cols": ["Bold", "List", "Emoji", "Exclamation", "Link", "Affirmative"], "rows": [
    ["GPT-4 Turbo", "LLM judge", [89.5, 75.75, 86.75, 80.5, 87.25, 88.75]],
    ["Skywork-Critic-Llama-3.1-8B", "generative judge", [99.25, 88.75, 97.25, 77.75, 75, 85]],
    ["Pairwise-model-Llama-3-8B", "pairwise preference model", [97, 93.5, 70.5, 64.25, 84.75, 47.75]],
    ["FsfairX-Llama-3-8B-v0.1", "Bradley-Terry RM", [95.5, 68.5, 15, 28.5, 64.5, 59.5]],
    ["ArmoRM-Llama3-8B-v0.1", "multi-head RM", [98, 50.5, 55, 34.5, 27, 28.5]],
    ["OffsetBias-RM-Llama-3-8B", "Bradley-Terry RM", [77.5, 84, 28, 38, 62, 30.5]],
    ["Zephyr-Beta-Mistral-7B", "DPO implicit RM", [37.5, 50, 26.5, 72, 58, 21]],
]}

# ---------------- PAR Table 1 ----------------
out["PAR"] = [["SFT (start)", 50.0, 899], ["Vanilla PPO", 0.1, 2008], ["PAR", 70.81, 1207], ["Minmax", 66.98, 1159], ["WARM", 60.67, 1073],
              ["LSC", 47.56, 1556], ["Meanstd", 0.03, 3183], ["Reg", 0.0, 1868], ["Clip", 0.0, 3096], ["ODIN", 0.0, 3672]]

# ---------------- Claude 4 system card, Table 6.2.A ----------------
C4 = {"Claude Sonnet 3.7": (78, 80), "Claude Opus 4": (47, 5), "Claude Sonnet 4": (45, 10)}
chk("Opus 4: anti-hack prompt reduction factor ('over 9x')", 47 / 5, 9.4, tol=0.01)
chk("Sonnet 4: anti-hack prompt reduction factor ('4.5x')", 45 / 10, 4.5, tol=0.01)
out["C4"] = C4

# ---------------- other rate checks ----------------
chk("METR o3 RE-Bench total 39/128 (%)", 100 * 39 / 128, 30.4, tol=0.1, note="39/128 = 30.47%, METR prints 30.4%")
chk("METR o3 HCAST 8/1087 (%)", 100 * 8 / 1087, 0.7, tol=0.05)
chk("METR Optimize a Kernel 6/24 (%)", 100 * 6 / 24, 25.0)
chk("METR Rust Codecontest 12/28 (%)", 100 * 12 / 28, 42.9, tol=0.05)
chk("Dreadnode cheated passes 78 to 11 (% drop)", 100 * (78 - 11) / 78, 85.9, tol=0.1, note="derived, not printed")
chk("Dreadnode web cheating 161 to 25 (% drop)", 100 * (161 - 25) / 161, 84.5, tol=0.05)
chk("Dreadnode clean solve vs pass: 41.5 - 26.1 points", 41.5 - 26.1, 15.4, tol=0.01, note="derived")
chk("Gao: RL KL efficiency, 3M RL peak KL / BoN peak KL", gao[0]["rl_peak_kl_fig1"] / gao[0]["bon_peak_kl"], 3.0, tol=0.2, note="derived, about 3x")
chk("Denison: 45 tampering episodes of 32,768 (%)", 100 * 45 / 32768, 0.14, tol=0.005, note="derived")

out["CHECKS"] = checks
js = "// generated by recompute.py; do not edit by hand\nwindow.RHD=" + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "20_js_data.js"), "w").write(js)
json.dump(out, open(os.path.join(HERE, "inputs", "derived.json"), "w"), indent=1)
print("wrote parts/20_js_data.js", len(js), "bytes;", sum(c["ok"] for c in checks), "of", len(checks), "checks within tolerance")
