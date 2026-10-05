import json
from typing import TypedDict
class Reply(TypedDict):
    tool: str
    args: dict[str, int]
r: Reply = json.loads('{"tool": "search"}')   # an LLM forgot "args"
print(r["args"])                              # TypedDict does not validate either
