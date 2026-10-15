"""Which entry points of the pinned clones import on this CPU machine (shared venv + this page's overlay).
Each module is imported in a fresh process. Run: python3 -B lc_imports.py (needs JX_SCRATCH) -> ../out/imports.json"""
import os, sys, json, subprocess, glob
JX = os.environ["JX_SCRATCH"]; HERE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(JX, "venv", "bin", "python")
MODS = ["maxtext.configs.pyconfig", "maxtext.models.models", "maxtext.trainers.pre_train.train",
        "maxtext.trainers.post_train.sft.train_sft", "maxtext.trainers.post_train.dpo.train_dpo", "maxtext.trainers.post_train.rl.train_rl",
        "tunix.sft.peft_trainer", "tunix.sft.dpo.dpo_trainer", "tunix.rl.rl_cluster", "tunix.rl.grpo.grpo_learner", "haliax"]
res = {}
for m in MODS:
    code = f"import sys; sys.path.insert(0, {HERE!r}); import lc_env, importlib; importlib.import_module({m!r}); print('OK')"
    p = subprocess.run([PY, "-I", "-B", "-c", code], capture_output=True, text=True, env=dict(os.environ, JAX_PLATFORMS="cpu"))
    if p.stdout.strip().endswith("OK"):
        res[m] = "ok"
    else:
        last = [l for l in p.stderr.strip().split("\n") if l and not l.startswith(" ")][-1]
        res[m] = last.replace(JX, "<JX_SCRATCH>")[:300]
    print(m, res[m])
overlay = sorted(os.path.basename(d)[:-len(".dist-info")].replace("-", " ", 1)
                 for d in glob.glob(os.path.join(JX, "lc", "site", "*.dist-info")))
json.dump({"imports": res, "overlay_packages": overlay}, open(os.path.join(HERE, "..", "out", "imports.json"), "w"), indent=1)
print(overlay)
