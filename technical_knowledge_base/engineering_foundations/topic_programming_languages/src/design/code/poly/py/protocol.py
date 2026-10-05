# check: ty
from typing import Protocol
class Speaker(Protocol):
    def speak(self) -> str: ...
class Dog:                      # never mentions Speaker
    def speak(self) -> str: return "woof"
class Rock: pass
def talk(x: Speaker) -> None: print(x.speak())
talk(Dog())
talk(Rock())                    # ty rejects; Python fails only when speak is called
