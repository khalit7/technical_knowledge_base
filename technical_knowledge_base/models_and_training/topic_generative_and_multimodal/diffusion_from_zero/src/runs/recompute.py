"""Diffusion from zero: every derived number on the page that is arithmetic, not a run (CPU, float64, instant).

Writes out/recompute.json; check_toy.mjs compares the page's JavaScript schedules with schedule_checks, and
check_data.py compares prose numbers with the values here.
Schedules as diffusers v0.41.0 scheduling_ddpm.py (linear, scaled_linear, squaredcos_cap_v2) and
rescale_zero_terminal_snr (scheduling_ddim.py line 103, Lin et al. 2023 Algorithm 1).
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
T = 1000


def betas(kind):
    if kind == "linear":
        return np.linspace(1e-4, 0.02, T)
    if kind == "scaled":
        return np.linspace(0.00085 ** 0.5, 0.012 ** 0.5, T) ** 2
    f = lambda t: math.cos((t + 0.008) / 1.008 * math.pi / 2) ** 2
    return np.array([min(1 - f((i + 1) / T) / f(i / T), 0.999) for i in range(T)])


def ztsnr(b):
    ab = np.cumprod(1 - b); s = np.sqrt(ab); s0, sT = s[0], s[-1]
    s = (s - sT) * s0 / (s0 - sT); a2 = s ** 2
    al = np.concatenate([a2[:1], a2[1:] / a2[:-1]])
    return 1 - al


out = {"schedules": {}, "schedule_checks": []}
for name in ["linear", "cosine", "scaled"]:
    for zt in [False, True]:
        b = betas(name)
        if zt:
            b = ztsnr(b)
        ab = np.cumprod(1 - b); snr = ab / (1 - ab)
        key = name + ("_zt" if zt else "")
        cross = int(np.argmax(snr < 1))
        out["schedules"][key] = {"sqrt_abar_500": round(float(np.sqrt(ab[500])), 4), "sqrt_abar_999": float(np.sqrt(ab[999])),
                                 "abar_999": float(ab[999]), "snr_999": float(snr[999]), "snr_lt1_from": cross,
                                 "log10_snr_0": round(float(np.log10(snr[0])), 3),
                                 "frac_noise_dominated": round(1 - cross / T, 3)}
        for t in [0, 1, 250, 500, 998, 999] if not zt else [0, 250, 500, 998]:
            out["schedule_checks"].append({"name": name, "zt": zt, "t": t, "abar": float(ab[t])})

# ---- how much of the image's average survives at the last step (the brightness leak) ----
# noise averaged over n values has variance (1 - abar) / n; the signal's average keeps sqrt(abar) m, so the SNR of the
# average is n times the per-value SNR. Offset noise adds k * xi (one draw per image and channel) to every value.
def mean_snr(abar, n, k=0.0):
    return abar / ((1 - abar) * (1.0 / n + k * k))


sd = out["schedules"]["scaled"]; lin = out["schedules"]["linear"]
n_sd = 64 * 64            # per channel of SD 1.5's 4 x 64 x 64 latent (offset noise is per channel)
n_tiny = 32 * 32
out["mean_leak"] = {
    "sd_pixel_snr_999": sd["snr_999"],
    "sd_n_per_channel": n_sd,
    "sd_mean_snr_999": mean_snr(sd["abar_999"], n_sd),
    "sd_mean_snr_999_offset0.1": mean_snr(sd["abar_999"], n_sd, 0.1),
    "sd_mean_snr_999_offset0.05": mean_snr(sd["abar_999"], n_sd, 0.05),
    "tiny_linear_pixel_snr_999": lin["snr_999"],
    "tiny_linear_mean_snr_999": mean_snr(lin["abar_999"], n_tiny),
    "sd_t_where_pixel_snr_equals_mean_snr_999": None,
}
# at which timestep does a single value have the SNR that the per-channel mean still has at t = 999?
ab_sd = np.cumprod(1 - betas("scaled")); snr_sd = ab_sd / (1 - ab_sd)
out["mean_leak"]["sd_t_where_pixel_snr_equals_mean_snr_999"] = int(np.argmax(snr_sd < out["mean_leak"]["sd_mean_snr_999"]))

# ---- loss weighting: the weight each target puts on the clean-image error, as a function of SNR ----
# eps-MSE = SNR * x0-MSE; v-MSE = (SNR + 1) * x0-MSE; min-SNR-gamma: min(SNR, gamma) on x0-MSE (Hang et al. 2023)
out["weights_at"] = {}
for t in [10, 100, 259, 500, 900, 999]:
    s = float((np.cumprod(1 - betas("linear")) / (1 - np.cumprod(1 - betas("linear"))))[t])
    out["weights_at"][str(t)] = {"snr": s, "eps": s, "v": s + 1, "x0": 1.0, "minsnr5": min(s, 5.0)}

# ---- sigma view: x / sqrt(abar) = x0 + sigma eps, sigma = sqrt((1 - abar) / abar) ----
ab_lin = np.cumprod(1 - betas("linear"))
out["sigma"] = {"linear_sigma_max": float(np.sqrt((1 - ab_lin[999]) / ab_lin[999])), "linear_sigma_min": float(np.sqrt((1 - ab_lin[0]) / ab_lin[0])),
                "sd_sigma_max": float(np.sqrt((1 - ab_sd[999]) / ab_sd[999])), "sd_sigma_min": float(np.sqrt((1 - ab_sd[0]) / ab_sd[0]))}
# Karras et al. 2022 sigma spacing, rho = 7 (diffusers _convert_to_karras), 10 steps on SD 1.5's range
smax, smin, rho = out["sigma"]["sd_sigma_max"], out["sigma"]["sd_sigma_min"], 7.0
ramp = np.linspace(0, 1, 10)
out["karras_sd_10"] = [round(float(v), 4) for v in (smax ** (1 / rho) + ramp * (smin ** (1 / rho) - smax ** (1 / rho))) ** rho]

json.dump(out, open(os.path.join(HERE, "..", "out", "recompute.json"), "w"), indent=1)
print(json.dumps({k: out[k] for k in ["mean_leak", "sigma"]}, indent=1))
for k, v in out["schedules"].items():
    print(k, v)
