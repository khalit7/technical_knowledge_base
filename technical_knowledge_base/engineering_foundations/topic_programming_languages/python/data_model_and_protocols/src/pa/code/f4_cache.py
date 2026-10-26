import functools

calls = 0
@functools.cache                       # = lru_cache(maxsize=None)
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80), "calls:", calls)
print(fib.cache_info())

calls = 0
def fib_plain(n):
    global calls
    calls += 1
    return n if n < 2 else fib_plain(n - 1) + fib_plain(n - 2)
fib_plain(25)
print("without the cache, fib(25) makes", calls, "calls")

@functools.lru_cache(maxsize=128)
def embed(text):
    return len(text)
try:
    embed(["not", "hashable"])          # arguments become a dict key
except TypeError as e:
    print("TypeError:", e)
