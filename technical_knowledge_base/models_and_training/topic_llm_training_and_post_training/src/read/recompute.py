"""Recompute every derived number the Reading tab shows. Run: python3 src/read/recompute.py
Each block prints the figure and the formula; the page quotes these values."""
import math

print("== Axis 3: memory of one RL step at 7B (derived) ==")
# bytes per parameter: a trained model keeps bf16 weights + bf16 grads + fp32 master, momentum, variance = 16 (ZeRO paper §3.1)
TRAIN, FROZEN = 16, 2
N = 7e9
setups = {
  'PPO (InstructGPT recipe)': {'policy': TRAIN, 'critic': TRAIN, 'reference': FROZEN, 'reward model': FROZEN},
  'GRPO with a verifier': {'policy': TRAIN, 'reference': FROZEN},
  'DPO': {'policy': TRAIN, 'reference': FROZEN},
}
for k, v in setups.items():
    b = sum(v.values()); print(f"{k}: {b} B/param -> {b*N/1e9:.0f} GB  ({', '.join(f'{m} {x*N/1e9:.0f}' for m,x in v.items())})")
print("GRPO / PPO =", 18/36)

print("\n== Axis 3: compute shares (derived from published figures) ==")
print("InstructGPT PPO-ptx 175B / GPT-3 pretraining = 60/3640 =", f"{60/3640:.2%}")
print("InstructGPT SFT 175B / GPT-3 pretraining = 4.9/3640 =", f"{4.9/3640:.2%}")
print("DeepSeek-R1 RL+SFT data GPU hours / V3 official run = 147/2788 =", f"{147/2788:.1%}", " $:", 147e3*2, 2788e3*2)
print("Thomson Reuters $40M / MiMo-V2.6-Pro final RL $2.62M =", f"{40/2.62:.1f}")
print("MiMo Flash ~$0.85M / Pro $2.62M =", f"{0.85/2.62:.2f}")
print("Mercor APEX-Agents 27.29/16.11 =", f"{27.29/16.11:.3f}")
print("Thomson 200B / 19T =", f"{200/19000:.2%}")
print("DSec 5000 per s / 160 nodes =", 5000/160, "; 3M per day / 160 nodes =", 3e6/160, "per node per day; 3M/86400 =", f"{3e6/86400:.1f} per s average")
print("NeoHorse 4B gap closed: (64.87-58.94)/(65.60-58.94) =", f"{(64.87-58.94)/(65.60-58.94):.0%}")
print("Dwarkesh 12.0/3.7 =", f"{12.0/3.7:.2f}")
print("Llama 3: 419 stops in 54 days -> one every", f"{54*24/419:.1f} h")
print("Chinchilla tokens per parameter 1.4T/70B =", 1.4e12/70e9, "; Llama 3 405B 15.6T/405B =", f"{15.6e12/405e9:.1f}")

print("\n== Machinery: bytes per parameter (derived) ==")
nf4 = (4 + 0.127) / 8   # QLoRA: NF4 plus double-quantised constants, 0.127 bits per parameter (QLoRA §3)
rows = {'Full fine-tune, mixed-precision Adam': 16, 'LoRA on a bf16 base (adapters left out)': 2,
        'QLoRA, NF4 base with double quantisation': nf4, 'Serve in bf16': 2, 'Serve in FP8': 1, 'Serve in 4-bit (Q4_K_M, 4.89 bits)': 4.89/8}
for k, v in rows.items():
    print(f"{k}: {v:.3f} B/param; 65B -> {v*65:.1f} GB; 7B -> {v*7:.1f} GB; 405B -> {v*405:.0f} GB")
print("QLoRA paper's 16-bit fine-tune of 65B '>780 GB' = 12 B/param x 65 =", 12*65)

print("\n== Axis 4: KL leash, Gao et al. functional form (illustrative coefficients) ==")
# gold(d) = d (a - b ln d), d = sqrt(KL)   (Gao, Schulman, Hilton 2022, RL form)
A, B = 1.0, 0.6           # gold
AP, BP = 1.0, 0.08        # proxy: same form with a smaller penalty, so it keeps rising over the range
gold = lambda d: d*(A - B*math.log(d)) if d > 0 else 0.0
proxy = lambda d: d*(AP - BP*math.log(d)) if d > 0 else 0.0
dgold = lambda d: A - B*math.log(d) - B
dproxy = lambda d: AP - BP*math.log(d) - BP
print("gold peak at d* = exp(A/B - 1) =", f"{math.exp(A/B-1):.2f}", " gold(d*) =", f"{gold(math.exp(A/B-1)):.2f}")
def run(lam, steps=200, eta=0.06, d0=0.05):
    d = d0; out = []
    for t in range(steps+1):
        out.append((t, d, proxy(d), gold(d), d*d))
        # gradient ascent on proxy(d) - lam * KL, with KL = d^2
        d = max(1e-3, d + eta*(dproxy(d) - 2*lam*d))
    return out
for lam in (0.0, 0.22):
    r = run(lam)
    best = max(r, key=lambda x: x[3])
    print(f"lambda {lam}: final d {r[-1][1]:.2f} KL {r[-1][4]:.1f} proxy {r[-1][2]:.2f} gold {r[-1][3]:.2f}; best gold {best[3]:.2f} at step {best[0]}")
