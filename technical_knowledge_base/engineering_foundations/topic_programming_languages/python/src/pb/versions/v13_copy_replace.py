import copy
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    model: str
    temperature: float


c = Config("small", 0.7)
print(copy.replace(c, temperature=0.0))
