import sys

lazy import json

print("json loaded before use:", "json" in sys.modules)
json.dumps({})
print("json loaded after use:", "json" in sys.modules)
