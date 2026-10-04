"""Run the round-trip property under a fixed seed and log every example Hypothesis tries."""
import json, sys
from hypothesis import given, settings, seed, strategies as st, Phase
from chunking import chunk, unchunk
from test_chunking_property import chunk_args

LOG = []
def run(s):
    LOG.clear()
    @seed(s)
    @settings(database=None, max_examples=100)
    @given(text=st.text(), args=chunk_args())
    def prop(text, args):
        size, overlap = args
        got = unchunk(chunk(text, size, overlap), overlap)
        ok = got == text
        LOG.append({"text": text, "size": size, "overlap": overlap, "got": got, "fail": not ok})
        assert ok
    try:
        prop(); return None
    except AssertionError:
        return list(LOG)

out = []
for s in range(20):
    log = run(s)
    if log is None:
        out.append({"seed": s, "found": False}); continue
    first = next(i for i, e in enumerate(log) if e["fail"])
    # the shrink path: every failing example in order (each one a step the shrinker kept or rechecked)
    path = []
    for e in log[first:]:
        if e["fail"] and (not path or (e["text"], e["size"], e["overlap"]) != (path[-1]["text"], path[-1]["size"], path[-1]["overlap"])):
            path.append(e)
    out.append({"seed": s, "found": True, "tries_before_fail": first, "total_calls": len(log), "path_len": len(path),
                "first": log[first], "final": path[-1]})
json.dump(out, open("trace_seeds.json", "w"), indent=1, ensure_ascii=False)
for o in out:
    if o["found"]:
        print(o["seed"], o["tries_before_fail"], o["total_calls"], o["path_len"], repr(o["first"]["text"][:30]), o["first"]["size"], o["first"]["overlap"], "->", repr(o["final"]["text"]), o["final"]["size"], o["final"]["overlap"])
    else: print(o["seed"], "not found")
