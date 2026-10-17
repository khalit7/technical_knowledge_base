"""The two samplers written out by hand for the Diffusion lab (shown on the page), plus a wrapper that runs any
diffusers scheduler on the tiny model. Conventions: linear betas, T = 1000, the net takes t / T in [0, 1).

CFG uses diffusers' guidance scale s: eps = eps_u + s (eps_c - eps_u); s = 1 is the plain conditional model, s = 0 the
unconditional one. (The shared objectives.py writes the same thing as eps_c + w (eps_c - eps_u) with w = s - 1.)
"""
import torch


def guided(net, x, t_int, y, s, T=1000):
    """One denoiser evaluation (two when 1 < s or s < 1: conditional and unconditional in one batch of 2N)."""
    tt = torch.full((x.shape[0],), float(t_int) / T, device=x.device)
    if s == 1:
        return net(x, tt, y)
    if s == 0:
        return net(x, tt, None)
    out = net(torch.cat([x, x]), torch.cat([tt, tt]), torch.cat([y, torch.full_like(y, 10)]))
    c, u = out.chunk(2)
    return u + s * (c - u)


def to_eps_x0(out, x, ab, pred):
    """Convert the network output to (predicted noise, predicted clean image) at cumulative alpha ab."""
    if pred == "eps":
        eps = out
        x0 = (x - (1 - ab).sqrt() * eps) / ab.sqrt()
    else:   # v = sqrt(ab) eps - sqrt(1 - ab) x0
        x0 = ab.sqrt() * x - (1 - ab).sqrt() * out
        eps = ab.sqrt() * out + (1 - ab).sqrt() * x
    return eps, x0


def trailing(n, T=1000):
    """n timesteps from T-1 down, evenly spaced (diffusers timestep_spacing='trailing')."""
    return [int(round(T - k * T / n)) - 1 for k in range(n)]


@torch.no_grad()
def ddim(net, abar, x, y, n, s=1.0, pred="eps", trace=None):
    """DDIM with eta = 0 (Song et al. 2020, eq. 12): deterministic, any number of steps n."""
    ts = trailing(n)
    for i, t in enumerate(ts):
        ab = abar[t]
        ab_prev = abar[ts[i + 1]] if i + 1 < n else torch.ones_like(ab)
        eps, x0 = to_eps_x0(guided(net, x, t, y, s), x, ab, pred)
        x = ab_prev.sqrt() * x0 + (1 - ab_prev).sqrt() * eps       # jump to the previous noise level
        if trace is not None:
            trace.append((t, x.clone(), x0.clone()))
    return x


@torch.no_grad()
def ddpm(net, abar, x, y, n, s=1.0, pred="eps", gen=None, trace=None):
    """Ancestral DDPM (Ho et al. 2020, eq. 6-7) on n respaced steps: sample the posterior q(x_prev | x_t, x0_hat)."""
    ts = trailing(n)
    for i, t in enumerate(ts):
        ab = abar[t]
        ab_prev = abar[ts[i + 1]] if i + 1 < n else torch.ones_like(ab)
        beta = 1 - ab / ab_prev                                     # the respaced step's beta
        eps, x0 = to_eps_x0(guided(net, x, t, y, s), x, ab, pred)
        mean = (ab_prev.sqrt() * beta * x0 + (1 - beta).sqrt() * (1 - ab_prev) * x) / (1 - ab)
        x = mean
        if i + 1 < n:                                               # fresh noise at every step but the last
            var = beta * (1 - ab_prev) / (1 - ab)                   # sigma^2 = beta_tilde (posterior variance)
            x = x + var.sqrt() * torch.randn(x.shape, generator=gen).to(x.device)
        if trace is not None:
            trace.append((t, x.clone(), x0.clone()))
    return x


@torch.no_grad()
def with_scheduler(net, sch, x, y, n, s=1.0, gen=None):
    """Run any diffusers scheduler (DDIM, DDPM, DPM-Solver, Euler) on the tiny net."""
    sch.set_timesteps(n)
    x = x * sch.init_noise_sigma
    for t in sch.timesteps:
        xin = sch.scale_model_input(x, t)
        out = guided(net, xin, float(t), y, s)
        kw = {"generator": gen} if gen is not None and "generator" in sch.step.__code__.co_varnames else {}
        x = sch.step(out, t, x, **kw).prev_sample
    return x
