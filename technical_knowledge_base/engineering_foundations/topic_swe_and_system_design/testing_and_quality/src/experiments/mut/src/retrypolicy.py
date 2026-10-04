"""When and how long to wait before retrying a failed call to the model provider."""

RETRYABLE = frozenset({408, 429, 500, 502, 503, 504})


def should_retry(status: int, attempt: int, max_attempts: int = 3) -> bool:
    """attempt counts from 1: the number of calls made so far."""
    if attempt >= max_attempts:
        return False
    return status in RETRYABLE


def backoff_delay(attempt: int, base: float = 0.5, cap: float = 8.0) -> float:
    """Seconds to wait after the given attempt: 0.5, 1, 2, 4, 8, 8, ..."""
    return min(cap, base * 2 ** (attempt - 1))


def parse_retry_after(value: str | None) -> float | None:
    """Read a Retry-After header given in seconds; None if absent or not a number."""
    if value is None:
        return None
    try:
        seconds = float(value)
    except ValueError:
        return None
    return max(0.0, seconds)
