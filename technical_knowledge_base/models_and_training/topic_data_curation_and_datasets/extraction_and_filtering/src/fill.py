"""Build filter: replace every [[KEY]] in the page with the value make_data.py computed (data/ef_facts.json), so that
numbers written in the prose come from the same data the widgets draw. Fails if a key has no value."""
import json
import os
import re
import sys

facts = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "ef_facts.json")))
text = sys.stdin.read()
missing = sorted(set(k for k in re.findall(r"\[\[([A-Z0-9_]+)\]\]", text) if k not in facts))
if missing:
    sys.stderr.write("fill.py: no value for " + ", ".join(missing) + "\n")
    if os.environ.get("EF_DRAFT") != "1":  # EF_DRAFT=1 only for previews while a run is still going
        sys.exit(1)
    facts.update({k: "[pending]" for k in missing})
sys.stdout.write(re.sub(r"\[\[([A-Z0-9_]+)\]\]", lambda m: str(facts[m.group(1)]), text))
