from jitter import full_jitter

def test_jitter_waits_a_bit():
    # attempt 3: the exponential delay is 2.0 s, so the jittered wait is uniform in [0, 2.0]
    assert full_jitter(3) >= 0.1          # "it should always wait at least a little": false 5% of the time
