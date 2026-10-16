"""MFU of the running example, measured the way a training loop should log it (Observability and cost page).
Runs inside the mi-train:1 image, one process, one thread:
  docker run --rm --memory 1g --cpus 1 -v <this dir>:/oc:ro mi-train:1 python /oc/oc_mfu.py
1. The ceiling: a large fp32 matmul on this CPU core (the "peak" an MFU is divided by; on a GPU it is the datasheet's
   dense peak, here it is measured, because a container's CPU share has no datasheet).
2. The job: the running example's model, batch 32 x 64 tokens, AdamW, timed per step with time.perf_counter
   (on a GPU: torch.cuda.synchronize() before reading the clock, or CUDA events).
3. Model FLOPs per step = 6 x parameters x tokens (+ the attention term 12 x layers x ctx x d per token, full square),
   the same convention as the Performance math page.
"""
import json, sys, time
import torch
import torch.nn.functional as F
sys.path.insert(0, "/opt/mi")
import train as T  # the running example, unchanged

torch.set_num_threads(1)
torch.manual_seed(0)

def ceiling(n=1024, reps=12):
    a, b = torch.randn(n, n), torch.randn(n, n)
    for _ in range(3):
        a @ b
    ts = []
    for _ in range(reps):
        t = time.perf_counter(); a @ b; ts.append(time.perf_counter() - t)
    ts.sort()
    return 2 * n**3 / ts[len(ts) // 2]

peak = [ceiling() for _ in range(3)]

class A: pass
a = A(); a.seed, a.ctx, a.global_batch = 1234, 64, 32
data, vocab = T.load_text("/opt/mi/input.txt")
model = T.GPT(vocab, 64, 2, 2, 64)
N = sum(p.numel() for p in model.parameters())
opt = torch.optim.AdamW(model.parameters(), lr=3e-3)
tokens = 32 * 64

def step(i):
    x, y = T.get_batch(data, i, a, 0, 1)
    loss = F.cross_entropy(model(x).view(-1, vocab), y.view(-1))
    opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
    return loss.item()

for i in range(10):
    step(i)                                   # warm-up, excluded (like compilation and first-step costs on a GPU)
times = []
for i in range(10, 110):
    t = time.perf_counter(); step(i); times.append(time.perf_counter() - t)
times_sorted = sorted(times)
med = times_sorted[len(times) // 2]
f6 = 6 * N * tokens
fatt = 12 * 2 * 64 * 64 * tokens              # 12 x layers x ctx x d per token, full-square attention
out = {
    "params": N, "tokens_per_step": tokens,
    "ceiling_flops": [round(p) for p in peak], "ceiling_median": round(sorted(peak)[1]),
    "step_s_median": round(med, 6), "step_s_p10": round(times_sorted[10], 6), "step_s_p90": round(times_sorted[90], 6),
    "model_flops_per_step_6N": f6, "attn_flops_per_step": fatt,
    "achieved_flops_6N": round(f6 / med), "achieved_flops_6N_attn": round((f6 + fatt) / med),
    "mfu_6N": round(f6 / med / sorted(peak)[1], 5), "mfu_6N_attn": round((f6 + fatt) / med / sorted(peak)[1], 5),
    "tokens_per_s": round(tokens / med, 1), "torch": torch.__version__,
}
print(json.dumps(out))
