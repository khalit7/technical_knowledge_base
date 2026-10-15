import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lc_env, importlib, traceback
for m in sys.argv[1:]:
    try:
        importlib.import_module(m); print("ok", m)
    except Exception as e:
        print("FAIL", m, type(e).__name__, lc_env.scrub(e))
