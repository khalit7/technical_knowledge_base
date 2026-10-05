"""What each argument and return type costs at the boundary, measured with timeit (medians of 7)."""
import json
import sys

import numpy as np
import tokrs

from common import CHAT, per, texts

T = texts(20000)
N = len(T)
data = open(CHAT, "rb").read()
xs = [float(i % 1000) / 7 for i in range(1_000_000)]
arr = np.array(xs)
d = {f"u{i:04d}": i for i in range(10_000)}
g = dict(tokrs=tokrs, T=T, data=data, xs=xs, arr=arr, d=d, np=np, t0=T[0])
nonascii = sum(1 for t in T if not t.isascii())

r = {"n_texts": N, "avg_chars": round(sum(map(len, T)) / N, 1), "non_ascii_share": round(nonascii / N, 3),
     "file_bytes": len(data), "n_floats": len(xs), "n_dict": len(d)}
r["call_noop"] = per("tokrs.noop()", g, 1_000_000)
r["call_str"] = per("tokrs.count_tokens(t0)", g, 1_000_000)
r["list_str_borrowed"] = per("tokrs.count_many(T)", g, 20, divide=N)
r["len_borrowed"] = per("tokrs.total_len(T)", g, 20, divide=N)
r["len_owned"] = per("tokrs.total_len_owned(T)", g, 20, divide=N)
r["list_str_owned"] = per("tokrs.count_many_owned(T)", g, 20, divide=N)
# fresh str objects: no cached UTF-8 copy yet, so non-ASCII strings are encoded on first use
fresh = "import tokrs\nfrom __main__ import T\nF=[(t+'.')[:-1] for t in T]"
import timeit, statistics
ts = timeit.repeat("tokrs.total_len(F)", setup=fresh, number=1, repeat=7)
r["list_str_fresh"] = {"med": statistics.median(ts) * 1e9 / N, "min": min(ts) * 1e9 / N, "max": max(ts) * 1e9 / N}
r["bytes_view"] = per("tokrs.count_bytes(data)", g, 5, divide=len(data))
r["bytes_vec"] = per("tokrs.count_bytes_owned(data)", g, 5, divide=len(data))
r["floats_vec"] = per("tokrs.sum_sq_list(xs)", g, 5, divide=len(xs))
r["floats_numpy"] = per("tokrs.sum_sq_array(arr)", g, 20, divide=len(xs))
r["floats_np_dot"] = per("np.dot(arr, arr)", g, 20, divide=len(xs))
r["floats_python"] = per("sum(x * x for x in xs)", g, 1, repeat=5, divide=len(xs))
r["ret_list"] = per("tokrs.counts_list(T)", g, 20, divide=N)
r["ret_numpy"] = per("tokrs.counts_array(T)", g, 20, divide=N)
r["dict_owned"] = per("tokrs.dict_total_owned(d)", g, 50, divide=len(d))
r["dict_borrowed"] = per("tokrs.dict_total(d)", g, 50, divide=len(d))
assert tokrs.sum_sq_list(xs) == tokrs.sum_sq_array(arr)
assert tokrs.count_bytes(data) == tokrs.count_bytes_owned(data)

json.dump(r, open(sys.argv[1], "w"), indent=1)
rows = [("str, one call", "call_str"), ("no-op call", "call_noop"),
        ("list[str] -> &str views", "list_str_borrowed"), ("list[str] -> Vec<String>", "list_str_owned"),
        ("  conversion only: views", "len_borrowed"), ("  conversion only: copies", "len_owned"),
        ("  views of fresh str objects", "list_str_fresh"),
        ("bytes -> &[u8]", "bytes_view"), ("bytes -> Vec<u8>", "bytes_vec"),
        ("list[float] -> Vec<f64>", "floats_vec"), ("ndarray -> slice", "floats_numpy"),
        ("np.dot(x, x)", "floats_np_dot"), ("Python sum(x*x)", "floats_python"),
        ("Vec<u64> -> list", "ret_list"), ("Vec<u64> -> ndarray", "ret_numpy"),
        ("dict -> HashMap", "dict_owned"), ("dict iterated in place", "dict_borrowed")]
print(f"{N} messages, {r['avg_chars']} chars on average, {r['non_ascii_share']:.0%} contain non-ASCII")
print(f"{'conversion':<27}{'ns per item':>12}   (min to max)")
for label, k in rows:
    v = r[k]
    print(f"{label:<27}{v['med']:>12.3f}   ({v['min']:.3f} to {v['max']:.3f})")
