"""PyTorch to JAX page. Checks that ../index.html embeds exactly the data runs/make_data.py builds from runs/out/*.json, that every
data-k span points at a value that exists, and that the numbers written directly in the prose agree with the data.
Plain Python 3: python3 -B check_data.py (after sh build.sh).
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "index.html"), encoding="utf-8").read()
fails = 0


def ok(cond, msg):
    global fails
    print(("ok   " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


# 1. embedded data equals a fresh build from the recorded outputs
m = re.search(r"window\.PJ=(\{.*?\});\n</script>", html, re.S)
ok(m is not None, "window.PJ found in the page")
emb = json.loads(m.group(1))
subprocess.run([sys.executable, "-B", os.path.join(HERE, "runs", "make_data.py")], check=True, capture_output=True)
part = open(os.path.join(HERE, "parts", "22_js_pj_data.js"), encoding="utf-8").read()
fresh = json.loads(part[part.index("window.PJ=") + len("window.PJ="):].rstrip().rstrip(";"))
ok(emb == fresh, "embedded data identical to make_data.py output from runs/out/*.json")


# 2. every data-k / data-code path resolves (same longest-key rule as the page's PJU.get)
def get(o, path):
    rest = path
    while rest:
        if isinstance(o, list):
            k, _, rest2 = rest.partition(".")
            if k == "length" and not rest2:
                return len(o)
            if not k.isdigit() or int(k) >= len(o):
                return KeyError
            o, rest = o[int(k)], rest2
            continue
        if not isinstance(o, dict):
            return KeyError
        if rest in o:
            return o[rest]
        ks = sorted((k for k in o if rest.startswith(k + ".")), key=len, reverse=True)
        if not ks:
            return KeyError
        o, rest = o[ks[0]], rest[len(ks[0]) + 1:]
    return o


paths = re.findall(r'data-(?:k|code)="([^"]+)"', html)
missing = [p for p in paths if get(emb, p) is KeyError or get(emb, p) is None]
ok(not missing, f"{len(paths)} data paths resolve ({missing[:5]})")

# 3. numbers written in the prose, checked against the data
J = emb
H = J["hunt"]["variants"]
root_src = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data"))
lines = [sum(1 for _ in open(os.path.join(root_src, f))) for f in ("model_torch.py", "model_nnx.py", "model_jax.py")]
ok(min(lines) == 116 and max(lines) == 148, f"model files {lines} lines (prose: 116 to 148)")
ok(len(H) - 1 == 17, f"{len(H) - 1} port variants besides the correct one (prose: seventeen)")
ok(sum(1 for k, v in H.items() if k != "correct" and v["src"].startswith("root")) == 7, "seven variants reused from the root")
ok(J["convert"]["n_tensors"] == 69 and J["convert"]["n_transposed"] == 25, "69 tensors, 25 transposed")
ok(len(J["drills"]["drills"]) == 11, "eleven drills")
ok(J["hunt"]["harness_check"]["max_abs_vs_root_correct"] == 0.0, "harness reproduces the root's correct curve exactly")
ok(32 * 128 == 4096, "4,096 characters per batch")
lr0 = 1e-3 * 1 / 50
ok(abs(lr0 / 1e-8 - 2000) < 1e-6, "lr at step 0 / eps = 2,000")
L64 = J["ladder"]["correct_float64"]
ratio = L64["step1"] / (L64["grads"] * 2000)
ok(0.5 < ratio < 2, f"one-step gap / (grad gap x 2000) = {ratio:.2f} in float64 (prose: the measured one-step gap)")
kb = J["ladder"]["correct_float32"]["keybias_grad_torch"]
step = 1e-3 * kb / 1e-8
ok(1e-6 < step < 4e-6 and 300 < 1e-3 / step < 800, f"key-bias step at full lr {step:.2e}, {1e-3 / step:.0f}x smaller than lr (prose: about 2e-6, some five hundred times)")
e = J["defaults"]["init"]["embedding"]
ok(10.5 < e["torch_std"] / e["flax_std"] < 12, f"embedding std ratio {e['torch_std'] / e['flax_std']:.1f} (prose: 11x)")
lw = J["defaults"]["init"]["linear_weight"]
ok(abs(lw["flax_std"] / lw["torch_std"] - 3 ** 0.5) < 0.05, "linear init stds sqrt(3) apart")
c = J["hunt"]["variants"]["correct"]["rungs"]
for k, t in (("logits", 1e-5), ("grads", 1e-5), ("step1", 1e-6)):
    r = t / c[k]
    ok(4 <= r <= 45, f"threshold {k} is {r:.1f}x the correct port's difference (prose: 4 to 45)")
ok(H["b2_default"]["val_300"] < H["correct"]["val_300"] and H["init"]["val_300"] < H["correct"]["val_300"], "b2 and Flax-init variants end lower (interview answer)")
D = J["dropout"]
ok(abs(D["runs"]["torch"]["val_300"] - D["runs"]["jax_fresh"]["val_300"]) < abs(D["summary"]["val_seed_noise"]), "torch vs jax dropout below seed noise")
ok(abs(D["runs"]["jax_reuse"]["val_300"] - D["runs"]["jax_fresh"]["val_300"]) < abs(D["summary"]["val_seed_noise"]), "reused key within seed noise at 300 steps")
G = J["gpt2"]
ok(G["n_params"] == 124439808 and G["greedy_same"] and G["mistakes"]["exact_gelu"]["greedy_same"] and not G["mistakes"]["transpose"]["greedy_same"], "GPT-2 facts quoted")
ok(J["interop"]["t2j"]["jax_value_after_torch_inplace_add"] == 105.0, "DLPack aliasing 5 -> 105")
ok(H["mask_inverted"]["first_nan_step"] == 0, "flipped mask: NaN at step 0")
ok(J["root"]["n_params"] == 826368, "parameter count 826,368")
ok("\u2014" not in html, "no em-dashes")
print("FAILED", fails) if fails else print("all checks passed")
sys.exit(1 if fails else 0)
