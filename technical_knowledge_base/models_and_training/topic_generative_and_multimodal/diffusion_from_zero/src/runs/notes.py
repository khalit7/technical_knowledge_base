"""Sentences and prose numbers for the page, written from the recorded data (imported by make_data.py).

build(ctx) returns (f, txt, dist, right):
  f     : {key: text} for <span data-dz="key"> in the Reading parts
  txt   : {element id: html} for the measured paragraphs
  dist  : rows of the distillation table (published numbers from inputs/published.json)
  right : the correct option of each predict-then-reveal question
Labels: <span class="meas">measured</span>, <span class="vend">published</span>, <span class="der">derived</span>.
"""
M = '<span class="meas">measured</span>'
P = '<span class="vend">published</span>'
DV = '<span class="der">derived</span>'


def a(url, text):
    return f'<a href="{url}" target="_blank" rel="noopener noreferrer">{text}</a>'


def fmt(v, d=1):
    return f"{v:,.{d}f}"


def pct(v, d=1):
    return f"{100 * v:.{d}f}%"


PAPERS = [
    ("2006.11239", "Ho, Jain, Abbeel 2020 (DDPM)"), ("2010.02502", "Song, Meng, Ermon 2020 (DDIM)"),
    ("2011.13456", "Song et al. 2021 (score SDE)"), ("2105.05233", "Dhariwal, Nichol 2021 (classifier guidance)"),
    ("2207.12598", "Ho, Salimans 2022 (classifier-free guidance)"), ("2205.11487", "Saharia et al. 2022 (Imagen)"),
    ("2202.00512", "Salimans, Ho 2022 (progressive distillation, v)"), ("2206.00364", "Karras et al. 2022 (EDM)"),
    ("2210.03142", "Meng et al. 2023 (guidance distillation)"), ("2211.01095", "Lu et al. 2022 (DPM-Solver++)"),
    ("2301.11093", "Hoogeboom, Heek, Salimans 2023 (simple diffusion)"), ("2302.04867", "Zhao et al. 2023 (UniPC)"),
    ("2303.01469", "Song et al. 2023 (consistency models)"), ("2303.09556", "Hang et al. 2023 (Min-SNR)"),
    ("2303.00848", "Kingma, Gao 2023 (diffusion objectives)"), ("2305.08891", "Lin et al. 2023 (flawed schedules)"),
    ("2310.04378", "Luo et al. 2023 (LCM)"), ("2311.05556", "Luo et al. 2023 (LCM-LoRA)"),
    ("2311.17042", "Sauer et al. 2023 (ADD)"), ("2311.18828", "Yin et al. 2023 (DMD)"), ("2405.14867", "Yin et al. 2024 (DMD2)"),
    ("2312.02696", "Karras et al. 2023 (EDM2)"), ("2404.07724", "Kynkaanniemi et al. 2024 (guidance interval)"),
    ("2406.02507", "Karras et al. 2024 (autoguidance)"),
]

