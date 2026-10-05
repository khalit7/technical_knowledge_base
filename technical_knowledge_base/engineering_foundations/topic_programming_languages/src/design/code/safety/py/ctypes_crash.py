xs = [1, 2, 3]
try:
    xs[10]
except IndexError as e:
    print("IndexError:", e, flush=True)   # checked access: an exception, never garbage
import ctypes
print(ctypes.string_at(0), flush=True)   # opt out of safety: read address 0
