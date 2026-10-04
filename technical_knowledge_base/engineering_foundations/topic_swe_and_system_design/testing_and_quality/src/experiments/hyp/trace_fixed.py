"""Same logging run as trace.py (seed 6), on the fixed chunker: every call passes."""
import json
from hypothesis import given, settings, seed, strategies as st
from chunking_fixed import chunk, unchunk
from test_chunking_property import chunk_args
LOG = []
@seed(6)
@settings(database=None, max_examples=100)
@given(text=st.text(), args=chunk_args())
def prop(text, args):
    size, overlap = args
    got = unchunk(chunk(text, size, overlap), overlap)
    LOG.append({"text": text, "size": size, "overlap": overlap, "got": got, "fail": got != text})
    assert got == text
prop()
json.dump({"seed": 6, "log": LOG}, open("trace_6_fixed.json", "w"), indent=1, ensure_ascii=True)
print(len(LOG), sum(e["fail"] for e in LOG), max(len(e["text"]) for e in LOG))
