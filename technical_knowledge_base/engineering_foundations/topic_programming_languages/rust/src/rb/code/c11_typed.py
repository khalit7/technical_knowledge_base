"""Calls that run, and calls a type checker should reject before they run."""
import numpy as np
import tokrs

n: int = tokrs.count_tokens("attention is all you need")
counts = tokrs.count_many(["a b", "c"])
top: list[tuple[str, int]] = tokrs.Counter().top()

tokrs.count_tokens(b"bytes, not str")          # wrong argument type
tokrs.sum_sq_array(np.arange(3, dtype=np.float32))  # float32 array where float64 is expected
label: str = tokrs.count_bytes(b"abc")          # returns int, not str
tokrs.tally_file("chat.jsonl", thread=4)        # misspelt keyword
