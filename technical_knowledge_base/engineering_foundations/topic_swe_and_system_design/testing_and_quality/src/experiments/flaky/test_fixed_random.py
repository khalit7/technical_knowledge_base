import random
from jitter import full_jitter, backoff_delay

def test_jitter_stays_within_bounds():
    rng = random.Random(1234)             # seeded: the same 1,000 draws on every run
    for attempt in range(1, 8):
        for _ in range(1000):
            assert 0 <= full_jitter(attempt, rng) <= backoff_delay(attempt)
