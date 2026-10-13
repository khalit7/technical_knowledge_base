"""Timed measurements for single techniques (hold the bench lock; run_misc.sh does). torch.utils.benchmark.Timer
with blocked_autorange for small ops (it warms up, picks the number of runs, and reports median and IQR);
whole training steps with a device synchronize. Every result records the load average.
    python time_misc.py <part> [...]   parts: optim attn flex ckpt amp lce ao data timer
-> inputs/time_<part>.json
"""
import json, math, os, statistics, sys, time, warnings
import torch
import torch.nn.functional as F
import torch.utils.benchmark as tb
import common
from variants import forward
warnings.filterwarnings("ignore")
torch.set_num_threads(4)
DEVS = ["cpu"] + (["mps"] if torch.backends.mps.is_available() else [])


def sync(d):
    if d == "mps":
        torch.mps.synchronize()


def bench(fn, device, min_run_time=1.0):
    def call():
        fn(); sync(device)
    call()
    m = tb.Timer(stmt="call()", globals={"call": call}, num_threads=torch.get_num_threads()).blocked_autorange(min_run_time=min_run_time)
    return {"median_ms": round(m.median * 1e3, 4), "iqr_ms": round(m.iqr * 1e3, 4), "runs": len(m.times),
            "number_per_run": m.number_per_run}


def la():
    return [round(v, 2) for v in os.getloadavg()]


def steps_ms(device, how, cfgname="big", steps=10, warm=3, trials=3, **cfgkw):
    res = []
    for _ in range(trials):
        c = common.cfg(cfgname, **cfgkw); m = common.make_model(c, device); opt = common.make_optimizer(m)
        for s in range(warm + steps):
            if s == warm:
                sync(device); t0 = time.perf_counter()
            x, y = common.get_batch(c, s, device)
            l = forward(m, x, y, how); l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
        sync(device); res.append(1e3 * (time.perf_counter() - t0) / steps)
    return {"trials_ms": [round(v, 2) for v in res], "median_ms": round(statistics.median(res), 2)}


def part_optim():
    out = []
    for d in DEVS:
        for name in ("small", "big"):
            c = common.cfg(name); m = common.make_model(c, d)
            x, y = common.get_batch(c, 0, d); m(x, y)[1].backward()
            for impl in ("forloop", "foreach", "fused"):
                kw = {"foreach": False} if impl == "forloop" else ({"foreach": True} if impl == "foreach" else {"fused": True})
                opt = torch.optim.AdamW(m.parameters(), lr=6e-4, betas=(0.9, 0.95), **kw)
                opt.step()
                r = bench(lambda: opt.step(), d); r.update(device=d, config=name, impl=impl, load=la()); out.append(r)
                print(r, file=sys.stderr)
    return out


def part_attn():
    """Forward + backward of one attention call, (B=1, H=8, T, D=64), SDPA vs written out."""
    out = []
    for d in DEVS:
        for T in (256, 1024, 2048):
            g = torch.Generator().manual_seed(0)
            q, k, v = (torch.randn(1, 8, T, 64, generator=g).to(d).requires_grad_(True) for _ in range(3))
            mask = torch.ones(T, T, dtype=torch.bool, device=d).tril()
            def sdpa():
                F.scaled_dot_product_attention(q, k, v, is_causal=True).sum().backward()
            def manual():
                s = (q @ k.transpose(-2, -1)) / 8.0
                (torch.softmax(s.masked_fill(~mask, float("-inf")), -1) @ v).sum().backward()
            for name, fn in (("sdpa", sdpa), ("manual", manual)):
                r = bench(fn, d); r.update(device=d, T=T, impl=name, load=la()); out.append(r); print(r, file=sys.stderr)
    return out


