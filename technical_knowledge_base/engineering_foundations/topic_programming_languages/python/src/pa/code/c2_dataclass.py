from dataclasses import dataclass, field, asdict, replace

@dataclass(frozen=True, slots=True)
class Message:
    role: str
    text: str
    tokens: int = 0

@dataclass
class Conversation:
    model: str
    messages: list[Message] = field(default_factory=list)   # a fresh list per instance

m = Message("user", "hi", 1)
print(m, m == Message("user", "hi", 1), hash(m) == hash(Message("user", "hi", 1)))
print(replace(m, text="hello"))
try:
    m.text = "changed"
except Exception as e:
    print(type(e).__name__ + ":", e)
c = Conversation("small-model")
c.messages.append(m)
print(asdict(c))
try:
    @dataclass
    class Bad:
        items: list = []
except ValueError as e:
    print("ValueError:", e)
print(Message.__slots__, hasattr(m, "__dict__"))
