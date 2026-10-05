"""Task: the same 8 timestamps in a NumPy array."""
import numpy as np

ts = np.array([1759650000 + 7 * i for i in range(8)], dtype=np.int64)
base = ts.ctypes.data                     # address of the first element
print(f"numpy {np.__version__}: buffer at {base:#x}, itemsize {ts.itemsize}, strides {ts.strides}")
for i in range(8):
    print(f"ts[{i}] at {base + i * ts.strides[0]:#x}  value {ts[i]}")
print("type of one element read back:", type(ts[0]).__name__)  # a new box, made on access
