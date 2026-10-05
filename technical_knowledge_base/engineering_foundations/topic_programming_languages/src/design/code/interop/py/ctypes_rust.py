# pre: rustc --edition 2024 -O --crate-type cdylib dot.rs -o libdot.dylib
import ctypes
lib = ctypes.CDLL("./libdot.dylib")            # a compiled Rust library
lib.dot.restype = ctypes.c_double
lib.dot.argtypes = [ctypes.POINTER(ctypes.c_double)] * 2 + [ctypes.c_size_t]
xs = (ctypes.c_double * 3)(1.0, 2.0, 3.0)
print(lib.dot(xs, xs, 3))                       # Rust code, called through the C ABI
