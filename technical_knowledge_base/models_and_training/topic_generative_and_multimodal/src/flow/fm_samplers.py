"""ODE samplers for the flow-matching model, written out by hand (shown on the page).

Convention (Lipman et al. 2023, and the shared objectives.py): t = 0 is noise, t = 1 is data,
x_t = (1 - t) x0 + t x1, the net predicts the velocity v = x1 - x0. Sampling integrates dx/dt = v(x, t) from 0 to 1.
CFG in diffusers' convention: v = v_u + s (v_c - v_u); s = 1 is the plain conditional model.
"""
import torch


def vel(net, x, t, y, s=1.0):
    """One velocity evaluation (one batch of 2N when guidance mixes conditional and unconditional)."""
    tt = torch.full((x.shape[0],), float(t), device=x.device)
    if s == 1:
        return net(x, tt, y)
    if s == 0:
        return net(x, tt, None)
    out = net(torch.cat([x, x]), torch.cat([tt, tt]), torch.cat([y, torch.full_like(y, 10)]))
    c, u = out.chunk(2)
    return u + s * (c - u)


def grid(n, shift=1.0):
    """n + 1 times from 0 to 1. shift > 1 spends more steps near the noise end (SD3's shift, on sigma = 1 - t)."""
    sig = torch.linspace(1, 0, n + 1, dtype=torch.float64)
    sig = shift * sig / (1 + (shift - 1) * sig)
    return [float(1 - v) for v in sig]


@torch.no_grad()
def euler(net, x, y, n, s=1.0, shift=1.0, trace=None):
    ts = grid(n, shift)
    for t, t2 in zip(ts[:-1], ts[1:]):
        v = vel(net, x, t, y, s)
        if trace is not None:
            trace.append((t, x.clone(), (x + (1 - t) * v).clone()))     # where we are, and the straight-line guess of the end
        x = x + (t2 - t) * v
    return x


@torch.no_grad()
def heun(net, x, y, n, s=1.0):
    """Second order: an Euler predictor, then step with the average of the slopes at both ends (2 evaluations a step)."""
    ts = grid(n)
    for t, t2 in zip(ts[:-1], ts[1:]):
        h = t2 - t
        v1 = vel(net, x, t, y, s)
        v2 = vel(net, x + h * v1, t2, y, s)
        x = x + h * 0.5 * (v1 + v2)
    return x


@torch.no_grad()
def midpoint(net, x, y, n, s=1.0):
    """Second order: take the slope at the half step (2 evaluations a step)."""
    ts = grid(n)
    for t, t2 in zip(ts[:-1], ts[1:]):
        h = t2 - t
        v1 = vel(net, x, t, y, s)
        x = x + h * vel(net, x + 0.5 * h * v1, t + 0.5 * h, y, s)
    return x


@torch.no_grad()
def heun_last_euler(net, x, y, n, s=1.0):
    """Heun, but the last step is plain Euler, as diffusers' HeunDiscreteScheduler does (v0.41.0, scheduling_heun_discrete.py
    lines 364 and 367: no corrector on the final interval): never evaluates the net at t = 1, where the learned field
    degenerates to v = x. 2n - 1 evaluations."""
    ts = grid(n)
    for i, (t, t2) in enumerate(zip(ts[:-1], ts[1:])):
        h = t2 - t
        v1 = vel(net, x, t, y, s)
        if i == n - 1:
            x = x + h * v1
        else:
            x = x + h * 0.5 * (v1 + vel(net, x + h * v1, t2, y, s))
    return x
