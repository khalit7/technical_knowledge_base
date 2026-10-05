import sys
import warnings

print("GIL enabled at start:", sys._is_gil_enabled())
import tokrs
print("after import tokrs:", sys._is_gil_enabled())
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    import gilused
print("after import gilused:", sys._is_gil_enabled())
for x in w:
    print(f"{x.category.__name__}: {x.message}")
