import random

def backoff_delay(attempt: int, base: float = 0.5, cap: float = 8.0) -> float:
    return min(cap, base * 2 ** (attempt - 1))

def full_jitter(attempt: int, rng: random.Random | None = None) -> float:
    """'Full jitter' backoff: a uniform random wait between 0 and the exponential delay."""
    rng = rng or random
    return rng.uniform(0, backoff_delay(attempt))
