import functools, time

def timed(fn):                                # a decorator: takes a function, returns one
    @functools.wraps(fn)                      # copy __name__, __doc__, __wrapped__ ...
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - t0:.3f} s")
    return wrapper

@timed                                        # same as: work = timed(work)
def work(n):
    """Sum of squares."""
    return sum(i * i for i in range(n))

print(work(1_000_000))
print(work.__name__, work.__doc__, work.__wrapped__.__name__)

def no_wraps(fn):
    def wrapper(*a, **k):
        return fn(*a, **k)
    return wrapper

@no_wraps
def other():
    """Docs that will be lost."""
print(other.__name__, other.__doc__)
