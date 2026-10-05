import sys

print("before import, GIL enabled:", sys._is_gil_enabled())
import newext

print("after newext, GIL enabled:", sys._is_gil_enabled())
import oldext

print("after oldext, GIL enabled:", sys._is_gil_enabled())