def part_flex():
    """Inference (no grad): FlexAttention with a BlockMask vs SDPA with the same dense mask vs SDPA is_causal.
    Compiled flex on MPS; on this CPU compiled flex is unsupported (macOS), so CPU runs eager flex."""
    from flex_lab import masks
    from torch.nn.attention.flex_attention import flex_attention, create_block_mask, create_mask
    out = []
    for d in DEVS:
        flex_c = torch.compile(flex_attention, dynamic=False) if d == "mps" else flex_attention
        for T in (1024, 4096):
            g = torch.Generator().manual_seed(0)
            q, k, v = (torch.randn(1, 8, T, 64, generator=g).to(d) for _ in range(3))
            mm, _ = masks(T, d)
            with torch.no_grad():
                r = bench(lambda: F.scaled_dot_product_attention(q, k, v, is_causal=True), d)
                r.update(device=d, T=T, mask="causal", impl="sdpa is_causal", load=la()); out.append(r); print(r, file=sys.stderr)
                for name, fn in mm.items():
                    bm = create_block_mask(fn, None, None, T, T, device=d)
                    dense = create_mask(fn, None, None, T, T, device=d)
                    r = bench(lambda: flex_c(q, k, v, block_mask=bm), d)
                    r.update(device=d, T=T, mask=name, impl="flex compiled" if d == "mps" else "flex eager", load=la()); out.append(r); print(r, file=sys.stderr)
                    r = bench(lambda: F.scaled_dot_product_attention(q, k, v, attn_mask=dense), d)
                    r.update(device=d, T=T, mask=name, impl="sdpa dense mask", load=la()); out.append(r); print(r, file=sys.stderr)
    return out


def part_ckpt():
    out = []
    for d in DEVS:
        for how in ("plain", "ckpt", "sac_mm", "sac_attn"):
            r = steps_ms(d, how); r.update(device=d, how=how, config="big", load=la()); out.append(r); print(r, file=sys.stderr)
    return out


def part_lce():
    out = []
    for d in DEVS:
        for how in ("plain", "lce"):
            r = steps_ms(d, how, vocab_size=50257, trials=3, steps=5, warm=2)
            r.update(device=d, how=how, config="big_v50k", load=la()); out.append(r); print(r, file=sys.stderr)
    return out


def part_amp():
    """One (4096 x 4096) @ (4096 x 4096) matmul in float32, bfloat16 and float16, and the larger variant's training step
    with and without autocast(bfloat16)."""
    out = []
    for d in DEVS:
        for dt in (torch.float32, torch.bfloat16, torch.float16):
            a = torch.randn(2048, 2048, device=d, dtype=dt); b = torch.randn(2048, 2048, device=d, dtype=dt)
            r = bench(lambda: a @ b, d); r.update(device=d, op="matmul 2048", dtype=str(dt)[6:], gflops=round(2 * 2048 ** 3 / (r["median_ms"] / 1e3) / 1e9, 1), load=la())
            out.append(r); print(r, file=sys.stderr)
        nt, nw, ns = (3, 3, 10) if d == "mps" else (1, 1, 2)    # CPU bfloat16 steps take about 44 s each here
        for amp in (False, True):
            res = []
            for _ in range(nt):
                c = common.cfg("big"); m = common.make_model(c, d); opt = common.make_optimizer(m)
                for s in range(nw + ns):
                    if s == nw:
                        sync(d); t0 = time.perf_counter()
                    x, y = common.get_batch(c, s, d)
                    with torch.autocast(device_type=d, dtype=torch.bfloat16, enabled=amp):
                        l = m(x, y)[1]
                    l.backward(); opt.step(); opt.zero_grad(set_to_none=True)
                sync(d); res.append(1e3 * (time.perf_counter() - t0) / ns)
            r = {"device": d, "op": "big step", "autocast_bf16": amp, "trials": nt, "warmup": nw, "steps": ns, "trials_ms": [round(v, 2) for v in res], "median_ms": round(statistics.median(res), 2), "load": la()}
            out.append(r); print(r, file=sys.stderr)
    return out


