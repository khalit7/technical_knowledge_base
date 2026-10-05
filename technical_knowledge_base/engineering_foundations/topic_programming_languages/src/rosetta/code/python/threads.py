"""Task: count tokens in 4 chunks on 4 threads, merge the per-user counts."""
import json
import sys
import sysconfig
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from count_tokens import tokens


def count_chunk(lines: list[str]) -> Counter[str]:
    c: Counter[str] = Counter()
    for line in lines:
        try:
            rec = json.loads(line)
            if isinstance(rec.get("user"), str) and isinstance(rec.get("text"), str):
                c[rec["user"]] += tokens(rec["text"])
        except (ValueError, AttributeError):
            pass
    return c


lines = open(sys.argv[1], encoding="utf-8").readlines()
chunks = [lines[i::4] for i in range(4)]
with ThreadPoolExecutor(max_workers=4) as pool:
    parts = list(pool.map(count_chunk, chunks))
total = sum(parts, Counter())
print("free-threaded build:", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
print("users", len(total), "tokens", total.total(), "top", total.most_common(1))
