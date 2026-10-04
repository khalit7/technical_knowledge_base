"""How much does pydantic validation cost compared with a plain dataclass? (the "hot loop" question)

Run from this folder (about 1 minute):
  uv run --no-project --python 3.12 --with pydantic --with attrs python bench_models.py
Writes ../inputs/bench_models.json. Each figure is the best of 7 runs of N constructions, in ns per object.
"""
import importlib.metadata as md, json, pathlib, platform, sys, timeit
from dataclasses import dataclass
from datetime import date

import attrs
from pydantic import BaseModel, ConfigDict, Field

N = 100_000

@dataclass(slots=True)
class MsgDC:
    role: str
    content: str
    tokens: int

@attrs.define
class MsgAttrs:
    role: str
    content: str
    tokens: int

class MsgPD(BaseModel):
    role: str
    content: str
    tokens: int

class MsgPDStrict(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str = Field(min_length=1, max_length=32_000)
    tokens: int = Field(ge=0)

D = {"role": "user", "content": "How do I cache prompts?", "tokens": 7}
J = json.dumps(D)

cases = {
    "dict literal": lambda: {"role": "user", "content": "How do I cache prompts?", "tokens": 7},
    "dataclass(slots=True)": lambda: MsgDC("user", "How do I cache prompts?", 7),
    "attrs.define": lambda: MsgAttrs("user", "How do I cache prompts?", 7),
    "pydantic BaseModel(...)": lambda: MsgPD(role="user", content="How do I cache prompts?", tokens=7),
    "pydantic with constraints": lambda: MsgPDStrict(role="user", content="How do I cache prompts?", tokens=7),
    "pydantic model_construct (no validation)": lambda: MsgPD.model_construct(role="user", content="How do I cache prompts?", tokens=7),
    "json.loads + dataclass": lambda: MsgDC(**json.loads(J)),
    "pydantic model_validate_json": lambda: MsgPD.model_validate_json(J),
}
out = {}
for name, f in cases.items():
    best = min(timeit.repeat(f, number=N, repeat=7)) / N * 1e9
    out[name] = round(best, 1)
    print(f"{name:42s} {best:8.1f} ns")
env = {"date": str(date.today()), "python": platform.python_version(), "machine": platform.machine(),
       "platform": platform.platform(), "pydantic": md.version("pydantic"), "pydantic_core": md.version("pydantic-core"),
       "attrs": md.version("attrs"), "N": N, "repeat": 7}
(pathlib.Path(__file__).parent.parent / "inputs" / "bench_models.json").write_text(json.dumps({"env": env, "ns_per_object": out}, indent=1))
print(env)