DIST = [
    ["Progressive distillation (Salimans and Ho, Feb 2022)", "Halve the steps repeatedly: a student does in one step what the teacher does in two; v-prediction introduced for it",
     "1 to 8", "CIFAR-10 FID 9.12 / 4.51 / 3.00 / 2.57 at 1 / 2 / 4 / 8 steps (Table 2)"],
    ["Guidance distillation (Meng et al., Oct 2022)", "First teach a student, conditioned on the scale w, to output the guided prediction in one call; then distil steps",
     "1 to 4", "1 to 4 steps on ImageNet 256 and LAION 512, \"at least 10-fold\" faster (abstract; the Figure 1 caption says at least 20x fewer steps)"],
    ["Consistency models (Song et al., Mar 2023)", "Train a map from any point on the ODE path straight to its end (distilled from a teacher, CD, or trained alone, CT)",
     "1 or 2", "CD: CIFAR-10 FID 3.55 / 2.93, ImageNet 64 6.20 / 4.70 at 1 / 2 steps; CT: 8.70 / 5.83 and 13.0 / 11.1"],
    ["Latent consistency models (Luo et al., Oct 2023)", "Consistency distillation in SD's latent space, guidance baked in (w = 8 in the tables)",
     "1 to 8", "LAION-Aesthetics 6+ at 512 px, FID 35.36 / 13.31 / 11.10 / 11.84 at 1 / 2 / 4 / 8 steps against DDIM's 183.29 / 81.05 / 22.38 / 13.83 (Table 1); about 32 A100 GPU hours"],
    ["LCM-LoRA (Luo et al., Nov 2023)", "The same distillation as a LoRA on an unchanged base model", "2 to 8",
     "67.5M trainable parameters on SD 1.5's 0.98B; run here, below"],
    ["Adversarial diffusion distillation (Sauer et al., Nov 2023)", "Distillation loss plus a GAN discriminator on frozen DINOv2 ViT-S features; the SD-Turbo (from SD 2.1) and SDXL-Turbo model cards name it as their training method",
     "1 to 4", "ADD-M (SD 1.5 backbone) at 1 step: COCO FID-5k 19.7, CLIP 0.326, 0.09 s, against DPM-Solver at 25 steps 20.1 (Table 2); human raters prefer ADD-XL at 4 steps over SDXL at 50 steps"],
    ["Distribution matching distillation (Yin et al., Nov 2023; DMD2 May 2024)", "Match the student's output distribution to the teacher's using two score models",
     "1 to 4", "ImageNet 64 one-step FID 2.62 (DMD), 1.28 (DMD2, longer training; teacher EDM 2.32 deterministic); SDXL-based DMD2 4 steps COCO-10k FID 19.32 against the 100-call teacher's 19.36"],
]


def build(c):
    m4, m8, ex, sm, gu, sd, toy, rc, G = c["m4"], c["m8"], c["ex"], c["sm"], c["gu"], c["sd"], c["toy"], c["rc"], c["G"]
    byname, lab = c["byname"], c["lab"]
    f, txt = {}, {}
    T = {(r["tau"], r["eta"], r["steps"]): r for r in toy["runs"]}
    for tau in (1.0, 2.0):
        for eta in (0.0, 1.0):
            for n in (50, 1000):
                f[f"toy_t{int(tau)}_e{int(eta)}_{n}"] = fmt(T[(tau, eta, n)]["tv"], 3)
            f[f"toy_t{int(tau)}_e{int(eta)}_between"] = pct(T[(tau, eta, 1000)]["between"], 1)
    s = rc["schedules"]
    f["lin_noise_frac"] = pct(s["linear"]["frac_noise_dominated"], 0)
    f["sd_noise_frac"] = pct(s["scaled"]["frac_noise_dominated"], 0)
    ml = rc["mean_leak"]
    f["mean_snr"] = fmt(ml["sd_mean_snr_999"], 1); f["mean_snr_t"] = str(ml["sd_t_where_pixel_snr_equals_mean_snr_999"])
    f["mean_snr_off"] = fmt(ml["sd_mean_snr_999_offset0.1"], 2)
    sg = rc["sigma"]
    f["sig_lin_min"] = fmt(sg["linear_sigma_min"], 2); f["sig_lin_max"] = fmt(sg["linear_sigma_max"], 0)
    f["sig_sd_min"] = fmt(sg["sd_sigma_min"], 3); f["sig_sd_max"] = fmt(sg["sd_sigma_max"], 1)
    f["karras10"] = ", ".join(f"{v:g}" for v in rc["karras_sd_10"])
    f["edm_pmean"] = "&minus;1.2"; f["edm_pstd"] = "1.2"
    f["floor"] = fmt(lab["floor_fd"], 1)
    f["real_acc"] = pct(float(c["lab_pd"]["f"]["real_acc"]), 1); f["real_div"] = fmt(float(c["lab_pd"]["f"]["real_div"]), 2)
    f["ddim50"] = fmt(m4["ddim"][50]["fd"], 1); f["eta1_50"] = fmt(m4["eta1.0"][50]["fd"], 1)
    cfgl = {r["scale"]: r for r in lab["cfg"]}
    f["beyond1"] = pct(cfgl[1]["beyond_range_frac"], 0); f["beyond15"] = pct(cfgl[15]["beyond_range_frac"], 0)
    f["sd_25s"] = "15.8"
    f["pubdate"] = "2026-10-17"
    f["lcm_mb"] = "134.6"
    measured(c, f, txt)
    return f, txt, DIST, {"dz-p1": 0, "dz-p2": 2, "dz-p3": 0}


