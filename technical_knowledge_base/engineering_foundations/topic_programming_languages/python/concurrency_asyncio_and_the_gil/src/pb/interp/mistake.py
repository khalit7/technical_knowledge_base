"""The common mistake: the worker function lives in a module found only through a sys.path change
made in the main interpreter. A subinterpreter starts with its own sys.path and does not see it."""
import importlib.util
import os
import sys
from concurrent import interpreters
from concurrent.futures import InterpreterPoolExecutor

FT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ft")
sys.path.insert(0, FT)
from tokwork import count_slice

interp = interpreters.create()
print("main interpreter can import tokwork:", importlib.util.find_spec("tokwork") is not None)
interp.exec("import importlib.util; print('subinterpreter can import tokwork:', importlib.util.find_spec('tokwork') is not None)")
interp.close()
with InterpreterPoolExecutor(max_workers=2) as ex:
    print(list(ex.map(count_slice, [['{"user": "u1", "text": "x86_64 caf\\u00e9"}']])))
