"""smolagents 1.26.0 LocalPythonExecutor on benign snippets, no model: what its rules allow and refuse.
Writes smol_exec.json."""
import json, sys, time
from smolagents.local_python_executor import LocalPythonExecutor

SNIPS = [
 ("allowed module", "import math\nmath.sqrt(16)", []),
 ("allowed module", "import re\nre.findall(r'[a-z]+', 'don t')", []),
 ("module not on the list", "import json\njson.dumps({'a': 1})", []),
 ("same, after authorising it", "import json\njson.dumps({'a': 1})", ["json"]),
 ("dangerous module", "import os\nos.getcwd()", []),
 ("dangerous module, even if authorised", "import os\nos.getcwd()", ["os"]),
 ("builtin not exposed", "open('notes.txt').read()", []),
 ("dangerous builtin", "eval('1 + 1')", []),
 ("dunder walk", "().__class__.__bases__[0].__subclasses__()", []),
 ("runaway loop", "x = 0\nwhile True:\n    x += 1", []),
 ("state persists across steps", "y = 21", []),
 ("state persists across steps", "y * 2", []),
 ("print is captured", "print('hello')\n3", []),
 ("wildcard authorisation", "import json\njson.loads('[1]')", ["*"]),
]
out = []
ex = None
for label, code, auth in SNIPS:
    if ex is None or auth or label != "state persists across steps" or code == "y = 21":
        ex = LocalPythonExecutor(additional_authorized_imports=auth)
        ex.send_tools({})
    t0 = time.time()
    try:
        r = ex(code)
        res = {"ok": True, "output": repr(r.output)[:120], "logs": r.logs[:120]}
    except Exception as e:
        res = {"ok": False, "error": (type(e).__name__ + ": " + str(e)).replace("\n", " ")[:260]}
    res.update({"label": label, "code": code, "authorized": auth, "seconds": round(time.time() - t0, 2)})
    out.append(res)
    print(res, flush=True)
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "smol_exec.json", "w"), indent=1)
