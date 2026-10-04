from retrypolicy import should_retry, backoff_delay, parse_retry_after

def test_should_retry():
    assert should_retry(503, attempt=1)
    assert not should_retry(503, attempt=3)

def test_backoff_delay():
    assert backoff_delay(1) > 0

def test_parse_retry_after():
    assert parse_retry_after("2") == 2.0
    assert parse_retry_after(None) is None
    assert parse_retry_after("soon") is None