def measured(c, f, txt):
    m4, m8, sm, ex, gu, sd, lab, byname = c["m4"], c["m8"], c["sm"], c["ex"], c["gu"], c["sd"], c["lab"], c["byname"]
    tr_more, tr_bad, pub = c["tr_more"], c["tr_bad"], c["pub"]
    S = {r["key"]: r for r in sd["runs"]}
    g = lambda k, n: m4[k][n]
    FD = lambda r: fmt(r["fd"], 1)
    # ---- prose keys
    f["m8_min"] = fmt(tr_more["seconds"] / 60, 1); f["bad_min"] = fmt(tr_bad["seconds"] / 60, 1)
    f["repro"] = f"DDIM 10 steps FD {FD(byname['lab_ddim'])} and DDPM 10 steps {FD(byname['lab_ddpm'])}, the lab's 181.34 and 130.5"
    f["sd_peak"] = fmt(sd["peak_mps_mib"] / 1024, 2)
    f["loopcheck"] = f"identical to the pipeline's image, largest pixel difference {sd['loop_vs_pipeline_max_abs_pixel']}"
    f["sd_n"] = str(len(sd["runs"]))
    f["sat20"] = fmt(S["cfg20_r0.0"]["mean_saturation"], 2); f["sat20r"] = fmt(S["cfg20_r0.7"]["mean_saturation"], 2)
    f["sat20i"] = fmt(S["interval20"]["mean_saturation"], 2)
    f["init_sigma"] = fmt(ex["euler_init_noise_sigma"], 1)
    f["rt"] = "40"
    # ---- eta check output (dz-out box)
    txt["dz-eta-check"] = (f"Checked on 16 noise images, 10 steps, float32 on MPS: eta = 0 against the lab's DDIM, largest difference "
                           f"{sm['check_eta0_vs_lab_ddim']:.1g}; eta = 1 against the lab's DDPM with the same noise draws, {sm['check_eta1_vs_lab_ddpm']:.1e}.")
    # ---- sampler summary
    best = {}
    for k, runs in m4.items():
        for n, r in runs.items():
            nfe = r["nfe"]
            if nfe <= 20 and (nfe not in best or r["fd"] < best[nfe][1]["fd"]):
                best[nfe] = (k, r)
    lab_names = {s[0]: s[1] for s in c["SAMPLERS"]}
    txt["dz-samp-txt"] = (
        f"<b>What it shows</b> {M}. Three groups. The deterministic ODE solvers (DDIM, Euler, UniPC, DPM-Solver++ 2M, Heun) all flatten out "
        f"between FD 100 and 110: UniPC {FD(g('unipc', 50))}, DPM-Solver++ {FD(g('dpm', 50))}, Heun {FD(g('heun', 50))} at 50 steps against DDIM's "
        f"{FD(g('ddim', 50))}. Better solvers only get there sooner (UniPC {FD(g('unipc', 10))} at 10 calls against DDIM's {FD(g('ddim', 10))}). "
        f"The stochastic samplers keep improving: DDPM and Euler ancestral are the same algorithm (FD {FD(g('ddpm', 50))} and {FD(g('euler_a', 50))} at 50 steps), "
        f"and the second-order stochastic DPM-Solver++ 2M SDE is the best sampler here from 20 to 50 calls ({FD(g('dpm2m_sde', 20))} at 20, {FD(g('dpm2m_sde', 50))} at 50). "
        f"Two schedulers fail at very few steps: Heun at 2 and 4 steps (FD {FD(g('heun', 2))} and {FD(g('heun', 4))}, saturated blobs) and DPM-Solver++ with "
        f"Karras sigmas at 4 steps ({FD(g('dpm2m_karras', 4))}): on the tiny model's schedule &sigma; runs up to 157, and &rho; = 7 spacing then puts "
        f"almost all of a short walk at very high noise. Karras spacing is the best deterministic choice at exactly 10 steps ({FD(g('dpm2m_karras', 10))}), "
        f"then rises back to the ODE plateau. Clipping the clean-image guess does not help this model (DDPM 50 steps {FD(g('ddpm_clip', 50))} with clipping, "
        f"{FD(g('ddpm', 50))} without). Every sample and number is in the {{Sampler workbench|#t-dzsamp}}.")
    D1 = pub[0]["numbers"]["table1_cifar10_fid"]
    txt["dz-ddimtab"] = (f"Table 1 of the DDIM paper on CIFAR-10: FID {D1['eta_0.0'][0]} for &eta; = 0 against {D1['eta_1.0'][0]} for &eta; = 1 at 10 steps, "
                         f"{D1['eta_0.0'][2]} against {D1['eta_1.0'][2]} at 50; the two meet only near 1,000 steps ({D1['eta_0.0'][4]} and {D1['eta_1.0'][4]}) {P}")
    txt["dz-eta-txt"] = (f"It does, and half the noise gets most of the way {M}: at 50 steps FD {FD(g('ddim', 50))} (&eta; = 0), {FD(g('eta0.5', 50))} (&eta; = 0.5), "
                         f"{FD(g('eta1.0', 50))} (&eta; = 1); at 250 steps {FD(g('ddim', 250))}, {FD(g('eta0.5', 250))}, {FD(g('eta1.0', 250))}. "
                         f"Class accuracy follows ({pct(g('ddim', 50)['acc'])}, {pct(g('eta0.5', 50)['acc'])}, {pct(g('eta1.0', 50)['acc'])} at 50 steps): "
                         f"the deterministic samples are the ones stranded between classes, exactly as in the toy.")
    r = lambda k, n: m8[k][n]
    txt["dz-m8-txt"] = (f"Its noise-prediction error at t = 999 fell from the bad model's {tr_bad['per_t'][-1]['eps_mse']} to {tr_more['per_t'][-1]['eps_mse']} (validation MSE). "
                        f"Results {M}: at 10 steps DDIM now <b>wins</b>, FD {FD(r('ddim', 10))} against DDPM's {FD(r('ddpm', 10))} (at 4,000 steps it lost, "
                        f"{FD(g('ddim', 10))} against {FD(g('ddpm', 10))}); at 50 steps they are level ({FD(r('ddim', 50))} and {FD(r('ddpm', 50))}); "
                        f"with many steps the stochastic sampler still pulls ahead ({FD(r('ddpm', 250))} against {FD(r('ddim', 250))} at 250, and DDPM at 1,000 steps "
                        f"reaches {FD(r('ddpm', 1000))}, near the real-image floor of {fmt(lab['floor_fd'], 1)}). A better model moves the crossover towards the DDIM paper's picture.")
    txt["dz-rule-txt"] = ("A deterministic sampler is exact for the model you have, errors included; a stochastic one partly corrects them, at the price of needing "
                          "more steps. With a well-trained model and a budget of 10 to 30 calls, use an ODE solver (DPM-Solver++ 2M, UniPC); with an "
                          "under-trained, small or out-of-distribution model, or a large budget, try a stochastic one (DPM-Solver++ 2M SDE, ancestral, EDM's churn). "
                          "EDM measured the same on ImageNet-64: the pretrained ADM model went from FID 2.64 with their best deterministic sampler (79 calls) to 1.55 "
                          f"with tuned stochasticity (511 calls) {P}. Re-measure after every training run that matters.")
    zt = S["ztsnr_eps"]
    txt["dz-zt-txt"] = (f"{M}: the last timestep's &#257; is exactly {c['sd'].get('ztsnr_abar_last', 0.0):g}, the first step divides by zero, the latents become NaN, "
                        f"and the decoded image is a black square (mean {fmt(zt['mean'], 2)}, standard deviation {fmt(zt['std'], 2)}; numpy warns about invalid values "
                        f"when casting to bytes). The same scheduler with SD 1.5's own schedule gives the normal image. The flag is only half of the recipe.")
    txt["dz-shift-txt"] = ("Hoogeboom, Heek and Salimans (2023) make it a rule: take a schedule designed at 64 &times; 64 and, at d &times; d, multiply its SNR by "
                           "(64/d)&sup2;, a shift of log SNR by 2 log(64/d); on ImageNet 256 that moved their training FID from 7.65 to 3.76 " + P + ".")
    txt["dz-minsnr-txt"] = ("Hang et al. (2023) report that Min-SNR-5 reaches FID 10 on ImageNet 256 3.4 times faster than the plain loss " + P +
                            "; EDM's weighting with its log-normal noise sampling is part of their CIFAR-10 FID 1.79 at 35 calls " + P + ".")
    s20, s20r, i20, i12, s12 = S["cfg20_r0.0"], S["cfg20_r0.7"], S["interval20"], S["interval12"], S["cfg12_r0.0"]
    resc = {x["scale"]: x for x in c["G"]["rescale"]}; cfg = {x["scale"]: x for x in c["G"]["cfg"]}
    txt["dz-resc-txt"] = (f"<b>What it shows</b> {M}: on SD 1.5, an &epsilon;-model with a non-zero terminal SNR, rescale at 0.7 barely changes the image: "
                          f"saturation at scale 20 goes from {fmt(s20['mean_saturation'], 3)} to {fmt(s20r['mean_saturation'], 3)} and the share of clipped "
                          f"pixels even rises ({pct(s20['clipped_frac'])} to {pct(s20r['clipped_frac'])}). On the tiny pixel model it does no better "
                          f"(saturated pixels at s = 7.5: {pct(cfg[7.5]['white'])} plain, {pct(resc[7.5]['white'])} rescaled; FD {FD(cfg[7.5])} and {FD(resc[7.5])}). "
                          "Lin et al. introduced it for a zero-terminal-SNR v-model, where guided predictions overshoot much more; it is not a general fix for "
                          "saturation, which is why the next fix exists.")
    itv = {x["scale"]: x for x in c["G"]["interval"]}
    txt["dz-int-txt"] = (f"Measured on SD 1.5 with the interval the paper used for SD-XL, &sigma; in (0.28, 5.42], which guides {i20['guided_steps']} of the 25 steps "
                         f"{M}: saturation at scale 20 falls from {fmt(s20['mean_saturation'], 2)} to {fmt(i20['mean_saturation'], 2)}, at scale 12 from "
                         f"{fmt(s12['mean_saturation'], 2)} to {fmt(i12['mean_saturation'], 2)}, the scene keeps its lighthouse, and the image takes "
                         f"{fmt(i20['sec'], 1)} s instead of {fmt(s20['sec'], 1)} s (6 fewer U-Net passes of 50). On the tiny model, mapped to timesteps "
                         f"{c['gu']['interval_t'][0]} to {c['gu']['interval_t'][1]} (24 of 50 DDIM steps), it gives the best FD of any CFG setting, "
                         f"{FD(itv[3])} at s = 3 with {pct(itv[3]['acc'])} accuracy and diversity {fmt(itv[3]['div'], 1)}, against plain CFG's best "
                         f"{FD(cfg[2])} at s = 2. Published: EDM2-XXL on ImageNet-512 FID 1.81 to 1.40, guiding 6 of 32 steps with (0.19, 1.61] {P}.")
    au = {x["scale"]: x for x in c["G"]["auto"]}; bad = byname["bad_alone"]
    txt["dz-auto-txt"] = (f"Tested here with the weak model trained for this page (TinyUNet base 16, 262,385 parameters, 1,000 steps; alone it scores FD {FD(bad)}) {M}: "
                          f"at w = 1.5 autoguidance gives FD {FD(au[1.5])}, the best tiny-model score on this page at 50 steps, with diversity {fmt(au[1.5]['div'], 1)} "
                          f"(real images {c['lab_pd']['f']['real_div']}, plain CFG at its best {fmt(cfg[2]['div'], 1)}) and accuracy {pct(au[1.5]['acc'])}. "
                          f"Larger w overshoots (FD {FD(au[3])} at w = 3). The published claim reproduces in kind: better fidelity without CFG's loss of variety. "
                          f"Published: ImageNet-512 EDM2-S FID 2.23 with CFG to 1.34, guided by an XS model trained 1/16 as long; EDM2-XXL 1.81 to 1.25 {P}.")
    l4, d4, l1, l8, lc2 = S["lcm_4"], S["dpm_4"], S["lcm_1"], S["lcm_8"], S["lcm_4_cfg2"]
    txt["dz-lcm-txt"] = (f"<b>What it shows</b> {M}: at 2 and 4 steps DPM-Solver++ gives a blur and a soft scene, LCM-LoRA a sharp, finished-looking coast at every step "
                         f"count, even 1, and fast ({fmt(l4['sec'], 2)} s at 4 steps against {fmt(d4['sec'], 2)} s, since it makes one call per step). But look at the "
                         "lighthouse: LCM-LoRA drops it at every step count, where DPM-Solver++ keeps it from 4 steps. With guidance off the student follows the prompt "
                         f"less closely, and turning guidance up to 2 oversaturates (mean saturation {fmt(lc2['mean_saturation'], 2)} against {fmt(l4['mean_saturation'], 2)}). "
                         "Few-step students trade prompt adherence and control for speed, which is why the papers report CLIP score and human preference beside FID.")
    raw50, raw50p = byname["raw_ddim_50"], byname["raw_ddpm_50"]
    txt["dz-ema-txt"] = (f"{M}: the lab's raw weights at step 4,000 score FD {FD(raw50)} with DDIM 50 and {FD(raw50p)} with DDPM 50, against {FD(g('ddim', 50))} "
                         f"and {FD(g('ddpm', 50))} for the EMA copy of the same run.")
    txt["dz-edm2-txt"] = "EDM2 reports ImageNet-512 FID 1.81 with this machinery and guidance (EDM2-XXL), 1.91 without " + P + "."
    txt["dz-drop-txt"] = ("Ho and Salimans found dropping 10% or 20% of conditions about equally good and 50% worse " + P + "; the tiny model uses 10%.")
    txt["dz-len-txt"] = (f"Doubling the tiny model's training (4,000 to 8,000 steps, {fmt(tr_more['seconds'] / 60, 1)} more minutes) moved DDIM at 50 steps from "
                         f"FD {FD(g('ddim', 50))} to {FD(r('ddim', 50))} and DDPM at 1,000 steps from {FD(g('ddpm', 1000))} to {FD(r('ddpm', 1000))} {M}; "
                         "the model was far from converged, which is the context for every sampler result here.")
    bug = lambda k: byname[k]
    txt["dz-bug-noinit"] = (f"{M}: FD {FD(bug('bug_noinit_50'))}, diversity {fmt(bug('bug_noinit_50')['div'], 2)} (real images {c['lab_pd']['f']['real_div']}): "
                            "every sample collapses to nearly the same faint shape.")
    txt["dz-bug-int"] = f"{M}: FD {FD(bug('bug_int_t_50'))}, accuracy {pct(bug('bug_int_t_50')['acc'])} (chance is 10%)."
    txt["dz-bug-cos"] = (f"{M}: FD {FD(bug('bug_cosine_50'))}, accuracy {pct(bug('bug_cosine_50')['acc'])}: the cosine schedule claims far more signal at "
                         "middle timesteps than the model was trained with, so each step removes the wrong amount of noise.")
    txt["dz-bug-zt"] = "On SD 1.5 it produced an all-black image (section 2) " + M + "."
    txt["dz-bug-clip"] = (f"On the tiny pixel model clipping did not help {M}: DDPM 50 steps FD {FD(g('ddpm_clip', 50))} with it, {FD(g('ddpm', 50))} without "
                          f"(250 steps: {FD(g('ddpm_clip', 250))} and {FD(g('ddpm', 250))}).")
    txt["dz-bug-ema"] = f"{M}: DDIM 50 steps FD {FD(raw50)} raw against {FD(g('ddim', 50))} EMA."
    txt["dz-papers"] = "; ".join(a(f"https://arxiv.org/abs/{i}", t) for i, t in PAPERS) + "."
