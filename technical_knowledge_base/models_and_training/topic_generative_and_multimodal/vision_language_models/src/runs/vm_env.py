"""Shared setup for this page's scripts (prefix vm).

Run with the shared venv, low priority, 4 threads:
    GM_SCRATCH=<shared setup folder> nice -n 15 $GM_SCRATCH/venv/bin/python -I runs/<script>.py
CPU-only scripts never take the GPU lock. GPU scripts (run_smol.py, run_qwen.py) run only under the shared bench
lock (GM_LOCK=<path to lock.sh> lets them touch it). Small JSON results go to out/; images and large arrays to
GM_SCRATCH/vm/.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
ROOT_SRC = os.path.join(SRC, "..", "..", "src")
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
sys.path.insert(0, os.path.join(ROOT_SRC, "vlm"))
from common import cap_threads, scratch, device, sync, PeakMem, MACHINE, touch_bench, empty_cache  # noqa
import pretrained  # noqa: E402

OUT = os.path.join(SRC, "out")
INP = os.path.join(SRC, "inputs")
os.makedirs(OUT, exist_ok=True)

# The second VLM of this page (the first is the root's SmolVLM-500M-Instruct, pretrained.VLM).
QWEN = ("Qwen/Qwen3.5-0.8B", "2fc06364715b967f1860aea9cf38778875588b17")


def big(*p):
    d = scratch("vm", *p[:-1]); os.makedirs(d, exist_ok=True)
    return os.path.join(d, p[-1])


def dump(name, obj, indent=None):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, "w"), indent=indent, separators=(",", ":") if indent is None else None)
    print("wrote", os.path.relpath(p, SRC), os.path.getsize(p), "bytes", flush=True)


def smol_processor(**kw):
    from transformers import AutoProcessor
    return AutoProcessor.from_pretrained(pretrained.VLM[0], revision=pretrained.VLM[1], **kw)


def qwen_processor(**kw):
    from transformers import AutoProcessor
    return AutoProcessor.from_pretrained(QWEN[0], revision=QWEN[1], **kw)


def chat(proc, question, n_images=1, video=False):
    content = [{"type": "video" if video else "image"}] * n_images + [{"type": "text", "text": question}]
    return proc.apply_chat_template([{"role": "user", "content": content}], add_generation_prompt=True)


def log(*a):
    print(time.strftime("[%H:%M:%S]"), *a, flush=True)
