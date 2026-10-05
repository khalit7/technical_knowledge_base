import numpy as np
import tokrs

a = np.arange(6, dtype=np.float64)
print(tokrs.sum_sq_array(a), tokrs.sum_sq_list(a.tolist()))
counts = tokrs.counts_array(["one two", "three", "日本語"])
print(repr(counts), counts.flags["OWNDATA"], counts.flags["WRITEABLE"])

def attempt(label, f):
    try:
        print(label, "->", f())
    except Exception as e:
        notes = "".join(f" ({n})" for n in getattr(e, "__notes__", []))
        print(label, "->", f"{type(e).__name__}: {e}{notes}")

attempt("float32 array", lambda: tokrs.sum_sq_array(a.astype(np.float32)))
attempt("every 2nd element a[::2]", lambda: tokrs.sum_sq_array(a[::2]))
attempt("np.ascontiguousarray(a[::2])", lambda: tokrs.sum_sq_array(np.ascontiguousarray(a[::2])))
attempt("a Python list", lambda: tokrs.sum_sq_array([1.0, 2.0]))
attempt("int64 array to Vec<f64>", lambda: tokrs.sum_sq_list(np.arange(3)))
