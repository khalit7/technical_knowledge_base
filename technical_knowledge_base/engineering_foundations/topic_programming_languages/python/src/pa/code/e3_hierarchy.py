class LLMError(Exception):
    """Root of everything this client raises: callers can catch one type."""

class RateLimited(LLMError):
    def __init__(self, retry_after: float):
        super().__init__(f"rate limited, retry after {retry_after}s")
        self.retry_after = retry_after

class ContextTooLong(LLMError):
    pass

def complete(prompt_tokens):
    if prompt_tokens > 8192:
        raise ContextTooLong(f"{prompt_tokens} tokens > 8192")
    raise RateLimited(retry_after=1.5)

for n in (100, 10_000):
    try:
        complete(n)
    except RateLimited as e:              # most specific first
        print("wait", e.retry_after)
    except LLMError as e:                 # then the family
        print(type(e).__name__, e)

print([c.__name__ for c in RateLimited.__mro__])
print(issubclass(KeyboardInterrupt, Exception), issubclass(KeyboardInterrupt, BaseException))
print(issubclass(TimeoutError, OSError))
import asyncio
print(issubclass(asyncio.CancelledError, Exception))
