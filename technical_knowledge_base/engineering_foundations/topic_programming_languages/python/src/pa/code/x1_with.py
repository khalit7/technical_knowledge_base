import contextlib, time

class Timer:
    def __enter__(self):
        self.t0 = time.perf_counter()
        return self                                   # bound to the name after `as`
    def __exit__(self, exc_type, exc, tb):
        self.ms = (time.perf_counter() - self.t0) * 1000
        print(f"Timer exit: exc_type={exc_type.__name__ if exc_type else None}")
        return False                                  # do not swallow exceptions

with Timer() as t:
    sum(range(100_000))
print(f"{t.ms:.1f} ms")

@contextlib.contextmanager                            # the same protocol, written as a generator
def opened(name):
    print(f"open {name}")
    try:
        yield name.upper()                            # the value bound by `as`
    finally:
        print(f"close {name}")                        # runs even if the body raises

try:
    with opened("a") as a, opened("b") as b:          # entered left to right...
        print("body", a, b)
        raise KeyError("oops")
except KeyError:
    print("KeyError reached the caller")              # ...exited right to left

with contextlib.ExitStack() as stack:                 # a number of resources known only at run time
    names = [stack.enter_context(opened(n)) for n in ("x", "y", "z")]
    print("using", names)

with contextlib.suppress(FileNotFoundError):
    open("/no/such/file")
print("suppressed")
