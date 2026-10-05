import functools
def logged(f):                       # a function that takes and returns a function
    @functools.wraps(f)
    def wrapper(*args):
        print(f"calling {f.__name__}{args}")
        return f(*args)
    return wrapper
@logged                              # runs at import time: add = logged(add)
def add(a, b): return a + b
print(add(2, 3), add.__name__)
