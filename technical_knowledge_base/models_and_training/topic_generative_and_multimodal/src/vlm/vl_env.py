"""Shared setup for the VLM lab scripts (prefix vl).

Run every script with the shared venv's Python, low priority, 4 threads:
    GM_SCRATCH=<shared setup folder> nice -n 15 $GM_SCRATCH/venv/bin/python -I <script>.py
Processor-only work (token counts, the prompt string) runs on the CPU. Model runs use MPS in bfloat16 and run
only under the shared bench lock (GM_LOCK=<path to lock.sh> lets the script touch it). Small JSON results go
to out/ here; anything large goes to GM_SCRATCH/vlm/.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
from common import cap_threads, scratch, device, sync, PeakMem, MACHINE, touch_bench  # noqa: E402,F401
import pretrained  # noqa: E402

OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


def big(*p):
    d = scratch("vlm"); os.makedirs(d, exist_ok=True)
    return os.path.join(d, *p)


def processor(**kw):
    from transformers import AutoProcessor
    return AutoProcessor.from_pretrained(pretrained.VLM[0], revision=pretrained.VLM[1], **kw)


def chat(proc, question, n_images=1):
    content = [{"type": "image"}] * n_images + [{"type": "text", "text": question}]
    return proc.apply_chat_template([{"role": "user", "content": content}], add_generation_prompt=True)


def dump(name, obj):
    p = os.path.join(OUT, name)
    json.dump(obj, open(p, "w"), indent=1)
    print("wrote", p, os.path.getsize(p), "bytes", flush=True)
