import functools, random, time

def retry(times=3, base_delay=0.01, on=(ConnectionError, TimeoutError)):
    """A decorator WITH arguments is a function that returns a decorator."""
    def decorate(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except on as e:
                    if attempt == times:
                        raise                     # out of attempts: re-raise the last error
                    delay = base_delay * 2 ** (attempt - 1) * random.uniform(0.5, 1.5)
                    print(f"attempt {attempt} failed ({e!r}); retrying in {delay * 1000:.0f} ms")
                    time.sleep(delay)
        return wrapper
    return decorate

random.seed(0)
calls = {"n": 0}

@retry(times=4)
def flaky_completion(prompt):
    calls["n"] += 1
    if calls["n"] < 3:
        raise ConnectionError("upstream reset")
    return f"answer to {prompt!r}"

print(flaky_completion("hello"))

@retry(times=2)
def bad_request():
    raise ValueError("400: bad request")          # not in `on`: never retried
try:
    bad_request()
except ValueError as e:
    print("not retried:", e)
