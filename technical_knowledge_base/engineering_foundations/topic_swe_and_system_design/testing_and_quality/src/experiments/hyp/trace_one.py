import json, sys
from trace import run
s = int(sys.argv[1]); log = run(s)
json.dump({"seed": s, "log": log}, open(f"trace_{s}.json", "w"), indent=1, ensure_ascii=True)
for i, e in enumerate(log): print(i, "FAIL" if e["fail"] else "pass", repr(e["text"])[:60], e["size"], e["overlap"], repr(e["got"])[:30])
