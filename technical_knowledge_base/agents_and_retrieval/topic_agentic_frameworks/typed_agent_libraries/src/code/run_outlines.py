"""Same model as the server (Qwen3-4B-Instruct-2507 4-bit MLX), loaded directly, same messages:
unconstrained vs JSON-schema-constrained decoding (outlines). Holds the shared mlx lock throughout.
Usage: run_outlines.py OUT.jsonl"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from mlx_call import locked
import common
from common import Triage, CASES
from textwrap import dedent

TEMPLATE = dedent("""
    Always respond with a JSON object that's compatible with this schema:

    {schema}

    Don't include any text or Markdown fencing before or after.
    """)  # pydantic_ai.profiles.DEFAULT_PROMPTED_OUTPUT_TEMPLATE (2.54.0), copied verbatim
OUT = sys.argv[1]

with locked():
    import mlx.core as mx
    from mlx_lm import load
    from mlx_lm.sample_utils import make_sampler
    import outlines
    from outlines.inputs import Chat
    model, tok = load(common.MODEL)
    om = outlines.from_mlxlm(model, tok)
    sysmsg = common.INSTRUCTIONS + "\n\n" + TEMPLATE.format(schema=json.dumps(Triage.model_json_schema())).strip()
    runs = [("greedy", 0.0, None), ("t07_1", 0.7, 1), ("t07_2", 0.7, 2)]
    for tag, temp, seed in runs:
        for mode in ("free", "constrained"):
            for c in CASES:
                if seed is not None:
                    mx.random.seed(seed * 100 + CASES.index(c))
                chat = Chat([{"role": "system", "content": sysmsg}, {"role": "user", "content": common.prompt(c)}])
                kw = {"max_tokens": 512, "sampler": make_sampler(temp=temp)}
                t0 = time.time()
                txt = om(chat, Triage if mode == "constrained" else None, **kw)
                dt = time.time() - t0
                obj, err = common.try_parse(txt)
                rec = {"mode": mode, "run": tag, "temperature": temp, "case": c["id"], "text": txt,
                       "out_tokens": len(tok.encode(txt)), "seconds": round(dt, 2), "error": err,
                       "obj": obj.model_dump() if obj else None, **common.score(c, obj)}
                with open(OUT, "a") as f:
                    f.write(json.dumps(rec) + "\n")
                print(mode, tag, c["id"], rec["valid"], err, flush=True)