def part_ao():
    """Weight-only quantized Linear (4096 -> 4096) vs float32, for one token (M=1, decode-like) and 2048 tokens (M=2048).
    torchao 0.18.0, CPU only (the configs that run here)."""
    import copy
    from torchao.quantization import quantize_, Int8WeightOnlyConfig, IntxWeightOnlyConfig, Int8DynamicActivationInt8WeightConfig
    from torchao.quantization.granularity import PerGroup
    out = []
    base = torch.nn.Sequential(torch.nn.Linear(4096, 4096, bias=False)).eval()
    cfgs = {"float32": None, "int8 weight-only": Int8WeightOnlyConfig(),
            "int4 (Intx, group 32) weight-only": IntxWeightOnlyConfig(weight_dtype=torch.int4, granularity=PerGroup(32)),
            "int8 dynamic act + int8 weight": Int8DynamicActivationInt8WeightConfig()}
    for name, c in cfgs.items():
        m = copy.deepcopy(base)
        if c is not None:
            quantize_(m, c)
        for M in (1, 2048):
            x = torch.randn(M, 4096)
            with torch.no_grad():
                r = bench(lambda: m(x), "cpu")
            r.update(device="cpu", config=name, M=M, load=la()); out.append(r); print(r, file=sys.stderr)
    return out


class Slow(torch.utils.data.Dataset):
    def __init__(self, ms, T=256):
        self.ms, self.T = ms, T
    def __len__(self):
        return 10 ** 6
    def __getitem__(self, i):
        end = time.perf_counter() + self.ms / 1e3
        while time.perf_counter() < end:
            pass
        return torch.randint(43, (self.T + 1,))


def part_data():
    """A consumer that needs 20 ms per batch (a stand-in for the step, sleep so it leaves the CPU free) fed by a
    DataLoader whose samples cost 2 ms of Python work each (batch 8: 16 ms per batch in one process)."""
    out = []
    for cost, nw, pin, pf in ((0.0, 0, False, None), (2.0, 0, False, None), (2.0, 1, False, 2), (2.0, 2, False, 2), (2.0, 4, False, 2), (2.0, 2, False, 1), (2.0, 2, False, 4)):
        dl = torch.utils.data.DataLoader(Slow(cost), batch_size=8, num_workers=nw, prefetch_factor=pf, persistent_workers=nw > 0, pin_memory=pin)
        it = iter(dl)
        for _ in range(5):
            next(it); time.sleep(0.02)
        waits, t0 = [], time.perf_counter()
        for _ in range(40):
            a = time.perf_counter(); next(it); waits.append(1e3 * (time.perf_counter() - a)); time.sleep(0.02)
        total = 1e3 * (time.perf_counter() - t0) / 40
        r = {"sample_cost_ms": cost, "num_workers": nw, "prefetch_factor": pf, "pin_memory": pin, "ms_per_step": round(total, 2),
             "median_wait_ms": round(statistics.median(waits), 2), "load": la()}
        out.append(r); print(r, file=sys.stderr)
        del it, dl
    return out


def part_timer():
    """The same op timed three ways: one perf_counter call, a loop without synchronize on MPS, benchmark.Timer."""
    out = {}
    d = "mps" if "mps" in DEVS else "cpu"
    a = torch.randn(2048, 2048, device=d); b = torch.randn(2048, 2048, device=d)
    a @ b; sync(d)
    t0 = time.perf_counter(); a @ b; out["mps_no_sync_ms"] = round(1e3 * (time.perf_counter() - t0), 4)
    sync(d)
    t0 = time.perf_counter(); a @ b; sync(d); out["mps_with_sync_ms"] = round(1e3 * (time.perf_counter() - t0), 4)
    out["timer"] = bench(lambda: a @ b, d)
    out["load"] = la()
    print(out, file=sys.stderr)
    return out


if __name__ == "__main__":
    for part in sys.argv[1:]:
        res = globals()["part_" + part]()
        common.dump(f"time_{part}.json", {"env": common.env(), "results": res})
