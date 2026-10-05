"""Can a subinterpreter import NumPy? (Extension modules must opt in to multiple interpreters.)"""
from concurrent import interpreters

interp = interpreters.create()
try:
    interp.exec("import numpy")
    print("numpy imported in a subinterpreter")
except interpreters.ExecutionFailed as e:
    print("ExecutionFailed:", str(e).strip().splitlines()[-1])
interp.close()
