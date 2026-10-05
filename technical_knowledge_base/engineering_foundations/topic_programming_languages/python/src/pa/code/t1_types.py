from collections.abc import Iterable, Sequence
from typing import Literal, NotRequired, Protocol, TypedDict, overload, reveal_type

class Message(TypedDict):                 # the shape of a dict, checked statically only
    role: Literal["system", "user", "assistant"]
    content: str
    name: NotRequired[str]

def first[T](xs: Sequence[T]) -> T:       # PEP 695 generic function (3.12+)
    return xs[0]

class SupportsClose(Protocol):            # structural: anything with close() fits
    def close(self) -> None: ...

def shutdown(things: Iterable[SupportsClose]) -> int:
    n = 0
    for t in things:
        t.close()
        n += 1
    return n

class Conn:                               # never mentions SupportsClose
    def close(self) -> None:
        print("closed")

@overload
def parse(x: str) -> int: ...
@overload
def parse(x: bytes) -> list[int]: ...
def parse(x: str | bytes) -> int | list[int]:
    return int(x) if isinstance(x, str) else list(x)

def find_user(msgs: list[Message], name: str) -> Message | None:
    return next((m for m in msgs if m.get("name") == name), None)

def legacy(x):                            # no annotations at all
    return x + 1

msgs: list[Message] = [{"role": "user", "content": "hello there", "name": "kh"}]
print(first([3, 4]), shutdown([Conn()]), parse("42"), parse(b"ab"))
reveal_type(first(["a", "b"]))
# Deliberate mistakes. Python runs every line until one actually fails.
bad: Message = {"role": "admin", "content": "x"}       # 1. not an allowed role
n: int = parse(b"ab")                                    # 2. the overload returns list[int]
print(find_user(msgs, "kh")["content"])                  # 3. may be None
print(legacy("text"))                                    # 4. str + int, inside an unannotated function
shutdown([42])                                           # 5. int has no close()
