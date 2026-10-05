"""Numba compiles array code: the messages become one uint8 buffer plus offsets."""
import numpy as np
from numba import njit


@njit(cache=False)
def count_many(buf, starts, ends):
    out = np.zeros(starts.shape[0], dtype=np.int64)
    for k in range(starts.shape[0]):
        n = 0
        inside = False
        for i in range(starts[k], ends[k]):
            b = buf[i]
            t = (48 <= b <= 57) or (65 <= b <= 90) or (97 <= b <= 122)
            if t and not inside:
                n += 1
            inside = t
        out[k] = n
    return out


def prepare(texts):
    """Encode and join the messages; record where each one starts and ends (bytes)."""
    enc = [t.encode() for t in texts]
    lens = np.fromiter((len(e) for e in enc), dtype=np.int64, count=len(enc))
    ends = np.cumsum(lens)
    return np.frombuffer(b"".join(enc), dtype=np.uint8), ends - lens, ends
