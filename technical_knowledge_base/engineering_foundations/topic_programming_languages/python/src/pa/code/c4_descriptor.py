class Positive:
    """A reusable validated attribute: a data descriptor (it defines __set__)."""
    def __set_name__(self, owner, name):
        self.name = "_" + name
    def __get__(self, obj, owner):
        if obj is None:
            return self                    # accessed on the class itself
        return getattr(obj, self.name)
    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.name[1:]} must be > 0, got {value}")
        setattr(obj, self.name, value)

class Sampling:
    temperature = Positive()
    max_tokens = Positive()
    def __init__(self, temperature, max_tokens):
        self.temperature = temperature     # goes through Positive.__set__
        self.max_tokens = max_tokens
    @property                              # property is a data descriptor too
    def budget(self):
        return self.max_tokens * 4
    def describe(self):
        return f"t={self.temperature} max={self.max_tokens}"

s = Sampling(0.7, 256)
print(s.describe(), s.budget, vars(s))
try:
    s.temperature = 0
except ValueError as e:
    print("ValueError:", e)
try:
    s.budget = 1
except AttributeError as e:
    print("AttributeError:", e)

# A method is a function stored on the class; looking it up on an instance binds it.
f = Sampling.__dict__["describe"]
print(type(f).__name__, type(s.describe).__name__)
bound = f.__get__(s, Sampling)            # exactly what s.describe does
print(bound(), bound.__self__ is s, bound.__func__ is f)
print(s.describe is s.describe, s.describe == s.describe)   # a new bound method each time
